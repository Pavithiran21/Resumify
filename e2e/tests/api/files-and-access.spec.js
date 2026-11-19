const { test, expect } = require('@playwright/test');
const { SEEDED, apiUrl, fixture, json, loginAs, newUser } = require('../../helpers/api');

test.describe('uploads: the real type comes from the first bytes, and unreadable files are refused', () => {
  test('a text file renamed to .pdf is refused (415)', async ({ request }) => {
    const api = await newUser(request);
    const body = await json(await api.upload('/resumes', 'resume.pdf', Buffer.from('Just plain text pretending to be a PDF file.')), 415);
    expect(body.error.code).toBe('FILE_TYPE_NOT_ALLOWED');
  });

  test('a password-protected PDF, a scan with no text and a 31-page PDF are refused (422) with a reason', async ({ request }) => {
    const api = await newUser(request);
    const code = async (file) => (await json(await api.upload('/resumes', file), 422)).error.code;
    expect(await code('Resume_locked.pdf')).toBe('FILE_PROTECTED');
    expect(await code('Resume_scan.pdf')).toBe('NO_TEXT_FOUND');
    expect(await code('Resume_31_pages.pdf')).toBe('TOO_MANY_PAGES');
  });

  test('a DOCX "zip bomb" is refused instead of being unpacked', async ({ request }) => {
    const api = await newUser(request);
    const response = await api.upload('/resumes', 'Resume_zip_bomb.docx');
    expect([413, 415, 422]).toContain(response.status());
  });

  test('a job description is read from a DOCX on the server; only the text is kept', async ({ request }) => {
    const api = await newUser(request);
    const extracted = await json(await api.upload('/jobs/extract-text', 'Northwind_Frontend_Developer.docx', fixture('Northwind_Frontend_Developer.docx')), 200);
    expect(extracted.text).toContain('Frontend Developer');
    expect(extracted.text).toContain('GraphQL');
  });
});

test.describe('privacy and accounts', () => {
  test('another user\'s resume, job and match answer 404', async ({ request }) => {
    const arjun = await loginAs(request, SEEDED.arjun);
    const [match] = (await json(await arjun.get('/matches'), 200)).items;
    expect(match, 'Arjun has a seeded match').toBeTruthy();

    const stranger = await newUser(request);
    expect((await stranger.get(`/matches/${match.id}`)).status()).toBe(404);
    expect((await stranger.get(`/resumes/${match.resumeId}`)).status()).toBe(404);
    expect((await stranger.get(`/resumes/${match.resumeId}/download`)).status()).toBe(404);
    expect((await stranger.get(`/jobs/${match.jobId}`)).status()).toBe(404);
  });

  test('a wrong password and an unknown email get the same 401; no token is 401', async ({ request }) => {
    const wrong = await request.post(apiUrl('/auth/login'), { data: { email: SEEDED.meera, password: 'Not-the-password-1' } });
    const unknown = await request.post(apiUrl('/auth/login'), { data: { email: 'nobody@e2e.resumify.test', password: 'Not-the-password-1' } });
    expect(wrong.status()).toBe(401);
    expect(unknown.status()).toBe(401);
    expect((await wrong.json()).error.message).toBe((await unknown.json()).error.message);
    expect((await request.get(apiUrl('/matches'))).status()).toBe(401);
  });

  test('a demo account cannot change its password (403 DEMO_ACCOUNT_LOCKED)', async ({ request }) => {
    const locked = await loginAs(request, SEEDED.locked);
    const body = await json(await locked.post('/me/password', { currentPassword: process.env.E2E_PASSWORD, newPassword: 'Another-pass-123' }), 403);
    expect(body.error.code).toBe('DEMO_ACCOUNT_LOCKED');
  });
});
