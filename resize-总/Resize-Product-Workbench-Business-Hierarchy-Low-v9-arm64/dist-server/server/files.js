import { mkdir, rename, rm, writeFile, readdir, stat } from "node:fs/promises";
import { dirname, resolve, relative, join } from "node:path";
import { AppError } from "./errors.js";
export function safeWithin(root, target) { const r = resolve(root), t = resolve(target), rel = relative(r, t); if (rel.startsWith("..") || rel === "" && t !== r)
    throw new AppError("UNSAFE_PATH"); return t; }
export async function atomicWrite(root, target, data) { const dest = safeWithin(root, target), tmp = `${dest}.${crypto.randomUUID()}.tmp`; await mkdir(dirname(dest), { recursive: true }); await writeFile(tmp, data, { flag: "wx" }); await rename(tmp, dest); return dest; }
export async function purgePath(root, target) { const safe = safeWithin(root, target); if (safe === resolve(root))
    throw new AppError("UNSAFE_PATH"); await rm(safe, { recursive: true, force: true }); }
export async function cleanOldTmp(root, now = Date.now(), ageMs = 24 * 60 * 60 * 1000) { let count = 0; async function walk(dir) { for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = join(dir, e.name);
    if (e.isDirectory())
        await walk(p);
    else if (e.name.endsWith(".tmp") && now - (await stat(p)).mtimeMs > ageMs) {
        await rm(p);
        count++;
    }
} } await walk(safeWithin(root, root)); return count; }
export function jobLayout(root, jobId, attemptId) { if (!/^[0-9a-f-]{16,}$/i.test(jobId) || !/^[0-9a-f-]{16,}$/i.test(attemptId))
    throw new AppError("INVALID_ID"); const base = safeWithin(root, join(root, "jobs", jobId)); return { base, source: join(base, "source", "source.bin"), attemptTmp: join(base, "attempts", attemptId, "tmp"), intermediate: join(base, "result", "intermediate.png"), final: join(base, "result", "final.png") }; }
