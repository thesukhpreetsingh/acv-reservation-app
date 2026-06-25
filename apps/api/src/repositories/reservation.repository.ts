import { Reservation } from "../models/reservation";

export interface ReservationRepository {
  findByVehicleId(vehicleId: string): Promise<Reservation[]>;

  save(reservation: Reservation): Promise<void>;
}