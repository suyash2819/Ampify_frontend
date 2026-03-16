import { Container, Row, Col, Button } from "react-bootstrap";
import "./Hero.css";

export default function Hero() {
  return (
    <section className="hero-section">
      <Container>
        <Row className="align-items-center min-vh-90">
          <Col lg={6} className="hero-content">
            <p className="hero-label">STAY IN TUNE</p>
            <h1 className="hero-title">
              Life Is One Grand Sweet Song So Start The Music
            </h1>
            <p className="hero-description">
              Music is your own experience, your thoughts, your wisdom. If you
              don't live it, it won't come out of your horn.
            </p>

            <div className="hero-buttons">
              <Button className="btn-primary-hero">Get Started</Button>
              <Button className="btn-secondary-hero">
                <span>📱</span> Download for iOS
              </Button>
            </div>
          </Col>

          <Col lg={6} className="hero-cards-container">
            <div className="card card-main">
              <img src="/images/selena-gomez.webp" alt="Selena Gomez" />
              <div className="card-label">SELENA GOMEZ</div>
            </div>

            <div className="card card-clash">
              <img src="/images/weekend.webp" alt="WEEKEND" />
              <div className="card-label">WEEKEND</div>
            </div>

            <div className="card card-side">
              <img src="/images/general1.jpg" alt="Artist" />
            </div>
          </Col>
        </Row>

        <Row className="hero-stats">
          <Col md={6} className="stats-left">
            <p className="stats-text">
              Trusted by over 50k users worldwide since 2010
            </p>
          </Col>
          <Col md={6} className="stats-right">
            <div className="stat-item">
              <div className="stat-value">4.9</div>
              <div className="stat-label">Top Rated</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">100k+</div>
              <div className="stat-label">Music Downloads</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">200+</div>
              <div className="stat-label">Top Singers</div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
}
