import { useCompactRuntime } from "@/runtime/compact";
import { EConversationType, type TConversationItem } from "@/stateV2/conversation";
import { Node } from "slate";
import {
	type PointerEvent as ReactPointerEvent,
	type PropsWithChildren,
	useRef,
	useState,
} from "react";

type Props = {
	item: TConversationItem;
	onDelete: (id: TConversationItem["id"]) => void;
	onRecall: (id: TConversationItem["id"]) => void;
	onEditText: (id: TConversationItem["id"], text: string) => void;
};

type MenuPoint = { x: number; y: number };

const textOf = (item: TConversationItem) => {
	if (item.type !== EConversationType.text) return "";
	return item.textContent.map((node) => Node.string(node)).join("\n").trim();
};

const copyText = async (text: string) => {
	if (!text) return;
	try {
		await navigator.clipboard.writeText(text);
		return;
	} catch {
		// Safari in standalone mode can deny clipboard without a direct permission grant.
	}
	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	document.body.appendChild(textarea);
	textarea.select();
	document.execCommand("copy");
	textarea.remove();
};

const MobileMessageActions = ({
	item,
	children,
	onDelete,
	onRecall,
	onEditText,
}: PropsWithChildren<Props>) => {
	const compact = useCompactRuntime();
	const holdTimer = useRef<number | null>(null);
	const startPoint = useRef<MenuPoint | null>(null);
	const [menuPoint, setMenuPoint] = useState<MenuPoint | null>(null);
	const [editing, setEditing] = useState(false);
	const [editValue, setEditValue] = useState("");

	if (!compact) return <>{children}</>;

	const clearHold = () => {
		if (holdTimer.current !== null) {
			window.clearTimeout(holdTimer.current);
			holdTimer.current = null;
		}
	};

	const openMenuAt = (x: number, y: number) => {
		clearHold();
		const clampedX = Math.min(Math.max(x, 90), window.innerWidth - 90);
		const clampedY = Math.min(Math.max(y, 84), window.innerHeight - 160);
		setMenuPoint({ x: clampedX, y: clampedY });
	};

	const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return;
		startPoint.current = { x: event.clientX, y: event.clientY };
		clearHold();
		holdTimer.current = window.setTimeout(() => {
			openMenuAt(event.clientX, event.clientY);
			if ("vibrate" in navigator) navigator.vibrate?.(15);
		}, 560);
	};

	const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		const start = startPoint.current;
		if (!start) return;
		if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 9) clearHold();
	};

	const closeMenu = () => setMenuPoint(null);
	const plainText = textOf(item);
	const isText = item.type === EConversationType.text;

	return (
		<div
			data-testid={`mobile-message-action-${item.id}`}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={clearHold}
			onPointerCancel={clearHold}
			onContextMenu={(event) => {
				event.preventDefault();
				openMenuAt(event.clientX, event.clientY);
			}}
		>
			{children}

			{menuPoint && (
				<div className="fixed inset-0 z-[850]" data-testid="mobile-message-menu">
					<button
						type="button"
						aria-label="关闭消息菜单"
						className="absolute inset-0 h-full w-full bg-transparent"
						onClick={closeMenu}
					/>
					<div
						className="absolute flex -translate-x-1/2 -translate-y-full overflow-hidden rounded-lg bg-[#4c4c4c] px-1 text-white shadow-lg"
						style={{ left: menuPoint.x, top: menuPoint.y - 8 }}
					>
						{isText && (
							<button
								type="button"
								className="whitespace-nowrap px-3.5 py-2.5 text-[14px] active:bg-white/10"
								onClick={async () => {
									await copyText(plainText);
									closeMenu();
								}}
							>
								复制
							</button>
						)}
						{isText && (
							<button
								type="button"
								className="whitespace-nowrap px-3.5 py-2.5 text-[14px] active:bg-white/10"
								onClick={() => {
									setEditValue(plainText);
									setEditing(true);
									closeMenu();
								}}
							>
								编辑
							</button>
						)}
						{item.role === "mine" && (
							<button
								type="button"
								className="whitespace-nowrap px-3.5 py-2.5 text-[14px] active:bg-white/10"
								onClick={() => {
									onRecall(item.id);
									closeMenu();
								}}
							>
								撤回
							</button>
						)}
						<button
							type="button"
							className="whitespace-nowrap px-3.5 py-2.5 text-[14px] active:bg-white/10"
							onClick={() => {
								onDelete(item.id);
								closeMenu();
							}}
						>
							删除
						</button>
						<div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-[#4c4c4c]" />
					</div>
				</div>
			)}

			{editing && isText && (
				<div className="fixed inset-0 z-[900] flex items-end bg-black/30" data-testid="mobile-message-editor">
					<button
						type="button"
						aria-label="取消编辑消息"
						className="absolute inset-0 h-full w-full bg-transparent"
						onClick={() => setEditing(false)}
					/>
					<div
						className="relative w-full rounded-t-[18px] bg-[#f7f7f7] px-4 pt-3"
						style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
					>
						<div className="mb-3 flex items-center justify-between">
							<button type="button" className="px-1 py-2 text-[15px] text-black/55" onClick={() => setEditing(false)}>
								取消
							</button>
							<div className="font-medium text-[16px]">编辑消息</div>
							<button
								type="button"
								className="rounded-lg bg-[#07c160] px-4 py-2 text-[14px] text-white disabled:opacity-40"
								disabled={!editValue.trim()}
								onClick={() => {
									const value = editValue.trim();
									if (!value) return;
									onEditText(item.id, value);
									setEditing(false);
								}}
							>
								完成
							</button>
						</div>
						<textarea
							aria-label="编辑消息内容"
							className="min-h-28 w-full resize-none rounded-xl bg-white p-3 text-[17px] leading-6 outline-none"
							value={editValue}
							onChange={(event) => setEditValue(event.target.value)}
							autoFocus
						/>
					</div>
				</div>
			)}
		</div>
	);
};

export default MobileMessageActions;
