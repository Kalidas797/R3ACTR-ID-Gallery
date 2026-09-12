import React from 'react';
import { Linkedin, Instagram, Github, Mail, Globe } from 'lucide-react';
import { profile } from '../data/profile';
import './SocialLinks.css';

const SocialLinks = () => {
  const iconMap = {
    linkedin: <Linkedin size={20} />,
    instagram: <Instagram size={20} />,
    github: <Github size={20} />,
    email: <Mail size={20} />,
    portfolio: <Globe size={20} />
  };

  const labelMap = {
    linkedin: 'LINKEDIN',
    instagram: 'INSTAGRAM',
    github: 'GITHUB',
    email: 'EMAIL',
    portfolio: 'PORTFOLIO'
  };

  const activeSocials = Object.entries(profile.socials).filter(([_, url]) => url !== null);

  return (
    <div className="socials-container">
      <div className="profile-info">
        <h1 className="profile-name">{profile.name}</h1>
        <h2 className="profile-role">{profile.role}</h2>
      </div>
      
      <div className="connect-heading">CONNECT WITH ME</div>
      
      <div className="social-links">
        {activeSocials.map(([platform, url]) => (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="social-button"
            aria-label={`Connect on ${labelMap[platform]}`}
          >
            <span className="social-icon">{iconMap[platform]}</span>
            <span className="social-label">{labelMap[platform]}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default SocialLinks;
