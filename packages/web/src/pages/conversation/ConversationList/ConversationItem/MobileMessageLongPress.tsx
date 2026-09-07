import { useCompactRuntime } from "@/runtime/compact";
import {
	ConversationTypeLabel,
	EConversationType,
	conversationListAtom,
	type IConversationTypeText,
	type TConversationItem,
} from "@/stateV2/conversation";
import { setDialogueListValue } from "@/stateV2/dialogueList";
import { isGroupId } from "@/stateV2/group";
import { useAtom } from "jotai";
import { Node } from "slate";
import {
	type PointerEvent as ReactPointerEvent,
	type PropsWithChildren,
	useRef,
	useState,
} from "react";

type Props = PropsWithChildren<{
	item: TConversationItem;
	conversationId: string;
}>;

const textFromItem = (item: TConversationItem) => {
	if (item.type !== EConversationType.text) return "";
	return item.textContent.map((node) => Node.string(node)).join("").trim();
};

const previewFromItem = (item?: TConversationItem) => {
	if (!item) return "";
	if (item.type === EConversationType.text) return textFromItem(item) || "[文本]";
	if (item.type === EConversationType.voice) return "[语音]";
	if (item.type === EConversationType.transfer) return "[转账]";
	if (item.type === EConversationType.redPacket) return "[红包]";
	if (item.type === EConversationType.centerText) return item.simpleContent;
	return `[${ConversationTypeLabel[item.type]}]`;
};

const MobileMessageLongPress = ({ item, conversationId, children }: Props) => {
	const compact = useCompactRuntime();
	const [messages, setMessages] = useAtom(conversationListAtom(conversationId));
	const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
	const [editing, setEditing] = useState(false);
	const [editText, setEditText] = useState("");
	const [toast, setToast] = useState("");
	const timerRef = useRef<number | null>(null);
	const startRef = useRef<{ x: number; y: number } | null>(null);

	const clearTimer = () => {
		if (timerRef.current !== null) {
			window.clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};

	const syncDialogue = (next: TConversationItem[]) => {
		const preview = previewFromItem(next.at(-1));
		setDialogueListValue((prev) =>
			prev.map((dialogue) => {
				const matched = isGroupId(conversationId)
					? dialogue.groupId === conversationId
					: dialogue.friendId === conversationId;
				return matched ? { ...dialogue, lastMessage: preview } : dialogue;
			}),
		);
	};

	const replaceMessages = (updater: (prev: TConversationItem[]) => TConversationItem[]) => {
		setMessages((prev) => {
			const next = updater(prev);
			syncDialogue(next);
			return next;
		});
	};

	const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (!compact) return;
		clearTimer();
		startRef.current = { x: event.clientX, y: event.clientY };
		timerRef.current = window.setTimeout(() => {
			setMenu({ x: event.clientX, y: event.clientY });
			if (navigator.vibrate) navigator.vibrate(20);
		}, 520);
	};

	const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		const start = startRef.current;
		if (!start) return;
		if (Math.abs(event.clientX - start.x) > 10 || Math.abs(event.clientY - start.y) > 10) {
			clearTimer();
		}
	};

	const closeMenu = () => {
		clearTimer();
		setMenu(null);
		startRef.current = null;
	};

	const showToast = (message: string) => {
		setToast(message);
		window.setTimeout(() => setToast(""), 1200);
	};

	const copyText = async () => {
		const value = textFromItem(item);
		if (!value) return;
		try {
			await navigator.clipboard.writeText(value);
			showToast("已复制");
		} catch {
			showToast("复制失败");
		}
		closeMenu();
	};

	const beginEdit = () => {
		if (item.type !== EConversationType.text) return;
		setEditText(textFromItem(item));
		setEditing(true);
		setMenu(null);
	};

	const saveEdit = () => {
		const value = editText.trim();
		if (!value || item.type !== EConversationType.text) return;
		replaceMessages((prev) =>
			prev.map((message) =>
				message.id === item.id && message.type === EConversationType.text
					? {
						...message,
						textContent: [
							{ type: "paragraph", children: [{ text: value }] },
						] as IConversationTypeText["textContent"],
					}
					: message,
			),
		);
		setEditing(false);
		showToast("已修改");
	};

	const recallMessage = () => {
		if (item.role !== "mine") return;
		replaceMessages((prev) =>
			prev.map((message) =>
				message.id === item.id
					? ({
						id: message.id,
						type: EConversationType.centerText,
						role: "mine",
						simpleContent: "你撤回了一条消息",
						upperText: message.upperText,
						sendTimestamp: message.sendTimestamp,
					} as TConversationItem)
					: message,
			),
		);
		closeMenu();
		showToast("已撤回");
	};

	const deleteMessage = () => {
		replaceMessages((prev) => prev.filter((message) => message.id !== item.id));
		closeMenu();
		showToast("已删除");
	};

	if (!compact) return <>{children}</>;

	const menuStyle = menu
		? {
			left: Math.max(12, Math.min(menu.x - 90, window.innerWidth - 240)),
			top: Math.max(70, Math.min(menu.y - 66, window.innerHeight - 170)),
		}
		: undefined;

	return (
		<div
			className="contents"
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={closeMenu}
			onPointerCancel={closeMenu}
			onContextMenu={(event) => event.preventDefault()}
		>
			{children}

			{menu && (
				<div className="fixed inset-0 z-[1450]" data-testid="mobile-message-menu-backdrop" onClick={closeMenu}>
					<div
						className="absolute flex overflow-hidden rounded-xl bg-[#2c2c2c] text-[13px] text-white shadow-xl"
						data-testid="mobile-message-menu"
						style={menuStyle}
						onClick={(event) => event.stopPropagation()}
					>
						{item.type === EConversationType.text && (
							<>
								<button type="button" className="px-4 py-3 active:bg-white/10" onClick={() => void copyText()}>复制</button>
								<button type="button" className="px-4 py-3 active:bg-white/10" onClick={beginEdit}>重新编辑</button>
							</>
						)}
						{item.role === "mine" && (
							<button type="button" className="px-4 py-3 active:bg-white/10" onClick={recallMessage}>撤回</button>
						)}
						<button type="button" className="px-4 py-3 active:bg-white/10" onClick={deleteMessage}>删除</button>
					</div>
				</div>
			)}

			{editing && item.type === EConversationType.text && (
				<div className="fixed inset-0 z-[1500] flex items-end bg-black/35" data-testid="mobile-message-edit-sheet" onClick={() => setEditing(false)}>
					<div
						className="w-full rounded-t-3xl bg-[#f5f5f5] p-4"
						style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
						onClick={(event) => event.stopPropagation()}
					>
						<div className="mb-3 text-center font-medium">重新编辑消息</div>
						<textarea
							aria-label="重新编辑消息"
							className="min-h-24 w-full resize-none rounded-xl bg-white p-3 text-[16px] outline-none"
							value={editText}
							onChange={(event) => setEditText(event.target.value)}
						/>
						<div className="mt-3 flex gap-2">
							<button type="button" className="flex-1 rounded-xl bg-white py-3" onClick={() => setEditing(false)}>取消</button>
							<button type="button" className="flex-1 rounded-xl bg-[#07c160] py-3 text-white" onClick={saveEdit}>保存</button>
						</div>
					</div>
				</div>
			)}

			{toast && (
				<div className="fixed top-1/2 left-1/2 z-[1600] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/75 px-4 py-2 text-sm text-white" data-testid="mobile-message-toast">
					{toast}
				</div>
			)}
		</div>
	);
};

export default MobileMessageLongPress;
