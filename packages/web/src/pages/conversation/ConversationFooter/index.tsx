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

const ConversationFooter = () => {
	const [showEmojiPanel, setShowEmojiPanel] = useState(false);
	const compact = useCompactRuntime();
	const setMode = useSetAtom(modeAtom);
	const setActivatedNode = useSetAtom(activatedNodeAtom);
	const inputComponentProps = compact ? { showEmojiPanel, setShowEmojiPanel } : {};

	const openDesktopConversationEditor = () => {
		if (compact) return;
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
					<VoiceSVG fill="#000" className="mb-[5px] h-[32px] w-[32px] shrink-0" />
					<Input {...inputComponentProps} />
					{showEmojiPanel ? (
						<KeyboardOutlinedSVG
							fill="#000"
							className="mb-[5px] h-[32px] w-[32px] shrink-0 cursor-pointer"
							onClick={() => setShowEmojiPanel((v) => !v)}
						/>
					) : (
						<StickerOutlinedSVG
							fill="#000"
							className="mb-[5px] h-[32px] w-[32px] shrink-0 cursor-pointer"
							onClick={() => setShowEmojiPanel((v) => !v)}
						/>
					)}
					<Add2OutlinedSVG
						fill="#000"
						className="mb-[5px] h-[32px] w-[32px] shrink-0 cursor-pointer"
						onClick={openDesktopConversationEditor}
					/>
				</div>
			</div>
			<BottomPopup show={showEmojiPanel}>
				<EmojiPanel />
			</BottomPopup>
		</div>
	);
};

export default ConversationFooter;
