import Add2OutlinedSVG from "@/assets/add2-outlined.svg?react";
import KeyboardOutlinedSVG from "@/assets/keyboard-outlined.svg?react";
import StickerOutlinedSVG from "@/assets/sticker-outlined.svg?react";
import VoiceSVG from "@/assets/voice-outlined.svg?react";
import { useCompactRuntime } from "@/runtime/compact";
import {
	EMetaDataType,
	activatedNodeAtom,
	getNodeInjectMetaDataValueSnapshot,
} from "@/stateV2/detectedNode";
import { getNodesAtomsValueSnapshot } from "@/stateV2/detectedNode/nodeAtom";
import { modeAtom } from "@/stateV2/mode";
import { SLATE_INITIAL_VALUE } from "@/wechatComponents/SlateText/utils";
import { useSetAtom } from "jotai";
import { isArray, isEqual, keys } from "lodash-es";
import { useRef, useState } from "react";
import type { Descendant } from "slate";
import { useConversationAPI } from "../context";
import BottomPopup from "./BottomPopup";
import EmojiPanel from "./EmojiPanel";
import Input from "./Input";
import MobileCreatorPanel from "./MobileCreatorPanel";

const ConversationFooter = () => {
	const [showEmojiPanel, setShowEmojiPanel] = useState(false);
	const [showCreatorPanel, setShowCreatorPanel] = useState(false);
	const [hasDraft, setHasDraft] = useState(false);
	const [visibleDraft, setVisibleDraft] = useState("");
	const lastTouchSendAtRef = useRef(0);
	const compact = useCompactRuntime();
	const { inputEditor, sendTextMessage } = useConversationAPI();
	const setMode = useSetAtom(modeAtom);
	const setActivatedNode = useSetAtom(activatedNodeAtom);
	const inputComponentProps = {
		onDraftPresenceChange: setHasDraft,
		onVisibleDraftChange: setVisibleDraft,
		...(compact ? { showEmojiPanel, setShowEmojiPanel } : {}),
	};

	const toggleEmojiPanel = () => {
		setShowCreatorPanel(false);
		setShowEmojiPanel((value) => !value);
	};

	const sendCurrentMessage = () => {
		const cleanedVisibleDraft = visibleDraft.replace(/[\u200B\uFEFF]/g, "");
		const liveEditorValue = inputEditor.children as Descendant[];
		let valueToSend = liveEditorValue;

		if (isEqual(liveEditorValue, SLATE_INITIAL_VALUE) && cleanedVisibleDraft.length > 0) {
			valueToSend = [
				{
					type: "paragraph",
					children: [{ text: cleanedVisibleDraft }],
				},
			] as Descendant[];
		}

		if (isEqual(valueToSend, SLATE_INITIAL_VALUE)) return;
		setShowEmojiPanel(false);
		setShowCreatorPanel(false);
		// Pass the exact live draft through to storage. Do not rely on a second
		// atom read in the same event tick, which can diverge on iOS composition.
		sendTextMessage(valueToSend);
		setHasDraft(false);
		setVisibleDraft("");
	};

	const openCreatorOrDesktopEditor = () => {
		if (compact) {
			setShowEmojiPanel(false);
			setShowCreatorPanel((value) => !value);
			return;
		}
		setMode("edit");
		const nodesAtoms = getNodesAtomsValueSnapshot();
		for (const key of keys(nodesAtoms)) {
			const metaData = getNodeInjectMetaDataValueSnapshot(key);
			if (!isArray(metaData) && metaData?.type === EMetaDataType.ConversationList) {
				setActivatedNode(key);
				break;
			}
		}
	};

	return (
		<div className="flex shrink-0 flex-col">
			<div className="flex flex-col border-black/5 border-t bg-[#F6F6F6] px-[10px] py-[7px]">
				<div className="flex min-h-[42px] w-full items-end space-x-[8px]">
					<button
						type="button"
						aria-label="添加语音消息"
						className="mb-[5px] h-[32px] w-[32px] shrink-0 cursor-pointer"
						onClick={openCreatorOrDesktopEditor}
					>
						<VoiceSVG fill="#000" className="h-full w-full" />
					</button>
					<Input {...inputComponentProps} />
					<button
						type="button"
						aria-label={showEmojiPanel ? "返回键盘" : "表情"}
						className="mb-[5px] h-[32px] w-[32px] shrink-0 cursor-pointer"
						onClick={toggleEmojiPanel}
					>
						{showEmojiPanel ? (
							<KeyboardOutlinedSVG fill="#000" className="h-full w-full" />
						) : (
							<StickerOutlinedSVG fill="#000" className="h-full w-full" />
						)}
					</button>
					{hasDraft ? (
						<button
							type="button"
							aria-label="发送消息"
							className="mb-[4px] h-[34px] shrink-0 rounded-[5px] bg-[#07c160] px-[12px] font-medium text-[15px] text-white active:bg-[#06ad56]"
							onPointerDown={(event) => {
								if (event.pointerType !== "touch") return;
								event.preventDefault();
								lastTouchSendAtRef.current = Date.now();
								sendCurrentMessage();
							}}
							onClick={() => {
								if (Date.now() - lastTouchSendAtRef.current < 700) return;
								sendCurrentMessage();
							}}
						>
							发送
						</button>
					) : (
						<button
							type="button"
							aria-label="更多聊天创作功能"
							className="mb-[5px] h-[32px] w-[32px] shrink-0 cursor-pointer"
							onClick={openCreatorOrDesktopEditor}
						>
							<Add2OutlinedSVG fill="#000" className="h-full w-full" />
						</button>
					)}
				</div>
			</div>
			<BottomPopup show={showEmojiPanel}>
				<EmojiPanel />
			</BottomPopup>
			<BottomPopup show={showCreatorPanel}>
				<MobileCreatorPanel />
			</BottomPopup>
		</div>
	);
};

export default ConversationFooter;
