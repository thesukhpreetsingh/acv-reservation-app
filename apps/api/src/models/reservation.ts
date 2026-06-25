export interface Reservation {
  id: number;

  vehicleId: string;

  startDateTime: string;
  endDateTime: string;

  customerName: string;
  customerEmail: string;
  customerPhone: string;
}