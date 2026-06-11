import { Avatar, Stars } from '@/components/atoms';
import type { ReviewModel } from '@/components/types';

export interface ReviewCardProps {
  review: ReviewModel;
  /** Report affordance (reviews spec §6). Rendered only when provided. */
  onReport?: () => void;
}

export function ReviewCard({ review, onReport }: ReviewCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-[22px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[11px]">
          <Avatar seed={review.avatarSeed} name={review.author} size={40} />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{review.author}</span>
            <span className="text-xs text-text-3">{review.dateLabel}</span>
          </div>
        </div>
        <Stars value={review.rating} size={13} />
      </div>
      <p className="text-sm leading-relaxed text-text-2">&ldquo;{review.text}&rdquo;</p>
      {onReport && (
        <button
          type="button"
          onClick={onReport}
          className="self-end text-[11.5px] text-text-3 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]"
        >
          Report
        </button>
      )}
    </div>
  );
}
