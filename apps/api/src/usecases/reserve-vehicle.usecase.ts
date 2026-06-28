import { VehicleRepository } from "../repositories/vehicle.repository";
import { ReservationRepository } from "../repositories/reservation.repository";
import { AvailabilityEngine } from "./availability.engine";
import { VehicleAllocationStrategy } from "./vehicle-allocation.strategy";
import { Reservation } from "../models/reservation";
import { Vehicle } from "../models/vehicle";

interface ReserveVehicleInput {
  vehicleId?: string; // Optional if we want the system to allocate automatically
  location: string;
  vehicleType: string;
  startDateTime: Date;
  durationMins: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export class ReserveVehicleUseCase {
  constructor(
    private readonly vehicleRepository: VehicleRepository,
    private readonly reservationRepository: any, // Cast to any or a custom TransactionalRepository to support sessions
    private readonly availabilityEngine: AvailabilityEngine,
    private readonly allocationStrategy: VehicleAllocationStrategy
  ) {}

  /**
   * Orchestrates the reservation process.
   * 
   * Process:
   * 1. Find all vehicles of the requested type and location.
   * 2. Filter vehicles that are actually available for the requested slot.
   * 3. Use the Allocation Strategy to pick the best vehicle (Even Distribution).
   * 4. Save the reservation.
   * 
   * Note: Concurrency is handled by a distributed lock at the controller level.
   */
  async execute(input: ReserveVehicleInput): Promise<Reservation> {
    const { vehicleId, location, vehicleType, startDateTime, durationMins, customerName, customerEmail, customerPhone } = input;

    const endDateTime = new Date(startDateTime.getTime() + durationMins * 60000);

    let selectedVehicle: Vehicle | null = null;

    if (vehicleId) {
      const explicitlyRequestedVehicle = await this.vehicleRepository.findById(vehicleId);

      if (!explicitlyRequestedVehicle) {
        throw new Error('Requested vehicle was not found.');
      }

      if (explicitlyRequestedVehicle.type !== vehicleType || explicitlyRequestedVehicle.location !== location) {
        throw new Error('Requested vehicle does not match the requested location and vehicle type.');
      }

      const reservations = await this.reservationRepository.findByVehicleId(explicitlyRequestedVehicle.id);
      const isAvailable = this.availabilityEngine.isVehicleAvailable(
        explicitlyRequestedVehicle,
        startDateTime,
        endDateTime,
        reservations,
      );

      if (!isAvailable) {
        throw new Error('Requested vehicle is not available for the selected time slot.');
      }

      selectedVehicle = explicitlyRequestedVehicle;
    } else {
      const candidates = await this.vehicleRepository.findEligibleVehicles(vehicleType, location);

      if (candidates.length === 0) {
        throw new Error('No vehicles of this type available at the requested location.');
      }

      const availableVehicles: Vehicle[] = [];
      for (const vehicle of candidates) {
        const reservations = await this.reservationRepository.findByVehicleId(vehicle.id);
        if (this.availabilityEngine.isVehicleAvailable(vehicle, startDateTime, endDateTime, reservations)) {
          availableVehicles.push(vehicle);
        }
      }

      if (availableVehicles.length === 0) {
        throw new Error('No vehicles are available for the requested time slot.');
      }

      const usageMap = await this.reservationRepository.countReservationsByVehicle(
        availableVehicles.map((vehicle) => vehicle.id),
      );

      selectedVehicle = this.allocationStrategy.selectVehicle(availableVehicles, usageMap);
    }

    if (!selectedVehicle) {
      throw new Error('Failed to allocate a vehicle.');
    }

    const reservation: Reservation = {
      id: undefined as any,
      vehicleId: selectedVehicle.id,
      startDateTime,
      endDateTime,
      customerName,
      customerEmail,
      customerPhone,
    };

    await this.reservationRepository.save(reservation);

    return reservation;
  }
}
