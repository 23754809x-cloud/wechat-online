import { MYSELF_ID } from "@/faker/user";
import { EConversationType, type TConversationItem } from "@/stateV2/conversation";
import { memo, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import CenterText from "./CenterText";
import File from "./File";
import Image from "./Image";
import MobileMessageLongPress from "./MobileMessageLongPress";
import PersonalCard from "./PersonalCard";
import RedPacket from "./RedPacket";
import RedPacketAcceptedReply from "./RedPacketAcceptedReply";
import Text from "./Text";
import Transfer from "./Transfer";
import Voice from "./Voice";

type Props = {
	data: TConversationItem;
};

const ConversationItem = ({ data }: Props) => {
	const { type, role, upperText, id: conversationItemId } = data;
	const { id, groupId } = useParams<{ id?: string; groupId?: string }>();
	const conversationId = groupId ?? id ?? "";
	const senderId = data.senderId ?? (role === "friend" ? (id ?? "") : MYSELF_ID);
	let content: ReactNode = null;

	switch (type) {
		case EConversationType.text:
			content = (
				<Text
					conversationItemId={conversationItemId}
					upperText={upperText}
					senderId={senderId}
					textContent={data.textContent}
					referenceId={data.referenceId}
				/>
			);
			break;
		case EConversationType.centerText:
			content = (
				<CenterText
					upperText={upperText}
					simpleContent={data.simpleContent}
					extraClassName={data.extraClassName}
				/>
			);
			break;
		case EConversationType.transfer:
			content = (
				<Transfer
					role={role}
					upperText={upperText}
					senderId={senderId}
					amount={data.amount}
					note={data.note}
					transferStatus={data.transferStatus}
					originalSender={data.originalSender}
				/>
			);
			break;
		case EConversationType.redPacket:
			content = (
				<RedPacket
					role={role}
					upperText={upperText}
					senderId={senderId}
					amount={data.amount}
					note={data.note}
					redPacketStatus={data.redPacketStatus}
					originalSender={data.originalSender}
				/>
			);
			break;
		case EConversationType.image:
			content = (
				<Image role={role} imageInfo={data.imageInfo} upperText={upperText} senderId={senderId} />
			);
			break;
		case EConversationType.video:
			content = (
				<Image
					role={role}
					imageInfo={data.videoInfo}
					upperText={upperText}
					senderId={senderId}
					isVideo
				/>
			);
			break;
		case EConversationType.voice:
			content = (
				<Voice
					senderId={senderId}
					upperText={upperText}
					duration={data.duration}
					isRead={data.isRead}
					role={role}
					showStt={data.showStt}
					stt={data.stt}
				/>
			);
			break;
		case EConversationType.redPacketAcceptedReply:
			content = (
				<RedPacketAcceptedReply id={data.id} redPacketId={data.redPacketId} upperText={upperText} />
			);
			break;
		case EConversationType.personalCard:
			content = (
				<PersonalCard
					avatarInfo={data.avatarInfo}
					nickname={data.nickname}
					senderId={senderId}
					upperText={upperText}
				/>
			);
			break;
		case EConversationType.file:
			content = <File fileData={data.fileData} senderId={senderId} upperText={upperText} />;
			break;
		default:
			content = null;
	}

	if (!content) return null;
	return (
		<MobileMessageLongPress item={data} conversationId={conversationId}>
			{content}
		</MobileMessageLongPress>
	);
};

export default memo(ConversationItem);
