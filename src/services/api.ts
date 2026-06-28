// API configuration
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

interface SigninPayload {
  email: string;
  password: string;
}

interface SignupResponse {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  access_token: string;
}

interface SigninResponse {
  access_token: string;
  token_type: string;
}

interface Genre {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

interface Artist {
  id: string;
  name: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface PreferencePayload {
  user_id: string;
  genre_id?: string | null;
  artist_id?: string | null;
}

interface PreferenceResponse {
  id: string;
  user_id: string;
  genre_id?: string | null;
  artist_id?: string | null;
  created_at: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  image_url: string;
  song_url: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  songs: Song[];
  image_url?: string;
}

// interface PreferencesSaveResponse {
//   message: string;
//   count: number;
//   preferences: PreferenceResponse[];
// }

/**
 * Call the signup API endpoint
 */
export const signupUser = async (
  payload: SignupPayload,
): Promise<SignupResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/user/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.detail || "Signup failed");
    }

    if (data.access_token) {
      localStorage.setItem("authToken", data.access_token);
    }

    return data;
  } catch (error) {
    throw error instanceof Error ? error : new Error("An error occurred");
  }
};

/**
 * Call the signin API endpoint
 */
export const signinUser = async (
  payload: SigninPayload,
): Promise<SigninResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/user/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.detail || "Signin failed");
    }

    // Store the token in localStorage
    if (data.access_token) {
      localStorage.setItem("authToken", data.access_token);
    }

    return data;
  } catch (error) {
    throw error instanceof Error ? error : new Error("An error occurred");
  }
};

/**
 * Fetch all available genres
 */
export const getGenres = async (): Promise<Genre[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/genres/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Genres API Response:", data);

    if (!response.ok) {
      throw new Error(data.message || data.detail || "Failed to fetch genres");
    }

    const result = Array.isArray(data) ? data : data.genres || [];
    console.log("Genres parsed result:", result);
    return result;
  } catch (error) {
    console.error("Error fetching genres:", error);
    throw error instanceof Error ? error : new Error("An error occurred");
  }
};

/**
 * Fetch all available artists
 */
export const getArtists = async (): Promise<Artist[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/artists/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Artists API Response:", data);

    if (!response.ok) {
      throw new Error(data.message || data.detail || "Failed to fetch artists");
    }

    const result = Array.isArray(data) ? data : data.artists || [];
    console.log("Artists parsed result:", result);
    return result;
  } catch (error) {
    console.error("Error fetching artists:", error);
    throw error instanceof Error ? error : new Error("An error occurred");
  }
};

/**
 * Save user preferences (genres and/or artists)
 */
export const saveUserPreferences = async (
  preferences: PreferencePayload[],
): Promise<PreferenceResponse[]> => {
  try {
    const authToken = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/v1/preferences/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ preferences }),
    });

    const data = await response.json();
    console.log("Save Preferences API Response:", data);

    if (!response.ok) {
      throw new Error(
        data.message || data.detail || "Failed to save preferences",
      );
    }

    const result = data.preferences || [];
    console.log("Preferences saved:", result);
    return result;
  } catch (error) {
    console.error("Error saving preferences:", error);
    throw error instanceof Error ? error : new Error("An error occurred");
  }
};

/**
 * Fetch user playlists from the backend
 */
export const getUserPlaylists = async (): Promise<Playlist[]> => {
  try {
    const authToken = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/v1/playlists`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (response.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.location.href = "/signin";
      throw new Error("Session expired. Please sign in again.");
    }

    if (!response.ok) {
      throw new Error(data.message || data.detail || "Failed to fetch playlists");
    }

    return Array.isArray(data) ? data : data.playlists || [];
  } catch (error) {
    console.error("Error fetching playlists:", error);
    throw error instanceof Error ? error : new Error("An error occurred");
  }
};

/**
 * Create a new playlist via backend
 */
export const createPlaylist = async (
  name: string,
  description?: string,
): Promise<Playlist> => {
  try {
    const authToken = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/v1/playlists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name, description }),
    });

    const data = await response.json();

    if (response.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.location.href = "/signin";
      throw new Error("Session expired. Please sign in again.");
    }

    if (!response.ok) {
      throw new Error(data.message || data.detail || "Failed to create playlist");
    }

    return data;
  } catch (error) {
    console.error("Error creating playlist:", error);
    throw error instanceof Error ? error : new Error("An error occurred");
  }
};

/**
 * Add a song to a specific playlist
 */
export const addSongToPlaylist = async (
  playlistId: string,
  song: Song,
): Promise<void> => {
  try {
    const authToken = localStorage.getItem("authToken");
    const response = await fetch(
      `${API_BASE_URL}/v1/playlists/${playlistId}/songs/${song.id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || data.detail || "Failed to add song");
    }
  } catch (error) {
    console.error("Error adding song:", error);
    throw error instanceof Error ? error : new Error("An error occurred");
  }
};

/**
 * Remove a song from a specific playlist
 */
export const removeSongFromPlaylist = async (
  playlistId: string,
  songId: string,
): Promise<void> => {
  try {
    const authToken = localStorage.getItem("authToken");
    const response = await fetch(
      `${API_BASE_URL}/v1/playlists/${playlistId}/songs/${songId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || data.detail || "Failed to remove song");
    }
  } catch (error) {
    console.error("Error removing song:", error);
    throw error instanceof Error ? error : new Error("An error occurred");
  }
};

/**
 * Search for songs/artists using backend
 */
export const searchSongs = async (query: string): Promise<Song[]> => {
  try {
    if (!query.trim()) return [];
    const response = await fetch(
      `${API_BASE_URL}/v1/songs/search?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.detail || "Failed to search songs");
    }

    return Array.isArray(data) ? data : data.songs || [];
  } catch (error) {
    console.error("Error searching songs:", error);
    throw error instanceof Error ? error : new Error("An error occurred");
  }
};

/**
 * Get suggested songs based on preferences from backend
 */
export const getSuggestedSongs = async (): Promise<Song[]> => {
  try {
    const authToken = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/v1/songs/suggestions`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (response.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.location.href = "/signin";
      throw new Error("Session expired. Please sign in again.");
    }

    if (!response.ok) {
      throw new Error(
        data.message || data.detail || "Failed to fetch suggestions",
      );
    }

    return Array.isArray(data) ? data : data.suggestions || [];
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    throw error instanceof Error ? error : new Error("An error occurred");
  }
};

/**
 * Rename/update a playlist via backend
 */
export const renamePlaylist = async (
  playlistId: string,
  name: string,
  description?: string,
): Promise<void> => {
  try {
    const authToken = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/v1/playlists/${playlistId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name, description }),
    });

    if (response.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.location.href = "/signin";
      throw new Error("Session expired. Please sign in again.");
    }

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || data.detail || "Failed to update playlist");
    }
  } catch (error) {
    console.error("Error updating playlist:", error);
    throw error instanceof Error ? error : new Error("An error occurred");
  }
};

/**
 * Delete a playlist via backend
 */
export const deletePlaylist = async (playlistId: string): Promise<void> => {
  try {
    const authToken = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/v1/playlists/${playlistId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.location.href = "/signin";
      throw new Error("Session expired. Please sign in again.");
    }

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || data.detail || "Failed to delete playlist");
    }
  } catch (error) {
    console.error("Error deleting playlist:", error);
    throw error instanceof Error ? error : new Error("An error occurred");
  }
};



