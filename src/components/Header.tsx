import { Navbar, Nav, Container, Button } from "react-bootstrap";
import { Search } from "lucide-react";
import "./Header.css";

export default function Header() {
  return (
    <Navbar expand="lg" className="navbar-custom" sticky="top">
      <Container>
        <Navbar.Brand href="#" className="brand-logo">
          Ampify
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto nav-center">
            <Nav.Link href="#home">Home</Nav.Link>
            <Nav.Link href="#features">Features</Nav.Link>
            <Nav.Link href="#about">About us</Nav.Link>
            <Nav.Link href="#store">Music Store</Nav.Link>
            <Nav.Link href="#contact">Contact us</Nav.Link>
          </Nav>
          <div className="header-actions">
            <button className="search-btn">
              <Search size={20} />
            </button>
            <Button className="btn-signup">Sign Up</Button>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
