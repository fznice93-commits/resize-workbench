import { randomUUID } from "node:crypto";
import { AppError } from "./errors.js";
export async function runAttempt(provider, request, ownership, deadlineMs, onTemp) { const controller = new AbortController(), token = ownership.token || randomUUID(); let timer; const work = provider.generate(request, controller.signal); work.catch(() => { }); const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new AppError("TIMED_OUT")); }, deadlineMs); }); try {
    const data = await Promise.race([work, timeout]);
    if (!ownership.isCurrent(token) || ownership.stopRequested())
        throw new AppError("STOPPED");
    if (onTemp)
        await onTemp(data);
    if (!ownership.isCurrent(token) || ownership.stopRequested())
        throw new AppError("STOPPED");
    return data;
}
finally {
    if (timer)
        clearTimeout(timer);
} }
