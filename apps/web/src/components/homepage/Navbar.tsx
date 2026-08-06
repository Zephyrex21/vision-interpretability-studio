import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Code2, Eye, Menu, X } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import styles from './Navbar.module.css';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it\u2019s built' },
  { href: '#tech', label: 'Tech' },
];

const GITHUB_URL = 'https://github.com/Zephyrex21/vision-interpretability-studio';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu automatically if the viewport grows back past
  // the breakpoint (e.g. rotating a tablet), so it can't get stuck open.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 641px)');
    const close = () => setMobileOpen(false);
    mq.addEventListener('change', close);
    return () => mq.removeEventListener('change', close);
  }, []);

  return (
    <header className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ''}`}>
      <div className={`${styles.inner} glass-panel-strong`}>
        <a href="#top" className={styles.brand}>
          <span className={styles.brandIcon} aria-hidden="true">
            <Eye size={14} strokeWidth={2} />
          </span>
          <span className={styles.brandName}>Vision Interpretability Studio</span>
        </a>

        <nav className={styles.links} aria-label="Page sections">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={styles.link}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.iconLink}
            aria-label="View source on GitHub"
          >
            <Code2 size={17} strokeWidth={1.8} />
          </a>
          <ThemeToggle />
          <Link to="/app" className={styles.cta}>
            Launch Studio
            <ArrowRight size={15} strokeWidth={2} />
          </Link>

          <button
            type="button"
            className={styles.menuButton}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className={`${styles.mobilePanel} glass-panel-strong`}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={styles.mobileLink}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mobileLink}
          >
            GitHub
          </a>
          <Link to="/app" className={styles.mobileCta} onClick={() => setMobileOpen(false)}>
            Launch Studio
            <ArrowRight size={15} strokeWidth={2} />
          </Link>
        </div>
      )}
    </header>
  );
}
