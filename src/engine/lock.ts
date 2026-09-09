import { constants, openSync, closeSync, writeSync, readFileSync, unlinkSync, mkdirSync, rmdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

/** Acquire before constructing the engine: even opening SQLite can perform writes. */
export class EngineLock {
  private fd: number | undefined;
  readonly path: string;

  constructor(dataDir: string) { this.path = join(dataDir, "engine.lock"); }

  async acquire(): Promise<void> {
    await mkdir(join(this.path, ".."), { recursive: true, mode: 0o700 });
    const claim = `${this.path}.claim`;
    try { mkdirSync(claim, { mode: 0o700 }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error(`Othie engine startup is already in progress; inspect ${claim} if a startup crashed`);
      throw error;
    }
    try {
      try {
        this.fd = openSync(this.path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const owner = readFileSync(this.path, "utf8").trim();
        const pid = Number(owner);
        // Empty/invalid locks are ambiguous. Fail closed rather than steal a starting engine's lock.
        if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error(`Othie lock has no valid owner: ${this.path}`);
        try {
          process.kill(pid, 0);
          throw new Error(`Othie engine is already running (pid ${pid})`);
        } catch (check) {
          if ((check as NodeJS.ErrnoException).code !== "ESRCH") throw check;
        }
        // No awaits between checking the dead owner and exclusive replacement.
        if (readFileSync(this.path, "utf8").trim() !== owner) throw new Error("Othie lock owner changed; retry startup");
        unlinkSync(this.path);
        this.fd = openSync(this.path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      }
      writeSync(this.fd, String(process.pid));
    } finally { rmdirSync(claim); }
  }

  release(): void {
    if (this.fd === undefined) return;
    closeSync(this.fd);
    this.fd = undefined;
    unlinkSync(this.path);
  }
}
