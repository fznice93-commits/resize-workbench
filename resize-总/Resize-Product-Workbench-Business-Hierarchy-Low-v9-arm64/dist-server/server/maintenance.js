import { join } from "node:path";
import { expiredFileJobs, markFilesPurged } from "./db.js";
import { purgePath, cleanOldTmp } from "./files.js";
import { POLICY } from "../shared/policy.js";
export async function runMaintenance(db, dataRoot, now = Date.now()) { await cleanOldTmp(dataRoot, now, POLICY.purgeAfterMs); let purged = 0; for (const job of expiredFileJobs(db, now - POLICY.purgeAfterMs)) {
    await purgePath(dataRoot, join(dataRoot, "jobs", job.id));
    markFilesPurged(db, job.id, now);
    purged++;
} return { purged }; }
