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
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const currentStartRef = useRef<number>(0);
  const totalSizeRef = useRef<number | null>(null);
  const isEndedRef = useRef<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);

  // Cleanup stream resources
  const cleanupStream = useCallback(() => {
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

  // Fetch and append next chunk
  const fetchAndAppendNext = useCallback(
    async (songId: string) => {
      if (isFetchingRef.current) return;
      if (isEndedRef.current) return;
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
        const res = await fetchSongRange(songId, start, end);
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
      setCurrentlyPlayingSongId(song.id);
      setIsPlaying(false);

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

            // Fetch next chunk after each append
            sb.addEventListener("updateend", () => {
              if (!isEndedRef.current) {
                fetchAndAppendNext(song.id);
              }
            });

            // Re-trigger if playback stalls
            audioRef.current?.addEventListener("waiting", () => {
              if (!isEndedRef.current) {
                fetchAndAppendNext(song.id);
              }
            });

            await fetchAndAppendNext(song.id);
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
        });
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

  return {
    audioRef,
    currentlyPlayingSongId,
    isPlaying,
    handlePlaySong,
    handleAudioEnded,
    cleanupStream,
  };
};
