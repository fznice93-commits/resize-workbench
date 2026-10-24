import { MacKeychain, MemoryKeychain } from "./keychain.js";
const defaults = { memory: () => new MemoryKeychain(), mac: () => new MacKeychain() };
export function selectKeychain(env, factories = defaults) { const productionAuthorized = env.RESIZE_ENABLE_PRODUCTION_KEYCHAIN === "EXPLICITLY_AUTHORIZED", nonDemo = env.RESIZE_RUN_MODE === "PRODUCTION"; if (productionAuthorized && nonDemo)
    return { adapter: factories.mac(), mode: "MACOS_KEYCHAIN" }; return { adapter: factories.memory(), mode: "MEMORY_DEMO" }; }
