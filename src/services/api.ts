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
