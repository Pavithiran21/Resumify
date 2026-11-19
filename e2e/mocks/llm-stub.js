/**
 * A stand-in for the OpenAI-compatible model API (Groq in production), so a run spends no quota and
 * every answer is fixed. make_env.py and the seed scripts point LLM_BASE_URL at
 * http://localhost:8080/llm/v1. Start it on its own with: node e2e/mocks/llm-stub.js
 *
 * It answers the match prompt (app/services/match_assessment.py) the way a careful model would:
 *   - every skill under JOB SKILLS that the hint says is named word for word: inResume true, with a
 *     quote copied from the resume;
 *   - a few skills the resume shows "in other words" (below): inResume true, quoting the resume's words;
 *   - the rest: inResume false;
 *   - experienceYears from "N years of experience" in the resume.
 * Triggers anywhere in the prompt (tests put them in a pasted job description):
 *   STUB_INVENT -> claims every missing skill with a made-up quote (Resumify must drop them)
 *   STUB_DOWN   -> 503 (Resumify answers 502 and saves nothing)
 *   STUB_SLOW   -> answers after 3 seconds (time for a test to upload a new resume version meanwhile)
 * GET /__calls?contains=<text> -> { calls }: how many requests held that text (cache tests).
 */
const http = require('node:http');

const PORT = Number(process.env.LLM_STUB_PORT ?? 8080);
const seen = [];

// Skill (as the dictionary names it, lower case) -> how a resume shows it without naming it.
const IN_OTHER_WORDS = [
  [/^(rest|rest apis?|api design|apis?)$/, /\bintegrated [\w\s,]*apis\b|\brest services\b|\bapis from\b/i],
  [/^design systems?$/, /\bcomponent library\b|\bdesign tokens\b/i],
  [/^responsive (design|web design)$/, /\bresponsive\b/i],
  [/^accessibility$/, /\baccessibility\b|\bwcag\b/i],
  [/^(agile|scrum)$/, /\bsprints?\b/i],
  [/^(performance|web performance)$/, /\bpage speed\b|\blighthouse\b|\bperformance\b/i],
  [/^node\.?js$/, /\bexpress\b|\bnode\b/i],
];

function between(prompt, tag) {
  const match = prompt.match(new RegExp(`<${tag}>\\n([\\s\\S]*?)\\n</${tag}>`));
  return match ? match[1] : '';
}

/** Up to 14 words of the resume around the match, joined by single spaces (how Resumify compares quotes). */
function quoteAround(text, index, length) {
  const before = text.slice(0, index).split(/\s+/).filter(Boolean).slice(-4);
  const after = text.slice(index).split(/\s+/).filter(Boolean).slice(0, 10);
  const words = [...before, ...after];
  return words.length >= 5 ? words.join(' ') : null;
}

function answerFor(prompt) {
  const resume = between(prompt, 'resume');
  const skills = [...prompt.matchAll(/^- (.+?) \((named word for word|not named word for word) in the resume\)$/gm)].map((m) => ({
    name: m[1],
    named: m[2] === 'named word for word',
  }));
  const invent = prompt.includes('STUB_INVENT');

  const answers = skills.map(({ name, named }) => {
    if (named) {
      const at = resume.toLowerCase().indexOf(name.toLowerCase());
      return { name, inResume: true, resumeQuote: at >= 0 ? quoteAround(resume, at, name.length) : null, reason: `Your resume names ${name}.` };
    }
    for (const [skill, shows] of IN_OTHER_WORDS) {
      if (!skill.test(name.toLowerCase())) continue;
      const found = resume.match(shows);
      if (found) {
        return { name, inResume: true, resumeQuote: quoteAround(resume, found.index, found[0].length), reason: `Your resume shows ${name} in other words.` };
      }
    }
    if (invent) {
      return { name, inResume: true, resumeQuote: `Led ${name} work across five teams for many years`, reason: `You know ${name}.` };
    }
    return { name, inResume: false, resumeQuote: null, reason: `The job asks for ${name}, and your resume doesn't show it.` };
  });

  const years = resume.match(/(\d+(?:\.\d+)?)\+?\s+years? of (?:professional )?experience/i);
  const missing = answers.filter((answer) => !answer.inResume).map((answer) => answer.name);
  return {
    summary: missing.length ? `A partial fit: ${answers.length - missing.length} of ${answers.length} skills shown.` : 'A strong fit for this job.',
    skills: answers,
    extraSkills: [],
    experienceYears: years ? Number(years[1]) : null,
    suggestions: missing.slice(0, 3).map((name) => `If you have used ${name}, add a line that shows it.`),
  };
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && (url.pathname === '/__health' || url.pathname === '/__admin/health')) return send(res, 200, { ok: true });
  if (req.method === 'GET' && url.pathname === '/__calls') {
    const needle = url.searchParams.get('contains') ?? '';
    return send(res, 200, { calls: seen.filter((text) => text.includes(needle)).length });
  }
  if (req.method !== 'POST' || url.pathname !== '/llm/v1/chat/completions') return send(res, 404, { error: 'not stubbed' });

  let raw = '';
  req.on('data', (chunk) => (raw += chunk));
  req.on('end', () => {
    const body = JSON.parse(raw || '{}');
    const prompt = body.messages?.find((message) => message.role === 'user')?.content ?? '';
    seen.push(prompt);
    if (prompt.includes('STUB_DOWN')) return send(res, 503, { error: { message: 'stub is down' } });
    const answer = () =>
      send(res, 200, {
        id: 'stub',
        object: 'chat.completion',
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(answerFor(prompt)) } }],
      });
    return prompt.includes('STUB_SLOW') ? setTimeout(answer, 3000) : answer();
  });
});

server.listen(PORT, '127.0.0.1', () => console.log(`LLM stub on http://127.0.0.1:${PORT}/llm/v1`));
