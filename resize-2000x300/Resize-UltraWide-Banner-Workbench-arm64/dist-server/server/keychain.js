import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { userInfo } from "node:os";
import { AppError } from "./errors.js";
const run = promisify(execFile), service = "com.resize-ultrawide-banner-workbench.himodels";
export class MemoryKeychain {
    #key = null;
    async status() { return { configured: this.#key !== null }; }
    async read() { return this.#key; }
    async save(k) { if (!k || k.length > 4096)
        throw new AppError("INVALID_KEY"); this.#key = k; }
    async delete() { this.#key = null; }
}
export class MacKeychain {
    keyService;
    account;
    constructor(keyService = service, account = userInfo().username) {
        this.keyService = keyService;
        this.account = account;
    }
    async exists() { try {
        await run("/usr/bin/security", ["find-generic-password", "-s", this.keyService, "-a", this.account], { shell: false, maxBuffer: 8192 });
        return true;
    }
    catch {
        return false;
    } }
    async status() { return { configured: await this.exists() }; }
    async read() { try {
        return (await run("/usr/bin/security", ["find-generic-password", "-s", this.keyService, "-a", this.account, "-w"], { shell: false, maxBuffer: 8192 })).stdout.trim();
    }
    catch {
        return null;
    } }
    async save(k) { if (!k || k.length > 4096)
        throw new AppError("INVALID_KEY"); await run("/usr/bin/security", ["add-generic-password", "-U", "-s", this.keyService, "-a", this.account, "-w", k], { shell: false, maxBuffer: 8192 }); }
    async delete() { try {
        await run("/usr/bin/security", ["delete-generic-password", "-s", this.keyService, "-a", this.account], { shell: false, maxBuffer: 8192 });
    }
    catch (e) {
        if (await this.exists())
            throw e;
    } }
}
