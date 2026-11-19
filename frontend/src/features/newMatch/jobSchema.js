import { z } from 'zod';

// The job form's rules and messages, the same as the backend's (UI-UX.md "Validation messages",
// backend schemas/fields.py). The backend checks everything again.

export const DESCRIPTION_MIN = 300;
export const DESCRIPTION_MAX = 20_000;

/**
 * Roughly the backend's clean_text(): runs of spaces become one, at most one blank line, trimmed.
 * The length limits are checked on the cleaned text, so a description padded with spaces can't
 * pass the 300-character minimum here and then fail on the server.
 */
export function cleanDescription(text) {
  return text
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const jobSchema = z.object({
  title: z.string().trim().min(1, 'Enter the job title.').max(120, 'Use at most 120 characters.'),
  company: z.string().trim().max(120, 'Use at most 120 characters.'),
  description: z.string().superRefine((value, context) => {
    const length = cleanDescription(value).length;
    if (length === 0) {
      context.addIssue({ code: 'custom', message: 'Paste the job description.' });
    } else if (length < DESCRIPTION_MIN) {
      context.addIssue({
        code: 'custom',
        message: 'This looks short. Paste the full description (at least 300 characters) for a fair match.',
      });
    } else if (length > DESCRIPTION_MAX) {
      context.addIssue({ code: 'custom', message: 'This is too long. Keep it under 20,000 characters.' });
    }
  }),
});
