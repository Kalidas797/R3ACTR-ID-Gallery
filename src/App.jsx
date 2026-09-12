import React, { useEffect, useState, Suspense } from 'react';
import SocialLinks from './components/SocialLinks';
import Lanyard from './components/Lanyard/Lanyard';
import './App.css';

// EDIT THIS CONSTANT TO CHANGE YOUR ID CARD IMAGE
// Both .png and .svg are fully supported! (For SVG, ensure it has width/height attributes in the file)
const ID_CARD_IMAGE = "/Neeraj_ID.png";

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
      <header className="brand-header">
        <img src="/g458.svg" alt="R.3.A.C.T.R Logo" className="brand-logo" />
      </header>

      {/* 3D Lanyard section */}
      <Lanyard
        position={[0, 0, isMobile ? 19 : 10]} // Dynamic zoom: slightly further back on mobile so it fits the narrow screen
        gravity={[0, -40, 0]}
        frontImage={ID_CARD_IMAGE}
        imageFit="fill" // Stretches the image to fit perfectly without trimming or leaving edges
        lanyardWidth={1}
      />

      {/* Social links below the canvas */}
      <SocialLinks />
    </div>
  );
}

export default App;
