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
import { useState } from "react";
import BottomPopup from "./BottomPopup";
import EmojiPanel from "./EmojiPanel";
import Input from "./Input";
import MobileCreatorPanel from "./MobileCreatorPanel";

const ConversationFooter = () => {
	const [showEmojiPanel, setShowEmojiPanel] = useState(false);
	const [showCreatorPanel, setShowCreatorPanel] = useState(false);
	const compact = useCompactRuntime();
	const setMode = useSetAtom(modeAtom);
	const setActivatedNode = useSetAtom(activatedNodeAtom);
	const inputComponentProps = compact ? { showEmojiPanel, setShowEmojiPanel } : {};

	const toggleEmojiPanel = () => {
		setShowCreatorPanel(false);
		setShowEmojiPanel((value) => !value);
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
