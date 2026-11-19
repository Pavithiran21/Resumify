/**
 * Gets resumify_test ready for a Playwright run, using the backend's own scripts:
 *   1. scripts.make_env test     -> backend/.env.test (resumify_test on the same MongoDB, new JWT
 *                                   secret, the model on the local stub, new Ethereal inboxes, new
 *                                   E2E_PASSWORD, rate limits off), layered over backend/.env
 *   2. scripts.sample_files --e2e -> e2e/fixtures/ (real PDF and DOCX resumes and jobs, and the
 *                                   files an upload must refuse)
 *   3. scripts.seed_test          -> empties resumify_test, then Meera's and Arjun's accounts with
 *                                   real matches (so the model stub runs while it seeds)
 *
 * Python: $PYTHON, else backend/.venv's, else "python".
 * Usage: npm test (runs this, then playwright test), or node prepare.js on its own.
 */
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const backend = path.resolve(__dirname, '../backend');
const venvPython = path.join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const python = process.env.PYTHON ?? (fs.existsSync(venvPython) ? venvPython : 'python');

function run(args, env = {}) {
  execFileSync(python, args, { cwd: backend, env: { ...process.env, ...env }, stdio: 'inherit' });
}

async function main() {
  run(['-m', 'scripts.make_env', 'test', ...process.argv.slice(2)]);
  const fixtures = path.join(__dirname, 'fixtures');
  run(['-m', 'scripts.sample_files', fixtures, '--e2e', '--quiet']);
  // The Northwind job as plain text too, for the tests that paste it.
  run(['-c', `from scripts import sample_data; open(r"${path.join(fixtures, 'Northwind_Frontend_Developer.txt')}", "w", encoding="utf-8", newline="\\n").write(sample_data.NORTHWIND_JOB["description"])`]);

  const stub = spawn(process.execPath, [path.join(__dirname, 'mocks', 'llm-stub.js')], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 50; i += 1) {
      const up = await fetch('http://127.0.0.1:8080/__health').then((r) => r.ok, () => false);
      if (up) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    run(['-m', 'scripts.seed_test'], { ENV_FILE: '.env.test' });
  } finally {
    stub.kill();
  }
  console.log('Ready: run "npx playwright test".');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
