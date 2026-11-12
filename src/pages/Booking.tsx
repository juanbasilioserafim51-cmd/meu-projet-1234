import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import type { Availability, BookingResult, SiteData } from '../lib/types';
import { Link } from '../lib/router';
import {
  brl,
  dateLong,
  dayNumber,
  durationLabel,
  isValidPhone,
  maskPhone,
  monthShort,
  onlyDigits,
  weekdayShort,
} from '../lib/format';
import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconClock,
  IconLock,
  IconPhone,
  IconUser,
  IconWhatsapp,
} from '../components/Icons';

export default function Booking() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [site, setSite] = useState<SiteData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [barberId, setBarberId] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  useEffect(() => {
    let active = true;
    api
      .site()
      .then((data) => {
        if (!active) return;
        setSite(data);
        const queryService = Number(params.get('servico'));
        if (Number.isInteger(queryService) && data.services.some((item) => item.id === queryService)) {
          setServiceId(queryService);
        }
        const queryBarber = Number(params.get('barbeiro'));
        if (Number.isInteger(queryBarber) && data.barbers.some((item) => item.id === queryBarber)) {
          setBarberId(queryBarber);
        }
        const queryDate = params.get('data');
        if (queryDate && data.dates.some((item) => item.date === queryDate && item.open)) {
          setDate(queryDate);
        } else {
          const firstOpen = data.dates.find((item) => item.open);
          if (firstOpen) setDate(firstOpen.date);
        }
      })
      .catch((error: Error) => {
        if (active) setLoadError(error.message);
      });
    return () => {
      active = false;
    };
  }, [params]);

  useEffect(() => {
    if (!serviceId || !barberId || !date) {
      setAvailability(null);
      return;
    }
    let active = true;
    setSlotsLoading(true);
    api
      .availability({ serviceId, barberId, date })
      .then((data) => {
        if (!active) return;
        setAvailability(data);
        setTime((previous) => (data.slots.some((slot) => slot.time === previous && slot.available) ? previous : ''));
      })
      .catch((error: Error) => {
        if (!active) return;
        setAvailability(null);
        setNotice(error.message);
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [serviceId, barberId, date]);

  const service = site?.services.find((item) => item.id === serviceId) ?? null;
  const barber = site?.barbers.find((item) => item.id === barberId) ?? null;
  const dateOption = site?.dates.find((item) => item.date === date) ?? null;
  const canSubmit = Boolean(customerName.trim().length >= 3 && isValidPhone(customerPhone) && service && barber && date && time);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (customerName.trim().length < 3) next.customerName = 'Informe seu nome completo.';
    if (!isValidPhone(customerPhone)) next.customerPhone = 'Informe um telefone válido com DDD.';
    if (!service) next.serviceId = 'Escolha um serviço.';
    if (!barber) next.barberId = 'Escolha um barbeiro.';
    if (!date) next.date = 'Escolha a data.';
    if (!time) next.time = 'Escolha um horário disponível.';
    setErrors(next);
    if (Object.keys(next).length) {
      setNotice('Revise os campos destacados para continuar.');
      const firstError = document.querySelector('.field-error, .section-error');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setNotice('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const data = await api.createAppointment({
        customerName: customerName.trim(),
        customerPhone: onlyDigits(customerPhone),
        serviceId: service!.id,
        barberId: barber!.id,
        date,
        time,
      });
      setResult(data);
      window.open(data.whatsappUrl, '_blank', 'noopener,noreferrer');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível concluir o agendamento.';
      setNotice(message);
      if (error instanceof ApiError && error.status === 409) {
        setTime('');
        api
          .availability({ serviceId: service!.id, barberId: barber!.id, date })
          .then(setAvailability)
          .catch(() => undefined);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setResult(null);
    setTime('');
    setNotice('');
    setErrors({});
  }

  if (result) {
    return (
      <section className="booking-page">
        <div className="container booking-success">
          <div className="success-icon">
            <IconCheck width={30} height={30} />
          </div>
          <span className="eyebrow">Agendamento registrado</span>
          <h1>Horário reservado com sucesso</h1>
          <p className="success-text">
            Seu horário já está bloqueado na agenda. Abra a conversa no WhatsApp para receber a confirmação da barbearia —
            a mensagem vai preenchida com todos os dados.
          </p>

          <div className="success-card">
            <div className="success-row">
              <span>Cliente</span>
              <strong>{result.appointment.customerName}</strong>
            </div>
            <div className="success-row">
              <span>Serviço</span>
              <strong>{result.appointment.serviceName}</strong>
            </div>
            <div className="success-row">
              <span>Barbeiro</span>
              <strong>{result.appointment.barberName}</strong>
            </div>
            <div className="success-row">
              <span>Data</span>
              <strong>{dateLong(result.appointment.date)}</strong>
            </div>
            <div className="success-row">
              <span>Horário</span>
              <strong>
                {result.appointment.time} — {result.appointment.endTime}
              </strong>
            </div>
            <div className="success-row total">
              <span>Valor</span>
              <strong>{result.appointment.priceFormatted}</strong>
            </div>
          </div>

          <div className="success-actions">
            <a className="btn btn-gold" href={result.whatsappUrl} target="_blank" rel="noopener noreferrer">
              <IconWhatsapp width={19} height={19} /> CONFIRMAR PELO WHATSAPP
            </a>
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              Fazer novo agendamento
            </button>
          </div>
          <p className="success-note">
            Se a janela do WhatsApp não abrir automaticamente, use o botão acima. Código do agendamento:{' '}
            <strong>#{String(result.appointment.id).padStart(4, '0')}</strong>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="booking-page">
      <div className="container">
        <header className="booking-head">
          <div>
            <span className="eyebrow">
              <IconCalendar width={14} height={14} /> Agendamento online
            </span>
            <h1>Reserve seu horário</h1>
            <p>
              Escolha o serviço, o barbeiro e o horário livre. A agenda é atualizada em tempo real e não permite dois
              clientes na mesma cadeira.
            </p>
          </div>
          <div className="booking-head-card">
            <IconLock width={18} height={18} />
            <div>
              <strong>Reserva imediata</strong>
              <span>Seu horário fica bloqueado assim que você confirma.</span>
            </div>
          </div>
        </header>

        {loadError && <div className="alert alert-error">Não foi possível carregar a agenda: {loadError}</div>}
        {notice && <div className="alert alert-warn">{notice}</div>}

        <div className="booking-layout">
          <form id="booking-form" className="booking-form" onSubmit={handleSubmit} noValidate>
            <section className="booking-block">
              <header className="block-head">
                <span className="block-step">01</span>
                <div>
                  <h2>Seus dados</h2>
                  <p>Usamos o telefone apenas para contato sobre este atendimento.</p>
                </div>
              </header>
              <div className="field-grid">
                <label className={`field ${errors.customerName ? 'has-error' : ''}`}>
                  <span className="field-label">
                    <IconUser width={15} height={15} /> Nome completo
                  </span>
                  <input
                    type="text"
                    name="customerName"
                    placeholder="Ex.: João da Silva"
                    autoComplete="name"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    aria-invalid={Boolean(errors.customerName)}
                  />
                  {errors.customerName && <span className="field-error">{errors.customerName}</span>}
                </label>

                <label className={`field ${errors.customerPhone ? 'has-error' : ''}`}>
                  <span className="field-label">
                    <IconPhone width={15} height={15} /> Telefone / WhatsApp
                  </span>
                  <input
                    type="tel"
                    name="customerPhone"
                    placeholder="(21) 90000-0000"
                    inputMode="tel"
                    autoComplete="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(maskPhone(event.target.value))}
                    aria-invalid={Boolean(errors.customerPhone)}
                  />
                  {errors.customerPhone && <span className="field-error">{errors.customerPhone}</span>}
                </label>
              </div>
            </section>

            <section className="booking-block">
              <header className="block-head">
                <span className="block-step">02</span>
                <div>
                  <h2>Serviço</h2>
                  <p>Preços e duração são definidos pela barbearia.</p>
                </div>
              </header>
              {errors.serviceId && <span className="section-error">{errors.serviceId}</span>}
              <div className="option-grid">
                {(site?.services ?? []).map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`option-card ${serviceId === item.id ? 'is-selected' : ''}`}
                    onClick={() => {
                      setServiceId(item.id);
                      setErrors((current) => ({ ...current, serviceId: '' }));
                    }}
                    aria-pressed={serviceId === item.id}
                  >
                    <span className="option-title">{item.name}</span>
                    <span className="option-meta">
                      {brl(item.priceCents)} · {durationLabel(item.durationMin)}
                    </span>
                    {serviceId === item.id && (
                      <span className="option-check">
                        <IconCheck width={14} height={14} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>

            <section className="booking-block">
              <header className="block-head">
                <span className="block-step">03</span>
                <div>
                  <h2>Barbeiro</h2>
                  <p>Cada profissional tem sua própria agenda.</p>
                </div>
              </header>
              {errors.barberId && <span className="section-error">{errors.barberId}</span>}
              <div className="option-grid">
                {(site?.barbers ?? []).map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`option-card option-barber ${barberId === item.id ? 'is-selected' : ''}`}
                    onClick={() => {
                      setBarberId(item.id);
                      setErrors((current) => ({ ...current, barberId: '' }));
                    }}
                    aria-pressed={barberId === item.id}
                  >
                    <span className="option-avatar">{item.initials}</span>
                    <span className="option-title">{item.name}</span>
                    <span className="option-meta">{item.specialty}</span>
                    {barberId === item.id && (
                      <span className="option-check">
                        <IconCheck width={14} height={14} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>

            <section className="booking-block">
              <header className="block-head">
                <span className="block-step">04</span>
                <div>
                  <h2>Data</h2>
                  <p>Agenda aberta para os próximos {site?.shop.maxDaysAhead ?? 60} dias.</p>
                </div>
              </header>
              {errors.date && <span className="section-error">{errors.date}</span>}
              <div className="date-strip">
                {(site?.dates ?? []).map((option) => (
                  <button
                    type="button"
                    key={option.date}
                    className={`date-chip ${date === option.date ? 'is-selected' : ''} ${option.open ? '' : 'is-closed'}`}
                    onClick={() => {
                      if (!option.open) return;
                      setDate(option.date);
                      setTime('');
                      setErrors((current) => ({ ...current, date: '' }));
                    }}
                    disabled={!option.open}
                    title={option.open ? dateLong(option.date) : 'Fechado'}
                  >
                    <span>{weekdayShort(option.date)}</span>
                    <strong>{dayNumber(option.date)}</strong>
                    <em>{monthShort(option.date)}</em>
                  </button>
                ))}
              </div>
              {dateOption && <p className="date-caption">{dateLong(date)}</p>}
            </section>

            <section className="booking-block">
              <header className="block-head">
                <span className="block-step">05</span>
                <div>
                  <h2>Horário disponível</h2>
                  <p>Horários ocupados e bloqueados não aparecem para seleção.</p>
                </div>
              </header>
              {errors.time && <span className="section-error">{errors.time}</span>}

              {!service || !barber || !date ? (
                <p className="slots-hint">Escolha serviço, barbeiro e data para ver os horários livres.</p>
              ) : slotsLoading ? (
                <p className="slots-hint">Carregando horários…</p>
              ) : availability?.closed ? (
                <p className="slots-hint slots-closed">{availability.reason || 'Agenda indisponível nesta data.'}</p>
              ) : availability && availability.slots.length === 0 ? (
                <p className="slots-hint">Nenhum horário comporta a duração deste serviço neste dia.</p>
              ) : (
                <>
                  <div className="slot-grid">
                    {availability?.slots.map((slot) => (
                      <button
                        type="button"
                        key={slot.time}
                        className={`slot ${time === slot.time ? 'is-selected' : ''} ${slot.available ? '' : 'is-busy'}`}
                        disabled={!slot.available}
                        title={slot.available ? `${slot.time} — ${slot.endTime}` : slot.reason}
                        onClick={() => {
                          setTime(slot.time);
                          setErrors((current) => ({ ...current, time: '' }));
                        }}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                  <div className="slot-legend">
                    <span>
                      <i className="dot dot-free" /> Disponível
                    </span>
                    <span>
                      <i className="dot dot-busy" /> Ocupado
                    </span>
                    <span>
                      <i className="dot dot-selected" /> Selecionado
                    </span>
                  </div>
                </>
              )}
            </section>
          </form>

          <aside className="summary">
            <div className="summary-card">
              <header>
                <span className="eyebrow">Resumo</span>
                <h2>Seu agendamento</h2>
              </header>

              <div className="summary-rows">
                <div className="summary-row">
                  <span>Cliente</span>
                  <strong>{customerName.trim() || '—'}</strong>
                </div>
                <div className="summary-row">
                  <span>Telefone</span>
                  <strong>{customerPhone || '—'}</strong>
                </div>
                <div className="summary-row">
                  <span>Serviço</span>
                  <strong>{service ? service.name : '—'}</strong>
                </div>
                <div className="summary-row">
                  <span>Barbeiro</span>
                  <strong>{barber ? barber.name : '—'}</strong>
                </div>
                <div className="summary-row">
                  <span>Data</span>
                  <strong>{date ? dateLong(date) : '—'}</strong>
                </div>
                <div className="summary-row">
                  <span>Horário</span>
                  <strong>{time ? `${time}${availability ? ` — ${availability.slots.find((s) => s.time === time)?.endTime ?? ''}` : ''}` : '—'}</strong>
                </div>
                <div className="summary-row">
                  <span>Duração</span>
                  <strong>{service ? durationLabel(service.durationMin) : '—'}</strong>
                </div>
              </div>

              <div className="summary-total">
                <span>Total</span>
                <strong>{service ? brl(service.priceCents) : brl(0)}</strong>
              </div>

              <button type="submit" form="booking-form" className="btn btn-gold btn-block" disabled={submitting || !canSubmit}>
                {submitting ? (
                  'Registrando…'
                ) : (
                  <>
                    <IconWhatsapp width={19} height={19} /> CONFIRMAR PELO WHATSAPP
                  </>
                )}
              </button>

              <p className="summary-note">
                Ao confirmar, o horário é reservado no banco de dados e a conversa do WhatsApp abre com a mensagem pronta
                para envio.
              </p>

              <Link to="/" className="summary-back">
                Voltar para o início <IconArrowRight width={15} height={15} />
              </Link>
            </div>

            <div className="summary-help">
              <IconClock width={18} height={18} />
              <div>
                <strong>Atendimento</strong>
                <span>
                  {site ? `${site.shop.openingTime} às ${site.shop.closingTime}` : '09:00 às 19:00'} ·{' '}
                  {site?.shop.workDays.map((day) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][day]).join(' · ')}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
