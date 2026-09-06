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
import { useSetAtom } from "jotai";
import { isArray, keys } from "lodash-es";
import { useRef, useState } from "react";
import { useConversationAPI } from "../context";
import BottomPopup from "./BottomPopup";
import EmojiPanel from "./EmojiPanel";
import Input from "./Input";
import MobileCreatorPanel from "./MobileCreatorPanel";

const ConversationFooter = () => {
	const [showEmojiPanel, setShowEmojiPanel] = useState(false);
	const [showCreatorPanel, setShowCreatorPanel] = useState(false);
	const [voiceMode, setVoiceMode] = useState(false);
	const [voiceRecording, setVoiceRecording] = useState(false);
	const voiceStartedAtRef = useRef<number | null>(null);
	const compact = useCompactRuntime();
	const { sendVoice } = useConversationAPI();
	const setMode = useSetAtom(modeAtom);
	const setActivatedNode = useSetAtom(activatedNodeAtom);
	const inputComponentProps = compact ? { showEmojiPanel, setShowEmojiPanel } : {};

	const focusTextInput = () => {
		window.setTimeout(() => {
			(document.getElementById("conversation-input") as HTMLElement | null)?.focus();
		}, 0);
	};

	const toggleVoiceMode = () => {
		setShowEmojiPanel(false);
		setShowCreatorPanel(false);
		setVoiceRecording(false);
		voiceStartedAtRef.current = null;
		setVoiceMode((value) => {
			const next = !value;
			if (!next) focusTextInput();
			return next;
		});
	};

	const startVoiceRecording = (event: React.PointerEvent<HTMLButtonElement>) => {
		voiceStartedAtRef.current = performance.now();
		setVoiceRecording(true);
		event.currentTarget.setPointerCapture?.(event.pointerId);
	};

	const finishVoiceRecording = (cancelled = false) => {
		const startedAt = voiceStartedAtRef.current;
		voiceStartedAtRef.current = null;
		setVoiceRecording(false);
		if (startedAt === null || cancelled) return;
		const elapsed = performance.now() - startedAt;
		if (elapsed < 450) return;
		sendVoice({ duration: Math.min(60, Math.max(1, Math.round(elapsed / 1000))) });
	};

	const toggleEmojiPanel = () => {
		setVoiceMode(false);
		setShowCreatorPanel(false);
		setShowEmojiPanel((value) => !value);
	};

	const openCreatorOrDesktopEditor = () => {
		if (compact) {
			setVoiceMode(false);
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
						aria-label={voiceMode ? "返回键盘" : "切换到语音"}
						className="mb-[5px] h-[32px] w-[32px] shrink-0 cursor-pointer"
						onClick={toggleVoiceMode}
					>
						{voiceMode ? (
							<KeyboardOutlinedSVG fill="#000" className="h-full w-full" />
						) : (
							<VoiceSVG fill="#000" className="h-full w-full" />
						)}
					</button>
					{compact && voiceMode ? (
						<button
							type="button"
							aria-label="按住说话"
							className={`min-h-[42px] min-w-0 flex-1 select-none rounded-[5px] bg-white px-[11px] py-[8px] text-center text-[17px] leading-[24px] active:bg-[#dedede] ${
								voiceRecording ? "bg-[#dedede]" : ""
							}`}
							onPointerDown={startVoiceRecording}
							onPointerUp={() => finishVoiceRecording(false)}
							onPointerCancel={() => finishVoiceRecording(true)}
							onContextMenu={(event) => event.preventDefault()}
						>
							{voiceRecording ? "松开 发送" : "按住 说话"}
						</button>
					) : (
						<Input {...inputComponentProps} />
					)}
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
					<button
						type="button"
						aria-label="更多聊天创作功能"
						className="mb-[5px] h-[32px] w-[32px] shrink-0 cursor-pointer"
						onClick={openCreatorOrDesktopEditor}
					>
						<Add2OutlinedSVG fill="#000" className="h-full w-full" />
					</button>
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
