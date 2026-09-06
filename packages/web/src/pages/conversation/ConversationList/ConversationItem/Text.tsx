import type { IConversationTypeText } from "@/stateV2/conversation";
import type { IStateProfile } from "@/stateV2/profile";
import SlateText from "@/wechatComponents/SlateText";
import { memo } from "react";
import CommonBlock from "./CommonBlock";
import TextReference from "./TextReference";

type Props = {
	conversationItemId: IConversationTypeText["id"];
	upperText: IConversationTypeText["upperText"];
	senderId: IStateProfile["id"];
	textContent: IConversationTypeText["textContent"];
	referenceId: IConversationTypeText["referenceId"];
};

const Text = ({ upperText, senderId, textContent, referenceId, conversationItemId }: Props) => {
	return (
		<>
			<CommonBlock
				upperText={upperText}
				senderId={senderId}
				innerBlockClassName="text-[17px] leading-[23px] group-[.friend]:bg-white group-[.mine]:bg-[#95EC69] group-[.friend]:before:bg-white group-[.mine]:before:bg-[#95EC69]"
			>
				<SlateText content={textContent} />
			</CommonBlock>
			{referenceId && (
				<TextReference referenceId={referenceId} conversationItemId={conversationItemId} />
			)}
		</>
	);
};

export default memo(Text);
