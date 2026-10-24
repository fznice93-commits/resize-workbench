import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { openDatabase, recoverInterrupted } from "./db.js";
import { disabledProviderFactory, LocalRuntime, makeFakeProviderFactory } from "./runtime.js";
import { createIntegratedServer } from "./integrated-server.js";
import { acquireLock } from "./single-instance.js";
import { BUILD_ID, POLICY, POLICY_HASH } from "../shared/policy.js";
import { AppError } from "./errors.js";
import { assertPromptGate } from "./prompt-gate.js";
import { selectKeychain } from "./keychain-policy.js";
import { assertProductionProviderGates, createProductionProvider } from "./provider-factory.js";
const namespace = process.env.RESIZE_DATA_NAMESPACE, appFolder = namespace === "KEY_SETUP" ? "Resize Product Workbench Key Setup" : namespace === "PRODUCTION_PREVIEW" ? "Resize Product Workbench Production Preview" : namespace === "PRODUCTION" ? "Resize Product Workbench Production" : "Resize Product Workbench", root = resolve(process.env.RESIZE_APP_DATA_ROOT || join(homedir(), "Library/Application Support", appFolder)), dist = resolve(process.env.RESIZE_CLIENT_DIST || "dist-client"), openBrowser = (port) => { if (process.env.RESIZE_NO_OPEN !== "1")
    spawn("/usr/bin/open", [`http://127.0.0.1:${port}/`], { stdio: "ignore", detached: true }).unref(); }, healthy = async (old) => { try {
    const response = await fetch(`http://127.0.0.1:${old.port}/api/health`, { headers: { "x-instance-token": old.token }, signal: AbortSignal.timeout(1200) }), value = await response.json();
    return response.ok && value.buildId === BUILD_ID && value.policyHash === POLICY_HASH;
}
catch {
    return false;
} };
await assertPromptGate();
const prompts = JSON.parse(await readFile(resolve("src/server/assets/prompts.json"), "utf8")).bodies, keySetupOnly = process.env.RESIZE_KEY_SETUP_ONLY === "1", productMode = process.env.RESIZE_PRODUCT_MODE === "PRODUCTION" ? "PRODUCTION" : process.env.RESIZE_PRODUCT_MODE === "PRODUCTION_PREVIEW" ? "PRODUCTION_PREVIEW" : keySetupOnly ? "KEY_SETUP" : "DEMO", facts = { promptGate: true, buildId: BUILD_ID, policyHash: POLICY_HASH, providerPolicyEnabled: POLICY.providerEnabled };
if (productMode === "PRODUCTION") {
    if (process.env.RESIZE_PRODUCT_MODE !== "PRODUCTION")
        throw new AppError("REAL_PROVIDER_DISABLED");
    assertProductionProviderGates(process.env, facts);
}
try {
    const old = JSON.parse(await readFile(join(root, "run", "instance.lock"), "utf8"));
    if (await healthy(old)) {
        openBrowser(old.port);
        process.exit(0);
    }
}
catch { }
const token = randomBytes(32).toString("hex");
mkdirSync(root, { recursive: true, mode: 0o700 });
const db = openDatabase(join(root, "metadata.sqlite"));
recoverInterrupted(db);
const keySelection = selectKeychain(process.env), providerFactory = productMode === "PRODUCTION" ? () => createProductionProvider(process.env, facts, { keychain: keySelection.adapter, fetcher: fetch }) : productMode === "DEMO" || productMode === "PRODUCTION_PREVIEW" ? makeFakeProviderFactory() : disabledProviderFactory, runtime = new LocalRuntime(db, root, keySelection.adapter, providerFactory, prompts);
await runtime.initialize();
let lock;
const server = createIntegratedServer(runtime, { instanceToken: token, distDir: dist, keyStorageMode: keySelection.mode, keySetupOnly, productMode, onShutdown: async () => { server.close(); await lock?.release(); db.close(); } });
await new Promise((ok, fail) => server.once("error", fail).listen(0, "127.0.0.1", ok));
const port = server.address().port;
try {
    lock = await acquireLock(root, port, BUILD_ID, async (old) => { if (await healthy(old)) {
        openBrowser(old.port);
        return true;
    } return false; }, token);
}
catch (error) {
    server.close();
    db.close();
    if (error instanceof AppError && error.code === "INSTANCE_ALREADY_RUNNING")
        process.exit(0);
    throw error;
}
process.once("SIGTERM", async () => { server.close(); await lock?.release(); db.close(); });
openBrowser(port);
console.log(JSON.stringify({ status: "READY", host: "127.0.0.1", port, buildId: BUILD_ID, policyHash: POLICY_HASH, promptGate: "PASS", keyStorageMode: keySelection.mode, keySetupOnly, productMode, providerPolicy: productMode === "PRODUCTION" ? "enabled" : "disabled" }));
