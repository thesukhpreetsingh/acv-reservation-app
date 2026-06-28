import test from 'node:test';
import assert from 'node:assert/strict';
import { ReserveVehicleUseCase } from './reserve-vehicle.usecase';
import { AvailabilityEngine } from './availability.engine';
import { Vehicle } from '../models/vehicle';
import { Reservation } from '../models/reservation';

class InMemoryVehicleRepository {
  constructor(private readonly vehicles: Vehicle[]) {}

  async findById(id: string): Promise<Vehicle | null> {
    return this.vehicles.find((vehicle) => vehicle.id === id) ?? null;
  }

  async findEligibleVehicles(type: string, location: string): Promise<Vehicle[]> {
    return this.vehicles.filter((vehicle) => vehicle.type === type && vehicle.location === location);
  }
}

class InMemoryReservationRepository {
  private readonly reservations: Reservation[] = [];

  async findByVehicleId(vehicleId: string): Promise<Reservation[]> {
    return this.reservations.filter((reservation) => reservation.vehicleId === vehicleId);
  }

  async countReservationsByVehicle(vehicleIds: string[]): Promise<Map<string, number>> {
    const usageMap = new Map<string, number>();
    for (const vehicleId of vehicleIds) {
      usageMap.set(vehicleId, this.reservations.filter((reservation) => reservation.vehicleId === vehicleId).length);
    }
    return usageMap;
  }

  async save(reservation: Reservation): Promise<void> {
    this.reservations.push({ ...reservation, id: `reservation-${this.reservations.length + 1}` });
  }
}

test('rejects a vehicleId that does not match the requested location and type', async () => {
  const vehicle: Vehicle = {
    id: 'tesla_1004',
    type: 'tesla_model3',
    location: 'cork',
    availableFromTime: '08:00:00',
    availableToTime: '18:00:00',
    availableDays: ['mon', 'tue', 'wed', 'thur', 'fri'],
    minimumMinutesBetweenBookings: 15,
  };

  const usecase = new ReserveVehicleUseCase(
    new InMemoryVehicleRepository([vehicle]) as any,
    new InMemoryReservationRepository() as any,
    new AvailabilityEngine(),
    { selectVehicle: (candidates: Vehicle[]) => candidates[0] ?? null } as any,
  );

  await assert.rejects(
    () =>
      usecase.execute({
        vehicleId: vehicle.id,
        location: 'dublin',
        vehicleType: 'tesla_model3',
        startDateTime: new Date('2026-06-30T09:00:00.000Z'),
        durationMins: 45,
        customerName: 'Ada Lovelace',
        customerEmail: 'ada@example.com',
        customerPhone: '+3531234567',
      }),
    /does not match/i,
  );
});
