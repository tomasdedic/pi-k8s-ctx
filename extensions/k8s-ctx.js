import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCRIPT_PATH = join(__dirname, "..", "scripts", "k8s-ctx.mjs");
const DEFAULT_CONFIG_DIR = join(homedir(), ".kube", "confignopass");
const DEFAULT_TMP_FILE = join(homedir(), "tmp", "kube");
const CONFIG_FILE = join(homedir(), ".pi", "k8s-ctx.json");
async function loadConfig() {
    // Check environment variables first
    const envConfigDir = process.env.K8S_CTX_CONFIG_DIR || process.env.KUBECONFIG_DIR;
    const envTmpFile = process.env.K8S_CTX_TMP_FILE;
    if (envConfigDir || envTmpFile) {
        return {
            configDir: envConfigDir || DEFAULT_CONFIG_DIR,
            tmpFile: envTmpFile || DEFAULT_TMP_FILE,
        };
    }
    // Check config file
    try {
        const raw = await readFile(CONFIG_FILE, "utf-8");
        const config = JSON.parse(raw);
        return {
            configDir: config.configDir || DEFAULT_CONFIG_DIR,
            tmpFile: config.tmpFile || DEFAULT_TMP_FILE,
        };
    }
    catch {
        // No config file, use defaults
        return {
            configDir: DEFAULT_CONFIG_DIR,
            tmpFile: DEFAULT_TMP_FILE,
        };
    }
}
function runScript(args) {
    const result = spawnSync("node", [SCRIPT_PATH, ...args], {
        encoding: "utf8",
        timeout: 10000,
    });
    if (result.error) {
        return {
            ok: false,
            output: "",
            error: result.error.message,
        };
    }
    return {
        ok: result.status === 0,
        output: result.stdout || result.stderr || "",
        error: result.status !== 0 ? result.stderr || "Command failed" : undefined,
    };
}
async function listConfigs() {
    const config = await loadConfig();
    try {
        const files = await readdir(config.configDir);
        return files
            .filter((f) => f.endsWith("-config"))
            .map((f) => f.replace(/-config$/, ""))
            .sort();
    }
    catch {
        return [];
    }
}
async function getCurrentConfig() {
    const config = await loadConfig();
    try {
        const content = await readFile(config.tmpFile, "utf-8");
        const match = content.match(/KUBECONFIG=.*\/([^/]+)-config/);
        return match ? match[1] : null;
    }
    catch {
        return null;
    }
}
async function updateEnvironment() {
    const config = await loadConfig();
    try {
        const content = await readFile(config.tmpFile, "utf-8");
        const match = content.match(/KUBECONFIG=([^\s]+)/);
        if (match) {
            process.env.KUBECONFIG = match[1];
        }
    }
    catch {
        // File doesn't exist or can't be read
    }
}
export default function k8sCtxExtension(pi) {
    // Update KUBECONFIG on extension load
    updateEnvironment();
    pi.registerCommand("ctx", {
        description: "Kubernetes context switcher: /ctx [current|list|switch <name>|config]",
        handler: async (args, ctx) => {
            const parts = args.trim().split(/\s+/);
            const action = parts[0] || "list";
            const name = parts[1];
            // Show configuration
            if (action === "config") {
                const result = runScript(["config"]);
                if (result.ok) {
                    console.log(result.output);
                }
                else {
                    ctx.ui.notify(result.error || "Failed to show config", "error");
                }
                return;
            }
            // Handle different subcommands
            if (action === "current") {
                const result = runScript(["current"]);
                if (result.ok) {
                    const output = result.output.trim();
                    ctx.ui.notify(output, "info");
                    // Extract the context name and add to conversation
                    const match = output.match(/Current config: (\S+)/);
                    if (match) {
                        pi.sendMessage({
                            customType: "k8s-context",
                            content: `Using Kubernetes context: ${match[1]}`,
                            display: true,
                        });
                    }
                }
                else {
                    ctx.ui.notify(result.error || "Failed to get current context", "error");
                }
                return;
            }
            if (action === "list") {
                const result = runScript(["list"]);
                if (result.ok) {
                    console.log(result.output);
                }
                else {
                    ctx.ui.notify(result.error || "Failed to list configs", "error");
                }
                return;
            }
            if (action === "switch") {
                // If name provided, switch directly
                if (name) {
                    const result = runScript(["switch", name]);
                    if (result.ok) {
                        // Update environment for child processes
                        await updateEnvironment();
                        ctx.ui.notify(`Switched to: ${name}`, "info");
                        // Add context switch to conversation history
                        pi.sendMessage({
                            customType: "k8s-context",
                            content: `Switched Kubernetes context to: ${name}`,
                            display: true,
                            details: { cluster: name, action: "switch" },
                        });
                    }
                    else {
                        ctx.ui.notify(result.error || `Failed to switch to ${name}`, "error");
                    }
                    return;
                }
                // Otherwise show interactive picker
                const configs = await listConfigs();
                if (configs.length === 0) {
                    const config = await loadConfig();
                    ctx.ui.notify(`No configs found in ${config.configDir}`, "error");
                    return;
                }
                const current = await getCurrentConfig();
                // Build display list with current marker
                const items = configs.map((name) => (name === current ? `${name} (current)` : name));
                const selected = await ctx.ui.select("Select Kubernetes Context", items);
                if (selected) {
                    // Extract the name (remove the "(current)" suffix if present)
                    const selectedName = selected.replace(/ \(current\)$/, "");
                    const result = runScript(["switch", selectedName]);
                    if (result.ok) {
                        // Update environment for child processes
                        await updateEnvironment();
                        ctx.ui.notify(`Switched to: ${selectedName}`, "info");
                        // Add context switch to conversation history
                        pi.sendMessage({
                            customType: "k8s-context",
                            content: `Switched Kubernetes context to: ${selectedName}`,
                            display: true,
                            details: { cluster: selectedName, action: "switch" },
                        });
                    }
                    else {
                        ctx.ui.notify(result.error || `Failed to switch to ${selectedName}`, "error");
                    }
                }
                return;
            }
            if (action === "path") {
                if (!name) {
                    ctx.ui.notify("Usage: /ctx path <config-name>", "warning");
                    return;
                }
                const result = runScript(["path", name]);
                if (result.ok) {
                    ctx.ui.notify(result.output.trim(), "info");
                }
                else {
                    ctx.ui.notify(result.error || `Failed to get path for ${name}`, "error");
                }
                return;
            }
            // Unknown action or no action - show usage
            ctx.ui.notify("Usage: /ctx [current|list|switch [<name>]|path <name>|config]", "warning");
        },
    });
}
