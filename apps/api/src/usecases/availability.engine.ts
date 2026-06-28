import { Vehicle } from "../models/vehicle";
import { Reservation } from "../models/reservation";

export interface AvailabilityCriteria {
  location: string;
  vehicleType: string;
  startDateTime: Date;
  durationMins: number;
}

export interface Slot {
  startDateTime: Date;
  endDateTime: Date;
  vehicleId: string;
}

/**
 * AvailabilityEngine is the core business logic for determining vehicle availability.
 *
 * Responsibilities:
 * - Validate that a requested time slot respects vehicle operating hours
 * - Ensure no overlaps with existing reservations (including buffer time)
 * - Enforce the 14-day booking window constraint
 * - Generate available slots based on a 15-minute scheduling grid
 *
 * This engine treats all times in UTC to ensure consistent behavior across
 * timezones and avoids locale-specific formatting issues.
 */
export class AvailabilityEngine {
  /**
   * Core availability check: determines if a vehicle can be reserved for the given time slot.
   *
   * Validates in order:
   * 1. Day of week is supported
   * 2. Time slot is within operating hours
   * 3. Booking is within 14-day window
   * 4. No conflict with existing reservations or their required buffer time
   *
   * @returns true if and only if all availability rules are satisfied
   */
  public isVehicleAvailable(
    vehicle: Vehicle,
    requestedStart: Date,
    requestedEnd: Date,
    existingReservations: Reservation[]
  ): boolean {
    if (!this.isDaySupported(vehicle, requestedStart)) {
      return false;
    }

    // 2. Validate Operating Hours
    if (!this.isWithinOperatingHours(vehicle, requestedStart, requestedEnd)) {
      return false;
    }

    // 3. Validate 14-Day Window
    if (!this.isWithinBookingWindow(requestedStart)) {
      return false;
    }

    const relevantReservations = this.getRelevantReservations(vehicle, requestedStart, requestedEnd, existingReservations);

    return !this.hasOverlapOrBufferConflict(vehicle, requestedStart, requestedEnd, relevantReservations);
  }

  /**
   * Checks if the requested date's day-of-week is in the vehicle's available days.
   * Uses UTC to ensure consistent day-of-week calculation across timezones.
   */
  private isDaySupported(vehicle: Vehicle, date: Date): boolean {
    const dayName = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "UTC"
    }).format(date);

    return vehicle.availableDays.includes(dayName);
  }

  /**
   * Verifies the requested time slot falls entirely within the vehicle's operating hours.
   * Both start and end times are converted to UTC minutes for safe numeric comparison.
   */
  private isWithinOperatingHours(vehicle: Vehicle, start: Date, end: Date): boolean {
    const startMinutes = this.toUtcMinutes(start);
    const endMinutes = this.toUtcMinutes(end);
    const fromMinutes = this.parseTimeToMinutes(vehicle.availableFromTime);
    const toMinutes = this.parseTimeToMinutes(vehicle.availableToTime);

    return startMinutes >= fromMinutes && endMinutes <= toMinutes;
  }

  /**
   * Converts a Date to minutes since midnight UTC.
   * Used for safe time comparisons independent of date boundaries.
   */
  private toUtcMinutes(date: Date): number {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }

  /**
   * Parses "HH:mm" string format into total minutes since midnight.
   * Example: "09:30" -> 570 minutes
   */
  private parseTimeToMinutes(value: string): number {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Enforces the 14-day booking window constraint.
   * Bookings must be at least now and no more than 14 days in the future.
   */
  private isWithinBookingWindow(date: Date): boolean {
    const now = new Date();
    const maxBookingDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    return date >= now && date <= maxBookingDate;
  }

  /**
   * Filters existing reservations to only those that could conflict with the requested slot.
   * This optimization reduces the overlap-check loop from O(all reservations) to O(relevant).
   *
   * A reservation is relevant if it or its buffer time overlaps the requested window's buffer.
   */
  private getRelevantReservations(
    vehicle: Vehicle,
    requestedStart: Date,
    requestedEnd: Date,
    existingReservations: Reservation[]
  ): Reservation[] {
    const bufferMins = vehicle.minimumMinutesBetweenBookings;
    const bufferWindowStart = new Date(requestedStart.getTime() - bufferMins * 60000);
    const bufferWindowEnd = new Date(requestedEnd.getTime() + bufferMins * 60000);

    return existingReservations.filter((reservation) => {
      return reservation.vehicleId === vehicle.id
        && reservation.endDateTime > bufferWindowStart
        && reservation.startDateTime < bufferWindowEnd;
    });
  }

  /**
   * Checks for overlap or buffer conflicts with existing reservations.
   *
   * Key insight: Each existing reservation creates a "blocked window" that includes:
   * - The reservation time itself
   * - The minimum buffer time before and after
   *
   * If the requested slot overlaps this blocked window, it's rejected.
   * This ensures the minimum buffer rule is enforced on both sides.
   */
  private hasOverlapOrBufferConflict(
    vehicle: Vehicle,
    requestedStart: Date,
    requestedEnd: Date,
    existingReservations: Reservation[]
  ): boolean {
    const bufferMins = vehicle.minimumMinutesBetweenBookings;

    return existingReservations.some((reservation) => {
      const blockedStart = new Date(reservation.startDateTime.getTime() - bufferMins * 60000);
      const blockedEnd = new Date(reservation.endDateTime.getTime() + bufferMins * 60000);

      return requestedStart < blockedEnd && requestedEnd > blockedStart;
    });
  }

  /**
   * Generates all available slots for a vehicle on a given date.
   *
   * Process:
   * 1. Iterate through the day in 15-minute intervals
   * 2. For each potential start time, check if a slot of durationMins fits
   * 3. Verify it doesn't exceed operating hours
   * 4. Verify it doesn't conflict with existing reservations
   * 5. If all checks pass, include it in the result
   *
   * @param durationMins Default 45 minutes; can be overridden for different slot lengths
   * @returns Array of available slots, empty if no availability
   */
  public generateAvailableSlots(
    vehicle: Vehicle,
    date: Date,
    existingReservations: Reservation[],
    durationMins = 45
  ): Slot[] {
    const slots: Slot[] = [];
    const gridIntervalMins = 15;

    const dayStart = this.createUtcDate(date, vehicle.availableFromTime);
    const dayEnd = this.createUtcDate(date, vehicle.availableToTime);

    let currentSlotStart = new Date(dayStart);

    while (currentSlotStart < dayEnd) {
      const currentSlotEnd = new Date(currentSlotStart.getTime() + durationMins * 60000);

      // Stop if this slot would extend beyond operating hours
      if (currentSlotEnd > dayEnd) {
        break;
      }

      if (this.isVehicleAvailable(vehicle, currentSlotStart, currentSlotEnd, existingReservations)) {
        slots.push({
          startDateTime: new Date(currentSlotStart),
          endDateTime: new Date(currentSlotEnd),
          vehicleId: vehicle.id
        });
      }

      // Advance to next grid interval (15 minutes)
      currentSlotStart = new Date(currentSlotStart.getTime() + gridIntervalMins * 60000);
    }

    return slots;
  }

  /**
   * Helper: Creates a UTC date from a calendar date and a "HH:mm" time string.
   * Ensures consistent time handling across timezones.
   *
   * Example: createUtcDate(new Date("2026-07-01"), "09:30") -> 2026-07-01T09:30:00Z
   */
  private createUtcDate(date: Date, timeValue: string): Date {
    const [hours, minutes] = timeValue.split(":").map(Number);

    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        hours,
        minutes,
        0,
        0
      )
    );
  }
}
