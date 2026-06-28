import { Controller, Get, Post, Body, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { AvailabilityEngine, Slot } from '../usecases/availability.engine';
import { ReserveVehicleUseCase } from '../usecases/reserve-vehicle.usecase';
import { VehicleRepository } from '../repositories/vehicle.repository';
import { ReservationRepository } from '../repositories/reservation.repository';
import { LeastUtilizedVehicleStrategy } from '../usecases/least-utilized-vehicle.strategy';
import { RedisLockService } from '../infrastructure/redis/redis-lock.service';
import { Vehicle } from '../models/vehicle';

@Controller('api')
export class BookingController {
  constructor(
    private readonly availabilityEngine: AvailabilityEngine,
    private readonly reserveVehicleUseCase: ReserveVehicleUseCase,
    private readonly lockService: RedisLockService,
    private readonly allocationStrategy: LeastUtilizedVehicleStrategy,
    @Inject('VehicleRepository') private readonly vehicleRepo: VehicleRepository,
    @Inject('ReservationRepository') private readonly resRepo: ReservationRepository,
  ) {}

  /**
   * POST /api/availability
   * Checks for available slots for a specific vehicle type and location.
   */
  @Post('availability')
  async checkAvailability(@Body() body: {
    location: string;
    vehicleType: string;
    startDateTime: string;
    durationMins: number;
  }) {
    const startDateTime = new Date(body.startDateTime);

    const candidates = await this.vehicleRepo.findEligibleVehicles(body.vehicleType, body.location);

    const availableSlots: Slot[] = [];
    const slotsByVehicle = new Map<string, Slot[]>();
    const availableVehicles: Vehicle[] = [];

    for (const vehicle of candidates) {
      const reservations = await this.resRepo.findByVehicleId(vehicle.id);
      const slots = this.availabilityEngine.generateAvailableSlots(vehicle, startDateTime, reservations, body.durationMins);

      if (slots.length > 0) {
        availableVehicles.push(vehicle);
        slotsByVehicle.set(vehicle.id, slots);
        availableSlots.push(...slots);
      }
    }

    let recommendedSlot: Slot | null = null;
    let recommendedVehicleId: string | null = null;

    if (availableVehicles.length > 0) {
      const usageMap = await this.resRepo.countReservationsByVehicle(availableVehicles.map((vehicle) => vehicle.id));
      const recommendedVehicle = this.allocationStrategy.selectVehicle(availableVehicles, usageMap);

      if (recommendedVehicle) {
        recommendedVehicleId = recommendedVehicle.id;
        recommendedSlot = slotsByVehicle.get(recommendedVehicle.id)?.[0] ?? null;
      }
    }

    return {
      availableSlots,
      recommendedSlot,
      recommendedVehicleId,
    };
  }

  @Get('admin/vehicle-options')
  async getVehicleOptions() {
    const vehicleTypes = await this.vehicleRepo.findDistinctTypes();
    const locations = await this.vehicleRepo.findDistinctLocations();

    return {
      vehicleTypes: vehicleTypes.sort((a, b) => a.localeCompare(b)),
      locations: locations.sort((a, b) => a.localeCompare(b)),
    };
  }

  @Post('admin/vehicles')
  async createVehicle(@Body() body: {
    type: string;
    location: string;
    availableDays: string[];
    availableFromTime: string;
    availableToTime: string;
    minimumMinutesBetweenBookings: number;
  }) {
    const normalizedDays = (body.availableDays || []).map((day) => day.trim()).filter(Boolean);

    if (!body.type || !body.location || normalizedDays.length === 0 || !body.availableFromTime || !body.availableToTime) {
      throw new HttpException('Please provide a model type, location, available days, and operating hours.', HttpStatus.BAD_REQUEST);
    }

    const vehicle = await this.vehicleRepo.create({
      type: body.type,
      location: body.location,
      availableDays: normalizedDays,
      availableFromTime: body.availableFromTime,
      availableToTime: body.availableToTime,
      minimumMinutesBetweenBookings: Number(body.minimumMinutesBetweenBookings || 0),
    });

    return {
      success: true,
      vehicle,
    };
  }

  /**
   * POST /api/reservations
   * Creates a reservation using a distributed lock to prevent race conditions.
   */
  @Post('reservations')
  async createReservation(@Body() body: {
    vehicleId?: string;
    location: string;
    vehicleType: string;
    startDateTime: string;
    durationMins: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }) {
    const lockResource = body.vehicleId || `allocation:${body.vehicleType}:${body.location}`;
    const lockValue = await this.lockService.acquireLock(lockResource);

    if (!lockValue) {
      throw new HttpException('Vehicle is currently being reserved. Please try again in a moment.', HttpStatus.CONFLICT);
    }

    try {
      const input = {
        ...body,
        startDateTime: new Date(body.startDateTime),
      };

      const reservation = await this.reserveVehicleUseCase.execute(input);

      return reservation;
    } catch (error: unknown) {
      console.error('[Reservation Error]:', error);
      const message = error instanceof Error ? error.message : 'Failed to create reservation';
      throw new HttpException(message, HttpStatus.CONFLICT);
    } finally {
      await this.lockService.releaseLock(lockResource, lockValue);
    }
  }
}
