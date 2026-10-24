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
export function classifyProviderError(e) { const code = e instanceof AppError ? e.code : "", allowed = ["AUTHENTICATION_FAILED", "INVALID_PROVIDER_REQUEST", "SAFETY_REJECTED", "NETWORK_FAILED", "TIMED_OUT", "STOPPED", "UNKNOWN_RESPONSE", "DOWNLOAD_TOO_LARGE", "SSRF_BLOCKED", "IMAGE_DECODE_FAILED", "EDGE_CONTENT_DETECTED", "CRITICAL_TEXT_MISMATCH", "CRITICAL_TEXT_MISSING", "CRITICAL_TEXT_DUPLICATED", "OCR_VALIDATION_FAILED", "POST_PROCESSING_FAILED"]; if (allowed.includes(code))
    return code; return /unsupported image|image format|corrupt.*image|invalid.*image/i.test(e instanceof Error ? e.message : "") ? "IMAGE_DECODE_FAILED" : "NETWORK_FAILED"; }
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
        throw new AppError("AUTHENTICATION_FAILED"); const model = request.model || "gpt-image-2", gemini = model.startsWith("gemini-"); let response; try {
        response = await this.fetcher(gemini ? "https://api.himodels.ai/v1/images/generations" : "https://api.himodels.ai/v1/images/edits", { method: "POST", headers: gemini ? { Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}`, "Content-Type": "application/json" } : { Authorization: key }, body: gemini ? JSON.stringify(buildGeminiBody({ ...request, model })) : buildMultipart({ ...request, model }), signal });
    }
    catch {
        if (signal.aborted)
            throw new AppError("TIMED_OUT");
        throw new AppError("NETWORK_FAILED");
    } if (response.status === 401 || response.status === 403)
        throw new AppError("AUTHENTICATION_FAILED"); if (response.status === 400)
        throw new AppError("INVALID_PROVIDER_REQUEST"); if (!response.ok)
        throw new AppError("NETWORK_FAILED"); let parsed; try {
        parsed = parseProviderJson(await response.json());
    }
    catch (e) {
        if (e instanceof AppError)
            throw e;
        throw new AppError("UNKNOWN_RESPONSE");
    } if (parsed.kind === "inline")
        return parsed.data; const fetchWithSignal = (resource, init) => this.fetcher(resource, { ...init, signal }); return boundedDownload(parsed.url, fetchWithSignal); }
}
export function buildMultipart(request) { const form = new FormData(); form.set("model", "gpt-image-2"); form.set("quality", "low"); form.set("size", request.size); form.set("prompt", request.prompt); form.set("output_format", "png"); form.set("output_compression", "100"); form.set("image", new Blob([new Uint8Array(request.image)], { type: request.mimeType || "image/png" }), "source-image"); return form; }
export function buildGeminiBody(request) { const imageConfig = request.model === "gemini-3.1-flash-image" ? { aspectRatio: "8:1", imageSize: "1K" } : { aspectRatio: "20:3", imageSize: "2K" }; return { model: request.model, contents: [{ role: "user", parts: [{ text: request.prompt }, { inlineData: { mimeType: request.mimeType || "image/png", data: request.image.toString("base64") } }] }], generationConfig: { responseModalities: ["IMAGE"], thinkingConfig: { thinkingLevel: "HIGH", includeThoughts: false }, imageConfig } }; }
export function parseProviderJson(value) { const row = value?.data?.[0]; if (row?.b64_json) {
    const data = Buffer.from(row.b64_json, "base64");
    if (!data.length)
        throw new AppError("UNKNOWN_RESPONSE");
    return { kind: "inline", data };
} if (row?.url)
    return { kind: "url", url: row.url }; const parts = value?.candidates?.[0]?.content?.parts || []; const encoded = parts.find(part => part.inlineData?.data)?.inlineData?.data; if (encoded) {
    const data = Buffer.from(encoded, "base64");
    if (!data.length)
        throw new AppError("UNKNOWN_RESPONSE");
    return { kind: "inline", data };
} throw new AppError("UNKNOWN_RESPONSE"); }
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
