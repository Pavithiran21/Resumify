import { z } from 'zod';

// The same rules and messages as the backend (UI-UX.md "Validation messages", backend
// schemas/fields.py), so most mistakes are caught before a request; the backend checks everything again.

// The pattern browsers use for <input type="email">, with at least one dot in the domain.
const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const emailField = z
  .string()
  .trim()
  .refine((value) => value.length <= 254 && EMAIL_PATTERN.test(value), 'Enter a valid email, like name@example.com.');

export const currentPasswordField = z.string().min(1, 'Enter your password.');

export const newPasswordField = z
  .string()
  .refine((value) => value.length >= 8 && /\d/.test(value), 'Use at least 8 characters, with a number.')
  // bcrypt uses only the first 72 bytes, so the backend refuses longer passwords.
  .refine((value) => new TextEncoder().encode(value).length <= 72, 'Use at most 72 characters.');

export const nameField = z.string().trim().min(1, 'Enter your name.').max(80, 'Use at most 80 characters.');

// remember: "Keep me logged in" (the backend keeps the refresh cookie for 7 days instead of until the browser closes).
export const loginSchema = z.object({ email: emailField, password: currentPasswordField, remember: z.boolean() });

export const registerSchema = z.object({ name: nameField, email: emailField, password: newPasswordField });

export const forgotSchema = z.object({ email: emailField });

export const resetSchema = z
  .object({ password: newPasswordField, confirm: z.string() })
  .refine((values) => values.password === values.confirm, { path: ['confirm'], message: "Passwords don't match." });

/** A reset link's token: 43 URL-safe characters (32 random bytes). Anything else is a broken link. */
export function isResetToken(token) {
  return /^[A-Za-z0-9_-]{43}$/.test(token ?? '');
}
