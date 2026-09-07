import { MYSELF_ID } from "@/faker/user";
import {
	EConversationType,
	type IConversationTypeRedPacket,
	type IConversationTypeTransfer,
	type TConversationItem,
	type TConversationRole,
	fromLastGenerateUpperText,
	getInputterConfigValueSnapshot,
	getInputterValueSnapshot,
	recentUsedEmojiAtom,
	setConversationListValue,
} from "@/stateV2/conversation";
import { setDialogueListValue } from "@/stateV2/dialogueList";
import {
	type IStateProfile,
	getMyProfileValueSnapshot,
	getProfileValueSnapshot,
} from "@/stateV2/profile";
import { animateElement } from "@/utils";
import type { CustomElementEmoji } from "@/vite-env";
import { SLATE_INITIAL_VALUE, withInlines } from "@/wechatComponents/SlateText/utils";
import { useCreation, usePrevious } from "ahooks";
import dayjs from "dayjs";
import { useSetAtom } from "jotai";
import { isEqual, throttle } from "lodash-es";
import { nanoid } from "nanoid";
import {
	type Dispatch,
	type HTMLAttributes,
	type PropsWithChildren,
	type RefObject,
	type SetStateAction,
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";
import { useParams } from "react-router-dom";
import { type BaseEditor, type Descendant, Editor, Node, Transforms, createEditor } from "slate";
import { withHistory } from "slate-history";
import { type ReactEditor, withReact } from "slate-react";

type InputMode = HTMLAttributes<HTMLDivElement>["inputMode"];

type VoiceDraft = {
	duration: number;
	stt?: string;
};

type MoneyDraft = {
	amount: string;
	note?: string;
};

type FileDraft = {
	fileInfo: string;
	fileName: string;
	fileSize: number;
};

type PersonalCardDraft = Pick<IStateProfile, "avatarInfo" | "nickname">;

interface IConversationAPIContext {
	conversationId: string;
	isGroupChat: boolean;
	listRef: RefObject<HTMLDivElement>;
	scrollConversationListToBtm: () => void;
	inputEditor: BaseEditor & ReactEditor;
	insertEmojiNode: (emojiSymbol: string) => void;
	sendTextMessage: (overrideValue?: Descendant[]) => void;
	sendImage: (imageInfo: string) => void;
	sendVoice: (data: VoiceDraft) => void;
	sendRedPacket: (data: MoneyDraft) => void;
	sendTransferFromCurrentSender: (data: MoneyDraft) => void;
	sendFile: (fileData: FileDraft) => void;
	sendPersonalCard: (data: PersonalCardDraft) => void;
	sendTickleText: (friendId: IStateProfile["id"]) => void;
	sendTransfer: (
		data: Omit<IConversationTypeTransfer, "id" | "sendTimestamp" | "upperText" | "type">,
	) => void;
	sendRedPacketAcceptedReply: (redPacketId: IConversationTypeRedPacket["id"]) => void;
	removeLastNode: () => void;
	focusInput: () => void;
	mobileInputMode: InputMode;
	setMobileInputMode: Dispatch<SetStateAction<InputMode>>;
	previousMobileInputMode: InputMode;
}

const ConversationAPIContext = createContext<IConversationAPIContext | null>(null);

export const ConversationAPIProvider = ({ children }: PropsWithChildren) => {
	const listRef = useRef<HTMLDivElement>(null);
	const inputEditor = useCreation(() => withInlines(withHistory(withReact(createEditor()))), []);
	const params = useParams<{ id?: string; groupId?: string }>();
	const isGroupChat = !!params.groupId;
	const conversationId = params.groupId ?? params.id ?? "";
	const setRecentUsedEmoji = useSetAtom(recentUsedEmojiAtom);
	const [mobileInputMode, setMobileInputMode] = useState<InputMode>("text");
	const previousMobileInputMode = usePrevious(mobileInputMode);

	const scrollConversationListToBtm = useCallback(() => {
		setTimeout(() => {
			if (listRef.current) {
				listRef.current.scrollTop = 9999999;
			}
		});
	}, []);

	const syncDialoguePreview = useCallback(
		(lastMessage: string) => {
			const lastMessageTime = dayjs().format("HH:mm");
			setDialogueListValue((prev) => {
				const targetIndex = prev.findIndex((item) =>
					isGroupChat ? item.groupId === conversationId : item.friendId === conversationId,
				);
				const existing = targetIndex >= 0 ? prev[targetIndex] : undefined;
				const updated = existing
					? { ...existing, lastMessage, lastMessageTime }
					: {
							id: nanoid(5),
							...(isGroupChat ? { groupId: conversationId } : { friendId: conversationId }),
							lastMessage,
							lastMessageTime,
						};
				return [updated, ...prev.filter((_, index) => index !== targetIndex)];
			});
		},
		[conversationId, isGroupChat],
	);

	const insertEmojiNode = useCallback((emojiSymbol: string) => {
		const emoji: CustomElementEmoji = { type: "emoji", emojiSymbol, children: [{ text: "" }] };
		Transforms.insertNodes(inputEditor, emoji);
		Transforms.move(inputEditor, { distance: 1 });
	}, []);

	const getCurrentSenderFields = useCallback(() => {
		const { sendRole, senderId } = getInputterConfigValueSnapshot();
		if (!isGroupChat) return { role: sendRole as TConversationRole };
		const id = senderId ?? MYSELF_ID;
		return {
			senderId: id,
			role: (id === MYSELF_ID ? "mine" : "friend") as TConversationRole,
		};
	}, [isGroupChat]);

	/** 群聊回复消息沿用当前选中的发送成员。 */
	const getGroupSenderFields = useCallback(() => {
		if (!isGroupChat) return {};
		const { senderId } = getInputterConfigValueSnapshot();
		const id = senderId ?? MYSELF_ID;
		return { senderId: id, role: (id === MYSELF_ID ? "mine" : "friend") as TConversationRole };
	}, [isGroupChat]);

	const sendTextMessage = useCallback(
		(overrideValue?: Descendant[]) => {
			const value = overrideValue ?? getInputterValueSnapshot();
			if (isEqual(value, SLATE_INITIAL_VALUE)) return;
			const senderFields = getCurrentSenderFields();
			setConversationListValue(conversationId, (prev) => [
				...prev,
				{
					type: EConversationType.text,
					textContent: value,
					id: nanoid(8),
					sendTimestamp: dayjs().valueOf(),
					upperText: fromLastGenerateUpperText(prev),
					...senderFields,
				} as TConversationItem,
			]);
			const pickedEmoji: string[] = [];
			for (const nodeEntry of Node.descendants(inputEditor)) {
				const [node] = nodeEntry;
				if ((node as CustomElementEmoji).type === "emoji") {
					const { emojiSymbol } = node as CustomElementEmoji;
					pickedEmoji.push(emojiSymbol);
				}
			}
			setRecentUsedEmoji((prev) => Array.from(new Set([...pickedEmoji, ...prev])).slice(0, 8));
			const preview = value.map((node) => Node.string(node)).join(" ").trim() || "[表情]";
			syncDialoguePreview(preview);
			Transforms.delete(inputEditor, {
				at: {
					anchor: Editor.start(inputEditor, []),
					focus: Editor.end(inputEditor, []),
				},
			});
			scrollConversationListToBtm();
		},
		[conversationId, getCurrentSenderFields, inputEditor, scrollConversationListToBtm, syncDialoguePreview],
	);

	const sendImage = useCallback(
		(imageInfo: string) => {
			const senderFields = getCurrentSenderFields();
			setConversationListValue(conversationId, (prev) => [
				...prev,
				{
					type: EConversationType.image,
					imageInfo,
					id: nanoid(8),
					sendTimestamp: dayjs().valueOf(),
					upperText: fromLastGenerateUpperText(prev),
					...senderFields,
				} as TConversationItem,
			]);
			syncDialoguePreview("[图片]");
			scrollConversationListToBtm();
		},
		[conversationId, getCurrentSenderFields, scrollConversationListToBtm, syncDialoguePreview],
	);

	const sendVoice = useCallback(
		({ duration, stt }: VoiceDraft) => {
			const senderFields = getCurrentSenderFields();
			setConversationListValue(conversationId, (prev) => [
				...prev,
				{
					type: EConversationType.voice,
					duration: Math.max(1, Math.min(60, Math.round(duration))),
					isRead: senderFields.role === "mine",
					showStt: !!stt?.trim(),
					stt: stt?.trim(),
					id: nanoid(8),
					sendTimestamp: dayjs().valueOf(),
					upperText: fromLastGenerateUpperText(prev),
					...senderFields,
				} as TConversationItem,
			]);
			syncDialoguePreview("[语音]");
			scrollConversationListToBtm();
		},
		[conversationId, getCurrentSenderFields, scrollConversationListToBtm, syncDialoguePreview],
	);

	const sendRedPacket = useCallback(
		({ amount, note }: MoneyDraft) => {
			const senderFields = getCurrentSenderFields();
			setConversationListValue(conversationId, (prev) => [
				...prev,
				{
					type: EConversationType.redPacket,
					amount,
					note: note?.trim(),
					redPacketStatus: "awaiting",
					originalSender: senderFields.role,
					id: nanoid(8),
					sendTimestamp: dayjs().valueOf(),
					upperText: fromLastGenerateUpperText(prev),
					...senderFields,
				} as TConversationItem,
			]);
			syncDialoguePreview("[红包]");
			scrollConversationListToBtm();
		},
		[conversationId, getCurrentSenderFields, scrollConversationListToBtm, syncDialoguePreview],
	);

	const sendTransferFromCurrentSender = useCallback(
		({ amount, note }: MoneyDraft) => {
			const senderFields = getCurrentSenderFields();
			setConversationListValue(conversationId, (prev) => [
				...prev,
				{
					type: EConversationType.transfer,
					amount,
					note: note?.trim(),
					transferStatus: "awaiting",
					id: nanoid(8),
					sendTimestamp: dayjs().valueOf(),
					upperText: fromLastGenerateUpperText(prev),
					...senderFields,
				} as TConversationItem,
			]);
			syncDialoguePreview("[转账]");
			scrollConversationListToBtm();
		},
		[conversationId, getCurrentSenderFields, scrollConversationListToBtm, syncDialoguePreview],
	);

	const sendFile = useCallback(
		(fileData: FileDraft) => {
			const senderFields = getCurrentSenderFields();
			setConversationListValue(conversationId, (prev) => [
				...prev,
				{
					type: EConversationType.file,
					...fileData,
					id: nanoid(8),
					sendTimestamp: dayjs().valueOf(),
					upperText: fromLastGenerateUpperText(prev),
					...senderFields,
				} as TConversationItem,
			]);
			syncDialoguePreview("[文件]");
			scrollConversationListToBtm();
		},
		[conversationId, getCurrentSenderFields, scrollConversationListToBtm, syncDialoguePreview],
	);

	const sendPersonalCard = useCallback(
		(data: PersonalCardDraft) => {
			const senderFields = getCurrentSenderFields();
			setConversationListValue(conversationId, (prev) => [
				...prev,
				{
					type: EConversationType.personalCard,
					...data,
					id: nanoid(8),
					sendTimestamp: dayjs().valueOf(),
					upperText: fromLastGenerateUpperText(prev),
					...senderFields,
				} as TConversationItem,
			]);
			syncDialoguePreview("[名片]");
			scrollConversationListToBtm();
		},
		[conversationId, getCurrentSenderFields, scrollConversationListToBtm, syncDialoguePreview],
	);

	const sendTickleText = useCallback(
		(friendId: IStateProfile["id"]) => {
			const sender = getMyProfileValueSnapshot();
			const friend = getProfileValueSnapshot(friendId);
			if (!friend) return;
			setConversationListValue(conversationId, (prev) => [
				...prev,
				{
					type: EConversationType.tickle,
					id: nanoid(8),
					sendTimestamp: dayjs().valueOf(),
					text: `${sender.nickname} 拍了拍 ${friend.nickname}`,
					upperText: fromLastGenerateUpperText(prev),
					...getGroupSenderFields(),
				} as TConversationItem,
			]);
			syncDialoguePreview("[拍一拍]");
			scrollConversationListToBtm();
		},
		[conversationId, getGroupSenderFields, scrollConversationListToBtm, syncDialoguePreview],
	);

	const sendTransfer = useCallback(
		(data: Omit<IConversationTypeTransfer, "id" | "sendTimestamp" | "upperText" | "type">) => {
			setConversationListValue(conversationId, (prev) => [
				...prev,
				{
					...data,
					type: EConversationType.transfer,
					id: nanoid(8),
					sendTimestamp: dayjs().valueOf(),
					upperText: fromLastGenerateUpperText(prev),
				} as TConversationItem,
			]);
			syncDialoguePreview("[转账]");
			scrollConversationListToBtm();
		},
		[conversationId, scrollConversationListToBtm, syncDialoguePreview],
	);

	const sendRedPacketAcceptedReply = useCallback(
		(redPacketId: IConversationTypeRedPacket["id"]) => {
			setConversationListValue(conversationId, (prev) => {
				const target = prev.find((item) => item.id === redPacketId);
				if (!target || target.type !== EConversationType.redPacket) return prev;
				return [
					...prev,
					{
						type: EConversationType.redPacketAccepted,
						id: nanoid(8),
						sendTimestamp: dayjs().valueOf(),
						upperText: fromLastGenerateUpperText(prev),
						originalSender: target.originalSender,
						...getGroupSenderFields(),
					} as TConversationItem,
				];
			});
			syncDialoguePreview("[红包]");
			scrollConversationListToBtm();
		},
		[conversationId, getGroupSenderFields, scrollConversationListToBtm, syncDialoguePreview],
	);

	const removeLastNode = useCallback(() => {
		const at = inputEditor.selection;
		if (!at) return;
		Transforms.delete(inputEditor, { reverse: true });
	}, [inputEditor]);

	const focusInput = useMemo(
		() =>
			throttle(() => {
				try {
					ReactEditor.focus(inputEditor);
				} catch {
					// The mobile editor can briefly unmount while switching creator panels.
				}
			}, 100),
		[inputEditor],
	);

	const value = useMemo<IConversationAPIContext>(
		() => ({
			conversationId,
			isGroupChat,
			listRef,
			scrollConversationListToBtm,
			inputEditor,
			insertEmojiNode,
			sendTextMessage,
			sendImage,
			sendVoice,
			sendRedPacket,
			sendTransferFromCurrentSender,
			sendFile,
			sendPersonalCard,
			sendTickleText,
			sendTransfer,
			sendRedPacketAcceptedReply,
			removeLastNode,
			focusInput,
			mobileInputMode,
			setMobileInputMode,
			previousMobileInputMode,
		}),
		[
			conversationId,
			isGroupChat,
			scrollConversationListToBtm,
			inputEditor,
			insertEmojiNode,
			sendTextMessage,
			sendImage,
			sendVoice,
			sendRedPacket,
			sendTransferFromCurrentSender,
			sendFile,
			sendPersonalCard,
			sendTickleText,
			sendTransfer,
			sendRedPacketAcceptedReply,
			removeLastNode,
			focusInput,
			mobileInputMode,
			previousMobileInputMode,
		],
	);

	return <ConversationAPIContext.Provider value={value}>{children}</ConversationAPIContext.Provider>;
};

export function useConversationAPI() {
	const context = useContext(ConversationAPIContext);
	if (!context) throw new Error("useConversationAPI must be used within ConversationAPIProvider");
	return context;
}
