const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { expect } = require('@playwright/test');

// A small API client over Playwright's request context, plus the fixture files that prepare.js
// writes with the backend's own scripts.sample_files (real PDF and DOCX files).

const FIXTURES = path.join(__dirname, '..', 'fixtures');
const SEEDED = { meera: 'meera@e2e.resumify.test', arjun: 'arjun@e2e.resumify.test', locked: 'locked@e2e.resumify.test' };

function apiUrl(pathname) {
  return `${process.env.E2E_API_URL}${pathname}`;
}

function fixture(name) {
  return fs.readFileSync(path.join(FIXTURES, name));
}

function client(request, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const call = (method) => (pathname, data) => request.fetch(apiUrl(pathname), { method, headers, ...(data === undefined ? {} : { data }) });
  const upload = (pathname, fileName, buffer = fixture(fileName)) =>
    request.fetch(apiUrl(pathname), { method: 'POST', headers, multipart: { file: { name: fileName, mimeType: 'application/octet-stream', buffer } } });
  return { get: call('GET'), post: call('POST'), patch: call('PATCH'), delete: call('DELETE'), upload, token };
}

/** The JSON body of a response that must have the given status. */
async function json(response, status) {
  const text = await response.text();
  expect(response.status(), text.slice(0, 500)).toBe(status);
  return text ? JSON.parse(text) : null;
}

/** A word no other test (or run) uses. */
const uniqueToken = () => `ref${randomBytes(5).toString('hex')}`;

async function newUser(request) {
  const email = `user.${uniqueToken()}@e2e.resumify.test`;
  const password = `Pw-${randomBytes(8).toString('hex')}-1`;
  const body = await json(await request.post(apiUrl('/auth/register'), { data: { name: 'Test User', email, password } }), 201);
  return { ...client(request, body.accessToken), email, password };
}

async function loginAs(request, email, password = process.env.E2E_PASSWORD) {
  const body = await json(await request.post(apiUrl('/auth/login'), { data: { email, password } }), 200);
  return client(request, body.accessToken);
}

/** The Northwind Frontend Developer job, pasted, with extra words (a unique token, or a stub trigger). */
async function pasteJob(api, extra = '') {
  const description = `${fixtureText('Northwind_Frontend_Developer.txt')}\n\n${extra}`.trim();
  return json(await api.post('/jobs', { title: 'Frontend Developer', company: 'Northwind', description }), 201);
}

/** A text fixture (the resume texts and the Northwind job, written by prepare.js). */
function fixtureText(name) {
  return fs.readFileSync(path.join(FIXTURES, name), 'utf8');
}

/** How many times the model stub was asked about a prompt containing `needle`. */
async function modelCalls(request, needle) {
  const response = await request.get(`${process.env.E2E_LLM_STUB_URL}/__calls?contains=${encodeURIComponent(needle)}`);
  return (await response.json()).calls;
}

/** Lower case, single spaces: how Resumify looks a quote up in a text (matching.normalise_for_search). */
function normalise(text) {
  return text.toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/•/g, ' ').split(/\s+/).filter(Boolean).join(' ');
}

module.exports = { SEEDED, apiUrl, fixture, fixtureText, client, json, uniqueToken, newUser, loginAs, pasteJob, modelCalls, normalise };
