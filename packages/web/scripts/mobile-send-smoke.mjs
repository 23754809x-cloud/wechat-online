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

async function verifyIOSCompositionShowsSend() {
	const input = page.locator("#conversation-input");
	await input.tap();
	await input.evaluate((node) => {
		node.textContent = "余光";
		node.dispatchEvent(
			new InputEvent("input", {
				bubbles: true,
				cancelable: false,
				data: "余光",
				inputType: "insertCompositionText",
				isComposing: true,
			}),
		);
	});
	await page.getByRole("button", { name: "发送消息", exact: true }).waitFor({ state: "visible" });
	assert(
		(await page.getByRole("button", { name: "更多聊天创作功能" }).count()) === 0,
		"iOS composition text was visible but plus button did not switch to send",
	);
	await page.screenshot({ path: path.join(outputDir, "ios-composition-send-visible.png"), fullPage: true });
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
	await verifyIOSCompositionShowsSend();

	// Reload after the low-level WebKit composition reproduction so the Slate editor starts clean.
	await page.reload({ waitUntil: "domcontentloaded" });
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
		"[mobile-send-smoke] OK: iOS composition text shows send, touch send works for private/group chat, persists after reload, and IME Enter is guarded.",
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
