import { Link } from '../lib/router';
import { Logo } from './Logo';
import { IconLock, IconWhatsapp } from './Icons';
import type { ShopSettings } from '../lib/types';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function Footer({ shop }: { shop?: ShopSettings & { whatsappLink?: string } }) {
  const workDays = shop?.workDays ?? [1, 2, 3, 4, 5, 6];
  const hours = `${shop?.openingTime ?? '09:00'} às ${shop?.closingTime ?? '19:00'}`;
  const whatsapp = shop?.whatsappLink ?? 'https://wa.me/5521979596565';

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo size={48} subtitle="SEU ESTILO, NOSSA EXCELÊNCIA" />
          <p>
            Barbearia premium com atendimento personalizado, ambiente reservado e agendamento online para você não
            perder tempo na espera.
          </p>
          <a className="footer-whats" href={whatsapp} target="_blank" rel="noopener noreferrer">
            <IconWhatsapp />
            Falar no WhatsApp
          </a>
        </div>

        <div className="footer-column">
          <h4>Navegação</h4>
          <Link to="/">Início</Link>
          <Link to="/#servicos">Serviços</Link>
          <Link to="/#equipe">Equipe</Link>
          <Link to="/agendar">Agendar horário</Link>
        </div>

        <div className="footer-column">
          <h4>Atendimento</h4>
          {workDays.map((day) => (
            <span key={day} className="footer-static">
              {DAY_NAMES[day]} · {hours}
            </span>
          ))}
        </div>

        <div className="footer-column">
          <h4>Área restrita</h4>
          <Link to="/admin" className="footer-admin">
            <IconLock width={16} height={16} /> Painel administrativo
          </Link>
          <p className="footer-hint">
            Gerencie agendamentos, serviços, preços, equipe e bloqueios de horário.
          </p>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} ELITE BARBER · Todos os direitos reservados.</span>
        <span>Serviços e equipe demonstrativos — editáveis no painel administrativo.</span>
      </div>
    </footer>
  );
}
