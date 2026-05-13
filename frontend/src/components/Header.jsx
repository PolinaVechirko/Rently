import { useEffect, useState } from 'react';
import './Header.css';
// icon stored in assets/images folder
import userIcon from '../assets/images/user-icon.png';

/**
 * Header component shared across pages.
 * - initially 20px from top, becomes sticky when scrolling
 * - white rectangle background, with fixed height (80px)
 * - uses DM Sans font (loaded globally)
 */
function Header() {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`app-header ${isSticky ? 'sticky' : ''}`}>
      <div className="header-content">
        <div className="logo">RENTLY</div>
        <nav className="nav-menu">
          <a href="#" className="nav-link">
            HOME
          </a>
          <a href="#" className="nav-link">
            ABOUT
          </a>
          <a href="#" className="nav-link">
            ACCOMMODATIONS
          </a>
          <a href="#" className="nav-link">
              BECOME A HOST
            </a>
        </nav>
        <img src={userIcon} className="user-icon" alt="User" />
      </div>
    </header>
  );
}

export default Header;
