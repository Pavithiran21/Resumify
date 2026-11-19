import { IconCheck, IconSparkles, IconX } from '@tabler/icons-react';
import { useEffect } from 'react';
import { Logo } from '../components/Logo';

/** The product preview floating around the Log in card (hidden below 1150 px). */
function FloatingPreview() {
  return (
    <div aria-hidden="true">
      <div className="orbit" style={{ left: '8%', top: '16%' }}>
        <span className="chip c-match">
          <IconCheck size={16} /> React · matched
        </span>
      </div>
      <div className="orbit" style={{ left: '12%', top: '48%' }}>
        <span className="chip c-info">
          <IconSparkles size={16} /> 11 of 15 skills
        </span>
      </div>
      <div className="orbit" style={{ left: '6%', bottom: '16%' }}>
        <span className="chip c-match">
          <IconCheck size={16} /> TypeScript · matched
        </span>
      </div>
      <div className="orbit" style={{ right: '8%', top: '18%' }}>
        <span className="chip c-miss">
          <IconX size={16} /> Next.js · missing
        </span>
      </div>
      <div className="orbit" style={{ right: '6%', top: '50%' }}>
        <div className="panel px-[18px] py-3.5 text-center">
          <div className="dim text-[11px] font-bold tracking-[0.12em]">MATCH SCORE</div>
          <div className="v-text ring-good font-display text-[36px] leading-none font-bold">69</div>
        </div>
      </div>
      <div className="orbit" style={{ right: '10%', bottom: '16%' }}>
        <span className="chip c-miss">
          <IconX size={16} /> GraphQL · missing
        </span>
      </div>
    </div>
  );
}

/**
 * Log in, Create account and the password screens (UI-UX.md screen 1): a centred white card with
 * a blue top strip. The stronger auth background (the colour sweep with a faint blue circle behind
 * the card) is switched on through body[data-screen] for as long as this layout is on screen.
 * preview: the floating skill chips and score tile (Log in only).
 */
export function AuthLayout({ preview = false, children }) {
  useEffect(() => {
    document.body.dataset.screen = 'auth';
    return () => {
      delete document.body.dataset.screen;
    };
  }, []);

  return (
    <main className="auth">
      {preview && <FloatingPreview />}
      <div className="panel glow auth-card">
        <div className="text-center">
          <span className="inline-block">
            <Logo size={56} />
          </span>
        </div>
        {children}
      </div>
    </main>
  );
}
