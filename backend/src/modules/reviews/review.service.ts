import { AppError } from '../../types/index.js';
import type { Review } from '../../types/index.js';
import type { BookingRepository } from '../booking/interfaces.js';
import type { EventRepository } from '../events/interfaces.js';
import type { ReviewRepository, ReviewableBooking } from './interfaces.js';

/**
 * Review submission (Phase 7 write side). The integrity rule: only a guest
 * who verifiably paid for and attended a dinner can review it, once.
 * `event_id`/`chef_id` are derived from the booking server-side — never from
 * the client. Reviews are immutable after posting (approved scope decision).
 * See docs/specs/reviews-and-moderation.md.
 */
export class ReviewService {
  constructor(
    private readonly reviews: ReviewRepository,
    private readonly bookings: BookingRepository,
    private readonly events: EventRepository,
  ) {}

  async submit(guestId: string, bookingId: string, rating: number, body: string): Promise<Review> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking || booking.guestId !== guestId) {
      throw new AppError('NOT_FOUND', 'Booking not found');
    }
    if (booking.status !== 'confirmed') {
      throw new AppError('REVIEW_NOT_ELIGIBLE', 'Only attended dinners can be reviewed.');
    }
    const event = await this.events.findById(booking.eventId);
    if (!event) throw new AppError('NOT_FOUND', 'Event not found');
    if (event.status !== 'completed') {
      throw new AppError(
        'REVIEW_NOT_ELIGIBLE',
        'You can review this dinner after it has taken place.',
      );
    }
    const existing = await this.reviews.findByEventAndAuthor(event.id, guestId);
    if (existing) {
      throw new AppError('ALREADY_REVIEWED', 'You already reviewed this dinner.');
    }

    try {
      return await this.reviews.create({
        eventId: event.id,
        chefId: event.chefId, // derived, never client-supplied (data spec 07 integrity note)
        authorId: guestId,
        rating,
        body,
      });
    } catch (err) {
      // The DB unique index is the backstop for the pre-check race.
      if (err instanceof Error && /uniq_review_per_guest_event|duplicate key/i.test(err.message)) {
        throw new AppError('ALREADY_REVIEWED', 'You already reviewed this dinner.');
      }
      throw err;
    }
  }

  listReviewable(guestId: string): Promise<ReviewableBooking[]> {
    return this.reviews.listReviewableBookings(guestId);
  }

  /** Boolean-only flag; flagged reviews stay visible until Phase 8 moderation. */
  async flag(reviewId: string): Promise<void> {
    const review = await this.reviews.findById(reviewId);
    if (!review) throw new AppError('NOT_FOUND', 'Review not found');
    if (!review.isFlagged) await this.reviews.setFlagged(reviewId, true);
  }
}
