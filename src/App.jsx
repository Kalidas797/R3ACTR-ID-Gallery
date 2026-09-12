import React, { useEffect, useState, Suspense } from 'react';
import SocialLinks from './components/SocialLinks';
import Lanyard from './components/Lanyard/Lanyard';
import './App.css';

function App() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div className="app-container">
      {/* Brand header */}
      <header className="brand-header">R.3.A.C.T.R</header>

      {/* 3D Lanyard section */}
      <Lanyard
        position={[0, 0, isMobile ? 19 : 12]} // Dynamic zoom: slightly further back on mobile so it fits the narrow screen
        gravity={[0, -40, 0]}
        frontImage="/id-card.png"
        imageFit="contain" // Using contain to not crop the ID card image
        lanyardWidth={1}
      />

      {/* Social links below the canvas */}
      <SocialLinks />
    </div>
  );
}

export default App;
