# 🎨 React Component Animation Implementation Examples

Quick copy-paste examples for integrating animations into each component.

---

## 1. HERO COMPONENT

```tsx
// Hero.tsx
import React, { useEffect } from 'react';
import './Hero.css';

export const Hero = () => {
  return (
    <section className="hero-section">
      <div className="hero-container animate-heroFadeIn">
        <h1 className="hero-title animate-slideInLeft">
          Welcome to Our Alumni Network
        </h1>
        <p 
          className="hero-subtitle animate-slideInRight" 
          style={{ animationDelay: '0.2s' }}
        >
          Connected. Celebrated. Growing Together.
        </p>
        
        <button 
          className="hero-cta button-animated"
          style={{ animationDelay: '0.4s' }}
        >
          Explore Alumni Stories
        </button>
      </div>
      
      {/* Glassmorphic overlay card */}
      <div className="hero-card glass-card animate-scaleIn">
        <h3>Discover Your Alumni Community</h3>
        <p>Connect with thousands of successful graduates</p>
      </div>
    </section>
  );
};
```

### Hero CSS

```css
/* Hero.css */
.hero-section {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
}

.hero-container {
  text-align: center;
  max-width: 800px;
  z-index: 2;
}

.hero-title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: clamp(1rem, 2vw, 1.5rem);
  opacity: 0.9;
  margin-bottom: 2rem;
}

.hero-cta {
  padding: 1rem 2rem;
  font-size: 1.1rem;
  border: none;
  cursor: pointer;
  border-radius: 0.75rem;
}

.hero-card {
  position: absolute;
  bottom: 40px;
  right: 40px;
  max-width: 300px;
  padding: 2rem;
  backdrop-filter: blur(20px);
}

@media (max-width: 768px) {
  .hero-card {
    bottom: 20px;
    right: 20px;
    max-width: 90%;
  }
}
```

---

## 2. STATS BAR COMPONENT

```tsx
// StatsBar.tsx
import React from 'react';

interface Stat {
  number: string;
  label: string;
  icon?: string;
}

export const StatsBar = () => {
  const stats: Stat[] = [
    { number: '15K+', label: 'Alumni Members' },
    { number: '95%', label: 'Success Rate' },
    { number: '50+', label: 'Countries' },
    { number: '1M+', label: 'Jobs Placed' },
  ];

  return (
    <section className="stats-section">
      <div className="stats-container">
        {stats.map((stat, index) => (
          <div 
            key={index}
            className="stat-card animate-scaleIn"
            style={{ animationDelay: `${index * 0.15}s` }}
          >
            <div className="stat-number animate-pulse-glow">
              {stat.number}
            </div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-bg"></div>
          </div>
        ))}
      </div>
    </section>
  );
};
```

### Stats Bar CSS

```css
/* Add to index.css */
.stats-section {
  padding: 4rem 2rem;
  background: var(--bg-secondary);
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.stat-card {
  position: relative;
  padding: 2rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 1rem;
  text-align: center;
  overflow: hidden;
  transition: all 0.3s ease;
  will-change: transform;
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent);
  box-shadow: 0 12px 28px -8px rgba(0, 29, 57, 0.3);
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-bg {
  position: absolute;
  top: 0;
  right: -50%;
  width: 200%;
  height: 100%;
  background: linear-gradient(
    135deg,
    transparent 0%,
    rgba(123, 189, 232, 0.05) 50%,
    transparent 100%
  );
  animation: gradientFlow 3s ease infinite;
  z-index: -1;
}
```

---

## 3. TIMELINE COMPONENT

```tsx
// Timeline.tsx
import React from 'react';

interface TimelineEvent {
  year: string;
  title: string;
  description: string;
}

export const Timeline = () => {
  const events: TimelineEvent[] = [
    { year: '2015', title: 'Founded', description: 'Alumni network established' },
    { year: '2017', title: 'Global Expansion', description: 'Reached 50 countries' },
    { year: '2019', title: 'Milestone', description: '10,000 members joined' },
    { year: '2023', title: 'Innovation', description: 'Launch new platform' },
    { year: '2024', title: 'Growth', description: 'Record engagement' },
  ];

  return (
    <section className="timeline-section">
      <div className="timeline-container">
        <div className="timeline-line animate-slideInDown"></div>
        
        <div className="timeline-wrapper">
          {events.map((event, index) => (
            <div 
              key={index}
              className="timeline-item stagger-item"
              style={{ '--index': index } as React.CSSProperties}
            >
              <div className="timeline-marker animate-pulse-glow"></div>
              <div className="timeline-content">
                <h3 className="timeline-year">{event.year}</h3>
                <h4 className="timeline-title">{event.title}</h4>
                <p className="timeline-description">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
```

### Timeline CSS

```css
.timeline-section {
  padding: 4rem 2rem;
  background: var(--bg-primary);
}

.timeline-container {
  max-width: 900px;
  margin: 0 auto;
  position: relative;
}

.timeline-line {
  position: absolute;
  left: 50%;
  top: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, var(--accent) 0%, transparent 100%);
  transform: translateX(-50%);
}

.timeline-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.timeline-item {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 2rem;
  align-items: center;
  opacity: 0;
  animation: fadeInUp 0.6s ease forwards;
}

.timeline-marker {
  width: 24px;
  height: 24px;
  background: var(--accent);
  border-radius: 50%;
  position: relative;
  z-index: 2;
}

.timeline-marker::before {
  content: '';
  position: absolute;
  inset: -8px;
  border: 2px solid var(--accent);
  border-radius: 50%;
  opacity: 0;
  animation: ripple 1.5s ease infinite;
}

.timeline-content {
  padding: 1.5rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 1rem;
  transition: all 0.3s ease;
}

.timeline-item:hover .timeline-content {
  background: var(--bg-secondary);
  border-color: var(--accent);
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.timeline-year {
  font-size: 0.9rem;
  color: var(--accent);
  font-weight: 700;
}

.timeline-title {
  font-size: 1.3rem;
  margin: 0.5rem 0;
  color: var(--text-primary);
}

.timeline-description {
  font-size: 0.95rem;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .timeline-line {
    left: 0;
  }

  .timeline-item {
    grid-template-columns: auto 1fr;
    padding-left: 2rem;
  }

  .timeline-item:nth-child(odd) {
    text-align: left;
  }
}
```

---

## 4. ALUMNI CARD COMPONENT

```tsx
// AlumniCard.tsx
import React, { useState } from 'react';

interface Alumni {
  id: string;
  name: string;
  title: string;
  company: string;
  image: string;
  bio: string;
  links: Array<{ icon: string; url: string }>;
}

export const AlumniCard = ({ alumni }: { alumni: Alumni }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="alumni-card card-animated hover-lift"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="alumni-image">
        <img src={alumni.image} alt={alumni.name} loading="lazy" />
        <div className="alumni-overlay" style={{
          opacity: isHovered ? 1 : 0,
        }}>
          <p className="alumni-bio">{alumni.bio}</p>
        </div>
      </div>
      
      <div className="alumni-content">
        <h3 className="alumni-name">{alumni.name}</h3>
        <p className="alumni-title">{alumni.title}</p>
        <p className="alumni-company">{alumni.company}</p>
        
        <div className="alumni-links">
          {alumni.links.map((link, idx) => (
            <a 
              key={idx}
              href={link.url}
              className="alumni-link"
              title={link.icon}
            >
              {link.icon}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### Alumni Card CSS

```css
.alumni-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 1.25rem;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.alumni-image {
  position: relative;
  width: 100%;
  padding-bottom: 100%; /* 1:1 aspect ratio */
  overflow: hidden;
  background: var(--bg-secondary);
}

.alumni-image img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.alumni-card:hover .alumni-image img {
  transform: scale(1.08);
}

.alumni-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10, 65, 116, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s ease;
  z-index: 2;
}

.alumni-bio {
  color: white;
  text-align: center;
  padding: 1rem;
  font-size: 0.9rem;
  line-height: 1.6;
}

.alumni-content {
  padding: 1.5rem;
}

.alumni-name {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  color: var(--text-primary);
}

.alumni-title {
  font-size: 0.9rem;
  color: var(--accent);
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.alumni-company {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.alumni-links {
  display: flex;
  gap: 0.75rem;
}

.alumni-link {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  text-decoration: none;
  cursor: pointer;
}

.alumni-link:hover {
  background: var(--accent);
  transform: translateY(-3px) scale(1.1);
}

@media (max-width: 768px) {
  .alumni-overlay {
    opacity: 0.9;
  }
}
```

---

## 5. DEPARTMENT CARD COMPONENT

```tsx
// DepartmentCard.tsx
import React from 'react';

interface Department {
  id: string;
  name: string;
  icon: string;
  color1: string;
  color2: string;
  members: number;
  description: string;
}

export const DepartmentCard = ({ dept }: { dept: Department }) => {
  return (
    <div 
      className="department-card animate-scaleIn"
      style={{
        '--dept-color-1': dept.color1,
        '--dept-color-2': dept.color2,
      } as React.CSSProperties}
    >
      <div className="dept-icon">{dept.icon}</div>
      <h3 className="dept-name">{dept.name}</h3>
      <p className="dept-description">{dept.description}</p>
      
      <div className="dept-footer">
        <span className="dept-members">{dept.members}+ Members</span>
        <button className="dept-cta button-animated">
          View Members →
        </button>
      </div>
    </div>
  );
};
```

### Department Card CSS

```css
.department-card {
  background: linear-gradient(
    135deg,
    var(--dept-color-1),
    var(--dept-color-2)
  );
  border-radius: 1.5rem;
  padding: 2rem;
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  perspective: 1000px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  color: white;
}

.department-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.2), transparent);
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.department-card:hover {
  transform: rotateY(3deg) rotateX(3deg) translateY(-8px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.department-card:hover::before {
  opacity: 1;
}

.dept-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  animation: float 4s ease-in-out infinite;
  transition: transform 0.3s ease;
}

.department-card:hover .dept-icon {
  transform: scale(1.1) rotate(5deg) translateY(-4px);
}

.dept-name {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.dept-description {
  font-size: 0.95rem;
  opacity: 0.95;
  margin-bottom: auto;
  line-height: 1.6;
}

.dept-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.dept-members {
  font-size: 0.9rem;
  font-weight: 600;
  opacity: 0.9;
}

.dept-cta {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 0.6rem 1.2rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.dept-cta:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: white;
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .department-card {
    min-height: 250px;
  }

  .dept-icon {
    font-size: 2.5rem;
  }
}
```

---

## 6. CTA BUTTON COMPONENT

```tsx
// CTAButton.tsx
import React from 'react';

interface CTAButtonProps {
  text: string;
  onClick?: () => void;
  pulse?: boolean;
  className?: string;
}

export const CTAButton = ({ text, onClick, pulse, className }: CTAButtonProps) => {
  return (
    <button
      className={`cta-button button-animated ${pulse ? 'animate-glow-pulse' : ''} ${className || ''}`}
      onClick={onClick}
    >
      <span className="button-text">{text}</span>
      <span className="button-shine"></span>
    </button>
  );
};
```

### CTA Button CSS

```css
.cta-button {
  background: var(--accent);
  color: white;
  padding: 0.875rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all var(--motion-duration-medium) var(--motion-ease);
  will-change: transform, box-shadow;
}

.cta-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  transform: translateX(-100%);
  transition: transform 0.5s ease;
}

.cta-button:hover::before {
  transform: translateX(100%);
}

.cta-button:hover {
  transform: scale(1.05) translateY(-2px);
  box-shadow: 
    0 0 30px rgba(123, 189, 232, 0.6),
    0 12px 24px rgba(0, 29, 57, 0.3);
}

.cta-button:active {
  transform: scale(0.98);
}

.button-text {
  position: relative;
  z-index: 1;
}

@media (prefers-reduced-motion: reduce) {
  .cta-button {
    animation: none;
  }

  .cta-button:hover {
    transform: none;
  }
}
```

---

## 7. NAVBAR COMPONENT

```tsx
// Navbar.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const Navbar = () => {
  const [activeLink, setActiveLink] = useState('home');

  const links = ['Home', 'About', 'Alumni', 'Events', 'Contact'];

  return (
    <nav className="glass-nav navbar-animated">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          Alumni Network
        </Link>
        
        <ul className="nav-menu">
          {links.map((link) => (
            <li key={link}>
              <Link
                to={`/${link.toLowerCase()}`}
                className={`nav-link link-animated ${
                  activeLink === link.toLowerCase() ? 'active' : ''
                }`}
                onClick={() => setActiveLink(link.toLowerCase())}
              >
                {link}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};
```

### Navbar CSS

```css
.navbar-animated {
  animation: slideInDown 0.6s ease;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
  text-decoration: none;
  transition: all 0.3s ease;
}

.nav-logo:hover {
  transform: scale(1.05);
}

.nav-menu {
  display: flex;
  gap: 0;
  list-style: none;
}

.nav-link {
  color: var(--text-primary);
  padding: 0.75rem 1.25rem;
  text-decoration: none;
  position: relative;
  transition: all var(--motion-duration-medium) var(--motion-ease);
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--accent);
  transition: width var(--motion-duration-medium) var(--motion-ease);
}

.nav-link:hover {
  color: var(--accent);
  transform: translateY(-2px);
}

.nav-link:hover::after {
  width: 100%;
}

.nav-link.active {
  color: var(--accent);
  box-shadow: 0 0 15px var(--glow-color);
  border-radius: 0.5rem;
}

.nav-link.active::after {
  width: 100%;
}

@media (max-width: 768px) {
  .nav-menu {
    flex-direction: column;
    gap: 0.5rem;
  }

  .nav-container {
    flex-direction: column;
    gap: 1rem;
  }
}
```

---

## 8. FOOTER COMPONENT

```tsx
// Footer.tsx
import React from 'react';

export const Footer = () => {
  return (
    <footer className="footer-section">
      <div className="footer-content animate-fadeInUp">
        <div className="footer-column">
          <h4>Alumni Network</h4>
          <p>Connecting and empowering our graduate community</p>
        </div>
        
        <div className="footer-column">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="#" className="link-animated footer-link">About</a></li>
            <li><a href="#" className="link-animated footer-link">Members</a></li>
            <li><a href="#" className="link-animated footer-link">Events</a></li>
          </ul>
        </div>
        
        <div className="footer-column">
          <h4>Connect</h4>
          <div className="social-icons">
            {['LinkedIn', 'Twitter', 'Facebook'].map((social) => (
              <a 
                key={social}
                href="#"
                className="social-icon link-animated"
              >
                {social[0]}
              </a>
            ))}
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; 2024 Alumni Network. All rights reserved.</p>
      </div>
    </footer>
  );
};
```

### Footer CSS

```css
.footer-section {
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  padding: 4rem 2rem 2rem;
  margin-top: 4rem;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 3rem;
  animation: fadeInUp 0.8s ease;
}

.footer-column h4 {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
  font-weight: 600;
}

.footer-column p {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
}

.footer-column ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.footer-link {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--motion-duration-medium) var(--motion-ease);
}

.footer-link:hover {
  color: var(--accent);
}

.social-icons {
  display: flex;
  gap: 1rem;
}

.social-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border-radius: 0.5rem;
  color: var(--text-primary);
  transition: all 0.3s ease;
  text-decoration: none;
  font-weight: 700;
}

.social-icon:hover {
  background: var(--accent);
  color: white;
  transform: translateY(-4px) scale(1.15);
}

.footer-bottom {
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.9rem;
}
```

---

## Quick Implementation Checklist

- [ ] Copy `animations-additions.css` and add to project
- [ ] Import animations in component files
- [ ] Add animation classes to JSX elements
- [ ] Test animations on desktop & mobile
- [ ] Verify reduced-motion preferences work
- [ ] Check performance on slower devices
- [ ] Get user feedback on animation timing
- [ ] Adjust delays and durations as needed

---

## Tips for Success

💡 **Performance:**
- Use `will-change` sparingly on animated elements
- Test on real devices
- Monitor frame rates

💡 **UX:**
- Animations should be snappy (< 1 second for interactions)
- Keep motion purposeful and not distracting
- Support dark/light mode transitions  

💡 **Accessibility:**
- Always respect `prefers-reduced-motion`
- Provide text alternatives to animated info
- Test keyboard navigation

---

Ready to implement? Start with the Hero and Stats components for maximum impact! 🚀
