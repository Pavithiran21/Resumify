import { IconFileText, IconListSearch, IconScale, IconSparkles } from '@tabler/icons-react';

// The four real steps of the match pipeline (BACKEND.md "Signature feature design"). The match is
// one request with no progress events, so they explain what happens; they are not timed progress.
// Shown while a match runs (RunningPanel) and beside the New match steps (HowMatchWorks).
export const MATCH_STEPS = [
  { Icon: IconFileText, text: 'Reading the job and your resume' },
  { Icon: IconListSearch, text: "Finding the job's skills and keywords" },
  { Icon: IconSparkles, text: 'AI check, every quote verified in your resume' },
  { Icon: IconScale, text: "Score worked out by Resumify's rules" },
];
