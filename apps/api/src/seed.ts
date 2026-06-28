import mongoose, { connect } from 'mongoose';
import { VehicleModel } from './infrastructure/mongoose/vehicle.schema';
import { ReservationModel } from './infrastructure/mongoose/reservation.schema';
import * as fs from 'fs';
import * as path from 'path';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/nevo-test-drive';

async function connectWithRetry(uri: string, attempts = 6, delayMs = 5000) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await connect(uri);
      console.log(`✅ Connected to MongoDB on attempt ${attempt}`);
      return;
    } catch (error) {
      console.warn(`MongoDB connection attempt ${attempt} failed.`);
      if (attempt === attempts) {
        throw error;
      }
      console.log(`Retrying in ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function seed() {
  console.log('Starting database seeding...');

  try {
    await connectWithRetry(MONGO_URI);

    const vehicleCount = await VehicleModel.countDocuments();
    if (vehicleCount > 0) {
      console.log('✅ Database already seeded. Skipping...');
      return;
    }

    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const vehiclesData = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'Requirement', 'vehicles.json'), 'utf8')
    ) as { vehicles: any[] };

    await VehicleModel.insertMany(
      vehiclesData.vehicles.map((v: any) => ({
        ...v,
        availableFromTime: v.availableFromTime.substring(0, 5),
        availableToTime: v.availableToTime.substring(0, 5),
        availableDays: v.availableDays.map((day: string) => {
          const map: Record<string, string> = {
            mon: 'Monday',
            tue: 'Tuesday',
            wed: 'Wednesday',
            thur: 'Thursday',
            fri: 'Friday',
            sat: 'Saturday',
            sun: 'Sunday',
          };
          return map[day] || day;
        }),
      })),
    );
    console.log('✅ Vehicles seeded successfully');

    const reservationsData = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'Requirement', 'reservations.json'), 'utf8')
    ) as { reservations: any[] };

    await ReservationModel.insertMany(
      reservationsData.reservations.map((r: any) => ({
        ...r,
        id: r.id.toString(),
        startDateTime: new Date(r.startDateTime),
        endDateTime: new Date(r.endDateTime),
      })),
    );
    console.log('✅ Reservations seeded successfully');

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

seed();
