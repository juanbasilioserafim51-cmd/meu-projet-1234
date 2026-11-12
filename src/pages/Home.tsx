import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { SiteData } from '../lib/types';
import { Link } from '../lib/router';
import { brl, dateShort, durationLabel } from '../lib/format';
import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconClock,
  IconRazor,
  IconScissors,
  IconShield,
  IconSparkle,
  IconStar,
  IconWhatsapp,
} from '../components/Icons';

const STEPS = [
  {
    icon: <IconCalendar />,
    title: 'Escolha o serviço',
    text: 'Selecione o corte, a barba ou a combinação completa que combina com você.',
  },
  {
    icon: <IconClock />,
    title: 'Escolha o horário',
    text: 'A agenda mostra apenas horários livres do barbeiro escolhido, em tempo real.',
  },
  {
    icon: <IconWhatsapp />,
    title: 'Confirme no WhatsApp',
    text: 'Seu horário é registrado e a mensagem de confirmação abre pronta no WhatsApp.',
  },
];

export default function Home() {
  const [site, setSite] = useState<SiteData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .site()
      .then((data) => {
        if (active) setSite(data);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const services = site?.services ?? [];
  const barbers = site?.barbers ?? [];

  return (
    <>
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">
              <IconSparkle width={14} height={14} /> Barbearia premium
            </span>
            <h1>
              Seu estilo,
              <br />
              <span className="gold-text">nossa excelência</span>
            </h1>
            <p className="hero-text">
              Cortes clássicos, barba tradicional e acabamento impecável em um ambiente pensado para o homem que valoriza
              cada detalhe. Agende online e receba a confirmação direto no WhatsApp.
            </p>
            <div className="hero-actions">
              <Link to="/agendar" className="btn btn-gold">
                AGENDAR HORÁRIO <IconArrowRight width={18} height={18} />
              </Link>
              <Link to="/#servicos" className="btn btn-ghost">
                Ver serviços
              </Link>
            </div>
            <ul className="hero-trust">
              <li>
                <IconCheck width={16} height={16} /> Agenda online
              </li>
              <li>
                <IconCheck width={16} height={16} /> Confirmação no WhatsApp
              </li>
              <li>
                <IconCheck width={16} height={16} /> Atendimento personalizado
              </li>
            </ul>
          </div>

          <aside className="hero-card">
            <div className="hero-card-top">
              <span className="hero-card-label">Horário de funcionamento</span>
              <span className="hero-card-hours">
                {site ? `${site.shop.openingTime} — ${site.shop.closingTime}` : '09:00 — 19:00'}
              </span>
            </div>
            <div className="hero-card-body">
              <div className="hero-card-row">
                <span>Atendimento</span>
                <strong>
                  {site
                    ? site.shop.workDays
                        .map((day) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][day])
                        .join(' · ')
                    : 'Seg · Ter · Qua · Qui · Sex · Sáb'}
                </strong>
              </div>
              <div className="hero-card-row">
                <span>Duração média</span>
                <strong>20 a 70 minutos</strong>
              </div>
              <div className="hero-card-row">
                <span>Agenda aberta</span>
                <strong>Próximos {site?.shop.maxDaysAhead ?? 60} dias</strong>
              </div>
              <div className="hero-card-divider" />
              <p className="hero-card-note">
                Reserve seu horário em menos de um minuto. Os horários já ocupados desaparecem automaticamente da agenda.
              </p>
              <Link to="/agendar" className="btn btn-gold btn-block">
                RESERVAR AGORA
              </Link>
              {site && (
                <a
                  className="hero-card-whats"
                  href={site.shop.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconWhatsapp width={18} height={18} /> Tirar dúvidas no WhatsApp
                </a>
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="benefits">
        <div className="container benefits-grid">
          <div className="benefit">
            <IconScissors />
            <div>
              <strong>Profissionais especialistas</strong>
              <span>Cada barbeiro com sua especialidade declarada no perfil.</span>
            </div>
          </div>
          <div className="benefit">
            <IconShield />
            <div>
              <strong>Sem horário duplicado</strong>
              <span>O sistema bloqueia conflitos automaticamente na mesma cadeira.</span>
            </div>
          </div>
          <div className="benefit">
            <IconStar />
            <div>
              <strong>Experiência premium</strong>
              <span>Ambiente reservado, produtos selecionados e atendimento pontual.</span>
            </div>
          </div>
        </div>
      </section>

      <section id="servicos" className="section">
        <div className="container">
          <header className="section-head">
            <span className="eyebrow">Serviços</span>
            <h2>Cuidado completo, do corte ao acabamento</h2>
            <p>Preços e duração são editáveis no painel administrativo, sem precisar mexer no código.</p>
          </header>

          {error && <div className="alert alert-error">Não foi possível carregar os serviços: {error}</div>}

          {!site && !error && (
            <div className="card-grid">
              {[0, 1, 2, 3].map((index) => (
                <div className="service-card skeleton" key={index} aria-hidden="true">
                  <div className="skeleton-line short" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                </div>
              ))}
            </div>
          )}

          <div className="card-grid">
            {services.map((service, index) => (
              <article className="service-card" key={service.id}>
                <div className="service-icon">{index % 2 === 0 ? <IconScissors /> : <IconRazor />}</div>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <div className="service-meta">
                  <span className="service-price">{brl(service.priceCents)}</span>
                  <span className="service-duration">
                    <IconClock width={15} height={15} /> {durationLabel(service.durationMin)}
                  </span>
                </div>
                <Link to={`/agendar?servico=${service.id}`} className="service-link">
                  Agendar este serviço <IconArrowRight width={16} height={16} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="equipe" className="section section-alt">
        <div className="container">
          <header className="section-head">
            <span className="eyebrow">Equipe</span>
            <h2>Quem cuida do seu estilo</h2>
            <p>
              Perfis demonstrativos prontos para substituição: nome, especialidade e descrição podem ser editados na área
              administrativa.
            </p>
          </header>

          <div className="team-grid">
            {barbers.map((barber) => (
              <article className="team-card" key={barber.id}>
                <div className="team-avatar" aria-hidden="true">
                  <span>{barber.initials}</span>
                </div>
                <span className="team-badge">Perfil demonstrativo</span>
                <h3>{barber.name}</h3>
                <span className="team-specialty">{barber.specialty || 'Especialidade a definir'}</span>
                <p>{barber.bio}</p>
                <Link to={`/agendar?barbeiro=${barber.id}`} className="service-link">
                  Agendar com {barber.name.split(' ')[0]} <IconArrowRight width={16} height={16} />
                </Link>
              </article>
            ))}
          </div>
          <p className="section-footnote">
            As fotos podem ser adicionadas posteriormente no painel administrativo — os avatares exibem as iniciais para não
            usar imagens de terceiros como se fossem da equipe real.
          </p>
        </div>
      </section>

      <section id="experiencia" className="section">
        <div className="container">
          <header className="section-head">
            <span className="eyebrow">Experiência</span>
            <h2>Como funciona o agendamento</h2>
          </header>
          <div className="steps-grid">
            {STEPS.map((step, index) => (
              <article className="step-card" key={step.title}>
                <span className="step-number">0{index + 1}</span>
                <div className="step-icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-inner">
          <div>
            <span className="eyebrow">Agenda aberta</span>
            <h2>Pronto para elevar o seu estilo?</h2>
            <p>
              {site
                ? `Atendimento de ${site.shop.openingTime} às ${site.shop.closingTime}. Reserve seu horário e receba a confirmação no WhatsApp.`
                : 'Reserve seu horário e receba a confirmação no WhatsApp.'}
            </p>
          </div>
          <div className="cta-actions">
            <Link to="/agendar" className="btn btn-gold">
              AGENDAR HORÁRIO
            </Link>
            {site && (
              <a className="btn btn-ghost" href={site.shop.whatsappLink} target="_blank" rel="noopener noreferrer">
                <IconWhatsapp width={18} height={18} /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {site && (
        <section className="next-days">
          <div className="container">
            <div className="next-days-head">
              <h3>Próximos dias com agenda</h3>
              <span>Escolha um dia e finalize em segundos</span>
            </div>
            <div className="next-days-strip">
              {site.dates.slice(0, 8).map((option) => (
                <Link
                  key={option.date}
                  to={`/agendar?data=${option.date}`}
                  className={`next-day ${option.open ? '' : 'is-closed'}`}
                >
                  <span>{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][option.weekday]}</span>
                  <strong>{dateShort(option.date).slice(0, 5)}</strong>
                  <em>{option.open ? 'Aberto' : 'Fechado'}</em>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
