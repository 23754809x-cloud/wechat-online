import { canBeDetected } from "@/components/NodeDetected";
import { useCompactRuntime } from "@/runtime/compact";
import { inputterValueAtom } from "@/stateV2/conversation";
import { EMetaDataType } from "@/stateV2/detectedNode";
import Element from "@/wechatComponents/SlateText/Element";
import { SLATE_INITIAL_VALUE } from "@/wechatComponents/SlateText/utils";
import { useSetAtom } from "jotai";
import { type Dispatch, type SetStateAction, memo, useEffect } from "react";
import { Editable, ReactEditor, Slate } from "slate-react";
import { useConversationAPI } from "../../context";
import { focusFix } from "./utils";

type Props = {
	showEmojiPanel?: boolean;
	setShowEmojiPanel?: Dispatch<SetStateAction<boolean>>;
};

const Input = ({ showEmojiPanel, setShowEmojiPanel }: Props) => {
	const compact = useCompactRuntime();
	const {
		inputEditor: editor,
		sendTextMessage,
		scrollConversationListToBtm,
		mobileInputMode,
		previousMobileInputMode,
	} = useConversationAPI();
	const setInputValue = useSetAtom(inputterValueAtom);

	useEffect(() => {
		if (compact && mobileInputMode === "text" && previousMobileInputMode === "none") {
			focusFix();
			ReactEditor.focus(editor);
		}
	}, [compact, mobileInputMode, previousMobileInputMode, editor]);

	return (
		<canBeDetected.div
			className="min-w-0 flex-1"
			metaData={{
				treeItemDisplayName: (data) => `发送消息（发送人：${data.sendRole}）`,
				type: EMetaDataType.ConversationInput,
			}}
		>
			<Slate editor={editor} initialValue={SLATE_INITIAL_VALUE} onChange={(v) => setInputValue(v)}>
				<Editable
					id="conversation-input"
					onFocus={() => {
						if (compact) {
							scrollConversationListToBtm();
							if (showEmojiPanel) setShowEmojiPanel?.(false);
						}
					}}
					className="min-h-[42px] rounded-[5px] bg-white px-[11px] py-[8px] text-[17px] leading-[24px] caret-wechatBrand-3 focus:outline-none"
					renderElement={(props) => <Element {...props} />}
					onKeyDown={(ev) => {
						if (ev.key === "Enter") {
							ev.preventDefault();
							sendTextMessage();
						}
					}}
					enterKeyHint="send"
					inputMode={compact ? mobileInputMode : "text"}
				/>
			</Slate>
		</canBeDetected.div>
	);
};

export default memo(Input);
