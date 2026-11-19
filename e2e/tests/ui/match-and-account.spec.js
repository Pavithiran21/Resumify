const { test, expect } = require('@playwright/test');
const { SEEDED, json, loginAs, newUser } = require('../../helpers/api');
const { waitForMail } = require('../../helpers/mail');

/** Logs in on the start page; after it the app goes where the visitor was going, or to /home. */
async function logIn(page, email, password = process.env.E2E_PASSWORD, landsOn = /\/home$/) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(landsOn);
}

/** Meera's two seeded Northwind runs (version 1, then version 2), oldest first. */
async function meeraNorthwindRuns(request) {
  const meera = await loginAs(request, SEEDED.meera);
  const { items } = await json(await meera.get('/matches?size=50'), 200);
  return items.filter((match) => match.jobCompany === 'Northwind').sort((a, b) => a.resumeVersion - b.resumeVersion);
}

test('Log in is the start page; a match shows its score, and matched skills with their quoted evidence', async ({ page, request }) => {
  const [, latest] = await meeraNorthwindRuns(request);
  await logIn(page, SEEDED.meera);
  await page.goto(`/matches/${latest.id}`);

  await expect(page.getByRole('heading', { level: 1, name: latest.jobTitle })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Score' })).toContainText(String(latest.score));
  const matched = page.getByRole('region', { name: /matched/i });
  await expect(matched).toBeVisible();
  await expect(matched.getByText('React').first()).toBeVisible();
  await expect(page.getByRole('region', { name: /missing/i }).getByText('GraphQL').first()).toBeVisible();
});

test('Compare two runs shows the score change between resume versions', async ({ page, request }) => {
  const [older, newer] = await meeraNorthwindRuns(request);
  await logIn(page, SEEDED.meera);
  await page.goto(`/matches/compare?first=${older.id}&second=${newer.id}`);

  await expect(page.getByRole('heading', { name: 'Compare two runs' })).toBeVisible();
  const change = newer.score - older.score;
  await expect(page.getByText(`${change > 0 ? '+' : ''}${change}`).first()).toBeVisible();
  await expect(page.getByRole('table', { name: 'What changed' })).toBeVisible();
});

test('a signed-out visitor is sent to Log in, and another user\'s match is "not found"', async ({ page, request }) => {
  await page.goto('/matches');
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);

  const [match] = await meeraNorthwindRuns(request);
  const stranger = await newUser(request);
  // Sent to Log in from /matches, the visitor is taken back there afterwards.
  await logIn(page, stranger.email, stranger.password, /\/matches$/);
  await page.goto(`/matches/${match.id}`);
  await expect(page.getByText(/not found|isn't here|doesn't exist/i).first()).toBeVisible();
});

test('forgot password: the emailed link sets a new password that then logs in', async ({ page, request }) => {
  test.setTimeout(90_000);
  const user = await newUser(request);
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(user.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();

  // Mail to .test addresses goes to the DEMO_SMTP_* inbox (app/core/mailer.py).
  const mail = await waitForMail({ to: user.email, subject: /Reset your Resumify password/, inbox: 'DEMO_SMTP' });
  const link = mail.html.match(/href="([^"]*\/reset-password\?token=[^"]+)"/)?.[1];
  expect(link, 'reset link in the email').toBeTruthy();
  const { pathname, search } = new URL(link.replace(/&amp;/g, '&'));
  await page.goto(pathname + search);

  const newPassword = 'Fresh-password-42';
  await page.getByRole('textbox', { name: 'New password', exact: true }).fill(newPassword);
  await page.getByRole('textbox', { name: 'Confirm password' }).fill(newPassword);
  await page.getByRole('button', { name: 'Set new password' }).click();
  await expect(page.getByRole('button', { name: 'Set new password' })).toHaveCount(0);

  await logIn(page, user.email, newPassword);
});
