import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Hero from "./components/Hero";
import PopularSingers from "./components/PopularSingers";
import Signup from "./pages/singup";
import Signin from "./pages/signin";
import Preferences from "./pages/preferences";
import { AuthProvider } from "./context/AuthContext";
import "./App.css";

function Home() {
  return (
    <>
      <Hero />
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
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
