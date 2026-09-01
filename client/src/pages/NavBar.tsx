import { useAuth0 } from "@auth0/auth0-react";
import { Link, NavLink } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import './NavBar.css';

const NavBar = () => {
  const { logout, isAuthenticated, loginWithRedirect, user, isLoading } = useAuth0();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  if (isLoading) {
    return (
      <header className="stm-header">
        <div className="stm-header-inner">
          <Link to="/" className="stm-logo">
            <div className="stm-logo-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="stm-logo-text">SmartTask</span>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="stm-header">
        <div className="stm-header-inner">

          {/* Brand */}
          <Link to="/" className="stm-logo">
            <div className="stm-logo-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="stm-logo-text">SmartTask</span>
          </Link>

          {/* Desktop navigation */}
          {isAuthenticated && (
            <nav className="stm-nav">
              <NavLink to="/" end className={({ isActive }) => `stm-nav-link${isActive ? ' stm-nav-active' : ''}`}>
                Home
              </NavLink>
              <NavLink to="/Tasks" className={({ isActive }) => `stm-nav-link${isActive ? ' stm-nav-active' : ''}`}>
                Tasks
              </NavLink>
              <NavLink to="/Calendar" className={({ isActive }) => `stm-nav-link${isActive ? ' stm-nav-active' : ''}`}>
                Calendar
              </NavLink>
              <NavLink to="/Charts" className={({ isActive }) => `stm-nav-link${isActive ? ' stm-nav-active' : ''}`}>
                Charts
              </NavLink>
              <NavLink to="/TaskAgent" className={({ isActive }) => `stm-nav-link stm-nav-agent${isActive ? ' stm-nav-active' : ''}`}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="url(#stm-sparkle)" aria-hidden="true">
                  <defs>
                    <linearGradient id="stm-sparkle" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#6366f1" />
                      <stop offset="1" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                  <path d="M12 2l1.6 4.6L18 8.2l-4.4 1.6L12 14.4l-1.6-4.6L6 8.2l4.4-1.6L12 2z" />
                  <path d="M18.5 13l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" />
                </svg>
                Task Agent
              </NavLink>
              <NavLink to="/NewTask" className="stm-nav-link stm-nav-new">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Task
              </NavLink>
            </nav>
          )}

          {/* Right: user area */}
          <div className="stm-header-right">
            {!isAuthenticated ? (
              <button className="stm-login-btn" onClick={() => loginWithRedirect()}>
                Log In
              </button>
            ) : (
              <div className="stm-user-section" ref={dropdownRef}>
                <button
                  className="stm-user-trigger"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="stm-avatar">{getInitials(user?.name)}</div>
                  <span className="stm-user-name">{user?.name?.split(' ')[0]}</span>
                  <svg
                    className={`stm-chevron${dropdownOpen ? ' stm-chevron-open' : ''}`}
                    width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="stm-dropdown">
                    <div className="stm-dropdown-head">
                      <div className="stm-dd-name">{user?.name}</div>
                      <div className="stm-dd-email">{user?.email}</div>
                    </div>
                    <Link
                      to="/UserRoutine"
                      className="stm-dd-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" />
                      </svg>
                      My Routine Profile
                    </Link>
                    <div className="stm-dd-divider" />
                    <button className="stm-dd-item stm-dd-danger" onClick={handleLogout}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile hamburger (authenticated) */}
          {isAuthenticated && (
            <button
              className="stm-hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          )}

          {/* Mobile login button (unauthenticated) */}
          {!isAuthenticated && (
            <button className="stm-hamburger-login" onClick={() => loginWithRedirect()}>
              Log In
            </button>
          )}

        </div>
      </header>

      {/* Mobile slide-down menu */}
      {isAuthenticated && mobileMenuOpen && (
        <div className="stm-mobile-menu">
          <div className="stm-mobile-user">
            <div className="stm-avatar stm-avatar-lg">{getInitials(user?.name)}</div>
            <div>
              <div className="stm-mobile-name">{user?.name}</div>
              <div className="stm-mobile-email">{user?.email}</div>
            </div>
          </div>
          <div className="stm-dd-divider" />
          <Link to="/" className="stm-mobile-link" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <Link to="/Tasks" className="stm-mobile-link" onClick={() => setMobileMenuOpen(false)}>Tasks</Link>
          <Link to="/Calendar" className="stm-mobile-link" onClick={() => setMobileMenuOpen(false)}>Calendar</Link>
          <Link to="/Charts" className="stm-mobile-link" onClick={() => setMobileMenuOpen(false)}>Charts</Link>
          <Link to="/TaskAgent" className="stm-mobile-link" onClick={() => setMobileMenuOpen(false)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="url(#stm-sparkle-m)" aria-hidden="true" style={{ marginRight: 8, verticalAlign: 'text-bottom' }}>
              <defs>
                <linearGradient id="stm-sparkle-m" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#6366f1" />
                  <stop offset="1" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <path d="M12 2l1.6 4.6L18 8.2l-4.4 1.6L12 14.4l-1.6-4.6L6 8.2l4.4-1.6L12 2z" />
              <path d="M18.5 13l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" />
            </svg>
            Task Agent
          </Link>
          <Link to="/NewTask" className="stm-mobile-link stm-mobile-link-new" onClick={() => setMobileMenuOpen(false)}>
            + New Task
          </Link>
          <div className="stm-dd-divider" />
          <Link to="/UserRoutine" className="stm-mobile-link" onClick={() => setMobileMenuOpen(false)}>
            My Routine Profile
          </Link>
          <button className="stm-mobile-link stm-mobile-logout" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      )}
    </>
  );
};

export default NavBar;
