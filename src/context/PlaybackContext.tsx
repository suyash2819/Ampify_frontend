import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Song } from "../services/api";
import { useAudioStreaming } from "../hooks/useAudioStreaming";

interface PlaybackNotification {
  id: number;
  type: "error" | "info";
  message: string;
}

interface PlaybackContextValue {
  // Queue
  queue: Song[];
  enqueue: (song: Song) => void;
  removeAt: (index: number) => void;
  move: (from: number, to: number) => void;
  clearQueue: () => void;

  // Playback
  audioRef: React.RefObject<HTMLAudioElement>;
  currentSong: Song | null;
  isPlaying: boolean;
  playbackProgress: number;
  playbackDuration: number;
  /** Starts playing a song (or toggles play/pause if it's already current). Auto-queues it if the queue is empty. */
  playSong: (song: Song) => void;
  seekTo: (seconds: number) => void;

  /** Fires once per playback event (streaming errors, "now playing" messages) so pages can surface a toast. */
  notification: PlaybackNotification | null;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export const PlaybackProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [notification, setNotification] = useState<PlaybackNotification | null>(
    null,
  );
  const notifyIdRef = useRef(0);

  const notify = useCallback((type: PlaybackNotification["type"], message: string) => {
    notifyIdRef.current += 1;
    setNotification({ id: notifyIdRef.current, type, message });
  }, []);

  const handleError = useCallback((msg: string) => notify("error", msg), [notify]);
  const handleInfo = useCallback((msg: string) => notify("info", msg), [notify]);

  const {
    audioRef,
    currentlyPlayingSongId,
    isPlaying,
    handlePlaySong,
    handleAudioEnded,
  } = useAudioStreaming(handleError, handleInfo);

  const enqueue = useCallback((song: Song) => {
    setQueue((prev) => [...prev, song]);
  }, []);

  const removeAt = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const move = useCallback((from: number, to: number) => {
    setQueue((prev) => {
      if (from < 0 || from >= prev.length) return prev;
      if (to < 0) to = 0;
      if (to >= prev.length) to = prev.length - 1;
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }, []);

  const clearQueue = useCallback(() => setQueue([]), []);

  const playSong = useCallback(
    (song: Song) => {
      setCurrentSong(song);
      setQueue((prev) => {
        if (currentlyPlayingSongId !== song.id && prev.length === 0) {
          return [song];
        }
        return prev;
      });
      handlePlaySong(song);
    },
    [currentlyPlayingSongId, handlePlaySong],
  );

  // Auto-advance to the next queued song when the current one finishes.
  const handleEnded = useCallback(() => {
    const currentIndex = queue.findIndex((q) => q.id === currentlyPlayingSongId);
    const newQueue = [...queue];
    if (currentIndex !== -1) newQueue.splice(currentIndex, 1);
    const next = newQueue.length > 0 ? newQueue[0] : undefined;

    if (currentIndex !== -1) removeAt(currentIndex);

    if (next) {
      setCurrentSong(next);
      handlePlaySong(next);
      notify("info", `Now playing: ${next.title}`);
    } else {
      handleAudioEnded();
    }
  }, [queue, currentlyPlayingSongId, removeAt, handlePlaySong, handleAudioEnded, notify]);

  // Progress tracking for the global player bar.
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updatePlaybackState = () => {
      setPlaybackProgress(audio.currentTime);
      setPlaybackDuration(audio.duration || 0);
    };

    const intervalId = window.setInterval(() => {
      if (!audio.paused && !audio.ended) {
        updatePlaybackState();
      }
    }, 100);

    audio.addEventListener("timeupdate", updatePlaybackState);
    audio.addEventListener("loadedmetadata", updatePlaybackState);
    audio.addEventListener("durationchange", updatePlaybackState);
    audio.addEventListener("play", updatePlaybackState);
    audio.addEventListener("playing", updatePlaybackState);
    audio.addEventListener("pause", updatePlaybackState);
    audio.addEventListener("ended", updatePlaybackState);

    updatePlaybackState();

    return () => {
      window.clearInterval(intervalId);
      audio.removeEventListener("timeupdate", updatePlaybackState);
      audio.removeEventListener("loadedmetadata", updatePlaybackState);
      audio.removeEventListener("durationchange", updatePlaybackState);
      audio.removeEventListener("play", updatePlaybackState);
      audio.removeEventListener("playing", updatePlaybackState);
      audio.removeEventListener("pause", updatePlaybackState);
      audio.removeEventListener("ended", updatePlaybackState);
    };
  }, [audioRef, currentSong?.id]);

  useEffect(() => {
    setPlaybackProgress(0);
    setPlaybackDuration(0);
  }, [currentSong?.id]);

  const seekTo = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = seconds;
    },
    [audioRef],
  );

  return (
    <PlaybackContext.Provider
      value={{
        queue,
        enqueue,
        removeAt,
        move,
        clearQueue,
        audioRef,
        currentSong,
        isPlaying,
        playbackProgress,
        playbackDuration,
        playSong,
        seekTo,
        notification,
      }}
    >
      {children}
      {/* Mounted once, globally, so playback survives navigation between pages. */}
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        crossOrigin="anonymous"
        style={{ display: "none" }}
      />
    </PlaybackContext.Provider>
  );
};

export const usePlayback = (): PlaybackContextValue => {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error("usePlayback must be used within a PlaybackProvider");
  return ctx;
};

export default PlaybackContext;
