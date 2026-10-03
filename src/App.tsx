import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Search, X } from "lucide-react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import PopularSingers from "./components/PopularSingers";
import SongDetailsModal from "./components/SongDetailsModal";
import BottomPlayerBar from "./components/BottomPlayerBar";
import Signup from "./pages/singup";
import Signin from "./pages/signin";
import Preferences from "./pages/preferences";
import PlaylistsPage from "./pages/PlaylistsPage";
import { useAuth } from "./context/AuthContext";
import {
  searchSongs,
  Song,
  Playlist,
  getUserPlaylists,
  addSongToPlaylist,
  createPlaylist,
} from "./services/api";
import "./App.css";

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/signin" />;

  return <>{children}</>;
};

// ── Home search bar ───────────────────────────────────────────────────────────
function HomeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();

  // Load user playlists for the modal
  useEffect(() => {
    if (!isAuthenticated) return;
    getUserPlaylists()
      .then(setUserPlaylists)
      .catch(() => {});
  }, [isAuthenticated]);

  // Debounced search
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchSongs(val);
        setResults(res);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  }, []);

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAddToPlaylist = async (song: Song, playlist: Playlist) => {
    try {
      await addSongToPlaylist(playlist.id, song);
      setUserPlaylists((prev) =>
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
    setUserPlaylists((prev) => [created, ...prev]);
    return created;
  };

  return (
    <div className="home-search-wrap">
      <div className="home-search-inner" ref={wrapperRef}>
        <p className="home-search-eyebrow">Discover music</p>

        <div className="home-search-bar">
          <Search size={20} className="home-search-icon" />
          <input
            id="home-song-search"
            type="text"
            className="home-search-input"
            placeholder="Search songs, artists…"
            value={query}
            onChange={handleChange}
            onFocus={() => results.length > 0 && setShowResults(true)}
            autoComplete="off"
            aria-label="Search songs"
            aria-expanded={showResults}
            aria-haspopup="listbox"
          />
          {query && (
            <button
              className="home-search-clear"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {showResults && (
          <div
            className="home-search-results"
            role="listbox"
            aria-label="Search results"
          >
            {isSearching && (
              <div className="home-search-loading">Searching…</div>
            )}

            {!isSearching && results.length === 0 && (
              <div className="home-search-empty">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {!isSearching &&
              results.map((song) => (
                <div
                  key={song.id}
                  className="home-search-result-item"
                  role="option"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedSong(song);
                    setShowResults(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSelectedSong(song);
                      setShowResults(false);
                    }
                  }}
                  aria-selected={false}
                >
                  {song.image_url ? (
                    <img
                      src={song.image_url}
                      alt={song.title}
                      className="home-result-art"
                    />
                  ) : (
                    <div className="home-result-art home-result-art-placeholder" />
                  )}
                  <div className="home-result-meta">
                    <span className="home-result-title">{song.title}</span>
                    <span className="home-result-artist">{song.artist}</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Song Details Modal */}
      <SongDetailsModal
        song={selectedSong}
        onClose={() => setSelectedSong(null)}
        playlists={userPlaylists}
        onAddToPlaylist={handleAddToPlaylist}
        onCreatePlaylist={handleCreatePlaylist}
      />
    </div>
  );
}

// ── Home page ─────────────────────────────────────────────────────────────────
function Home() {
  const { isAuthenticated, user, isReturningUser } = useAuth();

  return (
    <>
      {isAuthenticated && user ? (
        <section className="home-hero-section py-5 text-center">
          <div className="container">
            {isReturningUser ? (
              <>
                <h1 className="welcome-title">
                  Welcome back, <span className="user-name">{user.name}</span>!
                </h1>
                <p className="welcome-subtitle">
                  Ready for some music? Dive back into your playlists.
                </p>
              </>
            ) : (
              <>
                <h1 className="welcome-title">
                  Welcome to Ampify,{" "}
                  <span className="user-name">{user.name}</span>!
                </h1>
                <p className="welcome-subtitle">
                  Let's set up your taste and discover music you will love.
                </p>
              </>
            )}

            <HomeSearch />
          </div>
        </section>
      ) : (
        <Hero />
      )}

      <PopularSingers />
    </>
  );
}

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/preferences" element={<Preferences />} />
        <Route
          path="/playlists"
          element={
            <ProtectedRoute>
              <PlaylistsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      <BottomPlayerBar />
    </Router>
  );
}

export default App;
