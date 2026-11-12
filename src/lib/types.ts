export type Service = {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  durationMin: number;
  active: boolean;
};

export type Barber = {
  id: number;
  name: string;
  specialty: string;
  bio: string;
  active: boolean;
  initials: string;
};

export type DateOption = { date: string; weekday: number; open: boolean };

export type ShopSettings = {
  whatsappNumber: string;
  openingTime: string;
  closingTime: string;
  slotMinutes: number;
  workDays: number[];
  leadTimeMinutes: number;
  maxDaysAhead: number;
};

export type SiteData = {
  shop: ShopSettings & { name: string; tagline: string; whatsappLink: string };
  services: Service[];
  barbers: Barber[];
  dates: DateOption[];
};

export type Slot = { time: string; endTime: string; available: boolean; reason: string };

export type Availability = {
  date: string;
  barberId: number;
  serviceId: number;
  closed: boolean;
  reason: string;
  slots: Slot[];
};

export type Appointment = {
  id: number;
  customerName: string;
  customerPhone: string;
  customerPhoneFormatted: string;
  serviceId: number;
  barberId: number;
  serviceName: string;
  barberName: string;
  priceCents: number;
  priceFormatted: string;
  date: string;
  time: string;
  endTime: string;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
};

export type Block = {
  id: number;
  barberId: number;
  date: string;
  time: string | null;
  reason: string;
  createdAt: string;
};

export type BookingResult = {
  appointment: Appointment;
  whatsappUrl: string;
  message: string;
};

export type AdminUser = { username: string; defaultPassword: boolean };
