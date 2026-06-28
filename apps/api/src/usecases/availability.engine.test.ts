import test from 'node:test';
import assert from 'node:assert/strict';
import { AvailabilityEngine } from './availability.engine';
import type { Vehicle } from '../models/vehicle';

const engine = new AvailabilityEngine();

const vehicle: Vehicle = {
  id: 'tesla_1001',
  type: 'tesla_model3',
  location: 'dublin',
  availableFromTime: '08:00:00',
  availableToTime: '18:00:00',
  availableDays: ['tue', 'wed'],
  minimumMinutesBetweenBookings: 15,
};

test('accepts weekday values in the compact format used by vehicle data', () => {
  const start = new Date('2026-06-30T09:00:00.000Z');
  const end = new Date('2026-06-30T09:45:00.000Z');

  assert.equal(engine.isVehicleAvailable(vehicle, start, end, []), true);
});
