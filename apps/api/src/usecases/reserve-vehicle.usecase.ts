import { VehicleRepository } from "../repositories/vehicle.repository";
import { ReservationRepository } from "../repositories/reservation.repository";

interface ReserveVehicleInput {
  vehicleId: string;

  startDateTime: string;
  endDateTime: string;

  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export class ReserveVehicleUseCase {
  constructor(
    private vehicleRepository: VehicleRepository,
    private reservationRepository: ReservationRepository
  ) {}

  async execute(input: ReserveVehicleInput) {
    // TODO
  }
}