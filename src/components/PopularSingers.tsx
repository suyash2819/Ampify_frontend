import { Container, Row, Col } from "react-bootstrap";
import "./PopularSingers.css";

interface Singer {
  id: number;
  name: string;
  genre: string;
  rating: number;
  image: string;
}

const singers: Singer[] = [
  {
    id: 1,
    name: "Selena Gomez",
    genre: "Pop/R&B",
    rating: 4.8,
    image: "/images/selena-gomez.webp",
  },
  {
    id: 2,
    name: "Zayn Malik",
    genre: "Pop R&B",
    rating: 4.7,
    image: "/images/weekend.webp",
  },
  {
    id: 3,
    name: "Camila Cabello",
    genre: "Pop Singer",
    rating: 4.7,
    image: "/images/artist-3.jpg",
  },
  {
    id: 4,
    name: "Harry Styles",
    genre: "Soft Rock",
    rating: 4.6,
    image: "/images/artist-4.jpg",
  },
];

export default function PopularSingers() {
  return (
    <section className="popular-singers">
      <Container>
        <h2 className="singers-title">Popular Singer</h2>

        <Row className="singers-grid">
          {singers.map((singer) => (
            <Col key={singer.id} lg={10} md={6} sm={12} className="mb-6">
              <div className="singer-card">
                <div className="singer-image">
                  <img src={singer.image} alt={singer.name} />
                  <div className="singer-overlay">
                    <button className="play-btn">▶</button>
                  </div>
                </div>
                <div className="singer-info">
                  <h3 className="singer-name">{singer.name}</h3>
                  <p className="singer-genre">{singer.genre}</p>
                  <div className="singer-rating">
                    <span className="stars">★</span>
                    <span className="rating-value">{singer.rating}</span>
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
}
