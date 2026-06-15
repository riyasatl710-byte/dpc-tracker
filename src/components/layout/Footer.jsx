/**
 * Footer.jsx — Simple layout footer.
 */
import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p className="footer__text">
          &copy; {new Date().getFullYear()} DPC Tracker. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
