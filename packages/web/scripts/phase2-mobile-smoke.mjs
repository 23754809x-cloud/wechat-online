import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.APP_URL || "http://127.0.0.1:4173/wechat-online/";
const outputDir = process.env.TEST_OUTPUT || path.resolve("test-results/phase2-mobile");
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
page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
	if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
});

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

async function settle(ms = 450) {
	await page.waitForLoadState("domcontentloaded");
	await page.waitForTimeout(ms);
}

async function longPress(locator) {
	await locator.scrollIntoViewIfNeeded();
	const box = await locator.boundingBox();
	if (!box) throw new Error("longPress: target has no bounding box");
	const x = box.x + box.width / 2;
	const y = box.y + box.height / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.waitForTimeout(680);
	await page.mouse.up();
	await page.getByTestId("mobile-message-menu").waitFor({ state: "visible" });
}

try {
	await page.goto(`${baseURL}#/conversation/1`, { waitUntil: "domcontentloaded" });
	await settle();

	const input = page.locator("#conversation-input");
	const originalText = "二阶段长按编辑测试";
	const editedText = "二阶段已编辑并持久化";
	await input.click();
	await page.keyboard.type(originalText);
	await page.keyboard.press("Enter");
	await page.getByText(originalText, { exact: true }).waitFor({ state: "visible" });

	let messageWrapper = page
		.locator('[data-testid^="mobile-message-action-"]')
		.filter({ hasText: originalText })
		.last();
	await longPress(messageWrapper);
	assert((await page.getByRole("button", { name: "复制", exact: true }).count()) > 0, "message menu: copy missing");
	assert((await page.getByRole("button", { name: "编辑", exact: true }).count()) > 0, "message menu: edit missing");
	assert((await page.getByRole("button", { name: "撤回", exact: true }).count()) > 0, "message menu: recall missing");
	assert((await page.getByRole("button", { name: "删除", exact: true }).count()) > 0, "message menu: delete missing");

	await page.getByRole("button", { name: "编辑", exact: true }).click();
	await page.getByLabel("编辑消息内容").fill(editedText);
	await page.getByRole("button", { name: "完成", exact: true }).click();
	await page.getByText(editedText, { exact: true }).waitFor({ state: "visible" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.getByText(editedText, { exact: true }).waitFor({ state: "visible" });
	await page.screenshot({ path: path.join(outputDir, "01-message-edited.png"), fullPage: true });

	messageWrapper = page
		.locator('[data-testid^="mobile-message-action-"]')
		.filter({ hasText: editedText })
		.last();
	await longPress(messageWrapper);
	await page.getByRole("button", { name: "撤回", exact: true }).click();
	await page.getByText("你撤回了一条消息", { exact: true }).waitFor({ state: "visible" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.getByText("你撤回了一条消息", { exact: true }).waitFor({ state: "visible" });

	const deleteText = "二阶段删除测试";
	await input.click();
	await page.keyboard.type(deleteText);
	await page.keyboard.press("Enter");
	await page.getByText(deleteText, { exact: true }).waitFor({ state: "visible" });
	const deleteWrapper = page
		.locator('[data-testid^="mobile-message-action-"]')
		.filter({ hasText: deleteText })
		.last();
	await longPress(deleteWrapper);
	await page.getByRole("button", { name: "删除", exact: true }).click();
	await page.getByText(deleteText, { exact: true }).waitFor({ state: "detached" });
	await page.reload({ waitUntil: "domcontentloaded" });
	assert((await page.getByText(deleteText, { exact: true }).count()) === 0, "deleted message returned after reload");

	const imageData =
		"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='420'%3E%3Crect width='640' height='420' fill='%23d9d9d9'/%3E%3Ccircle cx='320' cy='210' r='90' fill='%2307c160'/%3E%3C/svg%3E";
	await page.evaluate((src) => {
		localStorage.setItem(
			"conversationList-1",
			JSON.stringify([
				{
					type: "image",
					role: "mine",
					imageInfo: src,
					id: "phase2-image-preview",
					sendTimestamp: Date.now(),
				},
			]),
		);
	}, imageData);
	await page.reload({ waitUntil: "domcontentloaded" });
	await settle();
	await page.getByRole("button", { name: "查看图片" }).click();
	await page.getByTestId("mobile-image-preview").waitFor({ state: "visible" });
	assert(
		(await page.getByText("轻触屏幕返回", { exact: true }).count()) === 0,
		"image preview leaked simulator instruction text",
	);
	await page.screenshot({ path: path.join(outputDir, "02-image-preview.png"), fullPage: true });
	await page.getByRole("button", { name: "关闭图片预览" }).click();
	await page.getByTestId("mobile-image-preview").waitFor({ state: "detached" });

	await page.goto(`${baseURL}#/group-conversation/group_demo1`, { waitUntil: "domcontentloaded" });
	await settle();
	await page.getByRole("button", { name: "群聊信息" }).click();
	await page.getByTestId("mobile-group-settings").waitFor({ state: "visible" });
	await page.getByLabel("群聊名称").fill("拍摄测试组");
	const addMario = page.getByRole("button", { name: "+ 马里奥", exact: true });
	if ((await addMario.count()) > 0) await addMario.click();
	await page.getByRole("button", { name: "完成", exact: true }).click();
	await page.getByText(/拍摄测试组\(4\)/).waitFor({ state: "visible" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.getByText(/拍摄测试组\(4\)/).waitFor({ state: "visible" });
	await page.screenshot({ path: path.join(outputDir, "03-group-settings-persisted.png"), fullPage: true });

	assert(runtimeErrors.length === 0, `runtime errors:\n${runtimeErrors.join("\n")}`);
	console.log("[phase2-mobile-smoke] OK: message actions, image preview and group settings passed.");
} catch (error) {
	console.error("[phase2-mobile-smoke] FAILED", error);
	if (runtimeErrors.length) console.error(runtimeErrors.join("\n"));
	await page.screenshot({ path: path.join(outputDir, "failure.png"), fullPage: true }).catch(() => {});
	process.exitCode = 1;
} finally {
	await context.close();
	await browser.close();
}
