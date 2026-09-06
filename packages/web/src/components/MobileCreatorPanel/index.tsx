import DEFAULT_FRIEND_AVATAR from "@/assets/friend-avatar-default.svg";
import DEFAULT_MOMENTS_COVER from "@/assets/moments-cover-default.svg";
import { saveImageAsset } from "@/assetStorage";
import HashAssets from "@/components/HashAssets";
import { MYSELF_ID } from "@/faker/user";
import { useCompactRuntime } from "@/runtime/compact";
import { allProfilesAtom, type IStateProfile } from "@/stateV2/profile";
import { useAtom } from "jotai";
import { nanoid } from "nanoid";
import { useEffect, useMemo, useRef, useState } from "react";

type CreatorSection = "home" | "profile" | "contacts";

const inputClass =
	"w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[16px] text-black outline-none focus:border-[#07c160]";
const labelClass = "mb-1.5 block text-xs text-black/45";

const cloneProfile = (profile: IStateProfile): IStateProfile => ({
	...profile,
	phone: profile.phone ? [...profile.phone] : undefined,
	tags: profile.tags ? [...profile.tags] : undefined,
	thumbnailInfo: [...profile.thumbnailInfo],
});

const MobileCreatorPanel = () => {
	const compact = useCompactRuntime();
	const [profiles, setProfiles] = useAtom(allProfilesAtom);
	const [open, setOpen] = useState(false);
	const [section, setSection] = useState<CreatorSection>("home");
	const [draft, setDraft] = useState<IStateProfile | null>(null);
	const holdTimerRef = useRef<number | null>(null);

	const myself = useMemo(
		() => profiles.find((profile) => profile.id === MYSELF_ID),
		[profiles],
	);
	const friends = useMemo(
		() => profiles.filter((profile) => profile.id !== MYSELF_ID),
		[profiles],
	);

	useEffect(() => {
		if (!compact) return;

		const clearHold = () => {
			if (holdTimerRef.current !== null) {
				window.clearTimeout(holdTimerRef.current);
				holdTimerRef.current = null;
			}
		};
		const handlePointerDown = (event: PointerEvent) => {
			if (open) return;
			const inHeaderHotspot =
				event.clientY <= 92 &&
				event.clientX >= window.innerWidth * 0.28 &&
				event.clientX <= window.innerWidth * 0.72;
			if (!inHeaderHotspot) return;
			clearHold();
			holdTimerRef.current = window.setTimeout(() => {
				setSection("home");
				setOpen(true);
			}, 950);
		};

		window.addEventListener("pointerdown", handlePointerDown, true);
		window.addEventListener("pointerup", clearHold, true);
		window.addEventListener("pointercancel", clearHold, true);
		window.addEventListener("scroll", clearHold, true);
		return () => {
			clearHold();
			window.removeEventListener("pointerdown", handlePointerDown, true);
			window.removeEventListener("pointerup", clearHold, true);
			window.removeEventListener("pointercancel", clearHold, true);
			window.removeEventListener("scroll", clearHold, true);
		};
	}, [compact, open]);

	useEffect(() => {
		if (!compact) return;
		document.documentElement.classList.toggle("wechat-camera-mode", !open);
		document.documentElement.dataset.creatorOpen = open ? "true" : "false";
		return () => {
			document.documentElement.classList.remove("wechat-camera-mode");
			delete document.documentElement.dataset.creatorOpen;
		};
	}, [compact, open]);

	if (!compact) return null;

	const closeCreator = () => {
		setDraft(null);
		setSection("home");
		setOpen(false);
	};

	const beginEdit = (profile: IStateProfile) => {
		setDraft(cloneProfile(profile));
		setSection("profile");
	};

	const addFriend = () => {
		const newProfile: IStateProfile = {
			id: nanoid(8),
			nickname: "新联系人",
			remark: undefined,
			wechat: `wxid_${nanoid(6)}`,
			avatarInfo: DEFAULT_FRIEND_AVATAR,
			momentsBackgroundInfo: DEFAULT_MOMENTS_COVER,
			momentsBackgroundLike: false,
			momentsPrivacy: "all",
			privacy: "all",
			thumbnailInfo: [],
		};
		setProfiles((prev) => [...prev, newProfile]);
		beginEdit(newProfile);
	};

	const updateDraft = <K extends keyof IStateProfile>(key: K, value: IStateProfile[K]) => {
		setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
	};

	const saveDraft = () => {
		if (!draft) return;
		const nickname = draft.nickname.trim();
		const wechat = draft.wechat.trim();
		if (!nickname || !wechat) return;
		setProfiles((prev) =>
			prev.map((profile) =>
				profile.id === draft.id
					? {
						...draft,
						nickname,
						wechat,
						remark: draft.remark?.trim() || undefined,
						area: draft.area?.trim() || undefined,
						signature: draft.signature?.trim() || undefined,
						tickleText: draft.tickleText?.trim() || undefined,
						description: draft.description?.trim() || undefined,
					}
					: profile,
			),
		);
		setSection(draft.id === MYSELF_ID ? "home" : "contacts");
		setDraft(null);
	};

	const uploadImage = async (field: "avatarInfo" | "momentsBackgroundInfo", file?: File) => {
		if (!file || !draft) return;
		const hash = await saveImageAsset(file);
		updateDraft(field, hash);
	};

	const openChat = (id: string) => {
		closeCreator();
		window.location.hash = `/conversation/${encodeURIComponent(id)}`;
	};

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-[1000] flex flex-col overflow-hidden bg-[#f5f5f5] text-black"
			data-testid="mobile-creator-center"
			style={{
				paddingTop: "max(env(safe-area-inset-top), 10px)",
				paddingBottom: "max(env(safe-area-inset-bottom), 10px)",
			}}
		>
			<header className="flex h-12 shrink-0 items-center justify-between border-black/5 border-b bg-white px-4">
				<button
					type="button"
					className="min-w-16 text-left text-[15px] text-black/60"
					onClick={() => {
						if (section === "home") closeCreator();
						else {
							setDraft(null);
							setSection("home");
						}
					}}
				>
					{section === "home" ? "拍摄模式" : "返回"}
				</button>
				<div className="font-medium text-[17px]">
					{section === "home" ? "创作中心" : section === "contacts" ? "联系人管理" : "资料编辑"}
				</div>
				<div className="min-w-16 text-right text-xs text-black/30">本机保存</div>
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
				{section === "home" && (
					<div className="space-y-3">
						<button
							type="button"
							className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm"
							onClick={() => myself && beginEdit(myself)}
						>
							{myself && <HashAssets src={myself.avatarInfo} className="h-14 w-14 rounded-xl object-cover" />}
							<div className="min-w-0 flex-1">
								<div className="font-medium text-[16px]">我的资料</div>
								<div className="mt-1 truncate text-sm text-black/45">
									{myself?.nickname ?? "未设置"} · {myself?.wechat ?? ""}
								</div>
							</div>
							<span className="text-black/25">›</span>
						</button>

						<button
							type="button"
							className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm"
							onClick={() => setSection("contacts")}
						>
							<div>
								<div className="font-medium text-[16px]">联系人管理</div>
								<div className="mt-1 text-sm text-black/45">新增、修改头像、昵称、备注、微信号</div>
							</div>
							<div className="flex items-center gap-2 text-sm text-black/35">
								<span>{friends.length}</span>
								<span>›</span>
							</div>
						</button>

						<div className="rounded-2xl bg-white p-4 shadow-sm">
							<div className="font-medium text-[16px]">聊天制作</div>
							<div className="mt-1 text-sm leading-5 text-black/45">
								选择联系人后可直接进入聊天页，使用输入框与“+”面板添加文字、图片、语音、红包、转账、名片和文件。
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
								{friends.slice(0, 6).map((friend) => (
									<button
										type="button"
										key={friend.id}
										className="rounded-full bg-[#f2f2f2] px-3 py-2 text-sm"
										onClick={() => openChat(friend.id)}
									>
										{friend.remark || friend.nickname}
									</button>
								))}
							</div>
						</div>

						<div className="rounded-2xl bg-white p-4 text-sm leading-6 text-black/45 shadow-sm">
							退出后界面不会显示任何“创作中心”按钮。需要再次进入时，长按微信页面顶部标题区域约 1 秒。
						</div>
					</div>
				)}

				{section === "contacts" && (
					<div className="space-y-3">
						<button
							type="button"
							className="w-full rounded-2xl bg-[#07c160] px-4 py-3 font-medium text-[16px] text-white"
							onClick={addFriend}
						>
							+ 新增联系人
						</button>
						{friends.map((friend) => (
							<div key={friend.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
								<HashAssets src={friend.avatarInfo} className="h-12 w-12 rounded-xl object-cover" />
								<div className="min-w-0 flex-1">
									<div className="truncate font-medium">{friend.remark || friend.nickname}</div>
									<div className="mt-0.5 truncate text-xs text-black/40">微信号：{friend.wechat}</div>
								</div>
								<div className="flex gap-2">
									<button
										type="button"
										className="rounded-lg bg-[#f2f2f2] px-3 py-2 text-sm"
										onClick={() => beginEdit(friend)}
									>
										编辑
									</button>
									<button
										type="button"
										className="rounded-lg bg-[#f2f2f2] px-3 py-2 text-sm"
										onClick={() => openChat(friend.id)}
									>
										聊天
									</button>
								</div>
							</div>
						))}
					</div>
				)}

				{section === "profile" && draft && (
					<div className="space-y-4 pb-6">
						<div className="rounded-2xl bg-white p-4 shadow-sm">
							<div className="flex items-center gap-4">
								<HashAssets src={draft.avatarInfo} className="h-20 w-20 rounded-2xl object-cover" />
								<div className="flex-1">
									<div className="mb-2 text-sm text-black/45">头像</div>
									<label className="inline-flex cursor-pointer rounded-xl bg-[#f2f2f2] px-3 py-2 text-sm">
										选择照片
										<input
											type="file"
											accept="image/*"
											className="hidden"
											onChange={(event) => void uploadImage("avatarInfo", event.target.files?.[0])}
										/>
									</label>
								</div>
							</div>
						</div>

						<div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
							<label>
								<span className={labelClass}>昵称</span>
								<input
									aria-label="创作资料昵称"
									className={inputClass}
									value={draft.nickname}
									onChange={(event) => updateDraft("nickname", event.target.value)}
								/>
							</label>
							{draft.id !== MYSELF_ID && (
								<label>
									<span className={labelClass}>备注</span>
									<input
										aria-label="创作资料备注"
										className={inputClass}
										value={draft.remark ?? ""}
										onChange={(event) => updateDraft("remark", event.target.value)}
									/>
								</label>
							)}
							<label>
								<span className={labelClass}>微信号</span>
								<input
									aria-label="创作资料微信号"
									className={inputClass}
									value={draft.wechat}
									onChange={(event) => updateDraft("wechat", event.target.value)}
								/>
							</label>
							<label>
								<span className={labelClass}>地区</span>
								<input
									aria-label="创作资料地区"
									className={inputClass}
									value={draft.area ?? ""}
									onChange={(event) => updateDraft("area", event.target.value)}
								/>
							</label>
							<label>
								<span className={labelClass}>个性签名</span>
								<input
									aria-label="创作资料签名"
									className={inputClass}
									value={draft.signature ?? ""}
									onChange={(event) => updateDraft("signature", event.target.value)}
								/>
							</label>
							<label>
								<span className={labelClass}>拍一拍文案</span>
								<input
									aria-label="创作资料拍一拍"
									className={inputClass}
									value={draft.tickleText ?? ""}
									onChange={(event) => updateDraft("tickleText", event.target.value)}
								/>
							</label>
						</div>

						<div className="rounded-2xl bg-white p-4 shadow-sm">
							<div className="mb-2 text-sm text-black/45">朋友圈背景</div>
							<div className="overflow-hidden rounded-xl bg-[#eee]">
								<HashAssets
									src={draft.momentsBackgroundInfo || DEFAULT_MOMENTS_COVER}
									className="h-32 w-full object-cover"
								/>
							</div>
							<label className="mt-3 inline-flex cursor-pointer rounded-xl bg-[#f2f2f2] px-3 py-2 text-sm">
								更换背景
								<input
									type="file"
									accept="image/*"
									className="hidden"
									onChange={(event) => void uploadImage("momentsBackgroundInfo", event.target.files?.[0])}
								/>
							</label>
						</div>

						<div className="flex gap-3">
							<button
								type="button"
								className="flex-1 rounded-2xl bg-[#e8e8e8] px-4 py-3 font-medium"
								onClick={() => {
									setDraft(null);
									setSection(draft.id === MYSELF_ID ? "home" : "contacts");
								}}
							>
								取消
							</button>
							<button
								type="button"
								className="flex-1 rounded-2xl bg-[#07c160] px-4 py-3 font-medium text-white"
								onClick={saveDraft}
							>
								保存
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default MobileCreatorPanel;
