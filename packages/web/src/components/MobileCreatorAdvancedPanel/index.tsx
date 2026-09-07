import HashAssets from "@/components/HashAssets";
import { MYSELF_ID } from "@/faker/user";
import { useCompactRuntime } from "@/runtime/compact";
import {
	ConversationTypeLabel,
	EConversationType,
	conversationListAtom,
	type IConversationTypeText,
	type TConversationItem,
} from "@/stateV2/conversation";
import { dialogueListAtom } from "@/stateV2/dialogueList";
import {
	allGroupsAtom,
	generateGroupId,
	isGroupId,
	type IStateGroup,
} from "@/stateV2/group";
import { allProfilesAtom, type IStateProfile } from "@/stateV2/profile";
import { useAtom } from "jotai";
import { Node } from "slate";
import { useEffect, useMemo, useState } from "react";

type Section = "home" | "chat" | "contacts" | "groups" | "group-edit";

const cardClass = "w-full rounded-2xl bg-white p-4 text-left shadow-sm";
const inputClass =
	"w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[16px] outline-none focus:border-[#07c160]";

const getMessagePreview = (item?: TConversationItem) => {
	if (!item) return "";
	if (item.type === EConversationType.text) {
		return item.textContent.map((node) => Node.string(node)).join("").trim() || "[文本]";
	}
	if (item.type === EConversationType.voice) return `[语音 ${item.duration}'' ]`;
	if (item.type === EConversationType.transfer) return `[转账 ¥${item.amount}]`;
	if (item.type === EConversationType.redPacket) return "[红包]";
	if (item.type === EConversationType.centerText) return item.simpleContent;
	return `[${ConversationTypeLabel[item.type]}]`;
};

const ChatRecordEditor = ({ conversationId }: { conversationId: string }) => {
	const [messages, setMessages] = useAtom(conversationListAtom(conversationId));
	const [, setDialogues] = useAtom(dialogueListAtom);
	const [profiles] = useAtom(allProfilesAtom);
	const [groups] = useAtom(allGroupsAtom);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editText, setEditText] = useState("");
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	const group = isGroupId(conversationId)
		? groups.find((item) => item.id === conversationId)
		: undefined;

	const syncPreview = (next: TConversationItem[]) => {
		const preview = getMessagePreview(next.at(-1));
		setDialogues((prev) =>
			prev.map((dialogue) => {
				const matched = group
					? dialogue.groupId === conversationId
					: dialogue.friendId === conversationId;
				return matched ? { ...dialogue, lastMessage: preview } : dialogue;
			}),
		);
	};

	const replaceMessages = (updater: (prev: TConversationItem[]) => TConversationItem[]) => {
		setMessages((prev) => {
			const next = updater(prev);
			syncPreview(next);
			return next;
		});
	};

	const startTextEdit = (item: IConversationTypeText) => {
		setEditingId(item.id);
		setEditText(item.textContent.map((node) => Node.string(node)).join(""));
	};

	const saveTextEdit = (id: string) => {
		const value = editText.trim();
		if (!value) return;
		replaceMessages((prev) =>
			prev.map((item) =>
				item.id === id && item.type === EConversationType.text
					? {
						...item,
						textContent: [
							{ type: "paragraph", children: [{ text: value }] },
						] as IConversationTypeText["textContent"],
					}
					: item,
			),
		);
		setEditingId(null);
	};

	const setPrivateSender = (id: string, role: "mine" | "friend") => {
		replaceMessages((prev) => prev.map((item) => (item.id === id ? { ...item, role } : item)));
	};

	const setGroupSender = (id: string, senderId: string) => {
		replaceMessages((prev) =>
			prev.map((item) =>
				item.id === id
					? {
						...item,
						senderId,
						role: senderId === MYSELF_ID ? "mine" : "friend",
					}
					: item,
			),
		);
	};

	const deleteMessage = (id: string) => {
		if (pendingDeleteId !== id) {
			setPendingDeleteId(id);
			return;
		}
		replaceMessages((prev) => prev.filter((item) => item.id !== id));
		setPendingDeleteId(null);
	};

	return (
		<div className="space-y-3" data-testid="advanced-chat-record-editor">
			{messages.length === 0 && (
				<div className="rounded-2xl bg-white p-5 text-center text-sm text-black/40">暂无聊天记录</div>
			)}
			{messages.map((item, index) => {
				const senderProfile = item.senderId
					? profiles.find((profile) => profile.id === item.senderId)
					: undefined;
				return (
					<div key={item.id} className="rounded-2xl bg-white p-3 shadow-sm" data-message-id={item.id}>
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0 flex-1">
								<div className="text-xs text-black/35">
									#{index + 1} · {ConversationTypeLabel[item.type]} · {item.role === "mine" ? "我" : senderProfile?.remark || senderProfile?.nickname || "对方"}
								</div>
								<div className="mt-1 break-words text-[15px] leading-5">{getMessagePreview(item)}</div>
							</div>
							<button
								type="button"
								className={pendingDeleteId === item.id ? "rounded-lg bg-red-500 px-3 py-2 text-xs text-white" : "rounded-lg bg-[#f2f2f2] px-3 py-2 text-xs"}
								onClick={() => deleteMessage(item.id)}
							>
								{pendingDeleteId === item.id ? "确认删除" : "删除"}
							</button>
						</div>

						{editingId === item.id && item.type === EConversationType.text ? (
							<div className="mt-3 space-y-2">
								<textarea
									aria-label="编辑聊天文本"
									className={`${inputClass} min-h-20 resize-none`}
									value={editText}
									onChange={(event) => setEditText(event.target.value)}
								/>
								<div className="flex gap-2">
									<button type="button" className="flex-1 rounded-xl bg-[#07c160] py-2 text-sm text-white" onClick={() => saveTextEdit(item.id)}>保存文字</button>
									<button type="button" className="flex-1 rounded-xl bg-[#f2f2f2] py-2 text-sm" onClick={() => setEditingId(null)}>取消</button>
								</div>
							</div>
						) : (
							<div className="mt-3 flex flex-wrap items-center gap-2">
								{item.type === EConversationType.text && (
									<button type="button" className="rounded-lg bg-[#f2f2f2] px-3 py-2 text-xs" onClick={() => startTextEdit(item)}>修改文字</button>
								)}
								{group ? (
									<select
										aria-label="群消息发送者"
										className="rounded-lg bg-[#f2f2f2] px-2 py-2 text-xs"
										value={item.senderId ?? (item.role === "mine" ? MYSELF_ID : group.memberIds.find((id) => id !== MYSELF_ID) ?? MYSELF_ID)}
										onChange={(event) => setGroupSender(item.id, event.target.value)}
									>
										{group.memberIds.map((memberId) => {
											const profile = profiles.find((profile) => profile.id === memberId);
											return <option key={memberId} value={memberId}>{memberId === MYSELF_ID ? "我" : profile?.remark || profile?.nickname || memberId}</option>;
										})}
									</select>
								) : (
									<div className="flex rounded-lg bg-[#f2f2f2] p-1 text-xs">
										<button type="button" className={item.role === "mine" ? "rounded-md bg-white px-3 py-1 shadow-sm" : "px-3 py-1"} onClick={() => setPrivateSender(item.id, "mine")}>我</button>
										<button type="button" className={item.role === "friend" ? "rounded-md bg-white px-3 py-1 shadow-sm" : "px-3 py-1"} onClick={() => setPrivateSender(item.id, "friend")}>对方</button>
									</div>
								)}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
};

const MobileCreatorAdvancedPanel = () => {
	const compact = useCompactRuntime();
	const [creatorOpen, setCreatorOpen] = useState(false);
	const [open, setOpen] = useState(false);
	const [section, setSection] = useState<Section>("home");
	const [profiles, setProfiles] = useAtom(allProfilesAtom);
	const [groups, setGroups] = useAtom(allGroupsAtom);
	const [, setDialogues] = useAtom(dialogueListAtom);
	const [selectedConversationId, setSelectedConversationId] = useState<string>("");
	const [groupDraft, setGroupDraft] = useState<IStateGroup | null>(null);
	const [pendingContactDeleteId, setPendingContactDeleteId] = useState<string | null>(null);

	const friends = useMemo(() => profiles.filter((profile) => profile.id !== MYSELF_ID), [profiles]);
	const chatTargets = useMemo(
		() => [
			...friends.map((profile) => ({ id: profile.id, label: profile.remark || profile.nickname, kind: "单聊" })),
			...groups.map((group) => ({ id: group.id, label: group.name, kind: "群聊" })),
		],
		[friends, groups],
	);

	useEffect(() => {
		if (!compact) return;
		const root = document.documentElement;
		const sync = () => setCreatorOpen(root.dataset.creatorOpen === "true");
		sync();
		const observer = new MutationObserver(sync);
		observer.observe(root, { attributes: true, attributeFilter: ["data-creator-open"] });
		return () => observer.disconnect();
	}, [compact]);

	useEffect(() => {
		if (!creatorOpen) {
			setOpen(false);
			setSection("home");
			setGroupDraft(null);
		}
	}, [creatorOpen]);

	if (!compact || !creatorOpen) return null;

	const deleteContact = (id: IStateProfile["id"]) => {
		if (pendingContactDeleteId !== id) {
			setPendingContactDeleteId(id);
			return;
		}
		setProfiles((prev) => prev.filter((profile) => profile.id !== id));
		setGroups((prev) =>
			prev.map((group) => {
				const memberIds = group.memberIds.filter((memberId) => memberId !== id);
				const safeMembers = memberIds.includes(MYSELF_ID) ? memberIds : [MYSELF_ID, ...memberIds];
				return {
					...group,
					memberIds: safeMembers,
					ownerId: group.ownerId === id ? MYSELF_ID : group.ownerId,
				};
			}),
		);
		setDialogues((prev) => prev.filter((dialogue) => dialogue.friendId !== id));
		setPendingContactDeleteId(null);
	};

	const createGroup = () => {
		const next: IStateGroup = {
			id: generateGroupId(),
			name: "新群聊",
			memberIds: [MYSELF_ID],
			ownerId: MYSELF_ID,
		};
		setGroupDraft({ ...next, memberIds: [...next.memberIds] });
		setSection("group-edit");
	};

	const beginGroupEdit = (group: IStateGroup) => {
		setGroupDraft({ ...group, memberIds: [...group.memberIds] });
		setSection("group-edit");
	};

	const toggleGroupMember = (memberId: string) => {
		if (!groupDraft || memberId === MYSELF_ID) return;
		setGroupDraft((prev) => {
			if (!prev) return prev;
			const memberIds = prev.memberIds.includes(memberId)
				? prev.memberIds.filter((id) => id !== memberId)
				: [...prev.memberIds, memberId];
			const ownerId = memberIds.includes(prev.ownerId) ? prev.ownerId : MYSELF_ID;
			return { ...prev, memberIds, ownerId };
		});
	};

	const saveGroup = () => {
		if (!groupDraft) return;
		const name = groupDraft.name.trim();
		if (!name) return;
		const memberIds = groupDraft.memberIds.includes(MYSELF_ID)
			? groupDraft.memberIds
			: [MYSELF_ID, ...groupDraft.memberIds];
		const ownerId = memberIds.includes(groupDraft.ownerId) ? groupDraft.ownerId : MYSELF_ID;
		const next = {
			...groupDraft,
			name,
			announcement: groupDraft.announcement?.trim() || undefined,
			memberIds,
			ownerId,
		};
		setGroups((prev) => {
			const exists = prev.some((group) => group.id === next.id);
			return exists
				? prev.map((group) => (group.id === next.id ? next : group))
				: [...prev, next];
		});
		setGroupDraft(null);
		setSection("groups");
	};

	const title = section === "home" ? "高级创作" : section === "chat" ? "聊天记录管理" : section === "contacts" ? "联系人整理" : section === "groups" ? "群聊管理" : "群聊编辑";

	return (
		<>
			{!open && (
				<button
					type="button"
					data-testid="advanced-creator-entry"
					className="fixed right-4 z-[1100] rounded-full bg-black/80 px-4 py-2 text-sm text-white shadow-lg"
					style={{ bottom: "max(env(safe-area-inset-bottom), 16px)" }}
					onClick={() => setOpen(true)}
				>
					高级
				</button>
			)}
			{open && (
				<div
					className="fixed inset-0 z-[1200] flex flex-col overflow-hidden bg-[#f5f5f5] text-black"
					data-testid="advanced-creator-center"
					style={{ paddingTop: "max(env(safe-area-inset-top), 10px)", paddingBottom: "max(env(safe-area-inset-bottom), 10px)" }}
				>
					<header className="flex h-12 shrink-0 items-center justify-between border-black/5 border-b bg-white px-4">
						<button
							type="button"
							className="min-w-16 text-left text-[15px] text-black/60"
							onClick={() => {
								if (section === "home") setOpen(false);
								else if (section === "group-edit") {
									setGroupDraft(null);
									setSection("groups");
								} else setSection("home");
							}}
						>
							返回
						</button>
						<div className="font-medium text-[17px]">{title}</div>
						<div className="min-w-16 text-right text-xs text-black/30">本机保存</div>
					</header>

					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
						{section === "home" && (
							<div className="space-y-3">
								<button type="button" data-testid="advanced-chat-entry" className={cardClass} onClick={() => setSection("chat")}>
									<div className="font-medium text-[16px]">聊天记录管理</div>
									<div className="mt-1 text-sm text-black/45">修改已有文字、删除消息、调整发送者</div>
								</button>
								<button type="button" data-testid="advanced-group-entry" className={cardClass} onClick={() => setSection("groups")}>
									<div className="font-medium text-[16px]">群聊管理</div>
									<div className="mt-1 text-sm text-black/45">新建群聊、群名、公告、成员、群主</div>
								</button>
								<button type="button" data-testid="advanced-contact-entry" className={cardClass} onClick={() => setSection("contacts")}>
									<div className="font-medium text-[16px]">联系人整理</div>
									<div className="mt-1 text-sm text-black/45">安全删除联系人并同步移出群聊和会话列表</div>
								</button>
							</div>
						)}

						{section === "chat" && (
							<div className="space-y-4">
								<select
									aria-label="选择要管理的聊天"
									className={inputClass}
									value={selectedConversationId}
									onChange={(event) => setSelectedConversationId(event.target.value)}
								>
									<option value="">选择单聊或群聊</option>
									{chatTargets.map((target) => <option key={target.id} value={target.id}>{target.kind} · {target.label}</option>)}
								</select>
								{selectedConversationId && <ChatRecordEditor conversationId={selectedConversationId} />}
							</div>
						)}

						{section === "contacts" && (
							<div className="space-y-3" data-testid="advanced-contact-cleanup">
								<div className="rounded-2xl bg-white p-4 text-sm leading-5 text-black/45 shadow-sm">删除联系人会同步从群成员和首页会话列表移除，但不会主动清空该联系人的历史聊天存储。</div>
								{friends.map((friend) => (
									<div key={friend.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
										<HashAssets src={friend.avatarInfo} className="h-12 w-12 rounded-xl object-cover" />
										<div className="min-w-0 flex-1">
											<div className="truncate font-medium">{friend.remark || friend.nickname}</div>
											<div className="truncate text-xs text-black/40">{friend.wechat}</div>
										</div>
										<button
											type="button"
											data-testid={`delete-contact-${friend.id}`}
											className={pendingContactDeleteId === friend.id ? "rounded-lg bg-red-500 px-3 py-2 text-xs text-white" : "rounded-lg bg-[#f2f2f2] px-3 py-2 text-xs text-red-500"}
											onClick={() => deleteContact(friend.id)}
										>
											{pendingContactDeleteId === friend.id ? "确认删除" : "删除"}
										</button>
									</div>
								))}
							</div>
						)}

						{section === "groups" && (
							<div className="space-y-3" data-testid="advanced-group-manager">
								<button type="button" className="w-full rounded-2xl bg-[#07c160] px-4 py-3 font-medium text-white" onClick={createGroup}>+ 新建群聊</button>
								{groups.map((group) => (
									<div key={group.id} className="rounded-2xl bg-white p-4 shadow-sm">
										<div className="flex items-center justify-between gap-3">
											<div>
												<div className="font-medium">{group.name}</div>
												<div className="mt-1 text-xs text-black/40">{group.memberIds.length} 位成员</div>
											</div>
											<div className="flex gap-2">
												<button type="button" className="rounded-lg bg-[#f2f2f2] px-3 py-2 text-sm" onClick={() => beginGroupEdit(group)}>编辑</button>
												<button type="button" className="rounded-lg bg-[#f2f2f2] px-3 py-2 text-sm" onClick={() => { setOpen(false); window.location.hash = `/group-conversation/${encodeURIComponent(group.id)}`; }}>聊天</button>
											</div>
										</div>
									</div>
								))}
							</div>
						)}

						{section === "group-edit" && groupDraft && (
							<div className="space-y-4 pb-6" data-testid="advanced-group-editor">
								<div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
									<label className="block">
										<span className="mb-1.5 block text-xs text-black/45">群聊名称</span>
										<input aria-label="群聊名称" className={inputClass} value={groupDraft.name} onChange={(event) => setGroupDraft((prev) => prev ? { ...prev, name: event.target.value } : prev)} />
									</label>
									<label className="block">
										<span className="mb-1.5 block text-xs text-black/45">群公告</span>
										<textarea aria-label="群公告" className={`${inputClass} min-h-20 resize-none`} value={groupDraft.announcement ?? ""} onChange={(event) => setGroupDraft((prev) => prev ? { ...prev, announcement: event.target.value } : prev)} />
									</label>
									<label className="block">
										<span className="mb-1.5 block text-xs text-black/45">显示成员数量（留空自动）</span>
										<input aria-label="显示成员数量" inputMode="numeric" className={inputClass} value={groupDraft.displayMemberCount ?? ""} onChange={(event) => setGroupDraft((prev) => prev ? { ...prev, displayMemberCount: event.target.value ? Number(event.target.value) : undefined } : prev)} />
									</label>
								</div>

								<div className="rounded-2xl bg-white p-4 shadow-sm">
									<div className="mb-3 font-medium">群成员</div>
									<div className="space-y-2">
										{profiles.map((profile) => (
											<label key={profile.id} className="flex items-center gap-3 py-1">
												<input type="checkbox" checked={groupDraft.memberIds.includes(profile.id)} disabled={profile.id === MYSELF_ID} onChange={() => toggleGroupMember(profile.id)} />
												<HashAssets src={profile.avatarInfo} className="h-9 w-9 rounded-lg object-cover" />
												<span className="flex-1 text-sm">{profile.id === MYSELF_ID ? "我" : profile.remark || profile.nickname}</span>
											</label>
										))}
									</div>
								</div>

								<div className="rounded-2xl bg-white p-4 shadow-sm">
									<label className="block">
										<span className="mb-1.5 block text-xs text-black/45">群主</span>
										<select aria-label="群主" className={inputClass} value={groupDraft.ownerId} onChange={(event) => setGroupDraft((prev) => prev ? { ...prev, ownerId: event.target.value } : prev)}>
											{groupDraft.memberIds.map((memberId) => {
												const profile = profiles.find((profile) => profile.id === memberId);
												return <option key={memberId} value={memberId}>{memberId === MYSELF_ID ? "我" : profile?.remark || profile?.nickname || memberId}</option>;
											})}
										</select>
									</label>
								</div>

								<button type="button" className="w-full rounded-2xl bg-[#07c160] py-3.5 font-medium text-white" onClick={saveGroup}>保存群聊设置</button>
							</div>
						)}
					</div>
				</div>
			)}
		</>
	);
};

export default MobileCreatorAdvancedPanel;