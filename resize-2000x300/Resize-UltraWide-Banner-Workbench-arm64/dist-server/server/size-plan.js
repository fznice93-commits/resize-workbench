import { AppError } from "./errors.js";
const gcd = (a, b) => b ? gcd(b, a % b) : a;
export const TARGET_PROFILES = Object.freeze(["aha", "mb", "ps-opening", "ps-banner", "ip-msg", "other"]);
export function normalizeProfile(value) { const profile = String(value || "other"); if (!TARGET_PROFILES.includes(profile))
    throw new AppError("TARGET_PROFILE_REJECTED"); return profile; }
export function planSize(width, height, profile = "other") {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width > 12000 || height > 12000 || width * height > 50_000_000)
        throw new AppError("INVALID_TARGET_SIZE");
    let route = width === height ? "Square" : width > height ? "Landscape" : "Portrait";
    const d = gcd(width, height), ratio = `${width / d}:${height / d}`;
    let request, postprocess = "SCALE";
    if (ratio === "1:1")
        request = [1024, 1024];
    else if (ratio === "16:9") {
        request = [1280, 720];
        if (width === 1280 && height === 720 && profile === "ip-msg") {
            route = "LandscapeSafe";
            postprocess = "SAFE_AREA_PRESERVE";
        }
    }
    else if (ratio === "9:16")
        request = [720, 1280];
    else if (ratio === "3:2")
        request = [1200, 800];
    else if (ratio === "9:20") {
        request = [720, 1600];
        route = "PortraitSafe220";
        postprocess = "SAFE_AREA_PRESERVE";
    }
    else if (width === 300 && height === 400)
        request = [768, 1024];
    else if (width === 985 && height === 403) {
        request = [1568, 640];
        postprocess = "CENTER_CROP_SCALE";
    }
    else if (width === 730 && height === 300) {
        request = [1520, 624];
        postprocess = "CENTER_CROP_SCALE";
    }
    else if (width === 780 && height === 470)
        request = [1248, 752];
    else if (width === 720 && height === 1010)
        request = [768, 1024];
    else if (width === 720 && height === 1376)
        request = [720, 1280];
    else if (width === 720 && height === 1456)
        request = [720, 1600];
    else if (width === 1080 && height === 2115)
        request = [720, 1600];
    else if (width === 800 && height === 450)
        request = [1280, 720];
    else if (width === 900 && height === 900)
        request = [1024, 1024];
    else if (width === 2000 && height === 300) {
        request = profile === "ps-opening" ? [3072, 384] : [2000, 300];
        route = profile === "ps-opening" ? "BannerFlash8" : "Banner";
        postprocess = profile === "aha" ? "SAFE_AREA_PRESERVE" : profile === "ps-opening" ? "CENTER_CROP_20_3_SCALE" : "CENTER_CROP_SCALE";
    }
    if (!request)
        throw new AppError("UNVERIFIED_TARGET_SIZE");
    return { route, requestWidth: request[0], requestHeight: request[1], postprocess, verified: true };
}
