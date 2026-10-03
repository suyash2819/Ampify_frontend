import React, { useEffect, useState } from "react";
import { Play, Pause, Heart, SkipForward } from "lucide-react";
import { usePlayback } from "../context/PlaybackContext";
import { useLikedSongs } from "../context/LikedSongsContext";
import { useAuth } from "../context/AuthContext";
import {
  getUserPlaylists,
  Playlist,
  Song,
  addSongToPlaylist,
  createPlaylist,
} from "../services/api";
import SongDetailsModal from "./SongDetailsModal";
import "../pages/PlaylistsPage.css";

interface Toast {
  id: string;
  message: string;
}

const BottomPlayerBar: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    playbackProgress,
    playbackDuration,
    playSong,
    seekTo,
    audioRef,
    notification,
  } = usePlayback();
  const { isLiked, toggleLike } = useLikedSongs();
  const { isAuthenticated } = useAuth();

  const [modalSong, setModalSong] = useState<Song | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getUserPlaylists()
      .then(setPlaylists)
      .catch(() => {});
  }, [isAuthenticated]);

  // Surface playback notifications (streaming errors, "now playing" updates) as toasts.
  useEffect(() => {
    if (!notification) return;
    const id = `${notification.id}`;
    setToasts((prev) => [...prev, { id, message: notification.message }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
    return () => clearTimeout(timer);
  }, [notification]);

  const handleAddToPlaylist = async (song: Song, playlist: Playlist) => {
    try {
      await addSongToPlaylist(playlist.id, song);
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlist.id ? { ...p, songs: [...p.songs, song] } : p,
        ),
      );
    } catch (err) {
      console.error("Failed to add song to playlist:", err);
    }
  };

  const handleCreatePlaylist = async (name: string): Promise<Playlist> => {
    const created = await createPlaylist(name);
    setPlaylists((prev) => [created, ...prev]);
    return created;
  };

  if (!isAuthenticated || !currentSong) return null;

  return (
    <>
      <div className="bottom-player-bar">
        <div className="bottom-player-inner">
          <div
            className="bottom-player-left"
            role="button"
            tabIndex={0}
            onClick={() => setModalSong(currentSong)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setModalSong(currentSong);
            }}
            title="View song details"
            style={{ cursor: "pointer" }}
          >
            <img
              src={
                currentSong.image_url ||
                "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&auto=format&fit=crop&q=60"
              }
              alt={currentSong.title}
              className="bottom-player-poster"
            />
            <div className="bottom-player-meta">
              <span className="bottom-player-title">{currentSong.title}</span>
              <span className="bottom-player-artist">{currentSong.artist}</span>
            </div>
          </div>
          <div className="bottom-player-controls d-flex align-items-center gap-2">
            <button
              className={`bottom-player-action${isLiked(currentSong.id) ? " liked" : ""}`}
              onClick={() => toggleLike(currentSong)}
              aria-label={isLiked(currentSong.id) ? "Unlike song" : "Like song"}
              aria-pressed={isLiked(currentSong.id)}
            >
              <Heart size={16} fill={isLiked(currentSong.id) ? "currentColor" : "none"} />
            </button>

            <button
              className="bottom-player-action"
              onClick={() => playSong(currentSong)}
              aria-label={isPlaying ? "Pause song" : "Play song"}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <button
              className="btn-premium-outline"
              onClick={() => {
                const audio = audioRef.current;
                if (!audio) return;
                const dur = audio.duration || 0;
                seekTo(Math.max(dur - 5, 0));
                if (audio.paused) {
                  playSong(currentSong);
                }
              }}
              title="Finish soon"
              aria-label="Finish soon"
            >
              <SkipForward size={14} />
              <span className="ms-1">Finish</span>
            </button>
          </div>
        </div>

        <div className="bottom-player-progress">
          <div
            className="bottom-player-progress-track"
            onClick={(e) => {
              const audio = audioRef.current;
              if (!audio) return;
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              const clickX = (e as React.MouseEvent).clientX - rect.left;
              const pct = Math.max(0, Math.min(1, clickX / rect.width));
              seekTo((audio.duration || 0) * pct);
              if (audio.paused) playSong(currentSong);
            }}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={playbackDuration}
            aria-valuenow={playbackProgress}
            tabIndex={0}
            onKeyDown={(e) => {
              const audio = audioRef.current;
              if (!audio) return;
              if (e.key === "ArrowRight") {
                seekTo(Math.min(audio.duration || 0, audio.currentTime + 5));
              } else if (e.key === "ArrowLeft") {
                seekTo(Math.max(0, audio.currentTime - 5));
              }
            }}
          >
            <div
              className="bottom-player-progress-fill"
              style={{
                width:
                  playbackDuration > 0
                    ? `${(playbackProgress / playbackDuration) * 100}%`
                    : "0%",
              }}
            />
          </div>
        </div>
      </div>

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="custom-toast toast-info">
            <div className="toast-content">
              <p className="toast-message">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      <SongDetailsModal
        song={modalSong}
        onClose={() => setModalSong(null)}
        playlists={playlists}
        onAddToPlaylist={handleAddToPlaylist}
        onCreatePlaylist={handleCreatePlaylist}
      />
    </>
  );
};

export default BottomPlayerBar;
