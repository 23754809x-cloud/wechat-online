import HashAssets from "@/components/HashAssets";
import { MYSELF_ID } from "@/faker/user";
import { useCompactRuntime } from "@/runtime/compact";
import { allGroupsAtom } from "@/stateV2/group";
import { allProfilesAtom } from "@/stateV2/profile";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";

type Props = {
	groupId: string;
	open: boolean;
	onClose: () => void;
};

const MobileGroupSettings = ({ groupId, open, onClose }: Props) => {
	const compact = useCompactRuntime();
	const [groups, setGroups] = useAtom(allGroupsAtom);
	const profiles = useAtomValue(allProfilesAtom);
	const group = useMemo(() => groups.find((item) => item.id === groupId), [groups, groupId]);
	const [name, setName] = useState("");
	const [announcement, setAnnouncement] = useState("");
	const [memberIds, setMemberIds] = useState<string[]>([]);
	const [displayMemberCount, setDisplayMemberCount] = useState("");

	useEffect(() => {
		if (!open || !group) return;
		setName(group.name);
		setAnnouncement(group.announcement ?? "");
		setMemberIds([...group.memberIds]);
		setDisplayMemberCount(group.displayMemberCount?.toString() ?? "");
	}, [group, open]);

	if (!compact || !open || !group) return null;

	const toggleMember = (id: string) => {
		if (id === MYSELF_ID) return;
		setMemberIds((prev) =>
			prev.includes(id) ? prev.filter((memberId) => memberId !== id) : [...prev, id],
		);
	};

	const save = () => {
		const cleanName = name.trim();
		if (!cleanName) return;
		const parsedDisplayCount = Number(displayMemberCount);
		const normalizedMemberIds = Array.from(new Set([MYSELF_ID, ...memberIds]));
		setGroups((prev) =>
			prev.map((item) =>
				item.id === groupId
					? {
							...item,
							name: cleanName,
							announcement: announcement.trim() || undefined,
							memberIds: normalizedMemberIds,
							ownerId: normalizedMemberIds.includes(item.ownerId) ? item.ownerId : MYSELF_ID,
							displayMemberCount:
								Number.isFinite(parsedDisplayCount) && parsedDisplayCount > 0
									? Math.round(parsedDisplayCount)
									: undefined,
						}
					: item,
			),
		);
		onClose();
	};

	return (
		<div
			className="fixed inset-0 z-[980] flex flex-col bg-[#ededed] text-black"
			data-testid="mobile-group-settings"
			style={{
				paddingTop: "max(env(safe-area-inset-top), 8px)",
				paddingBottom: "max(env(safe-area-inset-bottom), 10px)",
			}}
		>
			<header className="grid h-12 shrink-0 grid-cols-[72px_1fr_72px] items-center border-black/5 border-b bg-[#ededed] px-3">
				<button type="button" className="text-left text-[15px]" onClick={onClose}>
					取消
				</button>
				<div className="text-center font-semibold text-[17px]">聊天信息</div>
				<button type="button" className="text-right text-[15px] text-[#07c160]" onClick={save}>
					完成
				</button>
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto pb-6">
				<section className="bg-white px-4 py-4">
					<div className="grid grid-cols-5 gap-x-3 gap-y-4">
						{profiles
							.filter((profile) => memberIds.includes(profile.id))
							.map((profile) => (
								<button
									type="button"
									key={profile.id}
									className="min-w-0 text-center"
									onClick={() => toggleMember(profile.id)}
								>
									<HashAssets src={profile.avatarInfo} className="mx-auto h-12 w-12 rounded-[5px] object-cover" />
									<div className="mt-1 truncate text-[12px] text-black/55">
										{profile.id === MYSELF_ID ? "我" : profile.remark || profile.nickname}
									</div>
								</button>
							))}
					</div>
					<div className="mt-4 border-black/5 border-t pt-4">
						<div className="mb-2 text-[13px] text-black/45">添加群成员</div>
						<div className="flex flex-wrap gap-2">
							{profiles
								.filter((profile) => !memberIds.includes(profile.id) && profile.id !== MYSELF_ID)
								.map((profile) => (
									<button
										type="button"
										key={profile.id}
										className="rounded-full bg-[#f2f2f2] px-3 py-2 text-[13px]"
										onClick={() => toggleMember(profile.id)}
									>
										+ {profile.remark || profile.nickname}
									</button>
								))}
						</div>
					</div>
				</section>

				<section className="mt-2 bg-white">
					<label className="flex items-center border-black/5 border-b px-4 py-3">
						<span className="w-24 shrink-0 text-[16px]">群聊名称</span>
						<input
							aria-label="群聊名称"
							className="min-w-0 flex-1 bg-transparent text-right text-[16px] outline-none"
							value={name}
							onChange={(event) => setName(event.target.value)}
						/>
					</label>
					<label className="flex items-center px-4 py-3">
						<span className="w-32 shrink-0 text-[16px]">显示成员数量</span>
						<input
							aria-label="显示成员数量"
							inputMode="numeric"
							placeholder={memberIds.length.toString()}
							className="min-w-0 flex-1 bg-transparent text-right text-[16px] outline-none"
							value={displayMemberCount}
							onChange={(event) => setDisplayMemberCount(event.target.value.replace(/\D/g, ""))}
						/>
					</label>
				</section>

				<section className="mt-2 bg-white px-4 py-3">
					<div className="mb-2 text-[16px]">群公告</div>
					<textarea
						aria-label="群公告"
						placeholder="未设置"
						className="min-h-24 w-full resize-none bg-transparent text-[15px] leading-6 text-black/75 outline-none"
						value={announcement}
						onChange={(event) => setAnnouncement(event.target.value)}
					/>
				</section>

				<div className="px-4 pt-3 text-[12px] leading-5 text-black/35">
					点击已加入的成员可移除；“我”始终保留在群聊中。所有设置仅保存在当前浏览器设备。
				</div>
			</div>
		</div>
	);
};

export default MobileGroupSettings;
