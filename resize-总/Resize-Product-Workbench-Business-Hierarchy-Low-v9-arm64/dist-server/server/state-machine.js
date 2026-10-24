import { AppError } from "./errors.js";
const job = { DRAFT: ["READY_FOR_CONFIRMATION", "DELETED"], READY_FOR_CONFIRMATION: ["QUEUED", "DELETED"], QUEUED: ["GENERATING", "STOPPED", "FAILED"], GENERATING: ["POST_PROCESSING", "FAILED", "STOPPED", "INTERRUPTED"], POST_PROCESSING: ["COMPLETE", "FAILED", "STOPPED", "INTERRUPTED"], COMPLETE: ["DELETED", "FILES_PURGED"], FAILED: ["DELETED", "FILES_PURGED"], STOPPED: ["DELETED", "FILES_PURGED"], INTERRUPTED: ["DELETED", "FILES_PURGED"], DELETED: [], FILES_PURGED: ["DELETED"] };
const attempt = { CREATED: ["RUNNING", "STOPPED"], RUNNING: ["SUCCEEDED", "FAILED", "STOPPED", "TIMED_OUT", "INTERRUPTED", "SUPERSEDED"], SUCCEEDED: [], FAILED: [], STOPPED: [], TIMED_OUT: [], INTERRUPTED: [], SUPERSEDED: [] };
export function transitionJob(from, to) { if (!job[from].includes(to))
    throw new AppError("INVALID_JOB_TRANSITION"); return to; }
export function transitionAttempt(from, to) { if (!attempt[from].includes(to))
    throw new AppError("INVALID_ATTEMPT_TRANSITION"); return to; }
export function canCommit(input) { return input.attemptStatus === "RUNNING" && input.token === input.winningToken && input.jobStatus === "GENERATING" && !input.stopRequested; }
