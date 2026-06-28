import { useState } from 'react';

const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AdminPage() {
  const [form, setForm] = useState({
    type: '',
    location: '',
    availableDays: [] as string[],
    availableFromTime: '09:00',
    availableToTime: '17:00',
    minimumMinutesBetweenBookings: '30',
  });
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDayToggle = (day: string) => {
    setForm((current) => ({
      ...current,
      availableDays: current.availableDays.includes(day)
        ? current.availableDays.filter((item) => item !== day)
        : [...current.availableDays, day],
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:3000/api/admin/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          minimumMinutesBetweenBookings: Number(form.minimumMinutesBetweenBookings),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to register vehicle');
      }

      setMessage(`Registered ${data.vehicle.type} at ${data.vehicle.location}.`);
      setForm({
        type: '',
        location: '',
        availableDays: [],
        availableFromTime: '09:00',
        availableToTime: '17:00',
        minimumMinutesBetweenBookings: '30',
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to register vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fbff 0%, #eef4ff 45%, #f3f7fb 100%)', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '760px', background: 'white', borderRadius: '24px', boxShadow: '0 20px 60px rgba(15, 23, 42, 0.12)', padding: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Admin vehicle registration</h1>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>Create one model type, location, operation hours, and the days it is available for test drives.</p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <label style={{ display: 'grid', gap: '8px' }}>
            <span style={{ fontWeight: 600 }}>Model type</span>
            <input
              required
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
              placeholder="e.g. tesla_model3"
              style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px 14px' }}
            />
          </label>

          <label style={{ display: 'grid', gap: '8px' }}>
            <span style={{ fontWeight: 600 }}>Location</span>
            <input
              required
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
              placeholder="e.g. dublin"
              style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px 14px' }}
            />
          </label>

          <div style={{ display: 'grid', gap: '8px' }}>
            <span style={{ fontWeight: 600 }}>Days available</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {dayOptions.map((day) => {
                const active = form.availableDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    style={{ border: active ? '1px solid #0891b2' : '1px solid #cbd5e1', background: active ? '#ecfeff' : 'white', borderRadius: '999px', padding: '8px 12px' }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>Available from</span>
              <input
                type="time"
                required
                value={form.availableFromTime}
                onChange={(event) => setForm({ ...form, availableFromTime: event.target.value })}
                style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px 14px' }}
              />
            </label>

            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>Available to</span>
              <input
                type="time"
                required
                value={form.availableToTime}
                onChange={(event) => setForm({ ...form, availableToTime: event.target.value })}
                style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px 14px' }}
              />
            </label>
          </div>

          <label style={{ display: 'grid', gap: '8px' }}>
            <span style={{ fontWeight: 600 }}>Time gap between bookings (minutes)</span>
            <input
              type="number"
              min="0"
              required
              value={form.minimumMinutesBetweenBookings}
              onChange={(event) => setForm({ ...form, minimumMinutesBetweenBookings: event.target.value })}
              style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px 14px' }}
            />
          </label>

          <button type="submit" disabled={isSubmitting} style={{ border: 'none', borderRadius: '12px', padding: '12px 16px', background: 'linear-gradient(135deg, #0891b2 0%, #2563eb 100%)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
            {isSubmitting ? 'Registering…' : 'Register vehicle'}
          </button>
        </form>

        {message ? <p style={{ marginTop: '16px', color: '#0f766e', fontWeight: 600 }}>{message}</p> : null}
      </div>
    </main>
  );
}
