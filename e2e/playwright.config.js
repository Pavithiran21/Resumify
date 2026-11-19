const fs = require('node:fs');
const path = require('node:path');
const { defineConfig, devices } = require('@playwright/test');

// The run's settings: backend/.env.test, written by prepare.js (scripts.make_env test), layered over
// backend/.env by the backend (ENV_FILE). The tests need only the run's own values from it.
const backend = path.resolve(__dirname, '../backend');
process.loadEnvFile(path.join(backend, '.env.test'));

// Ports of their own, so a run never talks to the development servers on 4000 and 5173.
const API_PORT = 4100;
const WEB_PORT = 5273;
process.env.E2E_API_URL = `http://127.0.0.1:${API_PORT}/api`;
process.env.E2E_LLM_STUB_URL = 'http://127.0.0.1:8080';

const venvPython = path.join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const python = process.env.PYTHON ?? (fs.existsSync(venvPython) ? venvPython : 'python');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'api', testMatch: 'api/**/*.spec.js' },
    { name: 'ui', testMatch: 'ui/**/*.spec.js', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: 'node mocks/llm-stub.js',
      url: `${process.env.E2E_LLM_STUB_URL}/__health`,
      reuseExistingServer: false,
      timeout: 20_000,
    },
    {
      command: `"${python}" -m uvicorn app.main:app --host 127.0.0.1 --port ${API_PORT}`,
      cwd: backend,
      env: { ENV_FILE: '.env.test', LOG_LEVEL: 'warning' },
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort --host 127.0.0.1`,
      cwd: path.resolve(__dirname, '../frontend'),
      env: { API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` },
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
