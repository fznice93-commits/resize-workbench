import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { AppError } from "./errors.js";
export class FakeProvider {
    mode;
    image;
    delay;
    constructor(mode, image = Buffer.alloc(0), delay = 10) {
        this.mode = mode;
        this.image = image;
        this.delay = delay;
    }
    async generate(_, signal) { if (this.mode === "hang" || this.mode === "late")
        await new Promise((resolve, reject) => { const t = setTimeout(resolve, this.delay); signal.addEventListener("abort", () => { if (this.mode !== "late") {
            clearTimeout(t);
            reject(new AppError("STOPPED"));
        } }, { once: true }); }); if (this.mode === "401")
        throw Object.assign(new AppError("AUTHENTICATION_FAILED"), { status: 401 }); if (this.mode === "400")
        throw Object.assign(new AppError("INVALID_PROVIDER_REQUEST"), { status: 400 }); if (this.mode === "safety")
        throw new AppError("SAFETY_REJECTED"); if (this.mode === "malformed")
        throw new AppError("UNKNOWN_RESPONSE"); if (this.mode === "oversize")
        throw new AppError("DOWNLOAD_TOO_LARGE"); if (this.mode === "ssrf")
        throw new AppError("SSRF_BLOCKED"); if (this.mode === "decode")
        throw new AppError("IMAGE_DECODE_FAILED"); return this.image; }
}
export function classifyProviderError(e) { const code = e instanceof AppError ? e.code : "", allowed = ["AUTHENTICATION_FAILED", "INVALID_PROVIDER_REQUEST", "SAFETY_REJECTED", "NETWORK_FAILED", "TIMED_OUT", "STOPPED", "UNKNOWN_RESPONSE", "DOWNLOAD_TOO_LARGE", "SSRF_BLOCKED", "IMAGE_DECODE_FAILED", "POST_PROCESSING_FAILED"]; if (allowed.includes(code))
    return code; return /unsupported image|image format|corrupt.*image|invalid.*image/i.test(e instanceof Error ? e.message : "") ? "IMAGE_DECODE_FAILED" : "NETWORK_FAILED"; }
const ERROR_BODY_LIMIT = 16 * 1024, DETAIL_LIMIT = 240, REQUEST_ID_LIMIT = 128;
export function sanitizeProviderDetail(value) { const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""; if (!text)
    return null; if (/authorization|bearer|api[_ -]?key|access[_ -]?token|base64|b64_json|inlineData|data:image/i.test(text))
    return null; const redacted = text.replace(/\b(?:sk|key|token)-[A-Za-z0-9._-]+\b/gi, "[redacted]").replace(/[A-Za-z0-9+/=_-]{49,}/g, "[redacted]"); return redacted.slice(0, DETAIL_LIMIT); }
export function sanitizeRequestId(value) { const text = typeof value === "string" ? value.trim() : ""; return text && text.length <= REQUEST_ID_LIMIT && /^[A-Za-z0-9._:-]+$/.test(text) ? text : null; }
function diagnosticValue(value) { if (!value || typeof value !== "object")
    return null; const root = value, nested = root.error && typeof root.error === "object" ? root.error : null, code = nested?.code ?? root.code, message = nested?.message ?? root.message ?? root.detail; const safeCode = typeof code === "string" && /^[A-Za-z0-9_.:-]{1,64}$/.test(code) ? code : null, safeMessage = sanitizeProviderDetail(message); return [safeCode, safeMessage].filter(Boolean).join(": ") || null; }
async function boundedErrorBody(response) { const declared = Number(response.headers.get("content-length") || 0); if (declared > ERROR_BODY_LIMIT || !response.body)
    return null; const reader = response.body.getReader(), chunks = []; let total = 0; try {
    for (;;) {
        const { done, value } = await reader.read();
        if (done)
            break;
        if (value) {
            total += value.length;
            if (total > ERROR_BODY_LIMIT) {
                await reader.cancel();
                return null;
            }
            chunks.push(value);
        }
    }
}
catch {
    return null;
} const text = new TextDecoder().decode(Buffer.concat(chunks.map(chunk => Buffer.from(chunk)))); try {
    return diagnosticValue(JSON.parse(text));
}
catch {
    return sanitizeProviderDetail(text);
} }
async function providerDiagnostic(response) { const failureDetail = await boundedErrorBody(response), requestId = sanitizeRequestId(response.headers.get("x-request-id") || response.headers.get("request-id") || response.headers.get("x-correlation-id")); return { failureDetail, requestId }; }
function blocked(ip) { if (ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd"))
    return true; const p = ip.split(".").map(Number); return p.length === 4 && (p[0] === 10 || p[0] === 127 || p[0] === 0 || p[0] === 169 && p[1] === 254 || p[0] === 192 && p[1] === 168 || p[0] === 172 && (p[1] ?? 0) >= 16 && (p[1] ?? 0) <= 31); }
export async function assertSafeUrl(raw, resolver = lookup) { const u = new URL(raw); if (u.protocol !== "https:" || u.username || u.password || u.port)
    throw new AppError("SSRF_BLOCKED"); const addresses = isIP(u.hostname) ? [{ address: u.hostname }] : await resolver(u.hostname, { all: true }); if (addresses.some(x => blocked(x.address)))
    throw new AppError("SSRF_BLOCKED"); return u; }
export class DisabledHiModelsProvider {
    async generate(_request, _signal) { throw new AppError("REAL_PROVIDER_DISABLED"); }
}
export class HiModelsProvider {
    keys;
    fetcher;
    constructor(keys, fetcher) {
        this.keys = keys;
        this.fetcher = fetcher;
    }
    async generate(request, signal) { const key = await this.keys.read(); if (!key)
        throw new AppError("AUTHENTICATION_FAILED"); let response; try {
        response = await this.fetcher("https://api.himodels.ai/v1/images/edits", { method: "POST", headers: { Authorization: key }, body: buildMultipart(request), signal });
    }
    catch {
        if (signal.aborted)
            throw new AppError("TIMED_OUT");
        throw new AppError("NETWORK_FAILED");
    } if (response.status === 401 || response.status === 403)
        throw Object.assign(new AppError("AUTHENTICATION_FAILED"), { status: response.status }); if (response.status === 400) {
        const diagnostic = await providerDiagnostic(response);
        throw Object.assign(new AppError("INVALID_PROVIDER_REQUEST"), { status: 400, ...diagnostic });
    } if (!response.ok)
        throw Object.assign(new AppError("NETWORK_FAILED"), { status: response.status }); let parsed; try {
        parsed = parseProviderJson(await response.json());
    }
    catch (e) {
        if (e instanceof AppError)
            throw e;
        throw new AppError("UNKNOWN_RESPONSE");
    } if (parsed.kind === "inline")
        return parsed.data; const fetchWithSignal = (resource, init) => this.fetcher(resource, { ...init, signal }); return boundedDownload(parsed.url, fetchWithSignal); }
}
function providerImageType(image) { if (image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return { mime: "image/png", extension: "png" }; if (image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff)
    return { mime: "image/jpeg", extension: "jpg" }; if (image.subarray(0, 4).toString() === "RIFF" && image.subarray(8, 12).toString() === "WEBP")
    return { mime: "image/webp", extension: "webp" }; throw new AppError("IMAGE_DECODE_FAILED"); }
export function buildMultipart(request) { const form = new FormData(), type = providerImageType(request.image); form.set("model", "gpt-image-2"); form.set("quality", "low"); form.set("size", request.size); form.set("prompt", request.prompt); form.set("image", new Blob([new Uint8Array(request.image)], { type: type.mime }), `source.${type.extension}`); return form; }
export function parseProviderJson(value) { const row = value?.data?.[0]; if (row?.b64_json) {
    const data = Buffer.from(row.b64_json, "base64");
    if (!data.length)
        throw new AppError("UNKNOWN_RESPONSE");
    return { kind: "inline", data };
} if (row?.url)
    return { kind: "url", url: row.url }; throw new AppError("UNKNOWN_RESPONSE"); }
export async function boundedDownload(raw, fetcher, maxBytes = 20 * 1024 * 1024, resolver = lookup) { let url = await assertSafeUrl(raw, resolver); for (let redirects = 0; redirects <= 2; redirects++) {
    const res = await fetcher(url, { redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get("location");
        if (!next)
            throw new AppError("UNKNOWN_RESPONSE");
        url = await assertSafeUrl(new URL(next, url).toString(), resolver);
        continue;
    }
    if (!res.ok || !res.body)
        throw new AppError("NETWORK_FAILED");
    const length = Number(res.headers.get("content-length") || 0);
    if (length > maxBytes)
        throw new AppError("DOWNLOAD_TOO_LARGE");
    const chunks = [];
    let total = 0;
    for await (const chunk of res.body) {
        total += chunk.length;
        if (total > maxBytes)
            throw new AppError("DOWNLOAD_TOO_LARGE");
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
} throw new AppError("SSRF_BLOCKED"); }
