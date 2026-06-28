import { Vehicle } from "../models/vehicle";
import { VehicleAllocationStrategy } from "./vehicle-allocation.strategy";

/**
 * Implementation of VehicleAllocationStrategy that distributes bookings evenly.
 * 
 * The strategy selects the vehicle with the lowest number of existing reservations.
 * This prevents a single vehicle from being over-utilized while others remain idle.
 */
export class LeastUtilizedVehicleStrategy implements VehicleAllocationStrategy {
  /**
   * Selects the vehicle with the minimum number of bookings.
   * 
   * Complexity: O(K) where K is the number of eligible candidates.
   */
  public selectVehicle(
    candidates: Vehicle[],
    vehicleUsage: Map<string, number>
  ): Vehicle | null {
    if (candidates.length === 0) {
      return null;
    }

    let selectedVehicle: Vehicle | null = null;
    let minBookings = Infinity;

    for (const vehicle of candidates) {
      const bookingCount = vehicleUsage.get(vehicle.id) || 0;

      if (bookingCount < minBookings) {
        minBookings = bookingCount;
        selectedVehicle = vehicle;
      }
    }

    return selectedVehicle;
  }
}
