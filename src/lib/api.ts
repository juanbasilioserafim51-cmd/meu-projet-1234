import type {
  AdminUser,
  Appointment,
  Availability,
  Barber,
  Block,
  BookingResult,
  Service,
  ShopSettings,
  SiteData,
} from './types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message = (data as { error?: string } | null)?.error ?? 'Não foi possível concluir a operação.';
    throw new ApiError(message, response.status);
  }
  return data as T;
}

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const api = {
  site: () => request<SiteData>('/api/public/site'),
  availability: (params: { barberId: number; serviceId: number; date: string }) =>
    request<Availability>(
      `/api/public/availability?barberId=${params.barberId}&serviceId=${params.serviceId}&date=${params.date}`,
    ),
  createAppointment: (body: {
    customerName: string;
    customerPhone: string;
    serviceId: number;
    barberId: number;
    date: string;
    time: string;
  }) => request<BookingResult>('/api/appointments', json(body)),

  login: (username: string, password: string) =>
    request<{ user: AdminUser }>('/api/admin/login', json({ username, password })),
  logout: () => request<{ ok: boolean }>('/api/admin/logout', { method: 'POST' }),
  me: () => request<{ user: AdminUser; settings: ShopSettings }>('/api/admin/me'),

  appointments: (query: { date?: string; status?: string; barberId?: number } = {}) => {
    const search = new URLSearchParams();
    if (query.date) search.set('date', query.date);
    if (query.status) search.set('status', query.status);
    if (query.barberId) search.set('barberId', String(query.barberId));
    return request<{ appointments: Appointment[]; totals: { count: number; revenueCents: number } }>(
      `/api/admin/appointments?${search.toString()}`,
    );
  },
  updateAppointment: (id: number, status: 'confirmed' | 'cancelled') =>
    request<{ appointment: Appointment }>(`/api/admin/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  deleteAppointment: (id: number) =>
    request<{ deleted: Appointment }>(`/api/admin/appointments/${id}`, { method: 'DELETE' }),
  appointmentWhatsapp: (id: number) =>
    request<{ whatsappUrl: string }>(`/api/admin/appointments/${id}/whatsapp`),

  schedule: (date: string, barberId?: number) =>
    request<{
      date: string;
      appointments: Appointment[];
      cancelled: Appointment[];
      blocks: Block[];
      openingTime: string;
      closingTime: string;
      slotMinutes: number;
    }>(`/api/admin/schedule?date=${date}${barberId ? `&barberId=${barberId}` : ''}`),

  services: () => request<{ services: Service[] }>('/api/admin/services'),
  createService: (body: Partial<Service>) => request<{ service: Service }>('/api/admin/services', json(body)),
  updateService: (id: number, body: Partial<Service>) =>
    request<{ service: Service }>(`/api/admin/services/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteService: (id: number) => request<{ deleted?: { id: number }; message?: string }>(`/api/admin/services/${id}`, { method: 'DELETE' }),

  barbers: () => request<{ barbers: Barber[] }>('/api/admin/barbers'),
  createBarber: (body: Partial<Barber>) => request<{ barber: Barber }>('/api/admin/barbers', json(body)),
  updateBarber: (id: number, body: Partial<Barber>) =>
    request<{ barber: Barber }>(`/api/admin/barbers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteBarber: (id: number) => request<{ deleted?: { id: number }; message?: string }>(`/api/admin/barbers/${id}`, { method: 'DELETE' }),

  blocks: (query: { date?: string; barberId?: number } = {}) => {
    const search = new URLSearchParams();
    if (query.date) search.set('date', query.date);
    if (query.barberId) search.set('barberId', String(query.barberId));
    return request<{ blocks: Block[] }>(`/api/admin/blocks?${search.toString()}`);
  },
  createBlock: (body: { barberId: number; date: string; time: string | null; reason: string }) =>
    request<{ block: Block }>('/api/admin/blocks', json(body)),
  deleteBlock: (id: number) => request<{ deleted: { id: number } }>(`/api/admin/blocks/${id}`, { method: 'DELETE' }),

  settings: () => request<{ settings: ShopSettings }>('/api/admin/settings'),
  updateSettings: (body: Partial<ShopSettings>) =>
    request<{ settings: ShopSettings }>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean; message: string }>('/api/admin/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),
  resetDemo: () => request<{ ok: boolean; services: Service[]; barbers: Barber[] }>('/api/admin/reset-demo', { method: 'POST' }),
};
