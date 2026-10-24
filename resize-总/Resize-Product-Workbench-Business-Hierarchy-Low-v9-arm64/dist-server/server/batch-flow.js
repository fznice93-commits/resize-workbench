import { createHash, randomBytes, randomUUID } from "node:crypto";
import { join } from "node:path";
import { AppError } from "./errors.js";
import { atomicWrite, purgePath } from "./files.js";
import { inspectUpload } from "./upload.js";
import { normalizeProfile, planSize } from "./size-plan.js";
import { createStoredZip } from "./zip.js";
import { outputName } from "./output-name.js";
const sha = (value) => createHash("sha256").update(value).digest("hex");
export const BATCH_PRESETS = Object.freeze([[1024, 1024], [1200, 800], [720, 1280], [1280, 720], [720, 1600], [300, 400], [985, 403], [730, 300], [780, 470]]);
export class BatchFlow {
    runtime;
    session;
    ttlMs;
    now;
    #nonces = new Map();
    #chains = new Map();
    #creates = new Map();
    constructor(runtime, session, ttlMs = 120_000, now = Date.now) {
        this.runtime = runtime;
        this.session = session;
        this.ttlMs = ttlMs;
        this.now = now;
    }
    creationIdentity(sourceSha, plans) { return sha(JSON.stringify({ sourceSha, targets: plans.map(item => ({ profile: item.profile, width: item.width, height: item.height, route: item.plan.route, requestSize: `${item.plan.requestWidth}x${item.plan.requestHeight}`, promptSha: item.promptSha })), model: "gpt-image-2", quality: "low" })); }
    existingForToken(tokenSha, identity) { const existing = this.runtime.db.prepare("SELECT id,creation_identity_sha256 FROM batches WHERE creation_token_sha256=? AND status!='DELETED'").get(tokenSha); if (!existing)
        return; let stored = existing.creation_identity_sha256; if (!stored) {
        const batch = this.batch(existing.id), items = this.items(existing.id), plans = items.map(item => ({ width: item.target_width, height: item.target_height, profile: item.target_profile, plan: { route: item.route, requestWidth: Number(item.request_size.split("x")[0]), requestHeight: Number(item.request_size.split("x")[1]) }, promptSha: item.prompt_sha256 }));
        stored = this.creationIdentity(batch.source_sha256, plans);
        this.runtime.db.prepare("UPDATE batches SET creation_identity_sha256=? WHERE id=? AND creation_identity_sha256 IS NULL").run(stored, existing.id);
    } if (stored !== identity)
        throw new AppError("IDEMPOTENCY_CONFLICT", "IDEMPOTENCY_CONFLICT", 409); return this.get(existing.id); }
    async create(image, targets, idempotencyKey) { if (!Array.isArray(targets) || targets.length < 1 || targets.length > 9)
        throw new AppError("BATCH_SIZE_COUNT_REJECTED"); const seen = new Set(), plans = targets.map(target => { const profile = normalizeProfile(target.profile), key = `${profile}:${target.width}x${target.height}`; if (seen.has(key))
        throw new AppError("DUPLICATE_TARGET_SIZE"); seen.add(key); const plan = planSize(target.width, target.height, profile); return { width: target.width, height: target.height, profile, plan, promptSha: this.runtime.promptSha(plan.route) }; }), info = await inspectUpload(image), sourceSha = sha(image), identity = this.creationIdentity(sourceSha, plans), tokenSha = idempotencyKey ? sha(`${this.session}\0${idempotencyKey}`) : null; if (!tokenSha)
        return this.createNew(image, info, sourceSha, plans, null, identity); const existing = this.existingForToken(tokenSha, identity); if (existing)
        return existing; const pending = this.#creates.get(tokenSha); if (pending) {
        if (pending.identity !== identity)
            throw new AppError("IDEMPOTENCY_CONFLICT", "IDEMPOTENCY_CONFLICT", 409);
        return pending.promise;
    } const promise = this.createNew(image, info, sourceSha, plans, tokenSha, identity); this.#creates.set(tokenSha, { identity, promise }); try {
        return await promise;
    }
    finally {
        if (this.#creates.get(tokenSha)?.promise === promise)
            this.#creates.delete(tokenSha);
    } }
    async createNew(image, info, sourceSha, plans, tokenSha, identity) { const batchId = randomUUID(), sourcePath = join(this.runtime.root, "batches", batchId, "source", "source.bin"), now = this.now(); await atomicWrite(this.runtime.root, sourcePath, image); this.runtime.db.exec("BEGIN"); try {
        this.runtime.db.prepare("INSERT INTO batches(id,creation_token_sha256,creation_identity_sha256,created_at,updated_at,source_path,source_sha256,source_format,source_width,source_height,total_count,waiting_count,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").run(batchId, tokenSha, identity, now, now, sourcePath, sourceSha, info.format, info.width, info.height, plans.length, plans.length, "READY_FOR_CONFIRMATION");
        for (let index = 0; index < plans.length; index++) {
            const item = plans[index], jobId = randomUUID();
            this.runtime.db.prepare("INSERT INTO jobs(id,created_at,updated_at,source_path,source_sha256,source_format,source_width,source_height,target_width,target_height,target_profile,route,request_size,prompt_version,prompt_sha256,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(jobId, now, now, sourcePath, sourceSha, info.format, info.width, info.height, item.width, item.height, item.profile, item.plan.route, `${item.plan.requestWidth}x${item.plan.requestHeight}`, "FROZEN_v1.1", item.promptSha, "WAITING");
            this.runtime.db.prepare("INSERT INTO batch_jobs(batch_id,job_id,ordinal) VALUES(?,?,?)").run(batchId, jobId, index + 1);
        }
        this.runtime.db.exec("COMMIT");
    }
    catch (error) {
        this.runtime.db.exec("ROLLBACK");
        await purgePath(this.runtime.root, join(this.runtime.root, "batches", batchId));
        if (tokenSha) {
            const existing = this.existingForToken(tokenSha, identity);
            if (existing)
                return existing;
        }
        throw error;
    } return this.get(batchId); }
    batch(id) { const row = this.runtime.db.prepare("SELECT * FROM batches WHERE id=? AND status!='DELETED'").get(id); if (!row)
        throw new AppError("BATCH_NOT_FOUND", "BATCH_NOT_FOUND", 404); return row; }
    items(id) { this.batch(id); return this.runtime.db.prepare("SELECT bj.ordinal,j.id AS job_id,j.target_width,j.target_height,j.target_profile,j.route,j.request_size,j.prompt_sha256,j.status,j.result_id,a.started_at,a.ended_at,a.failure_class,a.failure_detail,a.provider_http_status,a.request_id FROM batch_jobs bj JOIN jobs j ON j.id=bj.job_id LEFT JOIN attempts a ON a.id=j.winning_attempt_id WHERE bj.batch_id=? ORDER BY bj.ordinal").all(id); }
    get(id) { let batch = this.batch(id); const items = this.items(id), terminal = items.filter(x => ["COMPLETE", "FAILED", "STOPPED", "INTERRUPTED", "SKIPPED", "DELETED"].includes(x.status)).length, completed = items.filter(x => x.status === "COMPLETE").length, failed = items.filter(x => x.status === "FAILED").length, stopped = items.filter(x => ["STOPPED", "INTERRUPTED"].includes(x.status)).length, waiting = items.filter(x => x.status === "WAITING").length, current = items.find(x => ["READY_FOR_CONFIRMATION", "GENERATING", "POST_PROCESSING"].includes(x.status)); if (batch.completed_count !== completed || batch.failed_count !== failed || batch.stopped_count !== stopped || batch.waiting_count !== waiting) {
        this.runtime.db.prepare("UPDATE batches SET completed_count=?,failed_count=?,stopped_count=?,waiting_count=? WHERE id=?").run(completed, failed, stopped, waiting, id);
        batch = this.batch(id);
    } return { id: batch.id, createdAt: batch.created_at, updatedAt: batch.updated_at, source: { sha256: batch.source_sha256, format: batch.source_format, width: batch.source_width, height: batch.source_height }, status: batch.status, totalCount: items.length, completed, failed, stopped, waiting, terminal, percent: Math.floor(terminal * 100 / items.length), currentJobId: current?.job_id ?? null, currentSize: current ? `${current.target_profile} · ${current.target_width}x${current.target_height}` : null, items }; }
    fingerprint(id, action, jobId) { const batch = this.batch(id), items = this.items(id); return sha(JSON.stringify({ session: this.session, batchId: id, sourceSha: batch.source_sha256, action, jobId, items: items.map(x => ({ ordinal: x.ordinal, profile: x.target_profile, target: [x.target_width, x.target_height], route: x.route, requestSize: x.request_size, promptSha: x.prompt_sha256, status: x.status })), model: "gpt-image-2", quality: "low", maxCalls: action === "SKIP" ? items.filter(x => x.status === "WAITING").length : items.filter(x => ["WAITING", "FAILED", "STOPPED", "INTERRUPTED"].includes(x.status)).length })); }
    issue(id, action = "START", jobId) { const batch = this.batch(id), items = this.items(id), status = String(batch.status); if (action === "START" && status !== "READY_FOR_CONFIRMATION")
        throw new AppError("BATCH_NOT_READY"); if (action !== "START" && !status.startsWith("PAUSED_"))
        throw new AppError("BATCH_NOT_PAUSED"); const failed = items.find(x => x.job_id === jobId); if (action !== "START" && (!failed || !["FAILED", "STOPPED", "INTERRUPTED"].includes(failed.status)))
        throw new AppError("BATCH_ACTION_TARGET_REJECTED"); const nonce = randomBytes(32).toString("base64url"), entry = { batchId: id, action, jobId, fingerprint: this.fingerprint(id, action, jobId), expiresAt: this.now() + this.ttlMs, consumed: false }; this.#nonces.set(nonce, entry); const remaining = items.filter(x => x.status === "WAITING").length + (action === "RETRY" ? 1 : 0); return { nonce, expiresAt: entry.expiresAt, summary: { batchId: id, action, jobId, sourceSha256: batch.source_sha256, items: items.map(x => ({ ordinal: x.ordinal, jobId: x.job_id, targetProfile: x.target_profile, targetWidth: x.target_width, targetHeight: x.target_height, route: x.route, requestSize: x.request_size, promptSha256: x.prompt_sha256, status: x.status })), model: "gpt-image-2", quality: "low", maxCalls: remaining, serial: true, automaticRetry: false, sendsOriginalToHiModels: true, incursCost: true } }; }
    submit(id, nonce, confirmed) { if (!confirmed)
        throw new AppError("PAID_CONFIRMATION_REQUIRED"); const entry = this.#nonces.get(nonce); if (!entry || entry.batchId !== id || entry.expiresAt < this.now())
        throw new AppError("CONFIRMATION_NONCE_INVALID"); if (entry.consumed || this.#chains.has(id))
        return { batchId: id, status: String(this.batch(id).status), idempotent: true }; if (entry.fingerprint !== this.fingerprint(id, entry.action, entry.jobId))
        throw new AppError("CONFIRMATION_STALE"); entry.consumed = true; const chain = this.run(id, entry).finally(() => this.#chains.delete(id)); this.#chains.set(id, chain); return { batchId: id, status: "RUNNING", idempotent: false }; }
    async run(id, entry) { const now = this.now(); if (entry.action === "RETRY")
        this.runtime.db.prepare("UPDATE jobs SET status='WAITING',updated_at=?,winning_attempt_id=NULL WHERE id=? AND status IN ('FAILED','STOPPED','INTERRUPTED')").run(now, entry.jobId);
    else if (entry.action === "SKIP")
        this.runtime.db.prepare("UPDATE jobs SET status='SKIPPED',updated_at=?,winning_attempt_id=NULL WHERE id=? AND status IN ('FAILED','STOPPED','INTERRUPTED')").run(now, entry.jobId); this.runtime.db.prepare("UPDATE batches SET status='RUNNING',updated_at=? WHERE id=?").run(now, id); while (true) {
        const next = this.items(id).find(x => x.status === "WAITING");
        if (!next) {
            this.finish(id);
            return;
        }
        this.runtime.db.prepare("UPDATE jobs SET status='READY_FOR_CONFIRMATION',updated_at=? WHERE id=? AND status='WAITING'").run(this.now(), next.job_id);
        await this.runtime.start(next.job_id);
        const status = await this.wait(next.job_id);
        if (status !== "COMPLETE") {
            this.runtime.db.prepare("UPDATE batches SET status=?,updated_at=? WHERE id=?").run(status === "FAILED" ? "PAUSED_FAILED" : "PAUSED_STOPPED", this.now(), id);
            return;
        }
    } }
    async wait(jobId) { for (;;) {
        const status = String(this.runtime.get(jobId).status);
        if (["COMPLETE", "FAILED", "STOPPED", "INTERRUPTED"].includes(status))
            return status;
        await new Promise(resolve => setTimeout(resolve, 5));
    } }
    finish(id) { const items = this.items(id), complete = items.filter(x => x.status === "COMPLETE").length, skipped = items.filter(x => x.status === "SKIPPED").length, status = complete === items.length ? "COMPLETE" : complete > 0 || skipped > 0 ? "PARTIAL_COMPLETE" : "COMPLETE"; this.runtime.db.prepare("UPDATE batches SET status=?,updated_at=? WHERE id=?").run(status, this.now(), id); }
    async zip(id) { const items = this.items(id).filter(x => x.status === "COMPLETE"); if (!items.length)
        throw new AppError("BATCH_NO_SUCCESSFUL_RESULTS", "BATCH_NO_SUCCESSFUL_RESULTS", 409); const files = []; for (const item of items) {
        const data = await this.runtime.result(item.job_id);
        files.push({ name: outputName(item.target_profile, item.target_width, item.target_height), data });
    } return createStoredZip(files); }
    stop(id) { const item = this.items(id).find(x => ["GENERATING", "POST_PROCESSING"].includes(x.status)); if (!item)
        throw new AppError("BATCH_NOT_RUNNING"); return this.runtime.stop(item.job_id); }
    async delete(id) { if (this.#chains.has(id))
        throw new AppError("BATCH_RUNNING"); const items = this.items(id); for (const item of items)
        if (item.status !== "DELETED")
            await this.runtime.delete(item.job_id); await purgePath(this.runtime.root, join(this.runtime.root, "batches", id)); this.runtime.db.prepare("UPDATE batches SET status='DELETED',source_path=NULL,updated_at=? WHERE id=?").run(this.now(), id); return { id, status: "DELETED" }; }
}
