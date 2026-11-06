// Tiny JSON persistence under .data/ (gitignored). Atomic writes. Swap for Postgres later.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const dir = () => process.env.ROUTIQ_DATA_DIR ?? join(process.cwd(), ".data");

export function readJson<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(join(dir(), name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(name: string, value: unknown): void {
  const file = join(dir(), name);
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
  renameSync(tmp, file);
}
