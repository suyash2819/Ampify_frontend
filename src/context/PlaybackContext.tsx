import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  getPlaybackQueue,
  PlayEvent,
  PlaybackQueuePayload,
  savePlaybackQueue,
  Song,
  sendPlayEvents,
} from "../services/api";
import { useAuth } from "./AuthContext";
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
  playQueuedSong: (index: number) => void;
  removeAt: (index: number) => void;
  move: (from: number, to: number) => void;
  clearQueue: () => void;
  skipCurrentSong: () => void;

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

interface ActivePlayback {
  song: Song;
  startedAt: string;
  source: "user" | "agent";
}

const isPlayEvent = (value: unknown): value is PlayEvent => {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Partial<PlayEvent>;
  return (
    typeof event.event_id === "string" &&
    event.type === "play_ended" &&
    typeof event.track_id === "string" &&
    typeof event.started_at === "string" &&
    typeof event.ms_played === "number" &&
    typeof event.track_duration_ms === "number" &&
    (event.end_reason === "finished" ||
      event.end_reason === "skipped" ||
      event.end_reason === "closed" ||
      event.end_reason === "error") &&
    typeof event.session_id === "string" &&
    typeof event.device === "string"
  );
};

const createPlaybackId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getTrackDurationMs = (
  song: Song,
  audio: HTMLAudioElement | null,
): number => {
  if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
    return Math.round(audio.duration * 1000);
  }

  const duration = song.duration?.trim();
  if (!duration) return 0;
  const numericDuration = Number(duration);
  if (Number.isFinite(numericDuration) && numericDuration > 0) {
    return Math.round(numericDuration * 1000);
  }
  const parts = duration.split(":").map(Number);
  if (parts.every(Number.isFinite)) {
    return Math.round(
      parts.reduce((seconds, part) => seconds * 60 + part, 0) * 1000,
    );
  }
  return 0;
};

const getNextQueuedSong = (
  queue: Song[],
  currentSongId: string,
): { next: Song | undefined; remaining: Song[] } => {
  const currentIndex = queue.findIndex((song) => song.id === currentSongId);
  const nextIndex = currentIndex === -1 ? 0 : currentIndex + 1;
  return {
    next: queue[nextIndex],
    remaining: queue.slice(nextIndex + 1),
  };
};

export const PlaybackProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const { authToken, user, isLoading: authLoading } = useAuth();
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queueLoaded, setQueueLoaded] = useState(false);
  const [notification, setNotification] = useState<PlaybackNotification | null>(
    null,
  );
  const notifyIdRef = useRef(0);
  const restoredPositionRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const pendingEmptyQueueSaveRef = useRef(false);
  const previousQueueStateRef = useRef<{
    authToken: string | null;
    nonEmpty: boolean;
  }>({ authToken: null, nonEmpty: false });
  const activePlaybackRef = useRef<ActivePlayback | null>(null);
  const eventBufferRef = useRef<PlayEvent[]>([]);
  const eventStorageKeyRef = useRef<string | null>(null);
  const eventFlushInFlightRef = useRef(false);
  const flushAfterInFlightRef = useRef(false);
  const playSourceRef = useRef<"user" | "agent">("user");
  const sessionIdRef = useRef<string | null>(null);
  const queueInstanceIdRef = useRef<string | null>(null);
  if (!sessionIdRef.current) sessionIdRef.current = createPlaybackId();
  if (!queueInstanceIdRef.current) queueInstanceIdRef.current = createPlaybackId();
  const queueSnapshotRef = useRef<PlaybackQueuePayload>({
    version: 1,
    songIds: [],
    currentSongId: null,
    positionSeconds: 0,
    updatedAt: "",
  });

  const notify = useCallback(
    (type: PlaybackNotification["type"], message: string) => {
      notifyIdRef.current += 1;
      setNotification({ id: notifyIdRef.current, type, message });
    },
    [],
  );

  const handleError = useCallback(
    (msg: string) => notify("error", msg),
    [notify],
  );
  const handleInfo = useCallback(
    (msg: string) => notify("info", msg),
    [notify],
  );

  const {
    audioRef,
    currentlyPlayingSongId,
    isPlaying,
    handlePlaySong,
    handleAudioEnded,
    stopPlayback,
  } = useAudioStreaming(handleError, handleInfo);

  const flushPlayEvents = useCallback(
    async (keepalive = false) => {
      if (
        !authToken ||
        !eventStorageKeyRef.current ||
        eventBufferRef.current.length === 0
      ) {
        return;
      }
      if (eventFlushInFlightRef.current) {
        if (keepalive) flushAfterInFlightRef.current = true;
        return;
      }

      const storageKey = eventStorageKeyRef.current;
      const batch = eventBufferRef.current.slice(0, 20);
      let succeeded = false;
      eventFlushInFlightRef.current = true;
      try {
        await sendPlayEvents(batch, true);
        succeeded = true;
      } catch (error) {
        console.error("Failed to send playback events:", error);
      } finally {
        if (succeeded && eventStorageKeyRef.current === storageKey) {
          const sentEventIds = new Set(batch.map((event) => event.event_id));
          eventBufferRef.current = eventBufferRef.current.filter(
            (event) => !sentEventIds.has(event.event_id),
          );
          try {
            localStorage.setItem(
              storageKey,
              JSON.stringify(eventBufferRef.current),
            );
          } catch (error) {
            console.error("Failed to update stored playback events:", error);
          }
        }
        eventFlushInFlightRef.current = false;
        const flushAfterInFlight = flushAfterInFlightRef.current;
        flushAfterInFlightRef.current = false;
        if (succeeded && eventBufferRef.current.length > 0) {
          void flushPlayEvents(flushAfterInFlight);
        }
      }
    },
    [authToken],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!authToken || !user?.id) {
      eventStorageKeyRef.current = null;
      eventBufferRef.current = [];
      return;
    }

    const storageKey = `ampify:play-events:${user.id}`;
    eventStorageKeyRef.current = storageKey;
    eventBufferRef.current = [];

    try {
      const storedEvents = localStorage.getItem(storageKey);
      if (storedEvents) {
        const parsed: unknown = JSON.parse(storedEvents);
        if (!Array.isArray(parsed) || !parsed.every(isPlayEvent)) {
          throw new Error("Stored playback events have an invalid format");
        }
        eventBufferRef.current = parsed;
      }
    } catch (error) {
      console.error("Failed to restore stored playback events:", error);
    }

    if (eventBufferRef.current.length > 0) {
      void flushPlayEvents();
    }
  }, [authLoading, authToken, user?.id, flushPlayEvents]);

  const finishActivePlayback = useCallback(
    (endReason: PlayEvent["end_reason"]) => {
      const active = activePlaybackRef.current;
      if (!active) return;

      activePlaybackRef.current = null;
      if (!authToken) return;

      const audio = audioRef.current;
      const event: PlayEvent = {
        event_id: createPlaybackId(),
        type: "play_ended",
        track_id: active.song.id,
        started_at: active.startedAt,
        ms_played:
          audio && Number.isFinite(audio.currentTime)
            ? Math.max(0, Math.round(audio.currentTime * 1000))
            : 0,
        track_duration_ms: getTrackDurationMs(active.song, audio),
        end_reason: endReason,
        source: active.source,
        session_id: sessionIdRef.current!,
        device: "web",
        queue_instance_id: queueInstanceIdRef.current!,
        app_version: import.meta.env.VITE_APP_VERSION || "0.0.0",
      };
      eventBufferRef.current.push(event);
      const storageKey = eventStorageKeyRef.current;
      if (storageKey) {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify(eventBufferRef.current),
          );
        } catch (error) {
          console.error("Failed to store playback events:", error);
        }
      }
      if (eventBufferRef.current.length >= 20) {
        void flushPlayEvents();
      }
    },
    [audioRef, authToken, flushPlayEvents],
  );

  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlaying = () => {
      const song = currentSongRef.current;
      if (!song || activePlaybackRef.current?.song.id === song.id) return;
      activePlaybackRef.current = {
        song,
        startedAt: new Date().toISOString(),
        source: playSourceRef.current,
      };
    };
    const handleAudioError = () => finishActivePlayback("error");
    const handlePageHide = () => {
      if (!audio.paused && !audio.ended) {
        finishActivePlayback("closed");
      }
      void flushPlayEvents(true);
    };

    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("error", handleAudioError);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("error", handleAudioError);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [audioRef, finishActivePlayback, flushPlayEvents]);

  useEffect(() => {
    if (!authToken) return;
    const intervalId = window.setInterval(() => {
      void flushPlayEvents();
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [authToken, flushPlayEvents]);

  useEffect(() => {
    if (authLoading) return;

    if (!authToken) {
      setQueue([]);
      setCurrentSong(null);
      restoredPositionRef.current = 0;
      setQueueLoaded(false);
      return;
    }

    let isActive = true;
    setQueueLoaded(false);

    getPlaybackQueue()
      .then((snapshot) => {
        if (!isActive) return;

        if (
          !snapshot ||
          !Array.isArray(snapshot.songIds) ||
          !Array.isArray(snapshot.songs)
        ) {
          setQueue([]);
          setCurrentSong(null);
          restoredPositionRef.current = 0;
          return;
        }

        const songsById = new Map(
          snapshot.songs.map((song) => [song.id, song]),
        );
        setQueue(
          snapshot.songIds
            .map((songId) => songsById.get(songId))
            .filter((song): song is Song => song !== undefined),
        );
        setCurrentSong(
          snapshot.currentSongId
            ? (songsById.get(snapshot.currentSongId) ?? null)
            : null,
        );
        restoredPositionRef.current = Number.isFinite(snapshot.positionSeconds)
          ? Math.max(0, snapshot.positionSeconds)
          : 0;
      })
      .catch((error) => {
        console.error("Failed to load playback queue:", error);
        if (isActive) {
          setQueue([]);
          setCurrentSong(null);
          restoredPositionRef.current = 0;
        }
      })
      .finally(() => {
        if (isActive) setQueueLoaded(true);
      });

    return () => {
      isActive = false;
    };
  }, [authToken, authLoading]);

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
      if (activePlaybackRef.current?.song.id !== song.id) {
        finishActivePlayback("skipped");
      }
      if (currentSong?.id !== song.id) {
        playSourceRef.current = "user";
        restoredPositionRef.current = 0;
      }
      setCurrentSong(song);
      setQueue((prev) => {
        const remaining =
          currentSong?.id === song.id
            ? prev
            : prev.filter((queuedSong) => queuedSong.id !== currentSong?.id);
        if (currentlyPlayingSongId !== song.id && remaining.length === 0) {
          return [song];
        }
        return remaining;
      });
      handlePlaySong(song);
    },
    [
      currentlyPlayingSongId,
      currentSong?.id,
      finishActivePlayback,
      handlePlaySong,
    ],
  );

  const playQueuedSong = useCallback(
    (index: number) => {
      const song = queue[index];
      if (!song) return;

      if (activePlaybackRef.current?.song.id !== song.id) {
        finishActivePlayback("skipped");
        playSourceRef.current = "user";
        restoredPositionRef.current = 0;
      }
      setQueue((prev) =>
        prev.filter(
          (queuedSong, queueIndex) =>
            queueIndex !== index && queuedSong.id !== currentSong?.id,
        ),
      );
      setCurrentSong(song);
      handlePlaySong(song);
    },
    [queue, currentSong?.id, finishActivePlayback, handlePlaySong],
  );

  const skipCurrentSong = useCallback(() => {
    if (!currentSong) return;
    finishActivePlayback("skipped");

    const { next, remaining } = getNextQueuedSong(queue, currentSong.id);
    setQueue(remaining);

    if (next) {
      restoredPositionRef.current = 0;
      playSourceRef.current = "agent";
      setCurrentSong(next);
      handlePlaySong(next);
      notify("info", `Now playing: ${next.title}`);
    } else {
      stopPlayback();
    }
  }, [
    currentSong,
    finishActivePlayback,
    handlePlaySong,
    notify,
    queue,
    stopPlayback,
  ]);

  // Auto-advance to the next queued song when the current one finishes.
  const handleEnded = useCallback(() => {
    finishActivePlayback("finished");
    const currentId = currentlyPlayingSongId ?? currentSong?.id;
    const { next, remaining } = currentId
      ? getNextQueuedSong(queue, currentId)
      : { next: queue[0], remaining: queue.slice(1) };
    setQueue(remaining);

    if (next) {
      restoredPositionRef.current = 0;
      playSourceRef.current = "agent";
      setCurrentSong(next);
      handlePlaySong(next);
      notify("info", `Now playing: ${next.title}`);
    } else {
      handleAudioEnded();
    }
  }, [
    queue,
    currentlyPlayingSongId,
    currentSong?.id,
    finishActivePlayback,
    handlePlaySong,
    handleAudioEnded,
    notify,
  ]);

  // Progress tracking for the global player bar.
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  const activePosition =
    currentSong && currentlyPlayingSongId === currentSong.id
      ? (audioRef.current?.currentTime ?? playbackProgress)
      : restoredPositionRef.current;
  queueSnapshotRef.current = {
    version: 1,
    songIds: queue.map((song) => song.id),
    currentSongId: currentSong?.id ?? currentlyPlayingSongId,
    positionSeconds: Number.isFinite(activePosition)
      ? Math.max(0, activePosition)
      : 0,
    updatedAt: "",
  };

  const persistQueue = useCallback(async (allowEmpty = false) => {
    if (!authToken || !queueLoaded) return;
    if (saveInFlightRef.current) {
      if (allowEmpty) pendingEmptyQueueSaveRef.current = true;
      return;
    }
    if (!allowEmpty && queueSnapshotRef.current.songIds.length === 0) return;

    saveInFlightRef.current = true;
    try {
      await savePlaybackQueue({
        ...queueSnapshotRef.current,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to save playback queue:", error);
    } finally {
      saveInFlightRef.current = false;
      if (pendingEmptyQueueSaveRef.current) {
        pendingEmptyQueueSaveRef.current = false;
        void persistQueue(true);
      }
    }
  }, [authToken, queueLoaded]);

  useEffect(() => {
    if (authLoading || !authToken || !queueLoaded) return;

    const timeoutId = window.setTimeout(() => void persistQueue(), 20_000);
    return () => window.clearTimeout(timeoutId);
  }, [
    authToken,
    authLoading,
    queueLoaded,
    queue,
    currentSong?.id,
    persistQueue,
  ]);

  useEffect(() => {
    if (authLoading || !authToken || !queueLoaded) return;

    const intervalId = window.setInterval(() => void persistQueue(), 20_000);
    return () => window.clearInterval(intervalId);
  }, [authToken, authLoading, queueLoaded, persistQueue]);

  useEffect(() => {
    if (authLoading || !authToken || !queueLoaded) return;

    const previous = previousQueueStateRef.current;
    const isNonEmpty = queue.length > 0;
    if (previous.authToken !== authToken) {
      previousQueueStateRef.current = { authToken, nonEmpty: isNonEmpty };
      return;
    }

    const wasNonEmpty = previous.nonEmpty;
    previous.nonEmpty = isNonEmpty;
    if (wasNonEmpty && !isNonEmpty) void persistQueue(true);
  }, [authLoading, authToken, queueLoaded, queue, persistQueue]);

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
        playQueuedSong,
        removeAt,
        move,
        clearQueue,
        skipCurrentSong,
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
  if (!ctx)
    throw new Error("usePlayback must be used within a PlaybackProvider");
  return ctx;
};

export default PlaybackContext;
