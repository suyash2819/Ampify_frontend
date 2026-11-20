import { useEffect, useState } from "react";
import { Alert, Button, Form, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { getArtists, uploadSong } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./UploadSongPage.css";

interface ArtistOption {
  id: string;
  name: string;
  genre_id: string;
}

type SongMood =
  | "happy"
  | "upbeat"
  | "energetic"
  | "romantic"
  | "chill"
  | "calm"
  | "nostalgic"
  | "sad"
  | "melancholic"
  | "dark"
  | "angry"
  | "focus";

const SONG_MOODS: SongMood[] = [
  "happy",
  "upbeat",
  "energetic",
  "romantic",
  "chill",
  "calm",
  "nostalgic",
  "sad",
  "melancholic",
  "dark",
  "angry",
  "focus",
];

const UploadSongPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [songTitle, setSongTitle] = useState("");
  const [selectedArtistId, setSelectedArtistId] = useState("");
  const [mood, setMood] = useState<SongMood | "">("");
  const [songFile, setSongFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingArtists(true);
        const artistsData = await getArtists();
        setArtists(artistsData);

        if (artistsData.length > 0) {
          setSelectedArtistId(artistsData[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load artists right now.",
        );
      } finally {
        setLoadingArtists(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.id) {
      setError("You need to be logged in to upload a song.");
      return;
    }

    if (!songTitle.trim()) {
      setError("Please enter a song title.");
      return;
    }

    if (!selectedArtistId) {
      setError("Please choose an artist.");
      return;
    }

    if (!mood) {
      setError("Please choose a mood for the song.");
      return;
    }

    if (!songFile) {
      setError("Please select an mp3 file for the song.");
      return;
    }

    if (!songFile.name.toLowerCase().endsWith(".mp3")) {
      setError("The song file must be in MP3 format.");
      return;
    }

    if (!coverFile) {
      setError("Please upload a cover image.");
      return;
    }

    if (!coverFile.type.startsWith("image/")) {
      setError("The cover must be an image file.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const selectedArtist = artists.find(
        (artist) => artist.id === selectedArtistId,
      );
      if (!selectedArtist?.genre_id) {
        setError("The selected artist does not have a genre assigned.");
        return;
      }

      const formData = new FormData();

      formData.append("title", songTitle.trim());
      formData.append("artist_id", selectedArtistId);
      formData.append("genre_id", selectedArtist.genre_id);
      formData.append("mood", mood);
      formData.append("song_file", songFile, songFile.name);
      formData.append("cover_image", coverFile, coverFile.name);

      await uploadSong(formData);

      setSuccessMessage("Song uploaded successfully.");
      setSongTitle("");
      setSelectedArtistId(artists[0]?.id || "");
      setMood("");
      setSongFile(null);
      setCoverFile(null);

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The song could not be uploaded. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="upload-song-page">
      <div className="upload-song-container">
        <div className="upload-song-card">
          <div className="upload-song-header">
            <h1>Upload a Song</h1>
            <p>
              Share a track with {user?.name || "your audience"} and make it
              available in the library.
            </p>
          </div>

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert
              variant="success"
              dismissible
              onClose={() => setSuccessMessage("")}
            >
              {successMessage}
            </Alert>
          )}

          <Form onSubmit={handleSubmit} className="upload-form">
            <Form.Group className="mb-3" controlId="songTitle">
              <Form.Label>Song name</Form.Label>
              <Form.Control
                type="text"
                value={songTitle}
                onChange={(event) => setSongTitle(event.target.value)}
                placeholder="Enter song title"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="songArtist">
              <Form.Label>Artist</Form.Label>
              <Form.Select
                value={selectedArtistId}
                onChange={(event) => setSelectedArtistId(event.target.value)}
                disabled={loadingArtists || artists.length === 0}
              >
                {artists.length === 0 ? (
                  <option value="">No artists available</option>
                ) : (
                  artists.map((artist) => (
                    <option key={artist.id} value={artist.id}>
                      {artist.name}
                    </option>
                  ))
                )}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="songMood">
              <Form.Label>Mood</Form.Label>
              <Form.Select
                required
                value={mood}
                onChange={(event) =>
                  setMood(event.target.value as SongMood | "")
                }
              >
                <option value="">Choose a mood</option>
                {SONG_MOODS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="songCover">
              <Form.Label>Song cover (image)</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setCoverFile(event.target.files?.[0] || null)
                }
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="songAudio">
              <Form.Label>Song file (MP3)</Form.Label>
              <Form.Control
                type="file"
                accept=".mp3,audio/mpeg"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setSongFile(event.target.files?.[0] || null)
                }
              />
            </Form.Group>

            <div className="upload-actions">
              <Button variant="secondary" onClick={() => navigate("/")}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting || loadingArtists}
              >
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Uploading...
                  </>
                ) : (
                  "Upload Song"
                )}
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </section>
  );
};

export default UploadSongPage;
