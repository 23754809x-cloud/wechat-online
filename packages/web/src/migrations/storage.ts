import FRIEND_AVATAR_DEFAULT from "@/assets/friend-avatar-default.svg";
import MOMENTS_DEMO_1 from "@/assets/moments-demo-1.svg";
import MOMENTS_DEMO_2 from "@/assets/moments-demo-2.svg";
import MOMENTS_DEMO_VIDEO from "@/assets/moments-demo-video.svg";
import DEFAULT_MOMENTS_COVER from "@/assets/moments-cover-default.svg";
import { INIT_FRIENDS } from "@/faker/user";
import type { TStateFeedLst } from "@/stateV2/moments";
import type { TStateAllProfiles } from "@/stateV2/profile";

const MIGRATION_KEY = "wechat-online:migration:2026-09-06-runtime-audit-v1";

const LEGACY_ASSET_REPLACEMENTS = new Map<string, string>([
	["https://cdn-fakeworld.azureedge.net/fakeworld/pnqqk6.jpg", DEFAULT_MOMENTS_COVER],
	["https://cdn-fakeworld.azureedge.net/fakeworld/pnqz5x.jpg", DEFAULT_MOMENTS_COVER],
	["https://cdn-fakeworld.azureedge.net/fakeworld/ppf1ga.jpg", FRIEND_AVATAR_DEFAULT],
	["https://cdn-fakeworld.azureedge.net/fakeworld/pnqxld.jpg", MOMENTS_DEMO_1],
	["https://cdn-fakeworld.azureedge.net/fakeworld/pnr4ub.jpg", MOMENTS_DEMO_2],
	["https://cdn-fakeworld.azureedge.net/fakeworld/pnr1bd.jpg", MOMENTS_DEMO_2],
	["https://cdn-fakeworld.azureedge.net/fakeworld/pnr1of.jpg", MOMENTS_DEMO_VIDEO],
]);

const replaceKnownLegacyAssets = (value: unknown): unknown => {
	if (typeof value === "string") {
		return LEGACY_ASSET_REPLACEMENTS.get(value) ?? value;
	}
	if (Array.isArray(value)) {
		return value.map(replaceKnownLegacyAssets);
	}
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, nestedValue]) => [key, replaceKnownLegacyAssets(nestedValue)]),
		);
	}
	return value;
};

const migrateJSONStorageValue = (key: string) => {
	const raw = localStorage.getItem(key);
	if (!raw) return;
	try {
		const parsed = JSON.parse(raw);
		const migrated = replaceKnownLegacyAssets(parsed);
		const next = JSON.stringify(migrated);
		if (next !== raw) localStorage.setItem(key, next);
	} catch {
		// Preserve unreadable/foreign data rather than resetting it.
	}
};

const restoreMissingBuiltinProfilesReferencedByFeeds = () => {
	const rawProfiles = localStorage.getItem("allProfiles");
	const rawFeeds = localStorage.getItem("feedList");
	if (!rawProfiles || !rawFeeds) return;

	try {
		const profiles = JSON.parse(rawProfiles) as TStateAllProfiles;
		const feeds = JSON.parse(rawFeeds) as TStateFeedLst;
		if (!Array.isArray(profiles) || !Array.isArray(feeds)) return;

		const existingIds = new Set(profiles.map((profile) => profile.id));
		const referencedIds = new Set(feeds.map((feed) => feed.userId));
		const missingBuiltinProfiles = INIT_FRIENDS.filter(
			(profile) => ["3", "4"].includes(profile.id) && referencedIds.has(profile.id) && !existingIds.has(profile.id),
		);

		if (missingBuiltinProfiles.length > 0) {
			localStorage.setItem("allProfiles", JSON.stringify([...profiles, ...missingBuiltinProfiles]));
		}
	} catch {
		// Never overwrite user storage when its shape is unknown.
	}
};

export const migrateLegacyStorageOnce = () => {
	if (typeof window === "undefined") return;
	try {
		if (localStorage.getItem(MIGRATION_KEY) === "1") return;

		migrateJSONStorageValue("allProfiles");
		migrateJSONStorageValue("feedList");
		restoreMissingBuiltinProfilesReferencedByFeeds();
		localStorage.setItem(MIGRATION_KEY, "1");
	} catch {
		// Storage can be unavailable in private/restricted contexts; app startup must continue.
	}
};
