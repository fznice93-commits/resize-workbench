import{MacKeychain,MemoryKeychain,type KeychainAdapter}from"./keychain.js";
export type KeyStorageMode="MEMORY_DEMO"|"MACOS_KEYCHAIN";
export interface KeychainFactories{memory:()=>KeychainAdapter;mac:()=>KeychainAdapter}
const defaults:KeychainFactories={memory:()=>new MemoryKeychain(),mac:()=>new MacKeychain()};
export function selectKeychain(env:Record<string,string|undefined>,factories:KeychainFactories=defaults):{adapter:KeychainAdapter;mode:KeyStorageMode}{const productionAuthorized=env.RESIZE_ENABLE_PRODUCTION_KEYCHAIN==="EXPLICITLY_AUTHORIZED",nonDemo=env.RESIZE_RUN_MODE==="PRODUCTION";if(productionAuthorized&&nonDemo)return{adapter:factories.mac(),mode:"MACOS_KEYCHAIN"};return{adapter:factories.memory(),mode:"MEMORY_DEMO"}}
