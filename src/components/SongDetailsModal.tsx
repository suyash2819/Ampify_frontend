import React, { useEffect, useCallback, useRef, useState } from "react";
import { Play, Pause, Heart, Plus, Music, ChevronDown, Check } from "lucide-react";
import { Song, Playlist } from "../services/api";
import { useLikedSongs } from "../context/LikedSongsContext";
import { usePlayback } from "../context/PlaybackContext";
import "./SongDetailsModal.css";

interface SongDetailsModalProps {
  /** The song whose details to display. Pass null to close. */
  song: Song | null;
  /** Called when the user dismisses the modal */
  onClose: () => void;
  /** All user playlists (used for the "Add to playlist" menu) */
  playlists: Playlist[];
  /** Called when the user adds the song to a specific existing playlist */
  onAddToPlaylist: (song: Song, playlist: Playlist) => void;
  /** Called when the user creates a new playlist from the "Add to playlist" menu. Must resolve to the created playlist. */
  onCreatePlaylist: (name: string) => Promise<Playlist>;
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const SongDetailsModal: React.FC<SongDetailsModalProps> = ({
  song,
  onClose,
  playlists,
  onAddToPlaylist,
  onCreatePlaylist,
}) => {
  const { isLiked, toggleLike } = useLikedSongs();
  const {
    currentSong,
    isPlaying,
    playSong,
    playbackProgress,
    playbackDuration,
    seekTo,
  } = usePlayback();

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Reset the add-to-playlist menu whenever a different song is shown.
  useEffect(() => {
    setIsAddMenuOpen(false);
    setIsCreatingPlaylist(false);
    setNewPlaylistName("");
  }, [song?.id]);

  // Close the add-to-playlist menu when clicking outside it.
  useEffect(() => {
    if (!isAddMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false);
        setIsCreatingPlaylist(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isAddMenuOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!song) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [song, onClose]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (!song) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [song]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!song) return null;

  const liked = isLiked(song.id);
  const currentlyPlayingThis = currentSong?.id === song.id;

  // Filter out the Liked Songs playlist from the "Add to playlist" menu
  const regularPlaylists = playlists.filter((p) => !p.is_liked_songs);
  const playlistsContainingSong = regularPlaylists.filter((p) =>
    p.songs.some((s) => s.id === song.id),
  );

  const handleCreateAndAdd = async () => {
    const name = newPlaylistName.trim();
    if (!name || isSaving) return;
    setIsSaving(true);
    try {
      const playlist = await onCreatePlaylist(name);
      onAddToPlaylist(song, playlist);
      setNewPlaylistName("");
      setIsCreatingPlaylist(false);
      setIsAddMenuOpen(false);
    } catch (err) {
      console.error("Failed to create playlist:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="sdm-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Song details: ${song.title}`}
    >
      <div className="sdm-box">
        {/* Blurred artwork backdrop */}
        {song.image_url && (
          <div
            className="sdm-artwork-bg"
            style={{ backgroundImage: `url(${song.image_url})` }}
          />
        )}

        {/* Close button */}
        <button
          className="sdm-close"
          onClick={onClose}
          aria-label="Close song details"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <div className="sdm-inner">
          {/* ── Top: artwork + meta ─────────────────────────────────── */}
          <div className="sdm-top">
            <div className="sdm-artwork-wrap">
              {song.image_url ? (
                <img src={song.image_url} alt={song.title} />
              ) : (
                <div className="sdm-artwork-placeholder">
                  <Music size={48} />
                </div>
              )}
            </div>

            <div className="sdm-meta">
              <span className="sdm-badge">Song</span>
              <h2 className="sdm-title" title={song.title}>
                {song.title}
              </h2>
              <p className="sdm-artist">{song.artist}</p>

              {/* ── Controls ─────────────────────────────────────────── */}
              <div className="sdm-controls">
                {/* Play / Pause */}
                <button
                  className="sdm-btn-play"
                  onClick={() => playSong(song)}
                  aria-label={
                    currentlyPlayingThis && isPlaying
                      ? `Pause ${song.title}`
                      : `Play ${song.title}`
                  }
                >
                  {currentlyPlayingThis && isPlaying ? (
                    <Pause size={22} />
                  ) : (
                    <Play size={22} fill="currentColor" />
                  )}
                </button>

                {/* Like / Unlike */}
                <button
                  className={`sdm-btn-like${liked ? " liked" : ""}`}
                  onClick={() => toggleLike(song)}
                  aria-label={liked ? "Unlike song" : "Like song"}
                  aria-pressed={liked}
                >
                  <Heart
                    size={24}
                    strokeWidth={2.25}
                    fill={liked ? "currentColor" : "none"}
                  />
                </button>
              </div>

              {/* Playback progress — only meaningful for the currently loaded song */}
              {currentlyPlayingThis && (
                <div className="sdm-progress">
                  <span className="sdm-progress-time">
                    {formatTime(playbackProgress)}
                  </span>
                  <div
                    className="sdm-progress-track"
                    role="slider"
                    tabIndex={0}
                    aria-label="Seek"
                    aria-valuemin={0}
                    aria-valuemax={playbackDuration}
                    aria-valuenow={playbackProgress}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = Math.max(
                        0,
                        Math.min(1, (e.clientX - rect.left) / rect.width),
                      );
                      seekTo((playbackDuration || 0) * pct);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight") {
                        seekTo(Math.min(playbackDuration || 0, playbackProgress + 5));
                      } else if (e.key === "ArrowLeft") {
                        seekTo(Math.max(0, playbackProgress - 5));
                      }
                    }}
                  >
                    <div
                      className="sdm-progress-fill"
                      style={{
                        width:
                          playbackDuration > 0
                            ? `${(playbackProgress / playbackDuration) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <span className="sdm-progress-time sdm-progress-time-end">
                    {formatTime(playbackDuration)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Add to playlist ───────────────────────────────────────── */}
          <div className="sdm-divider" />

          <div className="sdm-add-section" ref={addMenuRef}>
            <div className="sdm-add-row-top">
              <button
                className="sdm-add-toggle"
                onClick={() => setIsAddMenuOpen((open) => !open)}
                aria-expanded={isAddMenuOpen}
                aria-haspopup="menu"
              >
                <Plus size={15} />
                Add to playlist
                <ChevronDown
                  size={15}
                  className={`sdm-add-chevron${isAddMenuOpen ? " open" : ""}`}
                />
              </button>

              {playlistsContainingSong.length > 0 && (
                <div className="sdm-in-playlists">
                  <span className="sdm-in-playlists-label">In:</span>
                  {playlistsContainingSong.map((pl) => (
                    <span key={pl.id} className="sdm-in-playlist-chip">
                      {pl.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {isAddMenuOpen && (
              <div className="sdm-add-dropdown" role="menu">
                {regularPlaylists.length === 0 && (
                  <p className="sdm-no-playlists">No playlists yet.</p>
                )}

                {regularPlaylists.map((pl) => {
                  const alreadyAdded = pl.songs.some((s) => s.id === song.id);
                  return (
                    <button
                      key={pl.id}
                      className={`sdm-add-row${alreadyAdded ? " added" : ""}`}
                      disabled={alreadyAdded}
                      onClick={() => onAddToPlaylist(song, pl)}
                      aria-label={
                        alreadyAdded
                          ? `${song.title} is already in ${pl.name}`
                          : `Add ${song.title} to ${pl.name}`
                      }
                    >
                      <span>{pl.name}</span>
                      {alreadyAdded && <Check size={15} />}
                    </button>
                  );
                })}

                <div className="sdm-add-dropdown-divider" />

                {isCreatingPlaylist ? (
                  <div className="sdm-new-playlist-row">
                    <input
                      type="text"
                      className="sdm-new-playlist-input"
                      placeholder="Playlist name"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateAndAdd();
                      }}
                      autoFocus
                    />
                    <button
                      className="sdm-new-playlist-save"
                      onClick={handleCreateAndAdd}
                      disabled={!newPlaylistName.trim() || isSaving}
                    >
                      {isSaving ? "…" : "Create"}
                    </button>
                  </div>
                ) : (
                  <button
                    className="sdm-add-row sdm-add-row-create"
                    onClick={() => setIsCreatingPlaylist(true)}
                  >
                    <Plus size={15} />
                    <span>Create new playlist</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongDetailsModal;
