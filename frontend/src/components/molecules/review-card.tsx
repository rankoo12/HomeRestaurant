import { Avatar, Stars } from '@/components/atoms';
import type { ReviewModel } from '@/components/types';

export interface ReviewCardProps {
  review: ReviewModel;
}

export function ReviewCard({ review }: ReviewCardProps) {
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
    </div>
  );
}
