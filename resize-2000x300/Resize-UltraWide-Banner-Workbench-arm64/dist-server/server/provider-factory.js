import { AppError } from "./errors.js";
import { BUILD_ID, POLICY_HASH } from "../shared/policy.js";
import { HiModelsProvider } from "./provider.js";
export function assertProductionProviderGates(env, facts) { const allowed = env.RESIZE_RUN_MODE === "PRODUCTION" && env.RESIZE_ENABLE_PRODUCTION_KEYCHAIN === "EXPLICITLY_AUTHORIZED" && env.RESIZE_REAL_PROVIDER_ENABLED === "EXPLICITLY_AUTHORIZED" && facts.promptGate && facts.buildId === BUILD_ID && facts.policyHash === POLICY_HASH && facts.providerPolicyEnabled; if (!allowed)
    throw new AppError("REAL_PROVIDER_DISABLED"); }
export function createProductionProvider(env, facts, deps) { assertProductionProviderGates(env, facts); return new HiModelsProvider(deps.keychain, deps.fetcher); }
