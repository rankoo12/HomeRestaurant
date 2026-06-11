import { withTransaction } from '../../db/index.js';
import { AppError } from '../../types/index.js';
import type { ChefProfile, ChefProfileUpdate, ChefVerification } from '../../types/index.js';
import type { UserRepository } from '../identity/interfaces.js';
import type { ChefRepository } from './interfaces.js';

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;

/** "Amara Okafor" → "amara-okafor". */
export function suggestSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 32)
    .replace(/^-+|-+$/g, '');
  return base || 'chef';
}

export interface OnboardingSubmission {
  slug: string;
  cuisine: string;
  city: string;
  tagline: string;
  bio: string;
  coverSeed?: number;
  idDocument: { kind: 'passport' | 'drivers_license' | 'national_id'; reference: string };
  foodSafety: { declared: true; certificateRef?: string };
}

export interface OnboardingState {
  profile: ChefProfile;
  verifications: ChefVerification[];
}

/**
 * Host onboarding (Phase 7). The submit transaction creates the profile +
 * KYC audit rows and upgrades the user's role guest → host in one commit —
 * the trust gate stays at publishing (events spec §4). KYC is metadata-only:
 * `document_ref` is an opaque declared reference, never file bytes
 * (chef-onboarding spec §10, approved scope decision).
 */
export class OnboardingService {
  constructor(
    private readonly chefs: ChefRepository,
    private readonly users: UserRepository,
  ) {}

  async submit(userId: string, input: OnboardingSubmission): Promise<OnboardingState> {
    return withTransaction(async (client) => {
      const existing = await this.chefs.findByUserId(userId, client);
      if (existing) {
        throw new AppError('PROFILE_EXISTS', 'You already have a host profile.');
      }
      if (await this.chefs.isSlugTaken(input.slug, client)) {
        throw new AppError('VALIDATION_ERROR', 'That URL handle is taken — try another.', {
          field: 'slug',
          suggestion: `${input.slug}-${Math.abs(hashCode(userId)) % 90 + 10}`,
        });
      }

      const profile = await this.chefs.create(
        {
          userId,
          slug: input.slug,
          cuisine: input.cuisine,
          city: input.city,
          tagline: input.tagline,
          bio: input.bio,
          coverSeed: input.coverSeed,
          hostingSince: new Date().getFullYear(),
        },
        client,
      );

      const verifications: ChefVerification[] = [
        await this.chefs.addVerification(
          {
            chefId: userId,
            kind: 'id_document',
            documentRef: `${input.idDocument.kind}:${input.idDocument.reference}`,
          },
          client,
        ),
        await this.chefs.addVerification(
          {
            chefId: userId,
            kind: 'food_safety_cert',
            documentRef: input.foodSafety.certificateRef ?? 'declared',
          },
          client,
        ),
      ];

      // Role flips inside the same commit — a failed profile write never
      // leaves a roleless host or a profileless host role.
      await this.users.updateRole(userId, 'host', client);

      return { profile, verifications };
    });
  }

  /** Wizard prefill + dashboard banner data. */
  async getState(userId: string): Promise<OnboardingState> {
    const profile = await this.chefs.findByUserId(userId);
    if (!profile) throw new AppError('NOT_FOUND', 'No host profile yet');
    const verifications = await this.chefs.listVerifications(userId);
    return { profile, verifications };
  }

  /**
   * Edit profile fields; a `rejected` host resubmitting gets fresh KYC rows
   * appended (history preserved) and returns to `pending`.
   */
  async update(
    userId: string,
    fields: ChefProfileUpdate,
    resubmit?: Pick<OnboardingSubmission, 'idDocument' | 'foodSafety'>,
  ): Promise<OnboardingState> {
    return withTransaction(async (client) => {
      const existing = await this.chefs.findByUserId(userId, client);
      if (!existing) throw new AppError('NOT_FOUND', 'No host profile yet');

      let profile = await this.chefs.updateProfile(userId, fields, client);

      if (existing.verificationStatus === 'rejected' && resubmit) {
        await this.chefs.addVerification(
          {
            chefId: userId,
            kind: 'id_document',
            documentRef: `${resubmit.idDocument.kind}:${resubmit.idDocument.reference}`,
          },
          client,
        );
        await this.chefs.addVerification(
          {
            chefId: userId,
            kind: 'food_safety_cert',
            documentRef: resubmit.foodSafety.certificateRef ?? 'declared',
          },
          client,
        );
        profile = await this.chefs.setVerificationStatus(userId, 'pending', client);
      }

      const verifications = await this.chefs.listVerifications(userId, client);
      return { profile, verifications };
    });
  }

  async checkSlug(slug: string): Promise<{ available: boolean; suggestion?: string }> {
    if (!SLUG_PATTERN.test(slug)) {
      return { available: false, suggestion: suggestSlug(slug) };
    }
    const taken = await this.chefs.isSlugTaken(slug);
    return taken ? { available: false, suggestion: `${slug}-${new Date().getFullYear() % 100}` } : { available: true };
  }
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
