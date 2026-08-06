/**
 * Runs the backend pytest suite from `pnpm test:backend`.
 *
 * Exists so one command verifies the whole repo regardless of which half you
 * are working on. Resolves the venv's Python per-platform, and fails with a
 * useful message rather than a cryptic ENOENT when the venv or the database
 * is missing.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.join(repoRoot, "backend");

const python =
  process.platform === "win32"
    ? path.join(backend, ".venv", "Scripts", "python.exe")
    : path.join(backend, ".venv", "bin", "python");

if (!existsSync(python)) {
  console.error(
    [
      "Backend virtualenv not found at:",
      `  ${python}`,
      "",
      "Create it with:",
      "  cd backend",
      "  python -m venv .venv",
      process.platform === "win32"
        ? "  ./.venv/Scripts/python.exe -m pip install -r requirements.txt"
        : "  ./.venv/bin/python -m pip install -r requirements.txt",
    ].join("\n"),
  );
  process.exit(1);
}

const result = spawnSync(python, ["-m", "pytest", "-q", ...process.argv.slice(2)], {
  cwd: backend,
  stdio: "inherit",
});

if (result.error) {
  console.error(`Failed to run pytest: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(
    "\nBackend tests failed. If every test errored on connection, the database " +
      "is probably not running — start it with `pnpm db:up`.",
  );
}

process.exit(result.status ?? 1);
