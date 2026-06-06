'use client';

import { useState } from 'react';
import { BookingCard } from '@/components/organisms';

/**
 * Display-only booking widget for Phase 5. The stepper works locally, but
 * "Reserve" is inert until Phase 6 wires the booking flow. A note signals that.
 */
export function BookingWidget({
  price,
  rating,
  seatsLeft,
  seatsTotal,
  dateLabel,
}: {
  price: number;
  rating: number;
  seatsLeft: number;
  seatsTotal: number;
  dateLabel: string;
}) {
  const [seats, setSeats] = useState(Math.min(2, Math.max(1, seatsLeft)));

  return (
    <div className="flex flex-col gap-2">
      <BookingCard
        price={price}
        rating={rating}
        seatsLeft={seatsLeft}
        seatsTotal={seatsTotal}
        dateLabel={dateLabel}
        seats={seats}
        onSeatsChange={setSeats}
        onReserve={undefined}
      />
      <p className="text-center text-xs text-text-3">Booking opens soon.</p>
    </div>
  );
}
