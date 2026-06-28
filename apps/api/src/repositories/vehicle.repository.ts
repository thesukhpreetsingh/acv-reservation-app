import { Vehicle } from "../models/vehicle";

export interface VehicleRepository {
  findById(id: string): Promise<Vehicle | null>;
  findEligibleVehicles(type: string, location: string): Promise<Vehicle[]>;
}