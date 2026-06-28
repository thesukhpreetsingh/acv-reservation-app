export interface Vehicle {
  id: string;
  type: string;
  location: string;

  availableFromTime: string;
  availableToTime: string;

  availableDays: string[];

  minimumMinutesBetweenBookings: number;
}