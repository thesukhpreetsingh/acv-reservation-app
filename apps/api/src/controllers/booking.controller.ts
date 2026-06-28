import { Controller, Post, Body, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { AvailabilityEngine, Slot } from '../usecases/availability.engine';
import { ReserveVehicleUseCase } from '../usecases/reserve-vehicle.usecase';
import { VehicleRepository } from '../repositories/vehicle.repository';
import { ReservationRepository } from '../repositories/reservation.repository';
import { LeastUtilizedVehicleStrategy } from '../usecases/least-utilized-vehicle.strategy';
import { RedisLockService } from '../infrastructure/redis/redis-lock.service';

@Controller('api')
export class BookingController {
  constructor(
    private readonly availabilityEngine: AvailabilityEngine,
    private readonly reserveVehicleUseCase: ReserveVehicleUseCase,
    private readonly lockService: RedisLockService,
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
    
    const allAvailableSlots: Slot[] = [];
    for (const vehicle of candidates) {
      const reservations = await this.resRepo.findByVehicleId(vehicle.id);
      const slots = this.availabilityEngine.generateAvailableSlots(vehicle, startDateTime, reservations, body.durationMins);
      allAvailableSlots.push(...slots);
    }

    return {
      availableSlots: allAvailableSlots
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
    // We don't know the vehicleId yet if it's not provided, 
    // so we lock on a combination of type and location to prevent 
    // multiple concurrent allocations for the same request.
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
