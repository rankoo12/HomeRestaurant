import { z } from 'zod';
import { AppError } from '../../types/index.js';
import type { User } from '../../types/index.js';
import type { UserRepository } from './interfaces.js';
import { hashPassword, verifyPassword } from './password.js';
import { signAccessToken } from './jwt.js';
import { RefreshStore } from './refresh-store.js';

/**
 * Auth orchestration: register / login / refresh / logout / me.
 * Depends on abstractions (UserRepository) + the password, jwt, and refresh
 * helpers. See docs/specs/identity/01-auth-flows.md.
 */

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200, 'Password is too long')
  .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), 'Password must contain a letter and a digit');

export const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  fullName: z.string().min(1).max(120),
  dietaryPrefs: z.array(z.string()).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshStore: RefreshStore = new RefreshStore(),
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new AppError('EMAIL_TAKEN', 'An account with that email already exists');

    const passwordHash = await hashPassword(input.password);
    const user = await this.users.create({
      email: input.email,
      fullName: input.fullName,
      dietaryPrefs: input.dietaryPrefs ?? [],
      role: 'guest', // role is never client-settable; becoming a host is Phase 7
      passwordHash,
    });

    return this.issueFor(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const found = await this.users.findByEmailWithHash(input.email);
    // Same error whether the email is unknown or the password is wrong.
    if (!found || !found.passwordHash) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password');
    }
    if (found.user.isSuspended) {
      throw new AppError('ACCOUNT_SUSPENDED', 'This account has been suspended');
    }
    const ok = await verifyPassword(found.passwordHash, input.password);
    if (!ok) throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password');

    return this.issueFor(found.user);
  }

  /** Rotate the refresh token and issue a fresh access token. */
  async refresh(refreshToken: string): Promise<AuthResult> {
    const rotated = await this.refreshStore.rotate(refreshToken);
    if (!rotated) throw new AppError('INVALID_REFRESH', 'Session expired — please log in again');

    const user = await this.users.findById(rotated.userId);
    if (!user || user.isSuspended) {
      // User vanished or was suspended since the token was issued.
      await this.refreshStore.revoke(rotated.token);
      throw new AppError('INVALID_REFRESH', 'Session is no longer valid');
    }

    return {
      user,
      accessToken: signAccessToken({ sub: user.id, role: user.role }),
      refreshToken: rotated.token,
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) await this.refreshStore.revoke(refreshToken);
  }

  async me(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user || user.isSuspended) throw new AppError('UNAUTHENTICATED', 'Not authenticated');
    return user;
  }

  private async issueFor(user: User): Promise<AuthResult> {
    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = await this.refreshStore.issue(user.id);
    return { user, accessToken, refreshToken };
  }
}
