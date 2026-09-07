import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.APP_URL || "http://127.0.0.1:4173/wechat-online/";
const outputDir = process.env.TEST_OUTPUT || path.resolve("test-results/advanced-creator");
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

async function openCreator() {
	await page.evaluate(() => {
		document.body.dispatchEvent(
			new PointerEvent("pointerdown", {
				bubbles: true,
				clientX: window.innerWidth / 2,
				clientY: 44,
				pointerId: 1,
				pointerType: "touch",
				isPrimary: true,
			}),
		);
	});
	await page.waitForTimeout(1100);
	await page.evaluate(() => {
		document.body.dispatchEvent(
			new PointerEvent("pointerup", {
				bubbles: true,
				clientX: window.innerWidth / 2,
				clientY: 44,
				pointerId: 1,
				pointerType: "touch",
				isPrimary: true,
			}),
		);
	});
	await page.getByTestId("mobile-creator-center").waitFor({ state: "visible" });
}

async function openAdvanced() {
	await page.getByTestId("advanced-creator-entry").waitFor({ state: "visible" });
	await page.getByTestId("advanced-creator-entry").click();
	await page.getByTestId("advanced-creator-center").waitFor({ state: "visible" });
}

async function advancedBack() {
	await page
		.getByTestId("advanced-creator-center")
		.getByRole("button", { name: "返回", exact: true })
		.click();
}

try {
	await page.goto(baseURL, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(500);
	await openCreator();

	const tempName = "高级待删除联系人";
	await page.getByRole("button", { name: "联系人管理" }).click();
	await page.getByRole("button", { name: "+ 新增联系人", exact: true }).click();
	await page.getByLabel("创作资料昵称").fill(tempName);
	await page.getByLabel("创作资料微信号").fill("wx_advanced_delete");
	await page.getByRole("button", { name: "保存", exact: true }).click();
	await page.getByText(tempName, { exact: true }).waitFor({ state: "visible" });

	await openAdvanced();
	for (const testId of ["advanced-chat-entry", "advanced-group-entry", "advanced-contact-entry"]) {
		assert((await page.getByTestId(testId).count()) === 1, `advanced home missing ${testId}`);
	}
	await page.screenshot({ path: path.join(outputDir, "01-advanced-home.png"), fullPage: true });

	await page.getByTestId("advanced-contact-entry").click();
	await page.getByTestId("advanced-contact-cleanup").waitFor({ state: "visible" });
	const contactRow = page
		.getByTestId("advanced-contact-cleanup")
		.locator("div.rounded-2xl")
		.filter({ hasText: tempName })
		.last();
	await contactRow.getByRole("button", { name: "删除", exact: true }).click();
	await contactRow.getByRole("button", { name: "确认删除", exact: true }).click();
	assert(
		(await page.getByText(tempName, { exact: true }).count()) === 0,
		"contact cleanup did not delete temporary contact",
	);

	await advancedBack();
	await page.getByTestId("advanced-group-entry").click();
	await page.getByRole("button", { name: "+ 新建群聊", exact: true }).click();
	await page.getByLabel("群聊名称").fill("高级创作测试群");
	await page.getByLabel("群公告").fill("用于验证手机端高级群聊设置持久化");
	await page.getByRole("button", { name: "保存群聊设置", exact: true }).click();
	await page.getByText("高级创作测试群", { exact: true }).waitFor({ state: "visible" });
	await page.screenshot({ path: path.join(outputDir, "02-group-created.png"), fullPage: true });

	await advancedBack();
	await page.getByTestId("advanced-chat-entry").click();
	await page.getByLabel("选择要管理的聊天").selectOption({ label: "单聊 · 唐吉诃德" });
	await page.getByTestId("advanced-chat-record-editor").waitFor({ state: "visible" });
	const firstTextRow = page
		.getByTestId("advanced-chat-record-editor")
		.locator("[data-message-id]")
		.filter({ hasText: "以后别联系了" })
		.first();
	await firstTextRow.getByRole("button", { name: "修改文字", exact: true }).click();
	await firstTextRow.getByLabel("编辑聊天文本").fill("高级创作已修改聊天记录");
	await firstTextRow.getByRole("button", { name: "保存文字", exact: true }).click();
	await page.getByText("高级创作已修改聊天记录", { exact: true }).waitFor({ state: "visible" });
	await page.screenshot({
		path: path.join(outputDir, "03-chat-history-edited.png"),
		fullPage: true,
	});

	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(500);
	await openCreator();
	await openAdvanced();
	await page.getByTestId("advanced-group-entry").click();
	await page.getByText("高级创作测试群", { exact: true }).waitFor({ state: "visible" });

	await advancedBack();
	await page.getByTestId("advanced-chat-entry").click();
	await page.getByLabel("选择要管理的聊天").selectOption({ label: "单聊 · 唐吉诃德" });
	await page.getByText("高级创作已修改聊天记录", { exact: true }).waitFor({ state: "visible" });
	assert(
		(await page.getByText(tempName, { exact: true }).count()) === 0,
		"deleted contact reappeared after reload",
	);

	assert(runtimeErrors.length === 0, `runtime errors:\n${runtimeErrors.join("\n")}`);
	console.log(
		"[advanced-creator-smoke] OK: cleanup, group creation and chat history editing persisted.",
	);
} catch (error) {
	console.error("[advanced-creator-smoke] FAILED", error);
	if (runtimeErrors.length) console.error(runtimeErrors.join("\n"));
	await page
		.screenshot({ path: path.join(outputDir, "failure.png"), fullPage: true })
		.catch(() => {});
	process.exitCode = 1;
} finally {
	await context.close();
	await browser.close();
}
