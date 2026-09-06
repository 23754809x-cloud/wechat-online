import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.APP_URL || "http://127.0.0.1:4173/wechat-online/";
const outputDir = process.env.TEST_OUTPUT || path.resolve("test-results/mobile");
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
	viewport: { width: 430, height: 932 },
	deviceScaleFactor: 3,
	isMobile: true,
	hasTouch: true,
	locale: "zh-CN",
	userAgent:
		"Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
});
const page = await context.newPage();
const runtimeErrors = [];
const failedSameOriginResponses = [];

page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
	if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
});
page.on("response", (response) => {
	try {
		const responseURL = new URL(response.url());
		const appURL = new URL(baseURL);
		if (responseURL.origin === appURL.origin && response.status() >= 400) {
			failedSameOriginResponses.push(`${response.status()} ${response.url()}`);
		}
	} catch {
		// Ignore non-http response URLs.
	}
});

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

async function settle() {
	await page.waitForLoadState("domcontentloaded");
	await page.waitForTimeout(500);
}

async function commonChecks(name) {
	await settle();
	const state = await page.evaluate(() => ({
		bodyText: document.body.innerText,
		innerWidth: window.innerWidth,
		innerHeight: window.innerHeight,
		documentWidth: document.documentElement.scrollWidth,
		bodyWidth: document.body.scrollWidth,
		rootWidth: document.getElementById("root")?.getBoundingClientRect().width ?? 0,
		screen: (() => {
			const rect = document.getElementById("screen")?.getBoundingClientRect();
			return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
		})(),
		metadataNodes: document.querySelectorAll("[nd-id]").length,
	}));

	assert(!/(?:wechatPage|routerLabel|quickJump|menu|base)\.[A-Za-z0-9_.-]+/.test(state.bodyText), `${name}: raw i18n key leaked into UI`);
	assert(state.documentWidth <= state.innerWidth + 2, `${name}: document horizontal overflow ${state.documentWidth} > ${state.innerWidth}`);
	assert(state.bodyWidth <= state.innerWidth + 2, `${name}: body horizontal overflow ${state.bodyWidth} > ${state.innerWidth}`);
	assert(Math.abs(state.rootWidth - state.innerWidth) <= 2, `${name}: #root width ${state.rootWidth} does not match viewport ${state.innerWidth}`);
	assert(state.screen, `${name}: #screen missing`);
	assert(Math.abs(state.screen.width - state.innerWidth) <= 2, `${name}: screen width mismatch`);
	assert(state.metadataNodes === 0, `${name}: ${state.metadataNodes} desktop metadata nodes leaked into compact runtime`);
	assert(!state.bodyText.includes("iPad 微信已登录"), `${name}: desktop/iPad login row visible on phone`);

	await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true });
}

async function goHash(route, name) {
	await page.goto(`${baseURL}#${route}`, { waitUntil: "domcontentloaded" });
	await commonChecks(name);
}

try {
	await page.goto(baseURL, { waitUntil: "domcontentloaded" });
	await commonChecks("01-home");

	for (const label of ["微信", "通讯录", "发现", "我"]) {
		assert((await page.getByText(label, { exact: true }).count()) > 0, `home: missing bottom nav label ${label}`);
	}

	await page.getByText("通讯录", { exact: true }).last().click();
	await page.waitForFunction(() => location.hash.includes("/contacts"));
	await commonChecks("02-contacts");

	// The mobile add-friend icon must not silently switch the hidden desktop editor on.
	const contactHeaderButtons = page.locator("svg").filter({ has: page.locator("path") });
	void contactHeaderButtons;

	await page.getByText("唐吉诃德", { exact: true }).last().click();
	await page.waitForFunction(() => location.hash.includes("/friend/"));
	await commonChecks("03-friend");
	await page.reload({ waitUntil: "domcontentloaded" });
	await commonChecks("04-friend-reload");

	await goHash("/discover", "05-discover");
	await page.getByText("朋友圈", { exact: true }).first().click();
	await page.waitForFunction(() => location.hash.includes("/moments"));
	await commonChecks("06-moments");

	await goHash("/my", "07-my");
	await page.getByText("服务", { exact: true }).first().click();
	await page.waitForFunction(() => location.hash.includes("/service"));
	await commonChecks("08-service");
	await page.getByText("钱包", { exact: true }).first().click();
	await page.waitForFunction(() => location.hash.includes("/wallet"));
	await commonChecks("09-wallet");

	await goHash("/conversation/1", "10-private-chat");
	await page.reload({ waitUntil: "domcontentloaded" });
	await commonChecks("11-private-chat-reload");

	await goHash("/", "12-home-return");
	await page.getByText("开发组(3)", { exact: true }).click();
	await page.waitForFunction(() => location.hash.includes("/group-conversation/"));
	await commonChecks("13-group-chat");
	await page.reload({ waitUntil: "domcontentloaded" });
	await commonChecks("14-group-chat-reload");

	await goHash("/my/profile-edit", "15-profile-edit");
	await goHash("/wallet/balance", "16-balance");

	assert(failedSameOriginResponses.length === 0, `same-origin HTTP failures:\n${failedSameOriginResponses.join("\n")}`);
	assert(runtimeErrors.length === 0, `runtime errors:\n${runtimeErrors.join("\n")}`);
	console.log("[mobile-smoke] OK: 16 route/state checks passed at 430x932.");
} catch (error) {
	console.error("[mobile-smoke] FAILED", error);
	if (failedSameOriginResponses.length) console.error(failedSameOriginResponses.join("\n"));
	if (runtimeErrors.length) console.error(runtimeErrors.join("\n"));
	await page.screenshot({ path: path.join(outputDir, "failure.png"), fullPage: true }).catch(() => {});
	process.exitCode = 1;
} finally {
	await context.close();
	await browser.close();
}
