const integer = new Intl.NumberFormat('en-GB');

/** 1035 → "1,035". */
export function formatNumber(value) {
  return integer.format(value);
}

/** "1 match", "3 matches": count and noun together. */
export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
}

/** "1 page, 169 words" (the upload toasts); the page count is left out when the file doesn't state it. */
export function pagesAndWords(resume) {
  const words = plural(resume.wordCount, 'word');
  return resume.pageCount ? `${plural(resume.pageCount, 'page')}, ${words}` : words;
}

/** "1 page · 169 words" (list rows and the chosen resume). */
export function pagesAndWordsDotted(resume) {
  const words = plural(resume.wordCount, 'word');
  return resume.pageCount ? `${plural(resume.pageCount, 'page')} · ${words}` : words;
}
