import React, { createContext, useContext, useState, useCallback } from "react";
import { Song } from "../services/api";

interface PlaybackQueueContextValue {
  queue: Song[];
  enqueue: (song: Song) => void;
  removeAt: (index: number) => void;
  move: (from: number, to: number) => void;
  dequeue: () => Song | undefined;
  peek: () => Song | undefined;
  clear: () => void;
}

const PlaybackQueueContext = createContext<PlaybackQueueContextValue | null>(
  null,
);

export const PlaybackQueueProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const [queue, setQueue] = useState<Song[]>([]);

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

  const dequeue = useCallback((): Song | undefined => {
    let item: Song | undefined;
    setQueue((prev) => {
      if (prev.length === 0) return prev;
      item = prev[0];
      return prev.slice(1);
    });
    return item;
  }, []);

  const peek = useCallback(() => (queue.length > 0 ? queue[0] : undefined), [queue]);

  const clear = useCallback(() => setQueue([]), []);

  return (
    <PlaybackQueueContext.Provider
      value={{ queue, enqueue, removeAt, move, dequeue, peek, clear }}
    >
      {children}
    </PlaybackQueueContext.Provider>
  );
};

export const usePlaybackQueue = (): PlaybackQueueContextValue => {
  const ctx = useContext(PlaybackQueueContext);
  if (!ctx) throw new Error("usePlaybackQueue must be used within provider");
  return ctx;
};

export default PlaybackQueueContext;
