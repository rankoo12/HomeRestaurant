/**
 * View-model types for presentational components. These are NOT the backend
 * entities — feature phases map API data into these lightweight shapes before
 * passing them to components, keeping the design system decoupled from the API.
 */

export interface EventCardModel {
  id: string;
  slug: string;
  title: string;
  cuisine: string;
  neighborhood: string;
  dateLabel: string; // e.g. "Sun, Jun 7"
  timeLabel: string; // e.g. "6:30 PM"
  price: number; // dollars (display)
  seatsLeft: number;
  seatsTotal: number;
  imageSeed: number;
  short?: string;
  chef: {
    name: string;
    cuisine?: string;
    rating: number;
    reviews?: number;
    avatarSeed: number;
    superhost?: boolean;
  };
}

export interface ReviewModel {
  id: string;
  author: string;
  avatarSeed: number;
  rating: number;
  dateLabel: string;
  text: string;
}

export interface CategoryModel {
  id: string;
  label: string;
}
