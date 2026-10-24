import { createHash } from "node:crypto";
export const BUILD_ID = "ULTRAWIDE-001";
export const POLICY = Object.freeze({ providerEnabled: true, endpoint: "https://api.himodels.ai/v1/images", model: "user-selected", models: ["gpt-image-2", "gemini-3.1-flash-lite-image", "gemini-3.1-flash-image", "gemini-3-pro-image"], quality: "low", bindHost: "127.0.0.1", providerDeadlineMs: 240_000, postprocessDeadlineMs: 60_000, maxUploadBytes: 5 * 1024 * 1024, maxEdge: 12_000, maxPixels: 50_000_000, historyLimit: 20, purgeAfterMs: 24 * 60 * 60 * 1000 });
export const POLICY_HASH = createHash("sha256").update(JSON.stringify(POLICY)).digest("hex");
