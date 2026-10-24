import { open, readFile, rm } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { AppError } from "./errors.js";
export async function acquireLock(root, port, buildId, health, instanceToken = randomBytes(32).toString("hex")) { const dir = join(root, "run"), path = join(dir, "instance.lock"); await mkdir(dir, { recursive: true }); try {
    const old = JSON.parse(await readFile(path, "utf8"));
    if (await health(old))
        throw new AppError("INSTANCE_ALREADY_RUNNING");
    await rm(path, { force: true });
}
catch (e) {
    if (e instanceof AppError)
        throw e;
} const lock = { pid: process.pid, token: instanceToken, startedAt: new Date().toISOString(), port, buildId }; const h = await open(path, "wx", 0o600); await h.writeFile(JSON.stringify(lock)); await h.close(); return { path, lock, release: () => rm(path, { force: true }) }; }
export const tokenSummary = (token) => token.slice(0, 8);
