/** Tiny className joiner — filters falsy values. Keeps component JSX tidy. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
