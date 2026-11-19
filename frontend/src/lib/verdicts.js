import { IconCircleDashed, IconCircleHalf2, IconRosetteDiscountCheck, IconThumbUp } from '@tabler/icons-react';

// The four verdicts (UI-UX.md "Result details"). The backend decides the verdict from the score
// (85+ perfect, 60+ good, 40+ fair, below 40 weak; owner's bands, 8 Nov 2026); this only says how
// each one looks and what to do next. Colour is never the only signal: each has its own label and icon.
export const VERDICTS = {
  perfect: {
    label: 'Perfect match',
    short: 'Perfect',
    Icon: IconRosetteDiscountCheck,
    chip: 'c-match',
    ring: 'ring-perfect',
    advice: 'Ready to apply',
  },
  good: {
    label: 'Good match',
    short: 'Good',
    Icon: IconThumbUp,
    chip: 'c-good',
    ring: 'ring-good',
    advice: 'Apply after the fixes below',
  },
  fair: {
    label: 'Fair match',
    short: 'Fair',
    Icon: IconCircleHalf2,
    chip: 'c-fair',
    ring: 'ring-fair',
    advice: 'Tailor your resume first',
  },
  weak: {
    label: 'Weak match',
    short: 'Weak',
    Icon: IconCircleDashed,
    chip: 'c-weak',
    ring: 'ring-weak',
    advice: 'This role may not fit yet',
  },
};

export function verdictOf(verdict) {
  return VERDICTS[verdict] ?? VERDICTS.weak;
}

/** "69, good match": the label a score ring and the gauge read out. */
export function scoreLabel(score, verdict) {
  return `${score}, ${verdictOf(verdict).label.toLowerCase()}`;
}
