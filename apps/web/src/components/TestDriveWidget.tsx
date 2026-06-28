import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, CheckCircle, AlertCircle, Sparkles, MapPin, Car } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';
import { fetchAvailableSlots, createReservation, fetchVehicleOptions, Slot } from '../lib/api';
import styles from './TestDriveWidget.module.css';

interface TestDriveWidgetProps {
  vehicleType?: string;
  location?: string;
}

type Step = 'DETAILS' | 'SLOT_SELECTION' | 'CUSTOMER_DETAILS' | 'CONFIRMATION';

const fallbackVehicleTypes = ['tesla_model3', 'tesla_modelx', 'tesla_modely'];
const fallbackLocations = ['dublin', 'cork'];

export const TestDriveWidget: React.FC<TestDriveWidgetProps> = ({
  vehicleType: initialVehicleType = 'tesla_model3',
  location: initialLocation = 'dublin',
}) => {
  const [step, setStep] = useState<Step>('DETAILS');
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [selectedVehicleType, setSelectedVehicleType] = useState(initialVehicleType);
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState<string[]>(fallbackVehicleTypes);
  const [locationOptions, setLocationOptions] = useState<string[]>(fallbackLocations);
  const [selectedDate, setSelectedDate] = useState<Date | null>(startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [recommendedSlot, setRecommendedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
  });

  const availableDates = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i + 1)), []);

  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      try {
        const response = await fetchVehicleOptions();
        if (!isMounted) {
          return;
        }

        const nextVehicleTypes = response.vehicleTypes?.length ? response.vehicleTypes : fallbackVehicleTypes;
        const nextLocations = response.locations?.length ? response.locations : fallbackLocations;

        setVehicleTypeOptions(nextVehicleTypes);
        setLocationOptions(nextLocations);

        if (!nextVehicleTypes.includes(selectedVehicleType)) {
          setSelectedVehicleType(nextVehicleTypes[0] ?? initialVehicleType);
        }

        if (!nextLocations.includes(selectedLocation)) {
          setSelectedLocation(nextLocations[0] ?? initialLocation);
        }
      } catch {
        // Fall back to the built-in values when the API is unavailable.
      }
    };

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchAvailability = async () => {
    if (!selectedDate) {
      setError('Please choose a date for your test drive.');
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedSlot(null);
    setStep('SLOT_SELECTION');

    try {
      const response = await fetchAvailableSlots(selectedLocation, selectedVehicleType, selectedDate, 45);
      setSlots(response.availableSlots || []);
      setRecommendedSlot(response.recommendedSlot ?? null);
      if (!response.availableSlots?.length) {
        setError('No availability was found for that combination. Please choose another date or location.');
        setStep('DETAILS');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load availability right now.');
      setStep('DETAILS');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slot: Slot) => {
    setSelectedSlot(slot);
    setStep('CUSTOMER_DETAILS');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setError('Please select a time slot before confirming.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createReservation({
        vehicleId: selectedSlot.vehicleId,
        startDateTime: selectedSlot.startDateTime,
        durationMins: 45,
        ...formData,
        location: selectedLocation,
        vehicleType: selectedVehicleType,
      });
      setStep('CONFIRMATION');
    } catch (err: any) {
      setError(err.message || 'Reservation could not be created.');
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep('DETAILS');
    setSelectedSlot(null);
    setSlots([]);
    setRecommendedSlot(null);
    setError(null);
  };

  return (
    <div className={styles.shell}>
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.heroBrand}>
            <div className={styles.heroBadge}>
              <Sparkles size={24} />
            </div>
            <div>
              <p className={styles.heroEyebrow}>Nevo Test Drive</p>
              <h2 className={styles.heroTitle}>Reserve your next EV experience</h2>
              <p className={styles.heroDescription}>
                Choose your preferred city, model, and date. We’ll match you with the best available slot using a balanced allocation approach.
              </p>
            </div>
          </div>

          <div className={styles.heroSummary}>
            <span className={styles.heroSummaryLabel}>Current selection</span>
            <div className={styles.heroSummaryValue}>
              <span className={styles.pill}>{selectedLocation}</span>
              <span className={styles.pill}>{selectedVehicleType.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}><MapPin size={15} /> Location</div>
            <div className={styles.statValue}>{selectedLocation}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}><Car size={15} /> Model</div>
            <div className={styles.statValue}>{selectedVehicleType.replace('_', ' ')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}><Calendar size={15} /> Date</div>
            <div className={styles.statValue}>{selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Pick a date'}</div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.stepRow}>
          {[
            { key: 'DETAILS', label: '1. Details' },
            { key: 'SLOT_SELECTION', label: '2. Time' },
            { key: 'CUSTOMER_DETAILS', label: '3. Contact' },
            { key: 'CONFIRMATION', label: '4. Done' },
          ].map((item) => {
            const active = step === item.key;
            return (
              <div key={item.key} className={`${styles.stepPill} ${active ? styles.stepPillActive : ''}`}>
                {item.label}
              </div>
            );
          })}
        </div>

        {error && (
          <div className={styles.alert}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {step === 'DETAILS' && (
          <div className={styles.section}>
            <div className={styles.gridTwo}>
              <label className={styles.card}>
                <span className={styles.label}>Location</span>
                <select className={styles.select} value={selectedLocation} onChange={(event) => setSelectedLocation(event.target.value)}>
                  {locationOptions.map((location) => (
                    <option key={location} value={location}>
                      {location.charAt(0).toUpperCase() + location.slice(1)}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.card}>
                <span className={styles.label}>Vehicle Type</span>
                <select className={styles.select} value={selectedVehicleType} onChange={(event) => setSelectedVehicleType(event.target.value)}>
                  {vehicleTypeOptions.map((vehicleType) => (
                    <option key={vehicleType} value={vehicleType}>
                      {vehicleType.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.card}>
              <div className={styles.label}>Pick a date</div>
              <div className={styles.dateGrid}>
                {availableDates.map((date) => {
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className={`${styles.dateButton} ${isSelected ? styles.dateButtonActive : ''}`}
                    >
                      <div>{format(date, 'EEE')}</div>
                      <div>{format(date, 'MMM d')}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={handleSearchAvailability} disabled={loading} className={styles.buttonPrimary}>
              {loading ? 'Checking availability…' : 'Check availability'}
            </button>
          </div>
        )}

        {step === 'SLOT_SELECTION' && (
          <div className={styles.section}>
            <div className={styles.gridTwo}>
              <div>
                <h3 className={styles.label}>Choose a time slot</h3>
                <p className={styles.label} style={{ fontWeight: 500, color: '#64748b' }}>
                  We’ll highlight the best option for balanced vehicle usage.
                </p>
              </div>
              <button onClick={resetFlow} className={styles.buttonGhost}>
                Start over
              </button>
            </div>

            {loading ? (
              <div className={styles.card}>Searching for the best available options…</div>
            ) : slots.length === 0 ? (
              <div className={styles.card}>No slots are available for this combination yet.</div>
            ) : (
              <div className={styles.slotList}>
                {slots.map((slot) => {
                  const isRecommended = recommendedSlot && slot.vehicleId === recommendedSlot.vehicleId && slot.startDateTime === recommendedSlot.startDateTime;
                  return (
                    <button
                      key={`${slot.vehicleId}-${slot.startDateTime}`}
                      onClick={() => handleSlotSelect(slot)}
                      className={`${styles.slotButton} ${isRecommended ? styles.slotButtonRecommended : ''}`}
                    >
                      <div className={styles.slotTime}>
                        <Clock size={16} />
                        <span>{format(slot.startDateTime, 'HH:mm')} - {format(slot.endDateTime, 'HH:mm')}</span>
                      </div>
                      {isRecommended && <span className={styles.recommendedTag}>Recommended</span>}
                      <div className={styles.slotMeta}>Vehicle ID: {slot.vehicleId}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 'CUSTOMER_DETAILS' && (
          <form onSubmit={handleSubmit} className={styles.section}>
            <div className={styles.gridTwo}>
              <div>
                <h3 className={styles.label}>Your details</h3>
                <p className={styles.label} style={{ fontWeight: 500, color: '#64748b' }}>
                  We’ll save this reservation for your selected test drive.
                </p>
              </div>
              <button type="button" onClick={() => setStep('SLOT_SELECTION')} className={styles.buttonGhost}>
                Back
              </button>
            </div>

            <div className={styles.formGrid}>
              <input
                type="text"
                placeholder="Full Name"
                className={`${styles.input}`}
                value={formData.customerName}
                onChange={(event) => setFormData({ ...formData, customerName: event.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email Address"
                className={`${styles.input}`}
                value={formData.customerEmail}
                onChange={(event) => setFormData({ ...formData, customerEmail: event.target.value })}
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                className={`${styles.input}`}
                value={formData.customerPhone}
                onChange={(event) => setFormData({ ...formData, customerPhone: event.target.value })}
                required
              />
              <div className={styles.summaryBox}>
                Booking: {selectedDate ? format(selectedDate, 'MMM d, yyyy') : ''} • {selectedSlot ? `${format(selectedSlot.startDateTime, 'HH:mm')} - ${format(selectedSlot.endDateTime, 'HH:mm')}` : ''}
              </div>
            </div>

            <button type="submit" disabled={loading} className={styles.buttonPrimary}>
              {loading ? 'Saving reservation…' : 'Confirm booking'}
            </button>
          </form>
        )}

        {step === 'CONFIRMATION' && (
          <div className={styles.confirmation}>
            <div className={styles.confirmationIcon}>
              <CheckCircle size={40} />
            </div>
            <h3 className={styles.confirmationTitle}>Reservation confirmed</h3>
            <p className={styles.confirmationText}>Your test drive request has been saved. We’ll be in touch shortly at {formData.customerEmail}.</p>
            <button onClick={resetFlow} className={styles.buttonSecondary}>
              Book another drive
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
