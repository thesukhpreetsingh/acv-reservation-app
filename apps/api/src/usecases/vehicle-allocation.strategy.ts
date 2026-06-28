import { Vehicle } from "../models/vehicle";

/**
 * Strategy interface for vehicle allocation.
 * This allows the system to change how it selects a vehicle among multiple available options
 * without modifying the core booking logic (Open-Closed Principle).
 */
export interface VehicleAllocationStrategy {
  /**
   * Selects the best vehicle from a list of eligible candidates.
   * 
   * @param candidates List of vehicles that passed the availability checks
   * @param vehicleUsage A map containing the current booking count for each vehicle
   * @returns The selected vehicle or null if no candidates are available
   */
  selectVehicle(
    candidates: Vehicle[],
    vehicleUsage: Map<string, number>
  ): Vehicle | null;
}
