import { format, addDays, isWithinInterval, startOfDay } from 'date-fns';

const API_BASE_URL = 'http://localhost:3000/api';

export interface Slot {
  startDateTime: string;
  endDateTime: string;
  vehicleId: string;
}

export interface AvailabilityResponse {
  availableSlots: Slot[];
}

function toUtcMidnight(date: Date): string {
  const utcMidnight = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  return utcMidnight.toISOString();
}

export async function fetchAvailableSlots(
  location: string,
  vehicleType: string,
  date: Date,
  durationMins: number = 45
): Promise<AvailabilityResponse> {
  const isoDate = toUtcMidnight(date);
  
  const response = await fetch(`${API_BASE_URL}/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      vehicleType,
      startDateTime: isoDate,
      durationMins,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch available slots');
  }

  return response.json();
}

export async function createReservation(payload: {
  vehicleId: string;
  startDateTime: string;
  durationMins: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  location: string;
  vehicleType: string;
}) {
  const response = await fetch(`${API_BASE_URL}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create reservation');
  }

  return response.json();
}
