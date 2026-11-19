const { test, expect } = require('@playwright/test');
const { fixtureText, json, modelCalls, newUser, normalise, pasteJob, uniqueToken } = require('../../helpers/api');

// The signature feature: a scored, explainable and reproducible match. Rules find the job's skills,
// the model only answers what the rules can't see and must quote its evidence, every quote is
// checked against the real text, and the score is computed, never generated.

async function userWithResume(request, file = 'Meera_Iyer_2026_v1.pdf') {
  const api = await newUser(request);
  const resume = await json(await api.upload('/resumes', file), 201);
  return { api, resume };
}

const byName = (match) => Object.fromEntries(match.skills.map((skill) => [skill.name, skill]));

test('a match lists matched and missing skills; every matched skill quotes the resume word for word', async ({ request }) => {
  const { api, resume } = await userWithResume(request);
  const job = await pasteJob(api, uniqueToken());
  const match = await json(await api.post('/matches', { resumeId: resume.id, jobId: job.id }), 201);

  expect(match.score).toBeGreaterThanOrEqual(0);
  expect(match.score).toBeLessThanOrEqual(100);
  expect(['perfect', 'good', 'fair', 'weak']).toContain(match.verdict);
  const skills = byName(match);
  expect(skills.React.status).toBe('matched');
  expect(skills.React.matchedBy).toBe('text');
  expect(skills.GraphQL.status).toBe('missing');

  const resumeText = normalise(fixtureText('Meera_Iyer_2026_v1.txt'));
  for (const skill of match.skills) {
    expect(skill.reason, `${skill.name} has a reason`).toBeTruthy();
    if (skill.status === 'matched') {
      expect(resumeText, `the quote for ${skill.name} is in the resume`).toContain(normalise(skill.resumeQuote).replace(/^[\s.,;:'"]+|[\s.,;:'"]+$/g, ''));
    }
  }
});

test('the model matches a skill "in other words" only with a real quote, and an invented quote is dropped', async ({ request }) => {
  const { api, resume } = await userWithResume(request);
  const honest = await json(await api.post('/matches', { resumeId: resume.id, jobId: (await pasteJob(api, uniqueToken())).id }), 201);
  const aiMatched = honest.skills.filter((skill) => skill.matchedBy === 'ai');
  expect(aiMatched.length, 'at least one skill shown in other words').toBeGreaterThan(0);

  // STUB_INVENT: the stand-in model claims every missing skill with a made-up quote.
  const lying = await json(await api.post('/matches', { resumeId: resume.id, jobId: (await pasteJob(api, `STUB_INVENT ${uniqueToken()}`)).id }), 201);
  const invented = lying.skills.filter((skill) => skill.resumeQuote?.includes('across five teams'));
  expect(invented).toEqual([]);
  expect(byName(lying).GraphQL.status).toBe('missing');
  expect(lying.score).toBe(honest.score);
});

test('the same resume and job give the same score; the stored AI answer is reused, so the model is asked once', async ({ request }) => {
  const { api, resume } = await userWithResume(request);
  const token = uniqueToken();
  const job = await pasteJob(api, token);
  const first = await json(await api.post('/matches', { resumeId: resume.id, jobId: job.id }), 201);
  const second = await json(await api.post('/matches', { resumeId: resume.id, jobId: job.id }), 201);

  expect(second.score).toBe(first.score);
  expect(second.assessmentReused).toBe(true);
  expect([first.runNumber, second.runNumber]).toEqual([1, 2]);
  expect(await modelCalls(request, token)).toBe(1);
});

test('three runs saved at the same moment get run numbers 1, 2 and 3, each once', async ({ request }) => {
  const { api, resume } = await userWithResume(request);
  const job = await pasteJob(api, uniqueToken());
  const responses = await Promise.all([1, 2, 3].map(() => api.post('/matches', { resumeId: resume.id, jobId: job.id })));
  const runs = await Promise.all(responses.map((response) => json(response, 201)));
  expect(runs.map((run) => run.runNumber).sort()).toEqual([1, 2, 3]);
});

test('a new resume version compares against the old run: TypeScript moves from missing to matched', async ({ request }) => {
  const { api, resume } = await userWithResume(request);
  const job = await pasteJob(api, uniqueToken());
  const before = await json(await api.post('/matches', { resumeId: resume.id, jobId: job.id }), 201);
  expect(byName(before).TypeScript.status).toBe('missing');

  const v2 = await json(await api.upload(`/resumes/${resume.id}/versions`, 'Meera_Iyer_2026_v2.pdf'), 200);
  expect(v2.version).toBe(2);
  const after = await json(await api.post('/matches', { resumeId: resume.id, jobId: job.id }), 201);
  expect(byName(after).TypeScript.status).toBe('matched');

  const compare = await json(await api.get(`/matches/compare?first=${before.id}&second=${after.id}`), 200);
  expect(compare.scoreChange).toBe(after.score - before.score);
  expect(compare.scoreChange).toBeGreaterThan(0);
  expect(compare.skillChanges.map((change) => change.name)).toContain('TypeScript');
});

test('a resume changed while the model was thinking is refused (409 RESUME_CHANGED) and nothing is saved', async ({ request }) => {
  const { api, resume } = await userWithResume(request);
  const job = await pasteJob(api, `STUB_SLOW ${uniqueToken()}`);
  const running = api.post('/matches', { resumeId: resume.id, jobId: job.id });
  await new Promise((resolve) => setTimeout(resolve, 800));
  await json(await api.upload(`/resumes/${resume.id}/versions`, 'Meera_Iyer_2026_v2.pdf'), 200);

  expect((await json(await running, 409)).error.code).toBe('RESUME_CHANGED');
  expect((await json(await api.get('/matches'), 200)).items).toHaveLength(0);
});

test('when the model is down the match fails with 502 and nothing is saved', async ({ request }) => {
  test.setTimeout(60_000);
  const { api, resume } = await userWithResume(request);
  const job = await pasteJob(api, `STUB_DOWN ${uniqueToken()}`);
  expect((await json(await api.post('/matches', { resumeId: resume.id, jobId: job.id }), 502)).error.code).toBe('MATCH_SERVICE_FAILED');
  expect((await json(await api.get('/matches'), 200)).items).toHaveLength(0);
});
