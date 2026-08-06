/**
 * Runs the backend pytest suite from `pnpm verify`.
 *
 * Exists because the venv's Python lives at a different path on Windows
 * (.venv/Scripts/python.exe) than on macOS/Linux (.venv/bin/python), and the
 * two developers may not be on the same OS.
 *
 * Skips with a clear message rather than failing if the venv isn't set up —
 * a frontend-only contributor should still be able to run `pnpm verify`.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.join(root, "backend");

const candidates = [
  path.join(backend, ".venv", "Scripts", "python.exe"),
  path.join(backend, ".venv", "bin", "python"),
];

const python = candidates.find(existsSync);

if (!python) {
  console.log(
    "\n  backend tests SKIPPED — no virtualenv found.\n" +
      "  Set one up with:\n" +
      "    cd backend && python -m venv .venv\n" +
      "    ./.venv/Scripts/python.exe -m pip install -r requirements.txt   # Windows\n" +
      "    ./.venv/bin/python -m pip install -r requirements.txt           # macOS/Linux\n",
  );
  process.exit(0);
}

const result = spawnSync(python, ["-m", "pytest"], {
  cwd: backend,
  stdio: "inherit",
});

if (result.status !== 0) {
  console.error(
    "\n  Backend tests failed. If the errors are connection timeouts, the\n" +
      "  database is probably not running:\n" +
      "    docker compose -f docker-compose.dev.yml up -d\n",
  );
}

process.exit(result.status ?? 1);
