import { useState, useEffect, useRef, useCallback } from "react";
import { fetchSongRange, Song } from "../services/api";

const CHUNK_SIZE = 1_000_000;

interface UseAudioStreamingReturn {
  audioRef: React.RefObject<HTMLAudioElement>;
  currentlyPlayingSongId: string | null;
  isPlaying: boolean;
  handlePlaySong: (song: Song) => Promise<void>;
  handleAudioEnded: () => void;
  cleanupStream: () => void;
}

export const useAudioStreaming = (
  onError?: (error: string) => void,
  onSuccess?: (message: string) => void,
): UseAudioStreamingReturn => {
  // Music player states
  const [currentlyPlayingSongId, setCurrentlyPlayingSongId] = useState<
    string | null
  >(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null!);

  // Streaming references
  // We use refs for mutable streaming state that should not trigger re-renders.
  const mediaSourceRef = useRef<MediaSource | null>(null); // current MediaSource for the active stream
  const sourceBufferRef = useRef<SourceBuffer | null>(null); // buffer for appending audio chunks
  const objectUrlRef = useRef<string | null>(null); // object URL assigned to the audio element
  const currentStartRef = useRef<number>(0); // next byte offset to request from the server
  const totalSizeRef = useRef<number | null>(null); // total audio size of the current song
  const isEndedRef = useRef<boolean>(false); // whether streaming has reached the end
  const isFetchingRef = useRef<boolean>(false); // whether a chunk fetch is currently in progress
  const currentSongIdRef = useRef<string | null>(null); // ID of the song currently being streamed
  const fetchAbortControllerRef = useRef<AbortController | null>(null); // abort controller for in-flight fetch requests
  const mediaSourceOpenListenerRef = useRef<
    ((this: MediaSource, ev: Event) => void) | null
  >(null); // stored listener so it can be removed on cleanup
  const sourceBufferUpdateEndListenerRef = useRef<
    ((this: SourceBuffer, ev: Event) => void) | null
  >(null); // stored updateend listener for normal buffering
  const sourceBufferFinalUpdateEndListenerRef = useRef<
    ((this: SourceBuffer, ev: Event) => void) | null
  >(null); // stored listener for the final chunk end-of-stream
  const waitingListenerRef = useRef<(() => void) | null>(null); // stored audio waiting listener for retrying fetches

  // Cleanup stream resources
  // This resets the audio element, removes event listeners, aborts any outstanding
  // fetches, and clears MediaSource / SourceBuffer state so the next song can start fresh.
  const cleanupStream = useCallback(() => {
    try {
      if (audioRef.current) {
        if (waitingListenerRef.current) {
          audioRef.current.removeEventListener(
            "waiting",
            waitingListenerRef.current,
          );
          waitingListenerRef.current = null;
        }
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }

      if (sourceBufferRef.current) {
        if (sourceBufferUpdateEndListenerRef.current) {
          sourceBufferRef.current.removeEventListener(
            "updateend",
            sourceBufferUpdateEndListenerRef.current,
          );
          sourceBufferUpdateEndListenerRef.current = null;
        }
        if (sourceBufferFinalUpdateEndListenerRef.current) {
          sourceBufferRef.current.removeEventListener(
            "updateend",
            sourceBufferFinalUpdateEndListenerRef.current,
          );
          sourceBufferFinalUpdateEndListenerRef.current = null;
        }
      }

      if (mediaSourceRef.current && mediaSourceOpenListenerRef.current) {
        mediaSourceRef.current.removeEventListener(
          "sourceopen",
          mediaSourceOpenListenerRef.current,
        );
        mediaSourceOpenListenerRef.current = null;
      }

      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
        fetchAbortControllerRef.current = null;
      }

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      mediaSourceRef.current = null;
      sourceBufferRef.current = null;
      currentSongIdRef.current = null;
      currentStartRef.current = 0;
      totalSizeRef.current = null;
      isEndedRef.current = false;
      isFetchingRef.current = false;
    } catch (e) {
      console.error("cleanupStream error:", e);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  // Fetch and append the next audio chunk for the current song.
  // This is called by the source buffer update cycle and when playback stalls.
  const fetchAndAppendNext = useCallback(
    async (songId: string, signal?: AbortSignal) => {
      if (isFetchingRef.current) return;
      if (isEndedRef.current) return;
      if (currentSongIdRef.current !== songId) return;
      if (!sourceBufferRef.current || sourceBufferRef.current.updating) return;

      if (
        totalSizeRef.current !== null &&
        currentStartRef.current >= totalSizeRef.current
      )
        return;

      isFetchingRef.current = true;

      const start = currentStartRef.current;
      let end = start + CHUNK_SIZE - 1;
      if (totalSizeRef.current && end > totalSizeRef.current - 1) {
        end = totalSizeRef.current - 1;
      }

      try {
        console.log(`Fetching bytes ${start}-${end}`);
        const res = await fetchSongRange(songId, start, end, signal);
        if (signal?.aborted) return;

        console.log("Content-Range:", res.contentRange);
        console.log("Content-Length:", res.contentLength);
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

        if (currentSongIdRef.current !== songId) return;
        if (!sourceBufferRef.current || !mediaSourceRef.current) {
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
          sourceBufferFinalUpdateEndListenerRef.current = onFinalUpdateEnd;
          sb.addEventListener("updateend", onFinalUpdateEnd);
        }

        sourceBufferRef.current.appendBuffer(new Uint8Array(buffer));
      } catch (err) {
        if ((err as any)?.name === "AbortError") return;
        console.error("fetchAndAppendNext error:", err);
        if (onError) {
          onError("Error streaming song");
        }
      } finally {
        isFetchingRef.current = false;
      }
    },
    [onError],
  );

  // Music playback handler
  // Plays a new song stream, or toggles play/pause for the current song.
  const handlePlaySong = useCallback(
    async (song: Song) => {
      if (!audioRef.current) return;

      // If clicking the same song, toggle play/pause
      if (currentlyPlayingSongId === song.id) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play();
          setIsPlaying(true);
        }
        return;
      }

      // Stop current stream and play new song
      cleanupStream();
      currentSongIdRef.current = song.id;
      setCurrentlyPlayingSongId(song.id);
      setIsPlaying(false);
      fetchAbortControllerRef.current = new AbortController();

      try {
        const ms = new MediaSource();
        mediaSourceRef.current = ms;
        const url = URL.createObjectURL(ms);
        objectUrlRef.current = url;

        if (audioRef.current) {
          audioRef.current.src = url;
        }

        const onSourceOpen = async () => {
          if (!ms) return;
          try {
            const sb = ms.addSourceBuffer("audio/mpeg");
            sourceBufferRef.current = sb;

            const onBufferUpdateEnd = () => {
              if (!isEndedRef.current) {
                fetchAndAppendNext(
                  song.id,
                  fetchAbortControllerRef.current?.signal,
                );
              }
            };
            sourceBufferUpdateEndListenerRef.current = onBufferUpdateEnd;
            sb.addEventListener("updateend", onBufferUpdateEnd);

            const onWaiting = () => {
              if (!isEndedRef.current) {
                fetchAndAppendNext(
                  song.id,
                  fetchAbortControllerRef.current?.signal,
                );
              }
            };
            waitingListenerRef.current = onWaiting;
            audioRef.current?.addEventListener("waiting", onWaiting);

            await fetchAndAppendNext(
              song.id,
              fetchAbortControllerRef.current?.signal,
            );
            setTimeout(() => {
              audioRef.current?.play();
              setIsPlaying(true);
            }, 200);
            if (onSuccess) {
              onSuccess(`Now playing: ${song.title}`);
            }
          } catch (err) {
            console.error("SourceBuffer creation error:", err);
            if (onError) {
              onError("Failed to create SourceBuffer for this MIME type");
            }
          }
        };

        mediaSourceOpenListenerRef.current = onSourceOpen;
        ms.addEventListener("sourceopen", onSourceOpen);
      } catch (err) {
        console.error("handlePlaySong error:", err);
        if (onError) {
          onError("Failed to start streaming");
        }
      }
    },
    [
      currentlyPlayingSongId,
      isPlaying,
      cleanupStream,
      fetchAndAppendNext,
      onError,
      onSuccess,
    ],
  );

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Expose playback state and controls to the consuming component.
  return {
    audioRef,
    currentlyPlayingSongId,
    isPlaying,
    handlePlaySong,
    handleAudioEnded,
    cleanupStream,
  };
};
