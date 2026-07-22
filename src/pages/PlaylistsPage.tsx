import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Trash2,
  Music,
  Edit2,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  Play,
  Pause,
} from "lucide-react";
import {
  getUserPlaylists,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  searchSongs,
  getSuggestedSongs,
  Playlist,
  Song,
} from "../services/api";
import { useAudioStreaming } from "../hooks/useAudioStreaming";
import "./PlaylistsPage.css";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

const PlaylistsPage: React.FC = () => {
  // Playlist states
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    null,
  );
  const [playlistFilterQuery, setPlaylistFilterQuery] = useState("");

  // Music discovery states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [suggestions, setSuggestions] = useState<Song[]>([]);

  // Modal toggle states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Modal input fields state
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [editPlaylistName, setEditPlaylistName] = useState("");
  const [editPlaylistDescription, setEditPlaylistDescription] = useState("");

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Responsive mobile states
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Helper to trigger toast notification
  const addToast = (message: string, type: Toast["type"]) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Audio streaming hook
  const {
    audioRef,
    currentlyPlayingSongId,
    isPlaying,
    handlePlaySong,
    handleAudioEnded,
  } = useAudioStreaming(
    (error) => addToast(error, "error"),
    (message) => addToast(message, "info"),
  );

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);

  // Responsive listener
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileView("list"); // Reset mobile view state when switching to desktop
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedPlaylists = await getUserPlaylists();
      setPlaylists(fetchedPlaylists);
      if (fetchedPlaylists.length > 0) {
        setSelectedPlaylistId(fetchedPlaylists[0].id);
      }

      const fetchedSuggestions = await getSuggestedSongs();
      setSuggestions(fetchedSuggestions);
      setLoading(false);
    } catch (err: unknown) {
      console.error("Error loading playlists page:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load playlist data. Please try again.";
      setError(message || "Failed to load playlist data. Please try again.");
      setLoading(false);
    }
  };

  // Playlist CRUD: Create
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      addToast("Playlist name cannot be empty", "warning");
      return;
    }
    try {
      const created = await createPlaylist(
        newPlaylistName.trim(),
        newPlaylistDescription.trim(),
      );
      setPlaylists((prev) => [created, ...prev]);
      setSelectedPlaylistId(created.id);
      setIsCreateModalOpen(false);
      setNewPlaylistName("");
      setNewPlaylistDescription("");
      addToast(`Playlist "${created.name}" created successfully!`, "success");
      if (isMobile) {
        setMobileView("detail");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create playlist";
      addToast(message || "Failed to create playlist", "error");
    }
  };

  // Playlist CRUD: Rename / Edit details
  const handleRenamePlaylist = async () => {
    if (!selectedPlaylistId) return;
    if (!editPlaylistName.trim()) {
      addToast("Playlist name cannot be empty", "warning");
      return;
    }
    try {
      await renamePlaylist(
        selectedPlaylistId,
        editPlaylistName.trim(),
        editPlaylistDescription.trim(),
      );
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === selectedPlaylistId
            ? {
                ...p,
                name: editPlaylistName.trim(),
                description: editPlaylistDescription.trim(),
              }
            : p,
        ),
      );
      setIsRenameModalOpen(false);
      addToast("Playlist updated successfully!", "success");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update playlist";
      addToast(message || "Failed to update playlist", "error");
    }
  };

  // Playlist CRUD: Delete
  const handleDeletePlaylist = async () => {
    if (!selectedPlaylistId) return;
    const playlistName = selectedPlaylist?.name || "Playlist";
    try {
      await deletePlaylist(selectedPlaylistId);
      const updatedPlaylists = playlists.filter(
        (p) => p.id !== selectedPlaylistId,
      );
      setPlaylists(updatedPlaylists);
      setIsDeleteModalOpen(false);

      // Auto select another playlist if available
      if (updatedPlaylists.length > 0) {
        setSelectedPlaylistId(updatedPlaylists[0].id);
      } else {
        setSelectedPlaylistId(null);
      }

      addToast(`Playlist "${playlistName}" deleted.`, "info");
      if (isMobile) {
        setMobileView("list");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete playlist";
      addToast(message || "Failed to delete playlist", "error");
    }
  };

  // Open Rename Modal with populated values
  const openRenameModal = () => {
    if (!selectedPlaylist) return;
    setEditPlaylistName(selectedPlaylist.name);
    setEditPlaylistDescription(selectedPlaylist.description || "");
    setIsRenameModalOpen(true);
  };

  // Song Search Event
  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const results = await searchSongs(query);
        setSearchResults(results);
      } catch (err) {
        console.error("Error searching songs:", err);
      }
    } else {
      setSearchResults([]);
    }
  };

  // Add song to playlist (with duplicate check)
  const handleAddSong = async (song: Song) => {
    if (!selectedPlaylistId) {
      addToast("Please select or create a playlist first", "warning");
      return;
    }

    // Check if song already exists (duplicate prevention)
    const alreadyExists = selectedPlaylist?.songs.some((s) => s.id === song.id);
    if (alreadyExists) {
      addToast(`"${song.title}" is already in this playlist`, "warning");
      return;
    }

    try {
      await addSongToPlaylist(selectedPlaylistId, song);
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === selectedPlaylistId) {
            return { ...p, songs: [...p.songs, song] };
          }
          return p;
        }),
      );
      addToast(`Added "${song.title}" to playlist`, "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add song";
      addToast(message || "Failed to add song", "error");
    }
  };

  // Remove song from playlist
  const handleRemoveSong = async (songId: string, songTitle: string) => {
    if (!selectedPlaylistId) return;
    try {
      await removeSongFromPlaylist(selectedPlaylistId, songId);
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === selectedPlaylistId) {
            return { ...p, songs: p.songs.filter((s) => s.id !== songId) };
          }
          return p;
        }),
      );
      addToast(`Removed "${songTitle}" from playlist`, "info");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to remove song";
      addToast(message || "Failed to remove song", "error");
    }
  };

  // Filter playlists in sidebar
  const filteredPlaylists = playlists.filter((p) =>
    p.name.toLowerCase().includes(playlistFilterQuery.toLowerCase()),
  );

  // Render Loader
  if (loading) {
    return (
      <div className="playlists-page">
        <div className="container loading-wrapper">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading your music library...</p>
        </div>
      </div>
    );
  }

  // Render Error State
  if (error) {
    return (
      <div className="playlists-page">
        <div className="container">
          <div className="error-alert-card">
            <AlertCircle size={40} className="text-danger mb-3" />
            <h3 className="error-title">Oops! Something went wrong</h3>
            <p className="error-description">{error}</p>
            <button className="btn-premium" onClick={loadData}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="playlists-page">
      <div className="container-fluid px-md-5">
        <div className="playlists-container">
          {/* LEFT SIDEBAR: Playlists selector */}
          {(!isMobile || mobileView === "list") && (
            <div className="playlists-sidebar">
              <div className="sidebar-header">
                <span className="sidebar-title">Your Playlists</span>
                <button
                  className="btn-create-playlist"
                  onClick={() => setIsCreateModalOpen(true)}
                  title="Create playlist"
                  aria-label="Create playlist"
                >
                  <Plus size={18} />
                  <span>New</span>
                </button>
              </div>

              <div className="sidebar-search-box">
                <Search size={16} className="sidebar-search-icon" />
                <input
                  type="text"
                  placeholder="Filter playlists..."
                  className="sidebar-search-input"
                  value={playlistFilterQuery}
                  onChange={(e) => setPlaylistFilterQuery(e.target.value)}
                />
              </div>

              <div className="playlists-list-scroll">
                {filteredPlaylists.length > 0 ? (
                  filteredPlaylists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className={`playlist-list-item ${selectedPlaylistId === playlist.id ? "active" : ""}`}
                      onClick={() => {
                        setSelectedPlaylistId(playlist.id);
                        if (isMobile) {
                          setMobileView("detail");
                        }
                      }}
                    >
                      <img
                        src={
                          playlist.image_url ||
                          "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&auto=format&fit=crop&q=60"
                        }
                        alt={playlist.name}
                        className="mini-art"
                      />
                      <div className="item-details">
                        <h4 className="item-name">{playlist.name}</h4>
                        <p className="item-count">
                          {playlist.songs.length}{" "}
                          {playlist.songs.length === 1 ? "song" : "songs"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state-box py-4">
                    <Music size={28} />
                    <p className="empty-state-title">No playlists found</p>
                    {playlists.length === 0 && (
                      <button
                        className="btn-premium btn-sm mt-3"
                        onClick={() => setIsCreateModalOpen(true)}
                      >
                        Create One
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RIGHT SIDEBAR / CONTENT PANEL: Playlist details & edit */}
          {(!isMobile || mobileView === "detail") && (
            <div className="playlist-main-content">
              {isMobile && (
                <button
                  className="btn-premium-outline mb-4"
                  onClick={() => setMobileView("list")}
                >
                  <ArrowLeft size={16} className="me-2" />
                  Back to Library
                </button>
              )}

              {selectedPlaylist ? (
                <>
                  {/* Selected Playlist Hero Details */}
                  <div className="playlist-detail-card">
                    <div className="detail-hero-section">
                      <div className="large-art-container">
                        <img
                          src={
                            selectedPlaylist.image_url ||
                            "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=60"
                          }
                          alt={selectedPlaylist.name}
                        />
                      </div>
                      <div className="detail-info">
                        <span className="badge-playlist">Playlist</span>
                        <h2 className="playlist-title-header">
                          {selectedPlaylist.name}
                        </h2>
                        {selectedPlaylist.description && (
                          <p className="playlist-description-text">
                            {selectedPlaylist.description}
                          </p>
                        )}
                        <div className="detail-stats">
                          <span>Created by you</span>
                          <span className="bullet-separator">•</span>
                          <span>
                            {selectedPlaylist.songs.length}{" "}
                            {selectedPlaylist.songs.length === 1
                              ? "song"
                              : "songs"}
                          </span>
                        </div>
                        <div className="action-buttons-group">
                          <button
                            className="btn-premium-outline"
                            onClick={openRenameModal}
                          >
                            <Edit2 size={16} />
                            Edit Details
                          </button>
                          <button
                            className="btn-premium-danger-outline"
                            onClick={() => setIsDeleteModalOpen(true)}
                          >
                            <Trash2 size={16} />
                            Delete Playlist
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Playlist Songs Table */}
                    <div className="songs-table-section mt-4">
                      <div className="song-table-header">
                        <div>#</div>
                        <div>Cover</div>
                        <div>Title</div>
                        <div>Artist</div>
                        <div className="text-center">Action</div>
                      </div>

                      <div className="song-list-scroll">
                        {selectedPlaylist.songs.length > 0 ? (
                          selectedPlaylist.songs.map((song, index) => (
                            <div
                              key={`${song.id}-${index}`}
                              className={`song-table-row ${currentlyPlayingSongId === song.id ? "playing" : ""}`}
                            >
                              <div className="row-index">{index + 1}</div>
                              <img
                                src={
                                  song.image_url ||
                                  "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&auto=format&fit=crop&q=60"
                                }
                                alt={song.title}
                                className="song-image"
                              />
                              <div className="song-title-col">{song.title}</div>
                              <div className="song-artist-col">
                                {song.artist}
                              </div>
                              <div className="song-action-buttons">
                                <button
                                  className={`btn-play-song ${currentlyPlayingSongId === song.id ? "active" : ""}`}
                                  onClick={() => handlePlaySong(song)}
                                  title={
                                    currentlyPlayingSongId === song.id &&
                                    isPlaying
                                      ? "Pause song"
                                      : "Play song"
                                  }
                                  aria-label={
                                    currentlyPlayingSongId === song.id &&
                                    isPlaying
                                      ? `Pause ${song.title}`
                                      : `Play ${song.title}`
                                  }
                                >
                                  {currentlyPlayingSongId === song.id &&
                                  isPlaying ? (
                                    <Pause size={15} />
                                  ) : (
                                    <Play size={15} />
                                  )}
                                </button>
                                <button
                                  className="btn-remove-song"
                                  onClick={() =>
                                    handleRemoveSong(song.id, song.title)
                                  }
                                  title="Remove song from playlist"
                                  aria-label={`Remove ${song.title} from playlist`}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state-box py-5">
                            <Music size={40} />
                            <p className="empty-state-title">
                              This playlist is empty
                            </p>
                            <p className="empty-state-subtitle">
                              Search for songs below to add them to your
                              playlist.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hidden audio element for playback */}
                  <audio
                    ref={audioRef}
                    onEnded={handleAudioEnded}
                    crossOrigin="anonymous"
                  />

                  {/* Add Music Search and Suggestions */}
                  <div className="music-discovery-container">
                    <h3 className="discovery-section-title">
                      Add songs to this playlist
                    </h3>

                    <div className="row">
                      {/* Search for songs */}
                      <div className="col-lg-7 mb-4 mb-lg-0">
                        <div className="pe-lg-4">
                          <h4 className="fs-6 fw-bold mb-3 text-white-50">
                            Search for tracks
                          </h4>
                          <div className="discovery-search-wrapper">
                            <Search
                              size={18}
                              className="discovery-search-icon"
                            />
                            <input
                              type="text"
                              className="discovery-search-input"
                              placeholder="Search by song name or artist..."
                              value={searchQuery}
                              onChange={handleSearch}
                            />
                          </div>

                          <div className="search-results-list">
                            {searchResults.length > 0 ? (
                              searchResults.map((song) => {
                                const isAdded = selectedPlaylist.songs.some(
                                  (s) => s.id === song.id,
                                );
                                return (
                                  <div
                                    key={song.id}
                                    className="discovery-song-item"
                                  >
                                    <img
                                      src={song.image_url}
                                      alt={song.title}
                                    />
                                    <div className="discovery-song-details">
                                      <span className="discovery-song-title">
                                        {song.title}
                                      </span>
                                      <span className="discovery-song-artist">
                                        {song.artist}
                                      </span>
                                    </div>
                                    <button
                                      className="btn-add-song"
                                      onClick={() => handleAddSong(song)}
                                      disabled={isAdded}
                                    >
                                      {isAdded ? "Added" : "Add to Playlist"}
                                    </button>
                                  </div>
                                );
                              })
                            ) : searchQuery.trim() ? (
                              <p className="text-white-50 fs-7 italic py-2">
                                No matches found for "{searchQuery}"
                              </p>
                            ) : (
                              <p className="text-white-50 fs-7 italic py-2">
                                Type above to search Ampify's library
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Suggested Songs */}
                      <div className="col-lg-5">
                        <div>
                          <h4 className="fs-6 fw-bold mb-3 text-white-50 d-flex align-items-center gap-2">
                            <Sparkles size={16} className="text-info" />
                            Recommended for you
                          </h4>

                          <div className="suggestions-list">
                            {suggestions.length > 0 ? (
                              suggestions.map((song) => {
                                const isAdded = selectedPlaylist.songs.some(
                                  (s) => s.id === song.id,
                                );
                                return (
                                  <div
                                    key={song.id}
                                    className="discovery-song-item"
                                  >
                                    <img
                                      src={song.image_url}
                                      alt={song.title}
                                    />
                                    <div className="discovery-song-details">
                                      <span className="discovery-song-title">
                                        {song.title}
                                      </span>
                                      <span className="discovery-song-artist">
                                        {song.artist}
                                      </span>
                                    </div>
                                    <button
                                      className="btn-add-song"
                                      onClick={() => handleAddSong(song)}
                                      disabled={isAdded}
                                    >
                                      {isAdded ? "Added" : "Add"}
                                    </button>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-white-50 fs-7 py-2">
                                No recommendations available
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state-box py-5">
                  <Music size={50} />
                  <p className="empty-state-title">No playlist selected</p>
                  <p className="empty-state-subtitle">
                    Select a playlist from the sidebar library or create a new
                    one to begin.
                  </p>
                  <button
                    className="btn-premium mt-4"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    <Plus size={18} />
                    Create Playlist
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3>Create Playlist</h3>
              <button
                className="btn-close-toast"
                onClick={() => setIsCreateModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <p>Design a new home for your favorite tracks.</p>

            <div className="modal-form-group">
              <label>Playlist Name</label>
              <input
                type="text"
                className="modal-input"
                placeholder="e.g. Late Night Vibe"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="modal-form-group">
              <label>Description (Optional)</label>
              <textarea
                className="modal-input"
                placeholder="Describe the mood of this playlist..."
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-premium-outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button className="btn-premium" onClick={handleCreatePlaylist}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME / EDIT DETAILS MODAL */}
      {isRenameModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsRenameModalOpen(false)}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3>Edit Playlist Details</h3>
              <button
                className="btn-close-toast"
                onClick={() => setIsRenameModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <p>Update the name and description details of this playlist.</p>

            <div className="modal-form-group">
              <label>Playlist Name</label>
              <input
                type="text"
                className="modal-input"
                placeholder="Playlist Name"
                value={editPlaylistName}
                onChange={(e) => setEditPlaylistName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="modal-form-group">
              <label>Description (Optional)</label>
              <textarea
                className="modal-input"
                placeholder="Description of the playlist..."
                value={editPlaylistDescription}
                onChange={(e) => setEditPlaylistDescription(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-premium-outline"
                onClick={() => setIsRenameModalOpen(false)}
              >
                Cancel
              </button>
              <button className="btn-premium" onClick={handleRenamePlaylist}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="text-danger">Delete Playlist</h3>
              <button
                className="btn-close-toast"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <p className="mb-4">
              Are you sure you want to delete{" "}
              <strong>"{selectedPlaylist?.name}"</strong>? This will permanently
              erase the playlist. Your songs will remain in the main library.
            </p>

            <div className="modal-actions">
              <button
                className="btn-premium-outline"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn-premium btn-premium-danger-outline border-0 py-2 px-4"
                onClick={handleDeletePlaylist}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM CONTAINER */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`custom-toast toast-${toast.type}`}>
            <div className="toast-icon">
              {toast.type === "success" && <CheckCircle size={18} />}
              {toast.type === "error" && <AlertCircle size={18} />}
              {toast.type === "warning" && <AlertTriangle size={18} />}
              {toast.type === "info" && <Info size={18} />}
            </div>
            <div className="toast-content">
              <p className="toast-message">{toast.message}</p>
            </div>
            <button
              className="btn-close-toast"
              onClick={() => removeToast(toast.id)}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaylistsPage;
