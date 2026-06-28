import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingController } from './controllers/booking.controller';
import { AvailabilityEngine } from './usecases/availability.engine';
import { ReserveVehicleUseCase } from './usecases/reserve-vehicle.usecase';
import { MongoVehicleRepository } from './infrastructure/mongoose/mongo-vehicle.repository';
import { MongoReservationRepository } from './infrastructure/mongoose/mongo-reservation.repository';
import { LeastUtilizedVehicleStrategy } from './usecases/least-utilized-vehicle.strategy';
import { RedisLockService } from './infrastructure/redis/redis-lock.service';
import { VehicleSchema } from './infrastructure/mongoose/vehicle.schema';
import { ReservationSchema } from './infrastructure/mongoose/reservation.schema';

const mongoUri = process.env.MONGO_URI || 'mongodb://mongodb:27017/nevo-test-drive';

@Module({
  imports: [
    MongooseModule.forRoot(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: false,
      family: 4,
      autoIndex: false,
      autoCreate: true,
    }),
    MongooseModule.forFeature([
      { name: 'Vehicle', schema: VehicleSchema },
      { name: 'Reservation', schema: ReservationSchema },
    ]),
  ],
  controllers: [BookingController],
  providers: [
    AvailabilityEngine,
    LeastUtilizedVehicleStrategy,
    RedisLockService,
    {
      provide: 'VehicleRepository',
      useClass: MongoVehicleRepository,
    },
    {
      provide: 'ReservationRepository',
      useClass: MongoReservationRepository,
    },
    {
      provide: ReserveVehicleUseCase,
      inject: ['VehicleRepository', 'ReservationRepository', AvailabilityEngine, LeastUtilizedVehicleStrategy],
      useFactory: (vRepo, rRepo, engine, strategy) => {
        return new ReserveVehicleUseCase(vRepo, rRepo, engine, strategy);
      },
    },
  ],
})
export class AppModule {
}
