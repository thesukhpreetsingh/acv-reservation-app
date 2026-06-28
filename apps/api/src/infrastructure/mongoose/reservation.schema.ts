import { Schema, model, Document } from 'mongoose';
import { Reservation } from '../../models/reservation';

export interface ReservationDocument extends Reservation, Document {}

export const ReservationSchema = new Schema<ReservationDocument>({
  vehicleId: { type: String, required: true, index: true },
  startDateTime: { type: Date, required: true },
  endDateTime: { type: Date, required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, required: true },
});

// Optimized indexes for overlap queries
ReservationSchema.index({ vehicleId: 1, startDateTime: 1 });
ReservationSchema.index({ vehicleId: 1, endDateTime: 1 });

export const ReservationModel = model<ReservationDocument>('Reservation', ReservationSchema);
