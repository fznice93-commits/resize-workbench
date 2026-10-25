export type Route = "Square" | "Landscape" | "LandscapeSafe" | "Banner" | "Portrait" | "PortraitSafe220";
export type TargetProfile = "aha" | "mb" | "ps-opening" | "ps-banner" | "ip-msg" | "other";
export type JobStatus = "DRAFT"|"READY_FOR_CONFIRMATION"|"QUEUED"|"GENERATING"|"POST_PROCESSING"|"COMPLETE"|"FAILED"|"STOPPED"|"INTERRUPTED"|"DELETED"|"FILES_PURGED";
export type AttemptStatus = "CREATED"|"RUNNING"|"SUCCEEDED"|"FAILED"|"STOPPED"|"TIMED_OUT"|"INTERRUPTED"|"SUPERSEDED";
export type FailureClass = "AUTHENTICATION_FAILED"|"INVALID_PROVIDER_REQUEST"|"SAFETY_REJECTED"|"NETWORK_FAILED"|"TIMED_OUT"|"STOPPED"|"UNKNOWN_RESPONSE"|"DOWNLOAD_TOO_LARGE"|"SSRF_BLOCKED"|"IMAGE_DECODE_FAILED"|"POST_PROCESSING_FAILED";
export interface SizePlan { route: Route; requestWidth: number; requestHeight: number; postprocess: "SCALE"|"CENTER_CROP_SCALE"|"SAFE_AREA_PRESERVE"; verified: true }
export interface PublicKeyState { configured: boolean; updatedAt?: string }
