import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import type { AdminUser, Appointment, Barber, Block, Service, ShopSettings } from '../lib/types';
import { Logo } from '../components/Logo';
import { Link } from '../lib/router';
import { brl, dateLong, dateShort, durationLabel, fromPriceInput, todayISO, toPriceInput } from '../lib/format';
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconEdit,
  IconLock,
  IconLogout,
  IconPlus,
  IconScissors,
  IconShield,
  IconTrash,
  IconUser,
  IconWhatsapp,
} from '../components/Icons';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

type Tab = 'agenda' | 'horarios' | 'servicos' | 'equipe' | 'config';

function isExpired(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
}

export default function Admin() {
  const [status, setStatus] = useState<'loading' | 'out' | 'in'>('loading');
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((data) => {
        if (!active) return;
        setUser(data.user);
        setStatus('in');
      })
      .catch(() => {
        if (active) setStatus('out');
      });
    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* sessão já encerrada */
    }
    setUser(null);
    setStatus('out');
  }, []);

  if (status === 'loading') {
    return <div className="admin-boot">Carregando painel…</div>;
  }

  if (status === 'out' || !user) {
    return (
      <AdminLogin
        onSuccess={(nextUser) => {
          setUser(nextUser);
          setStatus('in');
        }}
      />
    );
  }

  return <Dashboard user={user} onLogout={logout} />;
}

function AdminLogin({ onSuccess }: { onSuccess: (user: AdminUser) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Informe usuário e senha para entrar.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.login(username.trim(), password);
      onSuccess(data.user);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-glow" aria-hidden="true" />
      <div className="admin-login-card">
        <Logo size={56} subtitle="PAINEL ADMINISTRATIVO" />
        <h1>Acesso restrito</h1>
        <p className="admin-login-text">
          Área exclusiva da equipe ELITE BARBER. Gerencie agendamentos, horários, serviços e profissionais.
        </p>
        <form onSubmit={handleSubmit} className="admin-login-form" noValidate>
          <label className="field">
            <span className="field-label">
              <IconUser width={15} height={15} /> Usuário
            </span>
            <input
              type="text"
              name="username"
              autoComplete="username"
              placeholder="admin"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">
              <IconLock width={15} height={15} /> Senha
            </span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          <button type="submit" className="btn btn-gold btn-block" disabled={loading}>
            {loading ? 'Entrando…' : 'ENTRAR NO PAINEL'}
          </button>
        </form>
        <div className="admin-login-foot">
          <IconShield width={15} height={15} />
          <span>Acesso protegido por sessão com expiração automática.</span>
        </div>
        <Link to="/" className="admin-login-back">
          ← Voltar para o site
        </Link>
      </div>
    </div>
  );
}

function Dashboard({ user, onLogout }: { user: AdminUser; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('agenda');
  const [barbers, setBarbers] = useState<Barber[]>([]);

  const loadBarbers = useCallback(async () => {
    try {
      const data = await api.barbers();
      setBarbers(data.barbers);
    } catch (error) {
      if (isExpired(error)) onLogout();
    }
  }, [onLogout]);

  useEffect(() => {
    loadBarbers();
  }, [loadBarbers]);

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'agenda', label: 'Agendamentos', icon: <IconCalendar width={17} height={17} /> },
    { id: 'horarios', label: 'Horários', icon: <IconClock width={17} height={17} /> },
    { id: 'servicos', label: 'Serviços', icon: <IconScissors width={17} height={17} /> },
    { id: 'equipe', label: 'Equipe', icon: <IconUser width={17} height={17} /> },
    { id: 'config', label: 'Configurações', icon: <IconShield width={17} height={17} /> },
  ];

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <Link to="/" className="admin-brand" aria-label="ELITE BARBER — site">
          <Logo size={38} subtitle="PAINEL ADMINISTRATIVO" />
        </Link>
        <div className="admin-topbar-actions">
          <span className="admin-user">
            <IconLock width={13} height={13} /> {user.username}
          </span>
          <Link to="/" className="btn btn-ghost btn-sm">
            Ver site
          </Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>
            <IconLogout width={16} height={16} /> Sair
          </button>
        </div>
      </header>

      {user.defaultPassword && (
        <div className="admin-warning">
          <IconShield width={18} height={18} />
          <span>
            Você está com a senha inicial de demonstração. Altere em <strong>Configurações</strong> para proteger a agenda.
          </span>
          <button type="button" className="link-button" onClick={() => setTab('config')}>
            Alterar agora
          </button>
        </div>
      )}

      <nav className="admin-tabs" aria-label="Seções do painel">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`admin-tab ${tab === item.id ? 'is-active' : ''}`}
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </nav>

      <main className="admin-main">
        {tab === 'agenda' && <AgendaTab barbers={barbers} onExpired={onLogout} />}
        {tab === 'horarios' && <ScheduleTab barbers={barbers} onExpired={onLogout} />}
        {tab === 'servicos' && <ServicesTab onExpired={onLogout} />}
        {tab === 'equipe' && <TeamTab barbers={barbers} onExpired={onLogout} reloadBarbers={loadBarbers} />}
        {tab === 'config' && <SettingsTab onExpired={onLogout} />}
      </main>
    </div>
  );
}

/* ------------------------------- Agendamentos ------------------------------ */

function AgendaTab({ barbers, onExpired }: { barbers: Barber[]; onExpired: () => void }) {
  const [date, setDate] = useState(todayISO());
  const [barberId, setBarberId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [data, setData] = useState<{ appointments: Appointment[]; totals: { count: number; revenueCents: number } } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.appointments({
        date,
        barberId: barberId ? Number(barberId) : undefined,
        status: statusFilter || undefined,
      });
      setData(result);
    } catch (caught) {
      if (isExpired(caught)) {
        onExpired();
        return;
      }
      setError(messageOf(caught));
    } finally {
      setLoading(false);
    }
  }, [date, barberId, statusFilter, onExpired]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(appointment: Appointment, status: 'confirmed' | 'cancelled') {
    setBusy(appointment.id);
    setNotice('');
    setError('');
    try {
      await api.updateAppointment(appointment.id, status);
      setNotice(
        status === 'cancelled'
          ? `Agendamento de ${appointment.customerName} cancelado — horário liberado.`
          : `Agendamento de ${appointment.customerName} confirmado novamente.`,
      );
      await load();
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    } finally {
      setBusy(null);
    }
  }

  async function remove(appointment: Appointment) {
    if (!window.confirm(`Excluir definitivamente o agendamento de ${appointment.customerName}?`)) return;
    setBusy(appointment.id);
    try {
      await api.deleteAppointment(appointment.id);
      setNotice('Agendamento excluído do histórico.');
      await load();
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    } finally {
      setBusy(null);
    }
  }

  async function openWhatsapp(appointment: Appointment) {
    setBusy(appointment.id);
    try {
      const result = await api.appointmentWhatsapp(appointment.id);
      window.open(result.whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    } finally {
      setBusy(null);
    }
  }

  const appointments = data?.appointments ?? [];
  const confirmed = appointments.filter((item) => item.status === 'confirmed');

  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <div>
          <h2>Agendamentos</h2>
          <p>Consulte a agenda por dia, filtre por profissional e gerencie cada reserva.</p>
        </div>
        <div className="admin-filters">
          <label className="filter">
            <span>Data</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="filter">
            <span>Barbeiro</span>
            <select value={barberId} onChange={(event) => setBarberId(event.target.value)}>
              <option value="">Todos</option>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Todos</option>
              <option value="confirmed">Confirmados</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
            Atualizar
          </button>
        </div>
      </header>

      <div className="admin-stats">
        <div className="stat">
          <span>Confirmados no dia</span>
          <strong>{data?.totals.count ?? 0}</strong>
        </div>
        <div className="stat">
          <span>Receita prevista</span>
          <strong>{brl(data?.totals.revenueCents ?? 0)}</strong>
        </div>
        <div className="stat">
          <span>Cancelados</span>
          <strong>{appointments.length - confirmed.length}</strong>
        </div>
        <div className="stat">
          <span>Data selecionada</span>
          <strong className="stat-small">{dateShort(date)}</strong>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-ok">{notice}</div>}

      {loading ? (
        <p className="admin-empty">Carregando agendamentos…</p>
      ) : appointments.length === 0 ? (
        <p className="admin-empty">
          Nenhum agendamento para {dateLong(date)} com estes filtros. Os novos agendamentos do site aparecem aqui
          automaticamente.
        </p>
      ) : (
        <div className="appointment-list">
          {appointments.map((appointment) => (
            <article
              key={appointment.id}
              className={`appointment-card ${appointment.status === 'cancelled' ? 'is-cancelled' : ''}`}
            >
              <div className="appointment-time">
                <strong>{appointment.time}</strong>
                <span>{appointment.endTime}</span>
              </div>
              <div className="appointment-body">
                <div className="appointment-title">
                  <h3>{appointment.customerName}</h3>
                  <span className={`pill ${appointment.status === 'confirmed' ? 'pill-ok' : 'pill-off'}`}>
                    {appointment.status === 'confirmed' ? 'Confirmado' : 'Cancelado'}
                  </span>
                </div>
                <div className="appointment-meta">
                  <span>
                    <IconScissors width={14} height={14} /> {appointment.serviceName}
                  </span>
                  <span>
                    <IconUser width={14} height={14} /> {appointment.barberName}
                  </span>
                  <span>
                    <IconWhatsapp width={14} height={14} /> {appointment.customerPhoneFormatted}
                  </span>
                  <span className="appointment-price">{appointment.priceFormatted}</span>
                </div>
              </div>
              <div className="appointment-actions">
                <a
                  className="icon-button"
                  href={`https://wa.me/55${appointment.customerPhone.replace(/\D/g, '').replace(/^55/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir conversa com o cliente"
                >
                  <IconWhatsapp width={16} height={16} />
                </a>
                <button
                  type="button"
                  className="icon-button"
                  title="Enviar resumo pelo WhatsApp da barbearia"
                  onClick={() => openWhatsapp(appointment)}
                  disabled={busy === appointment.id}
                >
                  <IconClock width={16} height={16} />
                </button>
                {appointment.status === 'confirmed' ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => changeStatus(appointment, 'cancelled')}
                    disabled={busy === appointment.id}
                  >
                    Cancelar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => changeStatus(appointment, 'confirmed')}
                    disabled={busy === appointment.id}
                  >
                    Reativar
                  </button>
                )}
                <button
                  type="button"
                  className="icon-button icon-danger"
                  title="Excluir agendamento"
                  onClick={() => remove(appointment)}
                  disabled={busy === appointment.id}
                >
                  <IconTrash width={16} height={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* --------------------------------- Horários -------------------------------- */

function ScheduleTab({ barbers, onExpired }: { barbers: Barber[]; onExpired: () => void }) {
  const [date, setDate] = useState(todayISO());
  const [barberId, setBarberId] = useState('');
  const [data, setData] = useState<{
    appointments: Appointment[];
    cancelled: Appointment[];
    blocks: Block[];
    openingTime: string;
    closingTime: string;
  } | null>(null);
  const [blockTime, setBlockTime] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [fullDay, setFullDay] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const effectiveBarber = barberId || String(barbers[0]?.id ?? '');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.schedule(date, effectiveBarber ? Number(effectiveBarber) : undefined);
      setData(result);
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    } finally {
      setLoading(false);
    }
  }, [date, effectiveBarber, onExpired]);

  useEffect(() => {
    if (!barbers.length) return;
    load();
  }, [load, barbers.length]);

  async function addBlock(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!effectiveBarber) {
      setError('Cadastre um barbeiro antes de bloquear horários.');
      return;
    }
    if (!fullDay && !blockTime) {
      setError('Informe o horário a bloquear ou marque "dia inteiro".');
      return;
    }
    try {
      await api.createBlock({
        barberId: Number(effectiveBarber),
        date,
        time: fullDay ? null : blockTime,
        reason: blockReason,
      });
      setBlockTime('');
      setBlockReason('');
      setFullDay(false);
      setNotice('Horário bloqueado. Ele deixa de aparecer no agendamento online.');
      await load();
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    }
  }

  async function removeBlock(block: Block) {
    if (!window.confirm('Liberar este bloqueio?')) return;
    try {
      await api.deleteBlock(block.id);
      setNotice('Bloqueio removido — horário liberado novamente.');
      await load();
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    }
  }

  const barberName = barbers.find((item) => String(item.id) === effectiveBarber)?.name ?? '—';

  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <div>
          <h2>Horários e bloqueios</h2>
          <p>Consulte a ocupação do dia e bloqueie intervalos para compromissos internos.</p>
        </div>
        <div className="admin-filters">
          <label className="filter">
            <span>Data</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="filter">
            <span>Barbeiro</span>
            <select value={effectiveBarber} onChange={(event) => setBarberId(event.target.value)}>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-ok">{notice}</div>}

      <div className="schedule-grid">
        <div className="schedule-column">
          <h3>
            Agenda de {barberName} · {dateShort(date)}
          </h3>
          {loading ? (
            <p className="admin-empty">Carregando…</p>
          ) : (data?.appointments.length ?? 0) === 0 ? (
            <p className="admin-empty">Nenhum atendimento confirmado neste dia.</p>
          ) : (
            <ul className="timeline">
              {data?.appointments.map((appointment) => (
                <li key={appointment.id}>
                  <span className="timeline-time">
                    {appointment.time}–{appointment.endTime}
                  </span>
                  <div>
                    <strong>{appointment.customerName}</strong>
                    <span>
                      {appointment.serviceName} · {appointment.priceFormatted}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h3 className="schedule-subtitle">Bloqueios do dia</h3>
          {(data?.blocks.length ?? 0) === 0 ? (
            <p className="admin-empty">Nenhum bloqueio ativo.</p>
          ) : (
            <ul className="block-list">
              {data?.blocks.map((block) => (
                <li key={block.id}>
                  <span className="pill pill-off">{block.time ?? 'Dia inteiro'}</span>
                  <span className="block-reason">{block.reason || 'Sem motivo informado'}</span>
                  <button type="button" className="icon-button icon-danger" onClick={() => removeBlock(block)} title="Remover bloqueio">
                    <IconTrash width={15} height={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form className="schedule-column card-form" onSubmit={addBlock}>
          <h3>Bloquear horário</h3>
          <p className="form-hint">Use para almoço, folgas, cursos ou manutenção. O horário sai da agenda pública.</p>
          <label className="field">
            <span className="field-label">Horário</span>
            <input
              type="time"
              value={blockTime}
              onChange={(event) => setBlockTime(event.target.value)}
              disabled={fullDay}
              min={data?.openingTime ?? '08:00'}
              max={data?.closingTime ?? '21:00'}
            />
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={fullDay} onChange={(event) => setFullDay(event.target.checked)} />
            <span>Bloquear o dia inteiro</span>
          </label>
          <label className="field">
            <span className="field-label">Motivo (opcional)</span>
            <input
              type="text"
              value={blockReason}
              maxLength={120}
              placeholder="Ex.: almoço, compromisso pessoal"
              onChange={(event) => setBlockReason(event.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-gold btn-block">
            <IconPlus width={17} height={17} /> BLOQUEAR
          </button>
        </form>
      </div>
    </section>
  );
}

/* --------------------------------- Serviços -------------------------------- */

type ServiceDraft = {
  id: number | null;
  name: string;
  description: string;
  price: string;
  durationMin: string;
  active: boolean;
};

const emptyService: ServiceDraft = { id: null, name: '', description: '', price: '', durationMin: '30', active: true };

function ServicesTab({ onExpired }: { onExpired: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [draft, setDraft] = useState<ServiceDraft>(emptyService);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.services();
      setServices(data.services);
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    }
  }, [onExpired]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    const priceCents = fromPriceInput(draft.price);
    if (draft.name.trim().length < 3) {
      setError('Informe o nome do serviço.');
      return;
    }
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      setError('Informe um preço válido, como 60,00.');
      return;
    }
    const durationMin = Number(draft.durationMin);
    if (!Number.isInteger(durationMin) || durationMin < 10 || durationMin > 240) {
      setError('A duração deve estar entre 10 e 240 minutos.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        priceCents,
        durationMin,
        active: draft.active,
      };
      if (draft.id) {
        await api.updateService(draft.id, body);
        setNotice('Serviço atualizado no site.');
      } else {
        await api.createService(body);
        setNotice('Serviço cadastrado no site.');
      }
      setDraft(emptyService);
      await load();
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(service: Service) {
    try {
      await api.updateService(service.id, { active: !service.active });
      await load();
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    }
  }

  async function remove(service: Service) {
    if (!window.confirm(`Excluir o serviço "${service.name}"?`)) return;
    try {
      const result = await api.deleteService(service.id);
      setNotice(result.message ?? 'Serviço excluído.');
      if (draft.id === service.id) setDraft(emptyService);
      await load();
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    }
  }

  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <div>
          <h2>Serviços e preços</h2>
          <p>Os valores abaixo aparecem no site e no agendamento imediatamente após salvar.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(emptyService)}>
          <IconPlus width={16} height={16} /> Novo serviço
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-ok">{notice}</div>}

      <div className="admin-two-col">
        <div className="admin-table">
          {services.length === 0 && <p className="admin-empty">Nenhum serviço cadastrado.</p>}
          {services.map((service) => (
            <div key={service.id} className={`row-item ${service.active ? '' : 'is-inactive'}`}>
              <div className="row-main">
                <strong>{service.name}</strong>
                <span>{service.description || 'Sem descrição'}</span>
              </div>
              <div className="row-price">
                <strong>{brl(service.priceCents)}</strong>
                <span>{durationLabel(service.durationMin)}</span>
              </div>
              <div className="row-actions">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => toggle(service)}>
                  {service.active ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title="Editar"
                  onClick={() =>
                    setDraft({
                      id: service.id,
                      name: service.name,
                      description: service.description,
                      price: toPriceInput(service.priceCents),
                      durationMin: String(service.durationMin),
                      active: service.active,
                    })
                  }
                >
                  <IconEdit width={16} height={16} />
                </button>
                <button type="button" className="icon-button icon-danger" title="Excluir" onClick={() => remove(service)}>
                  <IconTrash width={16} height={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <form className="card-form" onSubmit={save}>
          <h3>{draft.id ? 'Editar serviço' : 'Novo serviço'}</h3>
          <label className="field">
            <span className="field-label">Nome</span>
            <input
              type="text"
              value={draft.name}
              maxLength={60}
              placeholder="Ex.: Corte masculino"
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">Descrição</span>
            <textarea
              value={draft.description}
              maxLength={240}
              rows={3}
              placeholder="Como o serviço é executado"
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span className="field-label">Preço (R$)</span>
              <input
                type="text"
                inputMode="decimal"
                value={draft.price}
                placeholder="60,00"
                onChange={(event) => setDraft({ ...draft, price: event.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">Duração (min)</span>
              <input
                type="number"
                min={10}
                max={240}
                step={5}
                value={draft.durationMin}
                onChange={(event) => setDraft({ ...draft, durationMin: event.target.value })}
              />
            </label>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
            />
            <span>Disponível para agendamento</span>
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-gold" disabled={saving}>
              {saving ? 'Salvando…' : draft.id ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR SERVIÇO'}
            </button>
            {draft.id && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(emptyService)}>
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

/* ---------------------------------- Equipe --------------------------------- */

type BarberDraft = {
  id: number | null;
  name: string;
  specialty: string;
  bio: string;
  photoUrl: string;
  active: boolean;
};

const emptyBarber: BarberDraft = { id: null, name: '', specialty: '', bio: '', photoUrl: '', active: true };

function TeamTab({
  barbers,
  onExpired,
  reloadBarbers,
}: {
  barbers: Barber[];
  onExpired: () => void;
  reloadBarbers: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<BarberDraft>(emptyBarber);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (draft.name.trim().length < 2) {
      setError('Informe o nome do barbeiro.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: draft.name.trim(),
        specialty: draft.specialty.trim(),
        bio: draft.bio.trim(),
        photoUrl: draft.photoUrl.trim(),
        active: draft.active,
      };
      if (draft.id) {
        await api.updateBarber(draft.id, body);
        setNotice('Perfil atualizado no site.');
      } else {
        await api.createBarber(body);
        setNotice('Barbeiro cadastrado na equipe.');
      }
      setDraft(emptyBarber);
      await reloadBarbers();
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(barber: Barber) {
    try {
      await api.updateBarber(barber.id, { active: !barber.active });
      await reloadBarbers();
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    }
  }

  async function remove(barber: Barber) {
    if (!window.confirm(`Remover ${barber.name} da equipe?`)) return;
    try {
      const result = await api.deleteBarber(barber.id);
      setNotice(result.message ?? 'Barbeiro removido.');
      await reloadBarbers();
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    }
  }

  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <div>
          <h2>Equipe</h2>
          <p>Cadastre profissionais, especialidades e a foto exibida na página inicial.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(emptyBarber)}>
          <IconPlus width={16} height={16} /> Novo barbeiro
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-ok">{notice}</div>}

      <div className="admin-two-col">
        <div className="admin-table">
          {barbers.length === 0 && <p className="admin-empty">Nenhum barbeiro cadastrado.</p>}
          {barbers.map((barber) => (
            <div key={barber.id} className={`row-item ${barber.active ? '' : 'is-inactive'}`}>
              <div className="row-avatar">
                {barber.photoUrl ? <img src={barber.photoUrl} alt={barber.name} /> : barber.initials}
              </div>
              <div className="row-main">
                <strong>{barber.name}</strong>
                <span>{barber.specialty || 'Especialidade a definir'}</span>
              </div>
              <div className="row-actions">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => toggle(barber)}>
                  {barber.active ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title="Editar"
                  onClick={() =>
                    setDraft({
                      id: barber.id,
                      name: barber.name,
                      specialty: barber.specialty,
                      bio: barber.bio,
                      photoUrl: barber.photoUrl,
                      active: barber.active,
                    })
                  }
                >
                  <IconEdit width={16} height={16} />
                </button>
                <button type="button" className="icon-button icon-danger" title="Remover" onClick={() => remove(barber)}>
                  <IconTrash width={16} height={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <form className="card-form" onSubmit={save}>
          <h3>{draft.id ? 'Editar barbeiro' : 'Novo barbeiro'}</h3>
          <label className="field">
            <span className="field-label">Nome</span>
            <input
              type="text"
              value={draft.name}
              maxLength={60}
              placeholder="Nome do profissional"
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">Especialidade</span>
            <input
              type="text"
              value={draft.specialty}
              maxLength={80}
              placeholder="Ex.: degradê e barba"
              onChange={(event) => setDraft({ ...draft, specialty: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">Apresentação</span>
            <textarea
              value={draft.bio}
              maxLength={240}
              rows={3}
              placeholder="Breve descrição exibida no site"
              onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">Foto (URL)</span>
            <input
              type="url"
              value={draft.photoUrl}
              placeholder="https://…/foto.jpg"
              onChange={(event) => setDraft({ ...draft, photoUrl: event.target.value })}
            />
          </label>
          <p className="form-hint">Sem foto, o site mostra as iniciais do profissional.</p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
            />
            <span>Visível no site e na agenda</span>
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-gold" disabled={saving}>
              {saving ? 'Salvando…' : draft.id ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR BARBEIRO'}
            </button>
            {draft.id && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(emptyBarber)}>
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

/* ------------------------------- Configurações ----------------------------- */

function SettingsTab({ onExpired }: { onExpired: () => void }) {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.settings();
      setSettings(data.settings);
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    }
  }, [onExpired]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setError('');
    setNotice('');
    if (!/^\d{12,13}$/.test(settings.whatsappNumber.replace(/\D/g, ''))) {
      setError('Informe o WhatsApp com DDI e DDD, apenas números (ex.: 5521979596565).');
      return;
    }
    if (settings.workDays.length === 0) {
      setError('Selecione pelo menos um dia de funcionamento.');
      return;
    }
    setSaving(true);
    try {
      const data = await api.updateSettings(settings);
      setSettings(data.settings);
      setNotice('Configurações salvas e aplicadas ao site.');
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação não corresponde à nova senha.');
      return;
    }
    setSaving(true);
    try {
      const result = await api.changePassword(currentPassword, newPassword);
      setNotice(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  }

  async function resetDemo() {
    if (!window.confirm('Restaurar os serviços e a equipe demonstrativos? Os agendamentos serão mantidos.')) return;
    try {
      await api.resetDemo();
      setNotice('Serviços e equipe demonstrativos restaurados.');
      await load();
    } catch (caught) {
      if (isExpired(caught)) return onExpired();
      setError(messageOf(caught));
    }
  }

  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <div>
          <h2>Configurações</h2>
          <p>Horário de funcionamento, WhatsApp de confirmação e segurança do acesso.</p>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-ok">{notice}</div>}

      <div className="admin-two-col">
        <form className="card-form" onSubmit={saveSettings}>
          <h3>Funcionamento</h3>
          {settings ? (
            <>
              <div className="field-row">
                <label className="field">
                  <span className="field-label">Abertura</span>
                  <input
                    type="time"
                    value={settings.openingTime}
                    onChange={(event) => setSettings({ ...settings, openingTime: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Fechamento</span>
                  <input
                    type="time"
                    value={settings.closingTime}
                    onChange={(event) => setSettings({ ...settings, closingTime: event.target.value })}
                  />
                </label>
              </div>
              <div className="field-row">
                <label className="field">
                  <span className="field-label">Intervalo (min)</span>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    step={5}
                    value={settings.slotMinutes}
                    onChange={(event) => setSettings({ ...settings, slotMinutes: Number(event.target.value) })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Antecedência mínima (min)</span>
                  <input
                    type="number"
                    min={0}
                    max={720}
                    step={15}
                    value={settings.leadTimeMinutes}
                    onChange={(event) => setSettings({ ...settings, leadTimeMinutes: Number(event.target.value) })}
                  />
                </label>
              </div>
              <label className="field">
                <span className="field-label">WhatsApp de confirmação</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={settings.whatsappNumber}
                  onChange={(event) => setSettings({ ...settings, whatsappNumber: event.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">Dias de funcionamento</span>
                <div className="day-toggle">
                  {DAY_LABELS.map((label, index) => {
                    const active = settings.workDays.includes(index);
                    return (
                      <button
                        key={label}
                        type="button"
                        className={`day-chip ${active ? 'is-active' : ''}`}
                        onClick={() =>
                          setSettings({
                            ...settings,
                            workDays: active
                              ? settings.workDays.filter((day) => day !== index)
                              : [...settings.workDays, index].sort((a, b) => a - b),
                          })
                        }
                        aria-pressed={active}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </label>
              <button type="submit" className="btn btn-gold btn-block" disabled={saving}>
                <IconCheck width={17} height={17} /> SALVAR CONFIGURAÇÕES
              </button>
            </>
          ) : (
            <p className="admin-empty">Carregando…</p>
          )}
        </form>

        <div className="admin-stack">
          <form className="card-form" onSubmit={savePassword}>
            <h3>Segurança</h3>
            <p className="form-hint">Troque a senha inicial por uma senha forte com pelo menos 8 caracteres.</p>
            <label className="field">
              <span className="field-label">Senha atual</span>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Nova senha</span>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Confirmar nova senha</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
            <button type="submit" className="btn btn-outline btn-block" disabled={saving}>
              ALTERAR SENHA
            </button>
          </form>

          <div className="card-form">
            <h3>Dados demonstrativos</h3>
            <p className="form-hint">
              Serviços e equipe de exemplo podem ser restaurados a qualquer momento. Agendamentos reais nunca são apagados
              por esta ação.
            </p>
            <button type="button" className="btn btn-ghost btn-block" onClick={resetDemo}>
              Restaurar serviços e equipe
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
