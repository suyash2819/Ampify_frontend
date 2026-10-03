import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext";
import { PlaybackProvider } from "./context/PlaybackContext";
import { LikedSongsProvider } from "./context/LikedSongsContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <PlaybackProvider>
        <LikedSongsProvider>
          <App />
        </LikedSongsProvider>
      </PlaybackProvider>
    </AuthProvider>
  </StrictMode>,
);
