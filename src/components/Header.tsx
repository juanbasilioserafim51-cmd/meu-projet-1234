import { useEffect, useState } from 'react';
import { Link, usePath } from '../lib/router';
import { Logo } from './Logo';
import { IconClose, IconMenu, IconWhatsapp } from './Icons';

const links = [
  { to: '/', label: 'Início' },
  { to: '/#servicos', label: 'Serviços' },
  { to: '/#equipe', label: 'Equipe' },
  { to: '/#experiencia', label: 'Experiência' },
];

export function Header({ whatsappLink }: { whatsappLink?: string }) {
  const path = usePath();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container header-inner">
        <Link to="/" className="header-brand" aria-label="ELITE BARBER — página inicial">
          <Logo />
        </Link>

        <nav className={`site-nav ${open ? 'is-open' : ''}`} aria-label="Navegação principal">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="nav-link" onNavigate={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link to="/agendar" className="nav-link nav-link-cta" onNavigate={() => setOpen(false)}>
            Agendar
          </Link>
          {whatsappLink && (
            <a
              className="nav-whats"
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Falar no WhatsApp"
            >
              <IconWhatsapp />
            </a>
          )}
        </nav>

        <div className="header-actions">
          <Link to="/agendar" className="btn btn-gold btn-sm header-cta">
            AGENDAR HORÁRIO
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>
    </header>
  );
}
