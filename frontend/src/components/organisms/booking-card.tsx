import { Button, Icon, Price, Stepper } from '@/components/atoms';
import { SeatsMeter } from '@/components/molecules';

export interface BookingCardProps {
  price: number;
  rating: number;
  seatsLeft: number;
  seatsTotal: number;
  dateLabel: string;
  seats: number;
  onSeatsChange: (seats: number) => void;
  onReserve?: () => void;
  serviceFeeRate?: number;
}

/** Sticky booking widget from the event detail page. */
export function BookingCard({
  price,
  rating,
  seatsLeft,
  seatsTotal,
  dateLabel,
  seats,
  onSeatsChange,
  onReserve,
  serviceFeeRate = 0.1,
}: BookingCardProps) {
  const subtotal = price * seats;
  const fee = Math.round(subtotal * serviceFeeRate);
  const total = subtotal + fee;

  return (
    <div className="flex flex-col gap-[18px] rounded-lg border border-line bg-surface p-6 shadow-pop">
      <div className="flex items-end justify-between">
        <Price value={price} big />
        <span className="flex items-center gap-[5px] text-[13px] text-gold">
          <Icon name="star" size={13} filled /> {rating}
        </span>
      </div>

      <SeatsMeter left={seatsLeft} total={seatsTotal} />
      <div className="h-px bg-line" />

      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[13.5px] font-semibold">Seats</span>
            <span className="text-[12.5px] text-text-3">{seatsLeft} available</span>
          </div>
          <Stepper value={seats} onChange={onSeatsChange} min={1} max={Math.max(1, seatsLeft)} />
        </div>
        <div className="flex items-center justify-between rounded-sm border border-line bg-bg-2 px-3.5 py-3 text-sm">
          <span className="flex items-center gap-2.5">
            <Icon name="cal" size={16} className="text-gold" /> {dateLabel}
          </span>
          <Icon name="chevD" size={16} className="text-text-3" />
        </div>
      </div>

      <Button block size="lg" onClick={onReserve}>
        Reserve {seats} {seats > 1 ? 'seats' : 'seat'}
      </Button>

      <div className="flex flex-col gap-2.5 text-[13.5px]">
        <Row label={`$${price} × ${seats} ${seats > 1 ? 'seats' : 'seat'}`} value={`$${subtotal}`} />
        <Row label="Service fee" value={`$${fee}`} />
        <div className="h-px bg-line" />
        <div className="flex items-center justify-between font-bold">
          <span>Total</span>
          <span className="font-serif text-[18px] tabular-nums">${total}</span>
        </div>
      </div>

      <p className="flex items-center justify-center gap-[7px] text-xs text-text-3">
        <Icon name="lock" size={13} /> You won&apos;t be charged until confirmed
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-2">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
