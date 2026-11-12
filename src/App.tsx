import { useEffect, useState } from 'react';
import { api } from './lib/api';
import { usePath } from './lib/router';
import type { SiteData } from './lib/types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { IconWhatsapp } from './components/Icons';
import Home from './pages/Home';
import Booking from './pages/Booking';
import Admin from './pages/Admin';

export default function App() {
  const path = usePath();
  const [site, setSite] = useState<SiteData | null>(null);

  useEffect(() => {
    let active = true;
    api
      .site()
      .then((data) => {
        if (active) setSite(data);
      })
      .catch(() => {
        /* header/footer usam valores padrão */
      });
    return () => {
      active = false;
    };
  }, []);

  if (path === '/admin') return <Admin />;

  const page = path === '/agendar' ? <Booking /> : <Home />;

  return (
    <div className="app-shell">
      <Header whatsappLink={site?.shop.whatsappLink} />
      <main>{page}</main>
      <Footer shop={site?.shop} />
      {site && (
        <a
          className="floating-whats"
          href={site.shop.whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar com a ELITE BARBER no WhatsApp"
        >
          <IconWhatsapp width={22} height={22} />
        </a>
      )}
    </div>
  );
}
