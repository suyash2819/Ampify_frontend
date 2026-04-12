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
}

interface SigninResponse {
  access_token: string;
  token_type: string;
}

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
