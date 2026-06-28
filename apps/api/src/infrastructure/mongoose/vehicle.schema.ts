import { Schema, model, Document } from 'mongoose';
import { Vehicle } from '../../models/vehicle';

export interface VehicleDocument extends Vehicle, Document {}

export const VehicleSchema = new Schema<VehicleDocument>({
  type: { type: String, required: true, index: true },
  location: { type: String, required: true, index: true },
  availableDays: [{ type: String, required: true }],
  availableFromTime: { type: String, required: true },
  availableToTime: { type: String, required: true },
  minimumMinutesBetweenBookings: { type: Number, required: true },
});

// Compound index for optimized vehicle filtering
VehicleSchema.index({ type: 1, location: 1 });

export const VehicleModel = model<VehicleDocument>('Vehicle', VehicleSchema);
