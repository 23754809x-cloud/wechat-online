import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.APP_URL || "http://127.0.0.1:4173/wechat-online/";
const viewportWidth = Number(process.env.VIEWPORT_WIDTH || 430);
const viewportHeight = Number(process.env.VIEWPORT_HEIGHT || 932);
const viewportLabel = process.env.VIEWPORT_LABEL || `${viewportWidth}x${viewportHeight}`;
const outputDir = process.env.TEST_OUTPUT || path.resolve("test-results/mobile", viewportLabel);
const persistenceMessage = `回归测试消息-${viewportLabel}-刷新后必须保留`;
const groupPersistenceMessage = `群聊回归消息-${viewportLabel}`;
const addedFriendName = `回归好友-${viewportLabel}`;
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
	viewport: { width: viewportWidth, height: viewportHeight },
	deviceScaleFactor: 2,
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
	await page.waitForTimeout(450);
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
		legacyRuntimeRefs: Array.from(document.querySelectorAll("img"))
			.map((img) => img.currentSrc || img.getAttribute("src") || "")
			.filter((src) => src.includes("cdn-fakeworld.azureedge.net")),
		brokenVisibleImages: Array.from(document.images)
			.filter((img) => {
				const rect = img.getBoundingClientRect();
				return rect.width > 1 && rect.height > 1 && img.complete && img.naturalWidth === 0;
			})
			.map((img) => img.currentSrc || img.getAttribute("src") || ""),
	}));

	assert(
		!/(?:wechatPage|routerLabel|quickJump|menu|base)\.[A-Za-z0-9_.-]+/.test(state.bodyText),
		`${name}: raw i18n key leaked into UI`,
	);
	assert(
		state.documentWidth <= state.innerWidth + 2,
		`${name}: document horizontal overflow ${state.documentWidth} > ${state.innerWidth}`,
	);
	assert(
		state.bodyWidth <= state.innerWidth + 2,
		`${name}: body horizontal overflow ${state.bodyWidth} > ${state.innerWidth}`,
	);
	assert(
		Math.abs(state.rootWidth - state.innerWidth) <= 2,
		`${name}: #root width ${state.rootWidth} does not match viewport ${state.innerWidth}`,
	);
	assert(state.screen, `${name}: #screen missing`);
	assert(Math.abs(state.screen.width - state.innerWidth) <= 2, `${name}: screen width mismatch`);
	assert(
		state.metadataNodes === 0,
		`${name}: ${state.metadataNodes} desktop metadata nodes leaked into compact runtime`,
	);
	assert(
		!state.bodyText.includes("iPad 微信已登录"),
		`${name}: desktop/iPad login row visible on compact runtime`,
	);
	assert(
		state.legacyRuntimeRefs.length === 0,
		`${name}: legacy CDN image still rendered: ${state.legacyRuntimeRefs.join(", ")}`,
	);
	assert(
		state.brokenVisibleImages.length === 0,
		`${name}: visible broken images: ${state.brokenVisibleImages.join(", ")}`,
	);

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
		assert(
			(await page.getByText(label, { exact: true }).count()) > 0,
			`home: missing bottom nav label ${label}`,
		);
	}

	await page.getByText("通讯录", { exact: true }).last().click();
	await page.waitForFunction(() => location.hash.includes("/contacts"));
	await commonChecks("02-contacts");
	assert(
		(await page.getByText("毛毛虫", { exact: true }).count()) === 0,
		"contacts: current user's own profile leaked into the friends directory",
	);
	assert(
		(await page.getByText("唐吉诃德", { exact: true }).count()) > 0,
		"contacts: expected friend missing",
	);

	await page.getByRole("button", { name: "添加朋友" }).click();
	await page.getByLabel("联系人昵称").fill(addedFriendName);
	await page.getByRole("button", { name: "添加", exact: true }).click();
	await page.getByText(addedFriendName, { exact: true }).waitFor({ state: "visible" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.getByText(addedFriendName, { exact: true }).waitFor({ state: "visible" });
	await commonChecks("03-contacts-add-persisted");

	await page.getByText("唐吉诃德", { exact: true }).last().click();
	await page.waitForFunction(() => location.hash.includes("/friend/"));
	await commonChecks("04-friend");
	await page.reload({ waitUntil: "domcontentloaded" });
	await commonChecks("05-friend-reload");

	await goHash("/discover", "06-discover");
	await page.getByText("朋友圈", { exact: true }).first().click();
	await page.waitForFunction(() => location.hash.includes("/moments"));
	for (const name of ["唐吉诃德", "星之笨比", "路易吉", "马里奥"]) {
		assert((await page.getByText(name, { exact: true }).count()) > 0, `moments: missing built-in feed user ${name}`);
	}
	await commonChecks("07-moments");

	await goHash("/my", "08-my");
	await page.getByText("服务", { exact: true }).first().click();
	await page.waitForFunction(() => location.hash.includes("/service"));
	await commonChecks("09-service");
	await page.getByText("钱包", { exact: true }).first().click();
	await page.waitForFunction(() => location.hash.includes("/wallet"));
	await commonChecks("10-wallet");

	await goHash("/conversation/1", "11-private-chat");
	const input = page.locator("#conversation-input");
	await input.click();
	await page.keyboard.type(persistenceMessage);
	await page.keyboard.press("Enter");
	await page.getByText(persistenceMessage, { exact: true }).waitFor({ state: "visible" });
	await commonChecks("12-private-chat-after-send");
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.getByText(persistenceMessage, { exact: true }).waitFor({ state: "visible" });
	await commonChecks("13-private-chat-persisted");

	await goHash("/", "14-home-preview-sync");
	assert(
		(await page.getByText(persistenceMessage, { exact: true }).count()) > 0,
		"home: conversation preview did not update after sending a message",
	);

	await goHash("/conversation/1", "15-private-chat-creator");
	await page.getByRole("button", { name: "表情" }).click();
	await page.getByText("所有表情", { exact: true }).waitFor({ state: "visible" });
	const emojiBackground = await page.locator('[data-key="0-0"]').first().evaluate((node) =>
		getComputedStyle(node).backgroundImage,
	);
	assert(!emojiBackground.includes("cdn-fakeworld"), "emoji panel still uses legacy CDN sprite");
	assert(emojiBackground.includes("emoji-sprite"), "emoji panel is not using bundled sprite asset");
	await page.getByRole("button", { name: "返回键盘" }).click();

	await page.getByRole("button", { name: "更多聊天创作功能" }).click();
	await page.getByTestId("mobile-creator-panel").waitFor({ state: "visible" });
	for (const action of ["图片", "语音", "红包", "转账", "名片", "文件"]) {
		assert(
			(await page.getByRole("button", { name: action, exact: true }).count()) > 0,
			`creator panel: missing ${action} action`,
		);
	}
	await page.getByRole("button", { name: "语音", exact: true }).click();
	await page.getByLabel("语音时长").fill("7");
	await page.getByRole("button", { name: "添加", exact: true }).click();
	await page.getByText("7''", { exact: true }).waitFor({ state: "visible" });
	await commonChecks("16-mobile-creator-voice");

	await goHash("/", "17-home-return");
	await page.getByText("开发组(3)", { exact: true }).click();
	await page.waitForFunction(() => location.hash.includes("/group-conversation/"));
	await commonChecks("18-group-chat");
	const groupInput = page.locator("#conversation-input");
	await groupInput.click();
	await page.keyboard.type(groupPersistenceMessage);
	await page.keyboard.press("Enter");
	await page.getByText(groupPersistenceMessage, { exact: true }).waitFor({ state: "visible" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.getByText(groupPersistenceMessage, { exact: true }).waitFor({ state: "visible" });
	await commonChecks("19-group-chat-persisted");

	await goHash("/my/profile-edit", "20-profile-edit");
	await goHash("/wallet/balance", "21-balance");

	assert(
		failedSameOriginResponses.length === 0,
		`same-origin HTTP failures:\n${failedSameOriginResponses.join("\n")}`,
	);
	assert(runtimeErrors.length === 0, `runtime errors:\n${runtimeErrors.join("\n")}`);
	console.log(
		`[mobile-smoke] OK: 21 route/state/action checks passed at ${viewportWidth}x${viewportHeight}.`,
	);
} catch (error) {
	console.error("[mobile-smoke] FAILED", error);
	if (failedSameOriginResponses.length) console.error(failedSameOriginResponses.join("\n"));
	if (runtimeErrors.length) console.error(runtimeErrors.join("\n"));
	await page
		.screenshot({ path: path.join(outputDir, "failure.png"), fullPage: true })
		.catch(() => {});
	process.exitCode = 1;
} finally {
	await context.close();
	await browser.close();
}
