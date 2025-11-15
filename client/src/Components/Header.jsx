import { Link } from 'react-router-dom';
import '../styles/Header.css';

function Header() {
  return (
    <header className="header">
      <Link to="/" className="header-logo">
        Dispatch
      </Link>
    </header>
  );
}

export default Header;

