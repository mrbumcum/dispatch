import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import dispatchImage from '../assets/dispatch-image.png';
import '../styles/HomePage.css';

function HomePage() {
  useEffect(() => {
    // Disable scrolling when homepage mounts
    document.body.style.overflow = 'hidden';
    
    // Re-enable scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="homepage-container">
      <img src={dispatchImage} alt="Dispatch" className="homepage-background" />
      <div className="homepage-content">
        <h1 className="homepage-title">Dispatch</h1>
        <div className="homepage-nav-boxes">
          <Link to="/response-area" className="nav-box">
            Response Area
          </Link>
          <Link to="/simulated-radio" className="nav-box">
            Simulated Radio
          </Link>
          <Link to="/simulated-patient" className="nav-box">
            Simulated Patient
          </Link>
          <Link to="/flashcards" className="nav-box">
            Flashcards
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
