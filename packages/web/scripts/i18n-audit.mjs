import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const localesRoot = path.join(webRoot, "public", "locales");
const srcRoot = path.join(webRoot, "src");
const languages = ["zh-CN", "zh-TW", "en-US"];

function flatten(value, prefix = "", out = new Set()) {
	for (const [key, child] of Object.entries(value)) {
		const full = prefix ? `${prefix}.${key}` : key;
		if (child && typeof child === "object" && !Array.isArray(child)) {
			flatten(child, full, out);
		} else {
			out.add(full);
		}
	}
	return out;
}

function walk(dir, files = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, files);
		else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(full);
	}
	return files;
}

const localeKeys = new Map();
for (const lang of languages) {
	const file = path.join(localesRoot, lang, "translation.json");
	const json = JSON.parse(fs.readFileSync(file, "utf8"));
	localeKeys.set(lang, flatten(json));
}

const canonical = localeKeys.get("zh-CN");
let failed = false;
for (const lang of languages.slice(1)) {
	const keys = localeKeys.get(lang);
	const missing = [...canonical].filter((key) => !keys.has(key));
	const extra = [...keys].filter((key) => !canonical.has(key));
	if (missing.length) {
		failed = true;
		console.error(`[i18n] ${lang} is missing ${missing.length} key(s):\n${missing.join("\n")}`);
	}
	if (extra.length) {
		console.warn(`[i18n] ${lang} has ${extra.length} extra key(s):\n${extra.join("\n")}`);
	}
}

const literalKeys = new Map();
const callPattern = /(?:\bt|\bi18n\.t)\(\s*["'`]([^"'`$]+)["'`]/g;
for (const file of walk(srcRoot)) {
	const source = fs.readFileSync(file, "utf8");
	for (const match of source.matchAll(callPattern)) {
		const key = match[1];
		if (!literalKeys.has(key)) literalKeys.set(key, []);
		literalKeys.get(key).push(path.relative(webRoot, file));
	}
}

for (const [key, files] of literalKeys) {
	for (const lang of languages) {
		if (!localeKeys.get(lang).has(key)) {
			failed = true;
			console.error(`[i18n] literal key "${key}" used by ${files[0]} is missing from ${lang}`);
		}
	}
}

if (failed) process.exit(1);
console.log(`[i18n] OK: ${canonical.size} canonical keys, ${literalKeys.size} literal source references checked across ${languages.join(", ")}.`);
