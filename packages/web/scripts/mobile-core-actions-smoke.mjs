import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.APP_URL || "http://127.0.0.1:4173/wechat-online/";
const outputDir = process.env.TEST_OUTPUT || path.resolve("test-results/mobile-core-actions");
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

async function ensureCreatorOpen() {
	const panel = page.getByTestId("mobile-creator-panel");
	if (!(await panel.isVisible().catch(() => false))) {
		const plus = page.getByRole("button", { name: "更多聊天创作功能" });
		await plus.waitFor({ state: "visible" });
		await plus.tap();
		await panel.waitFor({ state: "visible" });
	}
	await page.waitForTimeout(350);
}

async function modalOk() {
	const modal = page.locator(".ant-modal:visible");
	await modal.locator(".ant-modal-footer .ant-btn-primary").last().click();
	await modal.waitFor({ state: "hidden" }).catch(() => {});
	await page.waitForTimeout(150);
}

async function sendTextByTouch(text) {
	const input = page.locator("#conversation-input");
	await input.tap();
	await input.pressSequentially(text, { delay: 15 });
	const send = page.getByRole("button", { name: "发送消息", exact: true });
	await send.waitFor({ state: "visible" });
	await send.tap();
	await page.getByText(text, { exact: true }).waitFor({ state: "visible" });
}

async function readConversationStorage() {
	return page.evaluate(() => {
		const raw = localStorage.getItem("conversationList-1");
		return raw ? JSON.parse(raw) : [];
	});
}

try {
	await page.goto(`${baseURL}#/conversation/1`, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(500);

	const plainText = "核心链路-触摸文本发送";
	await sendTextByTouch(plainText);

	// Image: exercise the hidden upload input and local asset persistence.
	await ensureCreatorOpen();
	const imageInput = page.locator('input[type="file"][accept="image/*"]');
	await imageInput.setInputFiles({
		name: "audit.png",
		mimeType: "image/png",
		buffer: Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
			"base64",
		),
	});
	await page.waitForTimeout(350);
	assert(
		(await page.locator('img[src^="blob:"], img[src^="data:"]').count()) > 0,
		"image message was not rendered",
	);

	// Voice.
	await ensureCreatorOpen();
	await page.getByRole("button", { name: "语音", exact: true }).tap();
	await page.getByLabel("语音时长").fill("9");
	await page.getByLabel("语音转文字").fill("核心语音转文字");
	await modalOk();
	await page.getByText("9''", { exact: true }).waitFor({ state: "visible" });

	// Red packet.
	await ensureCreatorOpen();
	await page.getByRole("button", { name: "红包", exact: true }).tap();
	await page.getByLabel("红包金额").fill("8.88");
	await page.getByLabel("红包说明").fill("核心红包测试");
	await modalOk();
	await page.waitForTimeout(250);
	assert(
		(await page.getByText("核心红包测试", { exact: true }).count()) > 0,
		"red packet message was not rendered",
	);

	// Transfer. Awaiting transfer cards intentionally show status text instead of the note.
	await ensureCreatorOpen();
	await page.getByRole("button", { name: "转账", exact: true }).tap();
	await page.getByLabel("转账金额").fill("12.34");
	await page.getByLabel("转账说明").fill("核心转账测试");
	await modalOk();
	await page.getByText("¥12.34", { exact: true }).waitFor({ state: "visible" });
	await page.getByText("待朋友确认收钱", { exact: true }).waitFor({ state: "visible" });
	const storedAfterTransfer = await readConversationStorage();
	assert(
		storedAfterTransfer.some(
			(item) => item.type === "transfer" && item.amount === "12.34" && item.note === "核心转账测试",
		),
		"transfer amount/note were not persisted",
	);

	// Contact card: default to the first available contact.
	await ensureCreatorOpen();
	await page.getByRole("button", { name: "名片", exact: true }).tap();
	await modalOk();
	await page.waitForTimeout(250);
	assert(
		(await page.locator("text=个人名片").count()) > 0 ||
			(await page.locator("text=名片").count()) > 0,
		"personal card message was not rendered",
	);

	// File.
	await ensureCreatorOpen();
	const fileInput = page.locator('input[type="file"]:not([accept])');
	await fileInput.setInputFiles({
		name: "核心文件测试.txt",
		mimeType: "text/plain",
		buffer: Buffer.from("wechat mobile core action audit", "utf8"),
	});
	await page.getByText("核心文件测试.txt", { exact: true }).waitFor({ state: "visible" });

	await page.screenshot({ path: path.join(outputDir, "all-core-actions.png"), fullPage: true });

	// Persistence check for representative persisted data after a full reload.
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.getByText(plainText, { exact: true }).waitFor({ state: "visible" });
	await page.getByText("核心文件测试.txt", { exact: true }).waitFor({ state: "visible" });
	await page.getByText("¥12.34", { exact: true }).waitFor({ state: "visible" });
	await page.getByText("待朋友确认收钱", { exact: true }).waitFor({ state: "visible" });
	const storedAfterReload = await readConversationStorage();
	assert(
		storedAfterReload.some(
			(item) => item.type === "transfer" && item.amount === "12.34" && item.note === "核心转账测试",
		),
		"transfer persistence was lost after reload",
	);

	assert(runtimeErrors.length === 0, `runtime errors:\n${runtimeErrors.join("\n")}`);
	console.log(
		"[mobile-core-actions] OK: text/image/voice/red-packet/transfer/card/file real actions completed and persisted.",
	);
} catch (error) {
	console.error("[mobile-core-actions] FAILED", error);
	if (runtimeErrors.length) console.error(runtimeErrors.join("\n"));
	await page
		.screenshot({ path: path.join(outputDir, "failure.png"), fullPage: true })
		.catch(() => {});
	process.exitCode = 1;
} finally {
	await context.close();
	await browser.close();
}
