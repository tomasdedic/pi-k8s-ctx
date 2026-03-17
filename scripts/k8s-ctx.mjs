#!/usr/bin/env node

import { readdir, readFile, writeFile, access } from "node:fs/promises";
import { join, basename } from "node:path";
import { homedir } from "node:os";

// Default paths
const DEFAULT_CONFIG_DIR = join(homedir(), ".kube", "confignopass");
const DEFAULT_TMP_FILE = join(homedir(), "tmp", "kube");
const CONFIG_FILE = join(homedir(), ".pi", "k8s-ctx.json");

/**
 * Load configuration
 */
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
	} catch {
		// No config file, use defaults
		return {
			configDir: DEFAULT_CONFIG_DIR,
			tmpFile: DEFAULT_TMP_FILE,
		};
	}
}

/**
 * List all available Kubernetes configs
 */
async function listConfigs() {
	const config = await loadConfig();
	const pathToConfig = config.configDir;

	try {
		const files = await readdir(pathToConfig);
		const configs = files
			.filter((f) => f.endsWith("-config"))
			.map((f) => f.replace(/-config$/, ""))
			.sort();

		if (configs.length === 0) {
			console.log("No configs found in", pathToConfig);
			return;
		}

		const current = await getCurrentConfig();
		console.log("Available Kubernetes configs:\n");
		configs.forEach((name) => {
			const marker = current === name ? "* " : "  ";
			console.log(`${marker}${name}`);
		});
	} catch (err) {
		console.error("Error listing configs:", err.message);
		console.error("Config directory:", pathToConfig);
		process.exit(1);
	}
}

/**
 * Get the currently active config name
 */
async function getCurrentConfig() {
	const config = await loadConfig();
	try {
		const content = await readFile(config.tmpFile, "utf-8");
		const match = content.match(/KUBECONFIG=.*\/([^/]+)-config/);
		return match ? match[1] : null;
	} catch {
		return null;
	}
}

/**
 * Show the current config
 */
async function showCurrent() {
	const current = await getCurrentConfig();
	const config = await loadConfig();
	
	if (current) {
		console.log(`Current config: ${current}`);
		console.log(`KUBECONFIG=${config.configDir}/${current}-config`);
	} else {
		console.log("No config currently set");
	}
}

/**
 * Switch to a specific config
 */
async function switchConfig(name) {
	if (!name) {
		console.error("Error: config name required");
		console.log("Usage: k8s-ctx.mjs switch <config-name>");
		process.exit(1);
	}

	const config = await loadConfig();
	const configFile = `${name}-config`;
	const configPath = join(config.configDir, configFile);

	try {
		// Check if config exists
		await access(configPath);

		// Write to tmp file
		const content = `export KUBECONFIG=${configPath}\n`;
		await writeFile(config.tmpFile, content);

		console.log(`Switched to: ${name}`);
		console.log(`KUBECONFIG=${configPath}`);
		console.log(
			`\nNote: To apply in your shell, run: source ${config.tmpFile}`,
		);
	} catch (err) {
		if (err.code === "ENOENT") {
			console.error(`Error: config '${name}' not found in ${config.configDir}`);
			console.log("\nRun 'k8s-ctx.mjs list' to see available configs");
		} else {
			console.error("Error switching config:", err.message);
		}
		process.exit(1);
	}
}

/**
 * Get the path for a specific config
 */
async function getConfigPath(name) {
	if (!name) {
		console.error("Error: config name required");
		process.exit(1);
	}

	const config = await loadConfig();
	const configFile = `${name}-config`;
	const configPath = join(config.configDir, configFile);

	try {
		await access(configPath);
		console.log(configPath);
	} catch (err) {
		if (err.code === "ENOENT") {
			console.error(`Error: config '${name}' not found`);
			process.exit(1);
		}
		throw err;
	}
}

/**
 * Show or update configuration
 */
async function showConfig() {
	const config = await loadConfig();
	console.log("Current configuration:");
	console.log(`  Config directory: ${config.configDir}`);
	console.log(`  Temp file:        ${config.tmpFile}`);
	console.log();
	console.log("Configuration sources (in priority order):");
	console.log("  1. Environment variables:");
	console.log("     K8S_CTX_CONFIG_DIR or KUBECONFIG_DIR");
	console.log("     K8S_CTX_TMP_FILE");
	console.log(`  2. Config file: ${CONFIG_FILE}`);
	console.log("  3. Defaults:");
	console.log(`     ${DEFAULT_CONFIG_DIR}`);
	console.log(`     ${DEFAULT_TMP_FILE}`);
}

/**
 * Initialize config file
 */
async function initConfig(configDir, tmpFile) {
	const config = {
		configDir: configDir || DEFAULT_CONFIG_DIR,
		tmpFile: tmpFile || DEFAULT_TMP_FILE,
	};

	await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
	console.log(`Config file created: ${CONFIG_FILE}`);
	console.log(JSON.stringify(config, null, 2));
}

// Main CLI
const command = process.argv[2];
const arg = process.argv[3];
const arg2 = process.argv[4];

switch (command) {
	case "list":
		await listConfigs();
		break;
	case "current":
		await showCurrent();
		break;
	case "switch":
		await switchConfig(arg);
		break;
	case "path":
		await getConfigPath(arg);
		break;
	case "config":
		await showConfig();
		break;
	case "init":
		await initConfig(arg, arg2);
		break;
	default:
		console.log(`Kubernetes Context Switcher for Pi

Usage:
  k8s-ctx.mjs list              List all available configs
  k8s-ctx.mjs current           Show current active config  
  k8s-ctx.mjs switch <name>     Switch to a config
  k8s-ctx.mjs path <name>       Get full path to a config
  k8s-ctx.mjs config            Show current configuration
  k8s-ctx.mjs init [dir] [tmp]  Create config file

Configuration:
  Set K8S_CTX_CONFIG_DIR env var to override config directory
  Or create ${CONFIG_FILE} with:
  {
    "configDir": "/path/to/your/kubeconfigs",
    "tmpFile": "/path/to/output/file"
  }

Examples:
  k8s-ctx.mjs list
  k8s-ctx.mjs switch lab1
  k8s-ctx.mjs current
  k8s-ctx.mjs config
  k8s-ctx.mjs init ~/.kube/configs
`);
		process.exit(command ? 1 : 0);
}
