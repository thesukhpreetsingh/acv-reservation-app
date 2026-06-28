export interface Reservation {
  id: string;

  vehicleId: string;

  startDateTime: Date;
  endDateTime: Date;

  customerName: string;
  customerEmail: string;
  customerPhone: string;
}