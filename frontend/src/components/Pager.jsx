import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { formatNumber } from '../lib/numbers';

/** "1–20 of 43" with Previous and Next, for a page response { page, size, totalItems, totalPages }. */
export function Pager({ data, onPage }) {
  if (!data || data.totalItems === 0) {
    return null;
  }
  const first = (data.page - 1) * data.size + 1;
  const last = Math.min(data.page * data.size, data.totalItems);
  return (
    <nav className="dim mt-3 flex items-center justify-between text-[13px]" aria-label="Pages">
      <span>
        {formatNumber(first)}–{formatNumber(last)} of {formatNumber(data.totalItems)}
      </span>
      <span className="flex gap-1.5">
        <button
          type="button"
          className="icon-btn"
          aria-label="Previous page"
          disabled={data.page <= 1}
          onClick={() => onPage(data.page - 1)}
        >
          <IconChevronLeft size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Next page"
          disabled={data.page >= data.totalPages}
          onClick={() => onPage(data.page + 1)}
        >
          <IconChevronRight size={18} aria-hidden="true" />
        </button>
      </span>
    </nav>
  );
}
