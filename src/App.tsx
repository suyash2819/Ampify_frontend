import "bootstrap/dist/css/bootstrap.min.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Header from "./components/Header";
import Hero from "./components/Hero";
import PopularSingers from "./components/PopularSingers";
import Signup from "./pages/singup";
import Signin from "./pages/signin";
import Preferences from "./pages/preferences";
import Features from "./pages/features";
import PlaylistsPage from "./pages/PlaylistsPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import "./App.css";

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/signin" />;

  return <>{children}</>;
};

function Home() {
  const { isAuthenticated, user, isReturningUser } = useAuth();

  return (
    <>
      {isAuthenticated && user ? (
        isReturningUser ? (
          <section className="welcome-section py-5 text-center">
            <div className="container">
              <h1 className="welcome-title">
                Welcome back, <span className="user-name">{user.name}</span>!
              </h1>
              <p className="welcome-subtitle">
                Ready for some music? Dive back into your playlists.
              </p>
            </div>
          </section>
        ) : (
          <section className="welcome-section py-5 text-center">
            <div className="container">
              <h1 className="welcome-title">
                Welcome to Ampify,{" "}
                <span className="user-name">{user.name}</span>!
              </h1>
              <p className="welcome-subtitle">
                Let's set up your taste and discover music you will love.
              </p>
            </div>
          </section>
        )
      ) : (
        <Hero />
      )}
      <PopularSingers />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/features" element={<Features />} />
          <Route
            path="/playlists"
            element={
              <ProtectedRoute>
                <PlaylistsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
