import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { inspectUpload } from "./upload.js";
import { planSize } from "./size-plan.js";
import { atomicWrite, jobLayout, purgePath, safeWithin } from "./files.js";
import { postprocess } from "./postprocess.js";
import { classifyProviderError, DisabledHiModelsProvider, FakeProvider, sanitizeProviderDetail, sanitizeRequestId } from "./provider.js";
import { runAttempt } from "./attempt-runner.js";
import { AppError } from "./errors.js";
const hash = (data) => createHash("sha256").update(data).digest("hex");
export const makeFakeProviderFactory = () => ({ mode, fakeImage }) => new FakeProvider(mode, Buffer.from(fakeImage), mode === "hang" ? 250 : 10);
export const disabledProviderFactory = () => new DisabledHiModelsProvider();
export class LocalRuntime {
    db;
    root;
    keys;
    providerFactory;
    prompts;
    #active = new Map();
    constructor(db, root, keys, providerFactory = makeFakeProviderFactory(), prompts = {}) {
        this.db = db;
        this.root = root;
        this.keys = keys;
        this.providerFactory = providerFactory;
        this.prompts = prompts;
    }
    async initialize() { await mkdir(join(this.root, "jobs"), { recursive: true }); if (!this.prompts.Square)
        this.prompts = JSON.parse(await readFile(join(process.cwd(), "src/server/assets/prompts.json"), "utf8")).bodies; }
    keyStatus() { return this.keys.status(); }
    saveKey(key) { return this.keys.save(key); }
    deleteKey() { return this.keys.delete(); }
    promptSha(route) { return { Square: "a5308cffa5f2f73e37f1f381c14ef7312ea61f08ec83aae2cf06dea22774c3c7", Landscape: "ace2c207c5e575d03579709ed13da90b84e670cc10d6f68017960436d1c86b2d", LandscapeSafe: "6d899421ec9e9bb6a01a3cc44421ec6b4abffc3cd361f13dab78c75c3c2947f5", Banner: "8f570a336bb4572de9aa86e9281e8cabf0b96c13e5c827aed264708c49626ed4", Portrait: "427f70c75052a40773d025c16026a9d68b2d659d3abf323922a37524ce2450f2", PortraitSafe220: "68fd600c1b16ee40a57260f9dde836523e36efc19937c4972b5f589bf504feff" }[route]; }
    async createJob(image, targetWidth, targetHeight, displayName = "image") { const info = await inspectUpload(image), plan = planSize(targetWidth, targetHeight), id = randomUUID(), layout = jobLayout(this.root, id, randomUUID()), now = Date.now(); await atomicWrite(this.root, layout.source, image); this.db.prepare("INSERT INTO jobs(id,created_at,updated_at,source_path,source_sha256,source_format,source_width,source_height,target_width,target_height,route,request_size,prompt_version,prompt_sha256,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(id, now, now, layout.source, hash(image), info.format, info.width, info.height, targetWidth, targetHeight, plan.route, `${plan.requestWidth}x${plan.requestHeight}`, "FROZEN_v1.1", this.promptSha(plan.route), "READY_FOR_CONFIRMATION"); return { id, status: "READY_FOR_CONFIRMATION", source: { format: info.format, width: info.width, height: info.height, displayName: displayName.slice(0, 80) }, target: { width: targetWidth, height: targetHeight }, plan }; }
    list() { return this.db.prepare("SELECT id,created_at,updated_at,target_width,target_height,target_profile,route,request_size,status,result_id FROM jobs WHERE status!='DELETED' ORDER BY created_at DESC LIMIT 20").all(); }
    get(id) { const row = this.db.prepare("SELECT id,created_at,updated_at,target_width,target_height,target_profile,route,request_size,status,result_id FROM jobs WHERE id=? AND status!='DELETED'").get(id); if (!row)
        throw new AppError("JOB_NOT_FOUND", "JOB_NOT_FOUND", 404); return row; }
    async start(id, mode = "success") { const row = this.db.prepare("SELECT id,source_path,request_size,target_width,target_height,route,prompt_sha256,status FROM jobs WHERE id=?").get(id); if (!row || row.status !== "READY_FOR_CONFIRMATION" || this.#active.has(id))
        throw new AppError("JOB_NOT_READY"); const attemptId = randomUUID(), token = randomUUID(), now = Date.now(), sequence = (this.db.prepare("SELECT COALESCE(MAX(sequence),0) AS n FROM attempts WHERE job_id=?").get(id).n) + 1, active = { stop: false, token }; this.#active.set(id, active); this.db.prepare("INSERT INTO attempts(id,job_id,sequence,attempt_token,status,started_at,deadline_at) VALUES(?,?,?,?,?,?,?)").run(attemptId, id, sequence, token, "RUNNING", now, now + 240000); this.db.prepare("UPDATE jobs SET status='GENERATING',updated_at=?,winning_attempt_id=? WHERE id=?").run(now, attemptId, id); void this.execute(row, attemptId, active, mode); return { id, status: "GENERATING", attemptId, sequence }; }
    async execute(job, attemptId, active, mode) { let stage = "provider"; try {
        const prompt = this.prompts[job.route];
        if (!prompt || hash(prompt) !== job.prompt_sha256 || job.prompt_sha256 !== this.promptSha(job.route))
            throw new AppError("PROMPT_GATE_FAILED");
        const [rw = 0, rh = 0] = job.request_size.split("x").map(Number), source = await readFile(job.source_path), fakeImage = await sharp(source, { failOn: "error" }).resize(rw, rh, { fit: "cover" }).png().toBuffer(), provider = this.providerFactory({ mode, fakeImage: Buffer.from(fakeImage), jobId: job.id, attemptId }), request = { image: Buffer.from(source), prompt, size: job.request_size, key: "" }, layout = jobLayout(this.root, job.id, attemptId), intermediate = Buffer.from(await runAttempt(provider, request, { token: active.token, isCurrent: value => this.#active.get(job.id)?.token === value, stopRequested: () => active.stop }, 240000, async (data) => { const meta = await sharp(data, { failOn: "error" }).metadata(); if (meta.format !== "png" || meta.width !== rw || meta.height !== rh || (meta.pages ?? 1) !== 1)
            throw new AppError("IMAGE_DECODE_FAILED"); await atomicWrite(this.root, layout.intermediate, Buffer.from(data)); }));
        if (active.stop || this.#active.get(job.id) !== active)
            throw new AppError("STOPPED");
        stage = "postprocess";
        this.db.prepare("UPDATE jobs SET status='POST_PROCESSING',updated_at=? WHERE id=?").run(Date.now(), job.id);
        const plan = planSize(job.target_width, job.target_height), final = Buffer.from(await postprocess(intermediate, plan, { width: job.target_width, height: job.target_height }));
        await atomicWrite(this.root, layout.final, final);
        if (active.stop || this.#active.get(job.id) !== active)
            throw new AppError("STOPPED");
        const resultId = randomUUID(), created = Date.now();
        this.db.prepare("INSERT INTO results(id,job_id,attempt_id,intermediate_path,final_path,intermediate_sha256,final_sha256,format,width,height,postprocess_type,postprocess_params,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").run(resultId, job.id, attemptId, layout.intermediate, layout.final, hash(intermediate), hash(final), "png", job.target_width, job.target_height, plan.postprocess, JSON.stringify({ fit: plan.postprocess }), created);
        this.db.prepare("UPDATE attempts SET status='SUCCEEDED',ended_at=? WHERE id=?").run(created, attemptId);
        this.db.prepare("UPDATE jobs SET status='COMPLETE',updated_at=?,result_id=? WHERE id=?").run(created, resultId, job.id);
    }
    catch (error) {
        const stopped = active.stop || (error instanceof AppError && error.code === "STOPPED"), failure = stopped ? "STOPPED" : stage === "provider" ? classifyProviderError(error) : "POST_PROCESSING_FAILED", attemptStatus = stopped ? "STOPPED" : failure === "TIMED_OUT" ? "TIMED_OUT" : "FAILED", now = Date.now(), diagnostic = error, httpStatus = typeof diagnostic.status === "number" ? diagnostic.status : null, failureDetail = sanitizeProviderDetail(diagnostic.failureDetail), requestId = sanitizeRequestId(diagnostic.requestId);
        this.db.prepare("UPDATE attempts SET status=?,ended_at=?,failure_class=?,failure_detail=?,provider_http_status=?,request_id=? WHERE id=?").run(attemptStatus, now, failure, failureDetail, httpStatus, requestId, attemptId);
        this.db.prepare("UPDATE jobs SET status=?,updated_at=? WHERE id=?").run(stopped ? "STOPPED" : "FAILED", now, job.id);
    }
    finally {
        if (this.#active.get(job.id) === active)
            this.#active.delete(job.id);
    } }
    stop(id) { const active = this.#active.get(id); if (!active)
        throw new AppError("JOB_NOT_RUNNING"); active.stop = true; this.db.prepare("UPDATE attempts SET stop_requested_at=? WHERE job_id=? AND status='RUNNING'").run(Date.now(), id); return { id, status: "STOP_REQUESTED" }; }
    async result(id) { const row = this.db.prepare("SELECT r.final_path FROM results r JOIN jobs j ON j.result_id=r.id WHERE j.id=? AND j.status='COMPLETE'").get(id); if (!row)
        throw new AppError("RESULT_NOT_FOUND", "RESULT_NOT_FOUND", 404); return readFile(safeWithin(this.root, row.final_path)); }
    async delete(id) { if (this.#active.has(id))
        throw new AppError("JOB_RUNNING"); await purgePath(this.root, join(this.root, "jobs", id)); this.db.prepare("UPDATE jobs SET status='DELETED',source_path=NULL,updated_at=? WHERE id=?").run(Date.now(), id); this.db.prepare("UPDATE results SET intermediate_path=NULL,final_path=NULL WHERE job_id=?").run(id); return { id, status: "DELETED" }; }
    async source(id) { const row = this.db.prepare("SELECT source_path FROM jobs WHERE id=? AND status!='DELETED'").get(id); if (!row?.source_path)
        throw new AppError("SOURCE_NOT_FOUND", "SOURCE_NOT_FOUND", 404); return readFile(safeWithin(this.root, row.source_path)); }
    hasRunning() { return this.#active.size > 0; }
}
