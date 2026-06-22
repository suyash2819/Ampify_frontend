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
    const response = await fetch(`${API_BASE_URL}/user/signup`, {
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
    const response = await fetch(`${API_BASE_URL}/user/signin`, {
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
    const response = await fetch(`${API_BASE_URL}/genres/`, {
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
    const response = await fetch(`${API_BASE_URL}/artists/`, {
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
    const response = await fetch(`${API_BASE_URL}/preferences/`, {
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
 * Stream a song and return a blob URL that can be used as an audio source
 */
export const streamSongToBlobUrl = async (songId: string): Promise<string> => {
  try {
    const authToken = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/songs/${songId}/stream`, {
      method: "GET",
      headers: authToken
        ? {
            Authorization: `Bearer ${authToken}`,
          }
        : {},
    });

    if (!response.ok) {
      let errText = "Failed to stream song";
      try {
        const json = await response.json();
        errText = json.message || json.detail || errText;
      } catch (error) {
        // ignore
        console.error("Error streaming song:", error);
      }
      throw new Error(errText);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return url;
  } catch (error) {
    console.error("Error streaming song:", error);
    throw error instanceof Error ? error : new Error("An error occurred");
  }
};

/**
 * Fetch a byte range for a song. Returns the ArrayBuffer and response headers.
 */
export const fetchSongRange = async (
  songId: string,
  start?: number,
  end?: number,
): Promise<{
  data: ArrayBuffer;
  contentRange?: string | null;
  contentLength?: string | null;
  acceptRanges?: string | null;
}> => {
  try {
    const authToken = localStorage.getItem("authToken");

    const headers: Record<string, string> = {};
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    if (typeof start === "number") {
      const rangeHeader = `bytes=${start}-${typeof end === "number" ? end : ""}`;
      headers.Range = rangeHeader;
    }

    const response = await fetch(`${API_BASE_URL}/songs/${songId}/stream`, {
      method: "GET",
      headers,
    });

    if (!response.ok && response.status !== 206 && response.status !== 200) {
      let errText = "Failed to fetch song range";
      try {
        const json = await response.json();
        errText = json.message || json.detail || errText;
      } catch (error) {
        console.error("Error streaming song:", error);
      }
      throw new Error(errText);
    }

    const data = await response.arrayBuffer();

    return {
      data,
      contentRange: response.headers.get("Content-Range"),
      contentLength: response.headers.get("Content-Length"),
      acceptRanges: response.headers.get("Accept-Ranges"),
    };
  } catch (error) {
    console.error("Error fetching song range:", error);
    throw error instanceof Error ? error : new Error("An error occurred");
  }
};
