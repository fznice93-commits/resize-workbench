import { createHash, randomBytes } from "node:crypto";
import { AppError } from "./errors.js";
export class ProductionFlow {
    runtime;
    session;
    ttlMs;
    now;
    #byNonce = new Map();
    #byJob = new Map();
    constructor(runtime, session, ttlMs = 120_000, now = Date.now) {
        this.runtime = runtime;
        this.session = session;
        this.ttlMs = ttlMs;
        this.now = now;
    }
    row(id) { const row = this.runtime.db.prepare("SELECT id,source_sha256,target_width,target_height,route,request_size,prompt_sha256,status,winning_attempt_id FROM jobs WHERE id=? AND status!='DELETED'").get(id); if (!row)
        throw new AppError("JOB_NOT_FOUND", "JOB_NOT_FOUND", 404); return row; }
    fingerprint(row) { return createHash("sha256").update(JSON.stringify({ session: this.session, jobId: row.id, sourceSha: row.source_sha256, target: [row.target_width, row.target_height], route: row.route, requestSize: row.request_size, promptSha: row.prompt_sha256, model: "gpt-image-2", quality: "low" })).digest("hex"); }
    issue(id) { const row = this.row(id); if (row.status !== "READY_FOR_CONFIRMATION")
        throw new AppError("JOB_NOT_READY"); const old = this.#byJob.get(id); if (old)
        this.#byNonce.delete(old); const nonce = randomBytes(32).toString("base64url"), entry = { nonce, jobId: id, fingerprint: this.fingerprint(row), expiresAt: this.now() + this.ttlMs }; this.#byNonce.set(nonce, entry); this.#byJob.set(id, nonce); return { nonce, expiresAt: entry.expiresAt, summary: { jobId: id, sourceSha256: row.source_sha256, targetWidth: row.target_width, targetHeight: row.target_height, route: row.route, requestSize: row.request_size, promptSha256: row.prompt_sha256, model: "gpt-image-2", quality: "low", sendsOriginalToHiModels: true, incursCost: true, automaticRetry: false } }; }
    async submit(id, nonce, confirmed, mode = "success") { if (!confirmed)
        throw new AppError("PAID_CONFIRMATION_REQUIRED"); const entry = this.#byNonce.get(nonce); if (!entry || entry.jobId !== id || entry.expiresAt < this.now())
        throw new AppError("CONFIRMATION_NONCE_INVALID"); if (entry.consumedAttemptId) {
        const current = this.row(id);
        return { id, status: current.status, attemptId: entry.consumedAttemptId === "PENDING" ? current.winning_attempt_id : entry.consumedAttemptId, idempotent: true };
    } const row = this.row(id); if (row.status !== "READY_FOR_CONFIRMATION" || entry.fingerprint !== this.fingerprint(row))
        throw new AppError("CONFIRMATION_STALE"); entry.consumedAttemptId = "PENDING"; try {
        const result = await this.runtime.start(id, mode), current = this.row(id), attemptId = current.winning_attempt_id;
        entry.consumedAttemptId = attemptId;
        return { ...result, attemptId, idempotent: false };
    }
    catch (e) {
        entry.consumedAttemptId = undefined;
        throw e;
    } }
    retry(id) { const row = this.row(id); if (!["FAILED", "STOPPED", "INTERRUPTED"].includes(row.status))
        throw new AppError("JOB_NOT_RETRYABLE"); this.runtime.db.prepare("UPDATE jobs SET status='READY_FOR_CONFIRMATION',updated_at=?,winning_attempt_id=NULL WHERE id=?").run(this.now(), id); const old = this.#byJob.get(id); if (old)
        this.#byNonce.delete(old); this.#byJob.delete(id); return this.runtime.get(id); }
    attempts(id) { this.row(id); return this.runtime.db.prepare("SELECT id,sequence,status,started_at,ended_at,failure_class,failure_detail,provider_http_status,request_id FROM attempts WHERE job_id=? ORDER BY sequence,id").all(id); }
}
