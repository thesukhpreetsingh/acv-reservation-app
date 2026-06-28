import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { ReservationRepository } from '../../repositories/reservation.repository';
import { Reservation } from '../../models/reservation';
import { ReservationDocument } from './reservation.schema';

@Injectable()
export class MongoReservationRepository implements ReservationRepository {
  constructor(
    @InjectModel('Reservation') private readonly reservationModel: Model<ReservationDocument>,
  ) {}

  /**
   * Finds all reservations for a specific vehicle.
   * Supports optional session for MongoDB transactions.
   */
  async findByVehicleId(vehicleId: string, session?: ClientSession | null): Promise<Reservation[]> {
    const query = this.reservationModel.find({ vehicleId });
    if (session) {
      query.session(session);
    }

    const docs = await query.lean().exec();
    return (docs as any[]).map((doc: any) => this.mapToDomain(doc));
  }

  /**
   * Aggregates booking counts for a set of vehicles.
   * Used by the LeastUtilizedVehicleStrategy.
   */
  async countReservationsByVehicle(vehicleIds: string[]): Promise<Map<string, number>> {
    const aggregation = await this.reservationModel.aggregate([
      { $match: { vehicleId: { $in: vehicleIds } } },
      { $group: { _id: "$vehicleId", count: { $sum: 1 } } }
    ]).exec();

    const usageMap = new Map<string, number>();
    aggregation.forEach((res: any) => {
      usageMap.set(res._id, res.count);
    });

    return usageMap;
  }

  /**
   * Saves a reservation.
   * Supports optional session for MongoDB transactions to prevent race conditions.
   */
  async save(reservation: Reservation, session?: ClientSession): Promise<void> {
    const doc = {
      vehicleId: reservation.vehicleId,
      startDateTime: reservation.startDateTime,
      endDateTime: reservation.endDateTime,
      customerName: reservation.customerName,
      customerEmail: reservation.customerEmail,
      customerPhone: reservation.customerPhone,
    };

    await this.reservationModel.create([doc], { session });
  }

  private mapToDomain(doc: any): Reservation {
    return {
      id: doc._id.toString(),
      vehicleId: doc.vehicleId,
      startDateTime: doc.startDateTime,
      endDateTime: doc.endDateTime,
      customerName: doc.customerName,
      customerEmail: doc.customerEmail,
      customerPhone: doc.customerPhone,
    };
  }
}
