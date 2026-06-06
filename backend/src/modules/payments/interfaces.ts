import type { Queryable } from '../../db/index.js';
import type { NewPayout, Payout } from '../../types/index.js';

/**
 * Persistence contract for payouts (host earnings).
 *
 * Phase 2 provides create/read for seeding the earnings screen. Stripe
 * integration (payment intents, Connect transfers) is Phases 6–7.
 */
export interface PayoutRepository {
  create(input: NewPayout, db?: Queryable): Promise<Payout>;
  listByChef(chefId: string, db?: Queryable): Promise<Payout[]>;
}
