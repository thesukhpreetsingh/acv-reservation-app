import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, CheckCircle, AlertCircle } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';
import { fetchAvailableSlots, createReservation, Slot } from '../lib/api';

interface TestDriveWidgetProps {
  vehicleType: string;
  location: string;
}

type Step = 'DATE_SELECTION' | 'SLOT_SELECTION' | 'CUSTOMER_DETAILS' | 'CONFIRMATION';

interface SlotPickerProps {
  location: string;
  vehicleType: string;
  date: Date;
  onSelect: (slot: Slot) => void;
  onError: (message: string | null) => void;
}

export const TestDriveWidget: React.FC<TestDriveWidgetProps> = ({ vehicleType, location }) => {
  const [step, setStep] = useState<Step>('DATE_SELECTION');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
  });

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setStep('SLOT_SELECTION');
    setError(null);
  };

  const handleSlotSelect = (slot: Slot) => {
    setSelectedSlot(slot);
    setStep('CUSTOMER_DETAILS');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createReservation({
        vehicleId: selectedSlot!.vehicleId,
        startDateTime: selectedSlot!.startDateTime,
        durationMins: 45,
        ...formData,
        location,
        vehicleType,
      });
      setStep('CONFIRMATION');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderDateSelection = () => {
    const dates = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i + 1));
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar size={20} /> Select a Date
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {dates.map((date) => (
            <button
              key={date.toISOString()}
              onClick={() => handleDateSelect(date)}
              className="p-2 text-sm border rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors"
            >
              {format(date, 'MMM d')}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-blue-600 p-6 text-white">
        <h2 className="text-2xl font-bold">Book a Test Drive</h2>
        <p className="text-blue-100 text-sm">{vehicleType.replace('_', ' ')} • {location}</p>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-start gap-2 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {step === 'DATE_SELECTION' && renderDateSelection()}

        {step === 'SLOT_SELECTION' && (
          <SlotPicker 
            location={location} 
            vehicleType={vehicleType} 
            date={selectedDate!} 
            onSelect={handleSlotSelect} 
            onError={setError}
          />
        )}

        {step === 'CUSTOMER_DETAILS' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User size={20} /> Your Details
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Full Name"
                className="w-full p-2 border rounded-lg"
                value={formData.customerName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, customerName: e.target.value})}
                required
              />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full p-2 border rounded-lg"
                value={formData.customerEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, customerEmail: e.target.value})}
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full p-2 border rounded-lg"
                value={formData.customerPhone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, customerPhone: e.target.value})}
                required
              />
            </div>
            <div className="flex gap-2 pt-4">
              <button 
                type="button" 
                onClick={() => setStep('SLOT_SELECTION')}
                className="flex-1 p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Back
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
              >
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </form>
        )}

        {step === 'CONFIRMATION' && (
          <div className="text-center py-8 space-y-4">
            <div className="flex justify-center">
              <CheckCircle size={64} className="text-green-500" />
            </div>
            <h3 className="text-xl font-bold">Reservation Confirmed!</h3>
            <p className="text-gray-500">We've sent a confirmation to {formData.customerEmail}.</p>
            <button 
              onClick={() => setStep('DATE_SELECTION')}
              className="p-2 text-blue-600 hover:underline text-sm"
            >
              Book another drive
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const SlotPicker: React.FC<SlotPickerProps> = ({ location, vehicleType, date, onSelect, onError }) => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableSlots(location, vehicleType, date, 45)
      .then(res => {
        setSlots(res.availableSlots);
        setLoading(false);
      })
      .catch(err => {
        onError(err.message);
        setLoading(false);
      });
  }, [location, vehicleType, date]);

  if (loading) return <div className="text-center py-4 animate-pulse text-gray-400">Searching for slots...</div>;
  if (slots.length === 0) return <div className="text-center py-4 text-gray-500">No slots available for this date.</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Clock size={20} /> Select a Time Slot
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {slots.map((slot, i) => (
          <button
            key={i}
            onClick={() => onSelect(slot)}
            className="p-3 text-left text-sm border rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors"
          >
            {format(slot.startDateTime, 'HH:mm')} - {format(slot.endDateTime, 'HH:mm')}
          </button>
        ))}
      </div>
    </div>
  );
};
