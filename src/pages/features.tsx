import React, { useRef, useState, useEffect } from "react";
import { fetchSongRange } from "../services/api";
import "./preferences.css";

/*
  Features page: lightweight UI to stream a song by ID using ranged HTTP
  requests and the MediaSource Extensions (MSE) API.

  Flow summary:
  1. Create a `MediaSource` and attach it to an `<audio>` element via an
    object URL.
  2. Create a `SourceBuffer` for the expected audio MIME type.
  3. Repeatedly fetch byte ranges from the backend (`/songs/{id}/stream`) using
    the `Range` header and append the received ArrayBuffer chunks to the
    `SourceBuffer`.
  4. When the server indicates the final byte (via `Content-Range`/`Content-Length`),
    call `mediaSource.endOfStream()` on the `updateend` event so the player
    knows the stream is complete.

  Notes / assumptions:
  - The backend supports `Range` requests and returns `Content-Range` and
   `Accept-Ranges` headers (partial content responses).
  - The example uses `audio/mpeg` as the MIME type; change if your backend
   serves a different codec/container.
*/

export default function Features() {
  const [songId, setSongId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Reference to the audio element used for playback.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Active MediaSource (MSE) instance attached to the audio element.
  const mediaSourceRef = useRef<MediaSource | null>(null);
  // The SourceBuffer we append decoded audio bytes into.
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  // Object URL for the MediaSource created via URL.createObjectURL.
  const objectUrlRef = useRef<string | null>(null);
  // Byte offset of the next chunk to request from the backend.
  const currentStartRef = useRef<number>(0);
  // Total resource size in bytes (populated from Content-Range or Content-Length).
  const totalSizeRef = useRef<number | null>(null);
  // Marked true when we've fetched the final chunk.
  const isEndedRef = useRef<boolean>(false);
  // Simple fetch lock to ensure only one concurrent range request.
  const isFetchingRef = useRef<boolean>(false); // ✅ fetch lock

  const CHUNK_SIZE = 1_000_000;

  useEffect(() => {
    return () => {
      cleanupStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupStream = () => {
    // Cleanup resources: stop playback, remove src, revoke object URL,
    // and reset internal refs/state so a new stream can start cleanly.
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      mediaSourceRef.current = null;
      sourceBufferRef.current = null;
      currentStartRef.current = 0;
      totalSizeRef.current = null;
      isEndedRef.current = false;
      isFetchingRef.current = false; // ✅ reset lock
    } catch (e) {
      console.error("cleanupStream error:", e);
    }
  };

  /**
   * fetchAndAppendNext
   * - Requests the next byte range from the backend using `fetchSongRange`.
   * - Parses `Content-Range` or `Content-Length` to discover the total size.
   * - Appends the received bytes to the SourceBuffer.
   * - When the final chunk is detected, marks `isEndedRef` and registers a
   *   final `updateend` listener to call `mediaSource.endOfStream()` once the
   *   last append finishes.
   */

  const fetchAndAppendNext = async () => {
    // ✅ Only one fetch at a time
    if (isFetchingRef.current) return;
    if (isEndedRef.current) return;
    if (!sourceBufferRef.current || sourceBufferRef.current.updating) return;

    // ✅ Don't fetch past end of file
    if (
      totalSizeRef.current !== null &&
      currentStartRef.current >= totalSizeRef.current
    )
      return;

    isFetchingRef.current = true; // ✅ lock

    const start = currentStartRef.current;
    let end = start + CHUNK_SIZE - 1;
    if (totalSizeRef.current && end > totalSizeRef.current - 1) {
      end = totalSizeRef.current - 1;
    }

    try {
      console.log(`Fetching bytes ${start}-${end}`); // helpful for debugging
      const res = await fetchSongRange(songId.trim(), start, end);
      console.log("Content-Range:", res.contentRange);
      console.log("Content-Length:", res.contentLength);
      console.log("Buffer size received:", res.data.byteLength);
      const buffer = res.data;

      if (res.contentRange) {
        const parts = res.contentRange.split("/");
        const total = parts[1] ? parseInt(parts[1], 10) : NaN;
        if (!isNaN(total)) totalSizeRef.current = total;
      } else if (res.contentLength && !totalSizeRef.current) {
        const maybe = parseInt(res.contentLength, 10);
        if (!isNaN(maybe)) totalSizeRef.current = maybe;
      }

      currentStartRef.current += buffer.byteLength;

      const isLastChunk =
        totalSizeRef.current !== null &&
        currentStartRef.current >= totalSizeRef.current;

      if (isLastChunk) {
        isEndedRef.current = true;
      }

      // ✅ Guard: sourceBuffer might have been cleared during async fetch
      if (!sourceBufferRef.current || !mediaSourceRef.current) {
        isFetchingRef.current = false;
        return;
      }

      if (isLastChunk) {
        const sb = sourceBufferRef.current;
        const onFinalUpdateEnd = () => {
          sb.removeEventListener("updateend", onFinalUpdateEnd);
          if (
            mediaSourceRef.current &&
            mediaSourceRef.current.readyState === "open"
          ) {
            try {
              mediaSourceRef.current.endOfStream();
              console.log("endOfStream called ✅");
            } catch (e) {
              console.error("endOfStream error:", e);
            }
          }
        };
        sb.addEventListener("updateend", onFinalUpdateEnd);
      }

      sourceBufferRef.current.appendBuffer(new Uint8Array(buffer));
    } catch (err) {
      console.error("fetchAndAppendNext error:", err);
      setError("Error fetching audio chunk");
    } finally {
      isFetchingRef.current = false; // ✅ always release lock
    }
  };

  const handlePlay = async () => {
    /**
     * handlePlay
     * - Validates the song ID, creates a MediaSource, and attaches it to the
     *   `<audio>` element via an object URL.
     * - On `sourceopen` it creates a SourceBuffer and sets up listeners
     *   (`updateend`, `waiting`) to continue fetching chunks as playback
     *   progresses or stalls.
     * - Starts by fetching the first chunk and then calls `play()`.
     */
    if (!songId) {
      setError("Please enter a song id");
      return;
    }

    setError(null);
    setLoading(true);
    cleanupStream();

    try {
      const ms = new MediaSource();
      mediaSourceRef.current = ms;
      const url = URL.createObjectURL(ms);
      objectUrlRef.current = url;

      if (audioRef.current) {
        audioRef.current.src = url;
      }

      ms.addEventListener("sourceopen", async () => {
        if (!ms) return;
        try {
          const sb = ms.addSourceBuffer("audio/mpeg");
          sourceBufferRef.current = sb;

          // ✅ updateend — fetch next chunk after each append
          sb.addEventListener("updateend", () => {
            if (!isEndedRef.current) {
              fetchAndAppendNext();
            }
          });

          // ✅ waiting — re-trigger if playback stalls
          audioRef.current?.addEventListener("waiting", () => {
            if (!isEndedRef.current) {
              fetchAndAppendNext();
            }
          });

          await fetchAndAppendNext();
          setTimeout(() => audioRef.current?.play(), 200);
        } catch (err) {
          console.error("SourceBuffer creation error:", err);
          setError("Failed to create SourceBuffer for this MIME type");
        }
      });
    } catch (err) {
      console.error("handlePlay error:", err);
      setError("Failed to start streaming");
    } finally {
      setLoading(false);
    }
  };

  /**
   * handleStop
   * - Stops playback and frees streaming resources by delegating to
   *   `cleanupStream`.
   */

  const handleStop = () => {
    cleanupStream();
  };

  return (
    <div className="preferences-container" style={{ padding: "2rem" }}>
      <h2>Features — Stream Song (Range)</h2>
      <p>
        Enter a song ID and click Play to stream via ranged requests to /songs/
        {"{song_id}"}/stream.
      </p>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Song ID"
          value={songId}
          onChange={(e) => setSongId(e.target.value)}
          style={{ padding: "0.5rem", flex: "0 0 220px" }}
        />
        <button onClick={handlePlay} disabled={loading} className="btn-signup">
          {loading ? "Loading..." : "Play"}
        </button>
        <button
          onClick={handleStop}
          className="btn-signup"
          style={{ background: "#e04f5f" }}
        >
          Stop
        </button>
      </div>
      {error && <p style={{ color: "red", marginTop: "0.75rem" }}>{error}</p>}
      <div style={{ marginTop: "1rem" }}>
        <audio ref={audioRef} controls style={{ width: "100%" }} />
      </div>
    </div>
  );
}
