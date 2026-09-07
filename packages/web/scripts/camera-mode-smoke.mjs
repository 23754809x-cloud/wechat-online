import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.APP_URL || "http://127.0.0.1:4173/wechat-online/";
const outputDir = process.env.TEST_OUTPUT || path.resolve("test-results/camera-mode");
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
	viewport: { width: 430, height: 932 },
	deviceScaleFactor: 2,
	isMobile: true,
	hasTouch: true,
	locale: "zh-CN",
	userAgent:
		"Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
});
const page = await context.newPage();
const runtimeErrors = [];
const failedResponses = [];

page.on("pageerror", (error) => runtimeErrors.push(error.message));
page.on("console", (message) => {
	if (message.type() === "error") runtimeErrors.push(message.text());
});
page.on("response", (response) => {
	const url = new URL(response.url());
	const app = new URL(baseURL);
	if (url.origin === app.origin && response.status() >= 400) {
		failedResponses.push(`${response.status()} ${response.url()}`);
	}
});

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

async function dispatchTouch(type, { x, y, pointerId = 1 }) {
	await page.evaluate(
		({ type, x, y, pointerId }) => {
			document.body.dispatchEvent(
				new PointerEvent(type, {
					bubbles: true,
					clientX: x,
					clientY: y,
					pointerId,
					pointerType: "touch",
					isPrimary: true,
				}),
			);
		},
		{ type, x, y, pointerId },
	);
}

async function verifyMovedHoldDoesNotOpenCreator() {
	const centerX = 215;
	await dispatchTouch("pointerdown", { x: centerX, y: 44, pointerId: 7 });
	await page.waitForTimeout(220);
	await dispatchTouch("pointermove", { x: centerX + 34, y: 44, pointerId: 7 });
	await page.waitForTimeout(900);
	assert(
		(await page.getByTestId("mobile-creator-center").count()) === 0,
		"creator opened after the hidden-entry touch moved away from its start point",
	);
	await dispatchTouch("pointerup", { x: centerX + 34, y: 44, pointerId: 7 });
}

async function openCreator() {
	const centerX = 215;
	await dispatchTouch("pointerdown", { x: centerX, y: 44, pointerId: 1 });
	await page.waitForTimeout(1100);
	await dispatchTouch("pointerup", { x: centerX, y: 44, pointerId: 1 });
	await page.getByTestId("mobile-creator-center").waitFor({ state: "visible" });
}

try {
	await page.goto(baseURL, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(500);

	assert((await page.getByTestId("mobile-creator-center").count()) === 0, "creator UI leaked into capture mode");
	assert(
		await page.evaluate(() => document.documentElement.classList.contains("wechat-camera-mode")),
		"camera mode class is missing while creator is closed",
	);
	assert(!((await page.locator("body").innerText()).includes("创作中心")), "creator text leaked into capture mode");

	await verifyMovedHoldDoesNotOpenCreator();

	const manifest = await page.locator('link[rel="manifest"]').getAttribute("href");
	assert(Boolean(manifest?.includes("manifest.webmanifest")), "PWA manifest link missing");
	const manifestStatus = await page.evaluate(async () => {
		const href = document.querySelector('link[rel="manifest"]')?.href;
		if (!href) return 0;
		return (await fetch(href)).status;
	});
	assert(manifestStatus === 200, `manifest returned HTTP ${manifestStatus}`);

	await page.screenshot({ path: path.join(outputDir, "01-capture-mode.png"), fullPage: true });
	await openCreator();
	await page.screenshot({ path: path.join(outputDir, "02-creator-home.png"), fullPage: true });

	await page.getByRole("button", { name: /我的资料/ }).click();
	await page.getByLabel("创作资料昵称").fill("拍摄模式测试用户");
	await page.getByLabel("创作资料微信号").fill("wx_camera_owner");
	await page.getByRole("button", { name: "保存", exact: true }).click();
	await page.getByText(/拍摄模式测试用户/).waitFor({ state: "visible" });

	await page.getByRole("button", { name: "联系人管理" }).click();
	await page.getByRole("button", { name: "+ 新增联系人", exact: true }).click();
	await page.getByLabel("创作资料昵称").fill("手机拍摄联系人");
	await page.getByLabel("创作资料微信号").fill("wx_camera_friend");
	await page.getByLabel("创作资料备注").fill("拍摄备注");
	await page.getByRole("button", { name: "保存", exact: true }).click();
	await page.getByText("拍摄备注", { exact: true }).waitFor({ state: "visible" });
	await page.screenshot({ path: path.join(outputDir, "03-contact-created.png"), fullPage: true });

	await page.getByRole("button", { name: "返回", exact: true }).click();
	await page.getByRole("button", { name: "拍摄模式", exact: true }).click();
	assert((await page.getByTestId("mobile-creator-center").count()) === 0, "creator did not close back to capture mode");
	assert(
		await page.evaluate(() => document.documentElement.classList.contains("wechat-camera-mode")),
		"camera mode class did not restore after closing creator",
	);

	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(500);
	await openCreator();
	await page.getByText(/拍摄模式测试用户/).waitFor({ state: "visible" });
	await page.getByRole("button", { name: "联系人管理" }).click();
	await page.getByText("拍摄备注", { exact: true }).waitFor({ state: "visible" });

	assert(failedResponses.length === 0, `HTTP failures:\n${failedResponses.join("\n")}`);
	assert(runtimeErrors.length === 0, `runtime errors:\n${runtimeErrors.join("\n")}`);
	console.log(
		"[camera-mode-smoke] OK: capture isolation, moved-hold cancellation, persistence and manifest passed.",
	);
} catch (error) {
	console.error("[camera-mode-smoke] FAILED", error);
	if (failedResponses.length) console.error(failedResponses.join("\n"));
	if (runtimeErrors.length) console.error(runtimeErrors.join("\n"));
	await page.screenshot({ path: path.join(outputDir, "failure.png"), fullPage: true }).catch(() => {});
	process.exitCode = 1;
} finally {
	await context.close();
	await browser.close();
}
