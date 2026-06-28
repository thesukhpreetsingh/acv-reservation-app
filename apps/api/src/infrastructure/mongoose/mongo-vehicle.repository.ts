import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VehicleRepository } from '../../repositories/vehicle.repository';
import { Vehicle } from '../../models/vehicle';
import { VehicleDocument } from './vehicle.schema';

@Injectable()
export class MongoVehicleRepository implements VehicleRepository {
  constructor(
    @InjectModel('Vehicle') private readonly vehicleModel: Model<VehicleDocument>,
  ) {}

  async findById(id: string): Promise<Vehicle | null> {
    const doc = await this.vehicleModel.findById(id).lean().exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  async findEligibleVehicles(type: string, location: string): Promise<Vehicle[]> {
    const docs = await this.vehicleModel.find({ type, location }).lean().exec();
    return docs.map(doc => this.mapToDomain(doc));
  }

  private mapToDomain(doc: any): Vehicle {
    return {
      id: doc._id.toString(),
      type: doc.type,
      location: doc.location,
      availableDays: doc.availableDays,
      availableFromTime: doc.availableFromTime,
      availableToTime: doc.availableToTime,
      minimumMinutesBetweenBookings: doc.minimumMinutesBetweenBookings,
    };
  }
}
