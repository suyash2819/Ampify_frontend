import { useState, useEffect } from "react";
import { Spinner, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { getGenres, getArtists, saveUserPreferences } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./preferences.css";

interface Genre {
  id: string;
  name: string;
}

interface Artist {
  id: string;
  name: string;
  image_url?: string;
}

const Preferences = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [genres, setGenres] = useState<Genre[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [selectedArtists, setSelectedArtists] = useState<Set<string>>(
    new Set(),
  );

  const [loading, setLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch genres and artists
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [genresData, artistsData] = await Promise.all([
          getGenres(),
          getArtists(),
        ]);
        console.log("Fetched genres:", genresData);
        console.log("Fetched artists:", artistsData);
        setGenres(genresData);
        setArtists(artistsData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load preferences data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle genre selection
  const handleGenreToggle = (genreId: string) => {
    const newSelected = new Set(selectedGenres);
    const totalSelected = selectedGenres.size + selectedArtists.size;

    if (newSelected.has(genreId)) {
      newSelected.delete(genreId);
    } else {
      // Only allow adding if total selected is less than 5
      if (totalSelected < 5) {
        newSelected.add(genreId);
      }
    }
    setSelectedGenres(newSelected);
  };

  // Handle artist selection
  const handleArtistToggle = (artistId: string) => {
    const newSelected = new Set(selectedArtists);
    const totalSelected = selectedGenres.size + selectedArtists.size;

    if (newSelected.has(artistId)) {
      newSelected.delete(artistId);
    } else {
      // Only allow adding if total selected is less than 5
      if (totalSelected < 5) {
        newSelected.add(artistId);
      }
    }
    setSelectedArtists(newSelected);
  };

  // Handle preference submission
  const handleSavePreferences = async () => {
    if (selectedGenres.size === 0 && selectedArtists.size === 0) {
      setError("Please select at least one genre or artist");
      return;
    }

    if (!user?.id) {
      setError("User information not available");
      return;
    }

    try {
      setSavingPreferences(true);
      setError("");

      // Build preference payloads
      const preferences = [];

      // Add genre preferences
      for (const genreId of selectedGenres) {
        preferences.push({
          user_id: user.id,
          genre_id: genreId,
          artist_id: null,
        });
      }

      // Add artist preferences
      for (const artistId of selectedArtists) {
        preferences.push({
          user_id: user.id,
          genre_id: null,
          artist_id: artistId,
        });
      }

      await saveUserPreferences(preferences);
      setSuccessMessage(
        "Preferences saved successfully! Redirecting to home...",
      );

      // Redirect to home after 2 seconds
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      console.error("Save preferences error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save preferences. Please try again.",
      );
    } finally {
      setSavingPreferences(false);
    }
  };

  // Handle skip preferences
  const handleSkip = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <section className="preferences-section">
        <div className="preferences-container">
          <div className="preferences-card">
            <div className="loading-container">
              <Spinner animation="border" role="status" className="spinner-lg">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p>Loading preferences...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="preferences-section">
      <div className="preferences-container">
        <div className="preferences-card">
          <div className="preferences-header">
            <h1 className="preferences-title">Personalize Your Experience</h1>
            <p className="preferences-subtitle">
              Tell us about your music taste so we can recommend songs you'll
              love
            </p>
          </div>

          {error && (
            <Alert
              variant="danger"
              onClose={() => setError("")}
              dismissible
              className="alert-box"
            >
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert
              variant="success"
              onClose={() => setSuccessMessage("")}
              dismissible
              className="alert-box"
            >
              {successMessage}
            </Alert>
          )}

          <div className="preferences-content">
            {/* Selection counter */}
            <div className="selection-counter">
              Selected: {selectedGenres.size + selectedArtists.size} / 5
            </div>

            {/* Genres Section */}
            <div className="preferences-section-group">
              <h2 className="section-title">Favorite Genres</h2>
              <div className="items-grid">
                {genres.map((genre) => {
                  const isSelected = selectedGenres.has(genre.id);
                  const isFull =
                    selectedGenres.size + selectedArtists.size >= 5;
                  return (
                    <button
                      key={genre.id}
                      className={`item-button ${isSelected ? "selected" : ""}`}
                      onClick={() => handleGenreToggle(genre.id)}
                      disabled={savingPreferences || (isFull && !isSelected)}
                    >
                      {genre.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Artists Section */}
            <div className="preferences-section-group">
              <h2 className="section-title">Favorite Artists</h2>
              <div className="items-grid">
                {artists.map((artist) => {
                  const isSelected = selectedArtists.has(artist.id);
                  const isFull =
                    selectedGenres.size + selectedArtists.size >= 5;
                  return (
                    <button
                      key={artist.id}
                      className={`item-button ${isSelected ? "selected" : ""}`}
                      onClick={() => handleArtistToggle(artist.id)}
                      disabled={savingPreferences || (isFull && !isSelected)}
                    >
                      {artist.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="preferences-actions">
            <button
              type="button"
              className="btn-save"
              onClick={handleSavePreferences}
              disabled={savingPreferences}
            >
              {savingPreferences ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="spinner"
                  />
                  Saving...
                </>
              ) : (
                "Complete Setup"
              )}
            </button>
            <button
              type="button"
              className="btn-skip"
              onClick={handleSkip}
              disabled={savingPreferences}
            >
              Skip for Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Preferences;
