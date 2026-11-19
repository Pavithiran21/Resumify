// Marks a skill's own words inside a quote, so the evidence can be skimmed (UI-UX.md "Quotes"):
// the skill's name, or its singular ("design systems" → "design system"), case-insensitive and
// whole words only, so "Java" is not marked inside "JavaScript".
//
// The result is a list of plain strings and { mark } pieces that the component renders as text
// and <mark> elements. The quotes come from the user's files and the AI model, so they are never
// turned into HTML (no dangerouslySetInnerHTML anywhere).

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The forms to look for: the name, and its singular when the last word ends in "s". */
function formsOf(skillName) {
  const name = skillName.trim();
  const forms = [name];
  if (/[a-z]s$/i.test(name) && !/ss$/i.test(name)) {
    forms.push(name.slice(0, -1));
  }
  return forms;
}

/**
 * Splits a quote into [text, { mark: text }, text, …]. A "whole word" edge is any place that is
 * not a letter or digit on that side, which works for names like "Next.js", "C++" and "CI/CD"
 * where \b would not.
 */
export function markSkill(quote, skillName) {
  if (!quote || !skillName?.trim()) {
    return [quote ?? ''];
  }
  // The longest form first, so "design systems" wins over "design system".
  const alternatives = formsOf(skillName)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}])`, 'giu');

  const pieces = [];
  let last = 0;
  for (const found of quote.matchAll(pattern)) {
    if (found.index > last) {
      pieces.push(quote.slice(last, found.index));
    }
    pieces.push({ mark: found[0] });
    last = found.index + found[0].length;
  }
  if (last < quote.length) {
    pieces.push(quote.slice(last));
  }
  return pieces;
}
