/** A post-event review. Mirrors `reviews`. */
export interface Review {
  id: string;
  eventId: string;
  chefId: string;
  authorId: string;
  rating: number;
  body: string;
  isFlagged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewReview {
  eventId: string;
  chefId: string;
  authorId: string;
  rating: number;
  body: string;
}
