import { Reservation } from "../models/reservation";

export interface ReservationRepository {
  findByVehicleId(vehicleId: string): Promise<Reservation[]>;
  countReservationsByVehicle(vehicleIds: string[]): Promise<Map<string, number>>;
  save(reservation: Reservation): Promise<void>;
}