import { setTimeout as delay } from 'node:timers/promises';

const baseUrl = 'http://localhost:3000/api/reservations';
const vehicleType = 'Tesla Model 3';
const location = 'Dublin';
const date = '2026-06-30';
const slots = [
  '09:00:00Z',
  '10:30:00Z',
  '12:00:00Z',
  '13:30:00Z',
  '15:00:00Z',
  '16:30:00Z',
];

const results = [];
for (const [index, time] of slots.entries()) {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      vehicleType,
      startDateTime: `${date}T${time}`,
      durationMins: 45,
      customerName: `Tester ${index + 1}`,
      customerEmail: `tester${index + 1}@example.com`,
      customerPhone: `+3530000000${index + 1}`,
    }),
  });

  const payload = await response.json();
  results.push({
    index: index + 1,
    status: response.status,
    vehicleId: payload.vehicleId || payload.id,
    message: payload.message || 'ok',
  });

  await delay(250);
}

console.log(JSON.stringify(results, null, 2));
