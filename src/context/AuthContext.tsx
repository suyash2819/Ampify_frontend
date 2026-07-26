import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  authToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isReturningUser: boolean;
  login: (token: string, user: User, isReturning?: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReturningUser, setIsReturningUser] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("hasLoggedInBefore") === "true";
  });

  // Restore session on app load
  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("user");
    const storedHasLoggedInBefore = localStorage.getItem("hasLoggedInBefore");

    if (storedToken && storedUser) {
      setAuthToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    if (storedHasLoggedInBefore === "true") {
      setIsReturningUser(true);
    } else if (storedHasLoggedInBefore === "false") {
      setIsReturningUser(false);
    } else if (storedToken) {
      setIsReturningUser(true);
    }

    setIsLoading(false);
  }, []);

  const login = (token: string, userData: User, isReturning = false) => {
    setAuthToken(token);
    setUser(userData);
    setIsReturningUser(isReturning);
    localStorage.setItem("authToken", token);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("hasLoggedInBefore", String(isReturning));
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setIsReturningUser(false);
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("hasLoggedInBefore");
  };

  const isAuthenticated = !!authToken;

  return (
    <AuthContext.Provider
      value={{
        authToken,
        user,
        isAuthenticated,
        isLoading,
        isReturningUser,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
