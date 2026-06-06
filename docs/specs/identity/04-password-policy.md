# Password Policy & Hashing

## Hashing
- **argon2id** via the `argon2` package — memory-hard, the current OWASP first choice.
- Use the library's sensible defaults (tuned memory/time cost); store the full encoded hash string
  (includes algorithm, params, and salt) in `users.password_hash`.
- Hashing + verification live **only** in the identity module (`password.ts`). The `password_hash` column
  is deliberately absent from the `User` domain type so it can't leak through a repository read used by
  another module.

## Password rules (validated at the API boundary with zod)
- Minimum **8 characters**, maximum 200 (avoid DoS via huge inputs to the hasher).
- Must contain at least one letter and one digit. (Kept deliberately modest — usability over theatre; the
  memory-hard hash is the real defense.)
- Trimmed of surrounding whitespace before validation? **No** — preserve exact input; only reject if it
  fails the rules. (Trimming silently changes a user's password.)

## Verification
- Constant-time comparison is handled by argon2's `verify`. On mismatch, return the generic
  `INVALID_CREDENTIALS` (never reveal whether the email or the password was wrong).

## Never
- Never log a password or hash.
- Never return `password_hash` in any API response.
- Never store a password reversibly or with a fast hash (md5/sha-x).

> Password **reset** (email flow) is out of scope for Phase 3 — there's no email provider yet. Recorded
> here so it isn't mistaken for missing; it arrives with notifications.
