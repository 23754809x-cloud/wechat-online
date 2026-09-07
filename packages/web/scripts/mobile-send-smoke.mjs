import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.APP_URL || "http://127.0.0.1:4173/wechat-online/";
const outputDir = process.env.TEST_OUTPUT || path.resolve("test-results/mobile-send");
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
	viewport: { width: 390, height: 844 },
	deviceScaleFactor: 3,
	isMobile: true,
	hasTouch: true,
	locale: "zh-CN",
	userAgent:
		"Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
});
const page = await context.newPage();
const runtimeErrors = [];

page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
	if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
});

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

async function verifyIOSCompositionActuallySends() {
	const text = "余光";
	const input = page.locator("#conversation-input");
	const messageSelector = '[data-testid^="mobile-message-action-"]';
	const beforeCount = await page.locator(messageSelector).count();
	await input.tap();

	// Reproduce the state seen on real iPhone/WebKit: the contenteditable DOM already
	// contains visible composition text while Slate/Jotai can still hold the empty draft.
	await input.evaluate((node, compositionText) => {
		node.textContent = compositionText;
		node.dispatchEvent(
			new InputEvent("input", {
				bubbles: true,
				cancelable: false,
				data: compositionText,
				inputType: "insertCompositionText",
				isComposing: true,
			}),
		);
	}, text);

	const sendButton = page.getByRole("button", { name: "发送消息", exact: true });
	await sendButton.waitFor({ state: "visible" });
	assert(
		(await page.getByRole("button", { name: "更多聊天创作功能" }).count()) === 0,
		"iOS composition text was visible but plus button did not switch to send",
	);
	await page.screenshot({ path: path.join(outputDir, "ios-stale-draft-send-ready.png"), fullPage: true });

	// This is the regression that v2.3.1 missed: seeing the button is not enough.
	// A touch must create a message even while the old external draft snapshot is empty.
	await sendButton.tap();
	await page.waitForFunction(
		({ selector, count }) => document.querySelectorAll(selector).length > count,
		{ selector: messageSelector, count: beforeCount },
	);
	await page.getByRole("button", { name: "更多聊天创作功能" }).waitFor({ state: "visible" });

	// Reload removes the manually-mutated contenteditable DOM. The text must still
	// exist as a persisted conversation message, proving the send path actually ran.
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.getByText(text, { exact: true }).waitFor({ state: "visible" });
}

async function typeAndTapSend(text, { verifyCompositionGuard = false } = {}) {
	const input = page.locator("#conversation-input");
	await input.tap();
	await input.pressSequentially(text, { delay: 12 });

	const sendButton = page.getByRole("button", { name: "发送消息", exact: true });
	await sendButton.waitFor({ state: "visible" });
	assert(
		(await page.getByRole("button", { name: "更多聊天创作功能" }).count()) === 0,
		"plus button remained visible while text was ready to send",
	);

	if (verifyCompositionGuard) {
		const beforeCount = await page.locator('[data-testid^="mobile-message-action-"]').count();
		await input.evaluate((node) => {
			node.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "Enter",
					code: "Enter",
					bubbles: true,
					cancelable: true,
					isComposing: true,
				}),
			);
		});
		await page.waitForTimeout(120);
		const afterCount = await page.locator('[data-testid^="mobile-message-action-"]').count();
		assert(afterCount === beforeCount, "IME composing Enter incorrectly sent the message");
		await sendButton.waitFor({ state: "visible" });
	}

	await page.screenshot({ path: path.join(outputDir, `ready-${Date.now()}.png`), fullPage: true });
	await sendButton.tap();
	await page.getByText(text, { exact: true }).waitFor({ state: "visible" });
	await page.getByRole("button", { name: "更多聊天创作功能" }).waitFor({ state: "visible" });
	assert((await sendButton.count()) === 0, "send button did not return to plus after sending");
}

try {
	await page.goto(`${baseURL}#/conversation/1`, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(450);
	assert(
		(await page.getByRole("button", { name: "发送消息", exact: true }).count()) === 0,
		"empty input incorrectly showed send button",
	);
	await verifyIOSCompositionActuallySends();

	await page.waitForTimeout(300);
	const privateText = "手机点击发送按钮-单聊";
	await typeAndTapSend(privateText, { verifyCompositionGuard: true });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.getByText(privateText, { exact: true }).waitFor({ state: "visible" });

	const groupText = "手机点击发送按钮-群聊";
	await page.goto(`${baseURL}#/group-conversation/group_demo1`, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(450);
	await typeAndTapSend(groupText);
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.getByText(groupText, { exact: true }).waitFor({ state: "visible" });

	assert(runtimeErrors.length === 0, `runtime errors:\n${runtimeErrors.join("\n")}`);
	console.log(
		"[mobile-send-smoke] OK: stale iOS composition draft actually sends by touch, private/group touch send persists, and IME Enter is guarded.",
	);
} catch (error) {
	console.error("[mobile-send-smoke] FAILED", error);
	if (runtimeErrors.length) console.error(runtimeErrors.join("\n"));
	await page.screenshot({ path: path.join(outputDir, "failure.png"), fullPage: true }).catch(() => {});
	process.exitCode = 1;
} finally {
	await context.close();
	await browser.close();
}
