import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".html"]);
const rules = [
	{
		name: "external-runtime-url",
		pattern: /https?:\/\/[^\s\"'`)]+/g,
	},
	{
		name: "device-detection",
		pattern: /react-device-detect|\bisMobileOnly\b|\bisDesktop\b|navigator\.userAgent/g,
	},
	{
		name: "direct-web-storage",
		pattern: /\b(?:localStorage|sessionStorage)\b/g,
	},
	{
		name: "hidden-editor-mode",
		pattern: /setMode\(["']edit["']\)|getModeValueSnapshot\(\)\s*===\s*["']edit["']/g,
	},
	{
		name: "viewport-height",
		pattern: /\b100vh\b|\bh-screen\b/g,
	},
	{
		name: "todo-fixme",
		pattern: /\b(?:TODO|FIXME|HACK)\b/gi,
	},
];

function walk(dir) {
	const out = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(full));
		else if (extensions.has(path.extname(entry.name))) out.push(full);
	}
	return out;
}

const findings = [];
for (const file of walk(root)) {
	const text = fs.readFileSync(file, "utf8");
	const lines = text.split(/\r?\n/);
	for (let i = 0; i < lines.length; i += 1) {
		for (const rule of rules) {
			rule.pattern.lastIndex = 0;
			const matches = [...lines[i].matchAll(rule.pattern)];
			for (const match of matches) {
				findings.push({
					rule: rule.name,
					file: path.relative(process.cwd(), file),
					line: i + 1,
					match: match[0],
					text: lines[i].trim().slice(0, 220),
				});
			}
		}
	}
}

const grouped = findings.reduce((acc, item) => {
	(acc[item.rule] ??= []).push(item);
	return acc;
}, {});

console.log("\n[runtime-audit] static runtime risk inventory");
for (const rule of rules) {
	const items = grouped[rule.name] ?? [];
	console.log(`\n## ${rule.name}: ${items.length}`);
	for (const item of items.slice(0, 80)) {
		console.log(`${item.file}:${item.line} | ${item.match} | ${item.text}`);
	}
	if (items.length > 80) console.log(`... ${items.length - 80} more`);
}

const reportDir = path.resolve("test-results");
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
	path.join(reportDir, "static-runtime-audit.json"),
	JSON.stringify(findings, null, 2),
);

const riskyExternal = findings.filter(
	(item) =>
		item.rule === "external-runtime-url" && /cdn-fakeworld\.azureedge\.net/i.test(item.match),
);
if (riskyExternal.length) {
	console.error(
		`\n[runtime-audit] FAIL: ${riskyExternal.length} bundled/default runtime assets still depend on cdn-fakeworld.`,
	);
	process.exitCode = 1;
} else {
	console.log("\n[runtime-audit] PASS: no cdn-fakeworld runtime dependency remains in src.");
}
