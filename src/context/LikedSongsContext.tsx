import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  Song,
  Playlist,
  getLikedSongsPlaylist,
  getLikedSongIds,
  addSongToPlaylist,
  removeSongFromPlaylist,
} from "../services/api";
import { useAuth } from "./AuthContext";

interface LikedSongsContextValue {
  /** IDs of all liked songs */
  likedIds: Set<string>;
  /** The Liked Songs playlist (undefined while loading) */
  likedPlaylist: Playlist | undefined;
  /** True while the initial fetch is in progress */
  isLoading: boolean;
  /** Returns true if the song with the given id is liked */
  isLiked: (songId: string) => boolean;
  /**
   * Like or unlike a song.
   * Updates optimistically and syncs with the backend.
   */
  toggleLike: (song: Song) => Promise<void>;
}

const LikedSongsContext = createContext<LikedSongsContextValue | null>(null);

export const LikedSongsProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likedPlaylist, setLikedPlaylist] = useState<Playlist | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = useState(false);

  // Load liked songs once the user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLikedIds(new Set());
      setLikedPlaylist(undefined);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const [playlist, ids] = await Promise.all([
          getLikedSongsPlaylist(),
          getLikedSongIds(),
        ]);
        if (!cancelled) {
          setLikedPlaylist(playlist);
          setLikedIds(new Set(ids));
        }
      } catch (err) {
        console.error("Failed to load liked songs:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const isLiked = useCallback(
    (songId: string) => likedIds.has(songId),
    [likedIds],
  );

  const toggleLike = useCallback(
    async (song: Song) => {
      if (!likedPlaylist) return;

      const alreadyLiked = likedIds.has(song.id);

      // Optimistic update
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (alreadyLiked) {
          next.delete(song.id);
        } else {
          next.add(song.id);
        }
        return next;
      });

      // Also update the playlist songs list for the sidebar count
      setLikedPlaylist((prev) => {
        if (!prev) return prev;
        if (alreadyLiked) {
          return { ...prev, songs: prev.songs.filter((s) => s.id !== song.id) };
        } else {
          return { ...prev, songs: [...prev.songs, song] };
        }
      });

      try {
        if (alreadyLiked) {
          await removeSongFromPlaylist(likedPlaylist.id, song.id);
        } else {
          await addSongToPlaylist(likedPlaylist.id, song);
        }
      } catch (err) {
        // Revert on failure
        console.error("Failed to toggle like:", err);
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (alreadyLiked) {
            next.add(song.id);
          } else {
            next.delete(song.id);
          }
          return next;
        });
        setLikedPlaylist((prev) => {
          if (!prev) return prev;
          if (alreadyLiked) {
            return { ...prev, songs: [...prev.songs, song] };
          } else {
            return {
              ...prev,
              songs: prev.songs.filter((s) => s.id !== song.id),
            };
          }
        });
      }
    },
    [likedIds, likedPlaylist],
  );

  return (
    <LikedSongsContext.Provider
      value={{ likedIds, likedPlaylist, isLoading, isLiked, toggleLike }}
    >
      {children}
    </LikedSongsContext.Provider>
  );
};

export const useLikedSongs = (): LikedSongsContextValue => {
  const ctx = useContext(LikedSongsContext);
  if (!ctx)
    throw new Error("useLikedSongs must be used within LikedSongsProvider");
  return ctx;
};

export default LikedSongsContext;
