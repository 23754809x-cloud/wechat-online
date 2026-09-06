import { saveFileAsset, saveImageAsset } from "@/assetStorage";
import { MYSELF_ID } from "@/faker/user";
import { inputterConfigAtom } from "@/stateV2/conversation";
import { allGroupsAtom } from "@/stateV2/group";
import { allProfilesAtom } from "@/stateV2/profile";
import { Input, InputNumber, Modal, Select, message } from "antd";
import { useAtom, useAtomValue } from "jotai";
import { useMemo, useRef, useState } from "react";
import { useConversationAPI } from "../context";

type MoneyState = {
	amount: string;
	note: string;
};

const INITIAL_MONEY: MoneyState = { amount: "1.00", note: "" };

const ActionButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
	<button
		type="button"
		className="flex flex-col items-center gap-2 text-[13px] text-black/80"
		onClick={onClick}
		aria-label={label}
	>
		<span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
			{label.slice(0, 1)}
		</span>
		<span>{label}</span>
	</button>
);

const MobileCreatorPanel = () => {
	const {
		conversationId,
		isGroupChat,
		sendImage,
		sendVoice,
		sendRedPacket,
		sendTransferFromCurrentSender,
		sendFile,
		sendPersonalCard,
	} = useConversationAPI();
	const [inputterConfig, setInputterConfig] = useAtom(inputterConfigAtom);
	const allGroups = useAtomValue(allGroupsAtom);
	const profiles = useAtomValue(allProfilesAtom);
	const imageInputRef = useRef<HTMLInputElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [voiceOpen, setVoiceOpen] = useState(false);
	const [voiceDuration, setVoiceDuration] = useState(3);
	const [voiceStt, setVoiceStt] = useState("");
	const [redPacketOpen, setRedPacketOpen] = useState(false);
	const [redPacket, setRedPacket] = useState<MoneyState>(INITIAL_MONEY);
	const [transferOpen, setTransferOpen] = useState(false);
	const [transfer, setTransfer] = useState<MoneyState>(INITIAL_MONEY);
	const [cardOpen, setCardOpen] = useState(false);
	const [cardProfileId, setCardProfileId] = useState<string>();
	const [messageApi, contextHolder] = message.useMessage();

	const group = useMemo(
		() => (isGroupChat ? allGroups.find((item) => item.id === conversationId) : undefined),
		[allGroups, conversationId, isGroupChat],
	);
	const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
	const cardProfiles = profiles.filter((profile) => profile.id !== MYSELF_ID);

	const handleImageChange = async (file?: File) => {
		if (!file) return;
		try {
			const imageInfo = await saveImageAsset(file);
			sendImage(imageInfo);
			messageApi.success("图片消息已添加");
		} catch {
			messageApi.error("图片保存失败");
		} finally {
			if (imageInputRef.current) imageInputRef.current.value = "";
		}
	};

	const handleFileChange = async (file?: File) => {
		if (!file) return;
		try {
			const fileInfo = await saveFileAsset(file);
			sendFile({ fileInfo, fileName: file.name, fileSize: file.size });
			messageApi.success("文件消息已添加");
		} catch {
			messageApi.error("文件保存失败");
		} finally {
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const senderControl = isGroupChat ? (
		<Select
			aria-label="当前发送人"
			className="min-w-40"
			value={inputterConfig.senderId ?? MYSELF_ID}
			onChange={(senderId) =>
				setInputterConfig({
					senderId,
					sendRole: senderId === MYSELF_ID ? "mine" : "friend",
				})
			}
			options={(group?.memberIds ?? [MYSELF_ID]).map((id) => ({
				value: id,
				label: profileMap.get(id)?.remark ?? profileMap.get(id)?.nickname ?? id,
			}))}
		/>
	) : (
		<Select
			aria-label="当前发送人"
			className="min-w-32"
			value={inputterConfig.sendRole}
			onChange={(sendRole) => setInputterConfig((prev) => ({ ...prev, sendRole }))}
			options={[
				{ value: "mine", label: "我自己" },
				{ value: "friend", label: "对方" },
			]}
		/>
	);

	return (
		<div className="h-[350px] overflow-auto bg-[#ECECEC] px-4 py-4" data-testid="mobile-creator-panel">
			{contextHolder}
			<div className="mb-5 flex items-center justify-between rounded-xl bg-white px-4 py-3">
				<span className="text-sm text-black/60">当前发送人</span>
				{senderControl}
			</div>
			<div className="grid grid-cols-4 gap-x-3 gap-y-5">
				<ActionButton label="图片" onClick={() => imageInputRef.current?.click()} />
				<ActionButton label="语音" onClick={() => setVoiceOpen(true)} />
				<ActionButton label="红包" onClick={() => setRedPacketOpen(true)} />
				<ActionButton label="转账" onClick={() => setTransferOpen(true)} />
				<ActionButton label="名片" onClick={() => setCardOpen(true)} />
				<ActionButton label="文件" onClick={() => fileInputRef.current?.click()} />
			</div>

			<input
				ref={imageInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={(event) => void handleImageChange(event.target.files?.[0])}
			/>
			<input
				ref={fileInputRef}
				type="file"
				className="hidden"
				onChange={(event) => void handleFileChange(event.target.files?.[0])}
			/>

			<Modal
				open={voiceOpen}
				title="添加语音消息"
				okText="添加"
				cancelText="取消"
				onCancel={() => setVoiceOpen(false)}
				onOk={() => {
					sendVoice({ duration: voiceDuration, stt: voiceStt });
					setVoiceOpen(false);
				}}
			>
				<div className="space-y-4">
					<div>
						<div className="mb-1 text-sm text-black/60">时长（1–60 秒）</div>
						<InputNumber
							aria-label="语音时长"
							min={1}
							max={60}
							value={voiceDuration}
							onChange={(value) => setVoiceDuration(value ?? 3)}
						/>
					</div>
					<div>
						<div className="mb-1 text-sm text-black/60">语音转文字（可选）</div>
						<Input
							aria-label="语音转文字"
							value={voiceStt}
							onChange={(event) => setVoiceStt(event.target.value)}
						/>
					</div>
				</div>
			</Modal>

			<Modal
				open={redPacketOpen}
				title="添加红包消息"
				okText="添加"
				cancelText="取消"
				onCancel={() => setRedPacketOpen(false)}
				onOk={() => {
					sendRedPacket(redPacket);
					setRedPacketOpen(false);
				}}
			>
				<div className="space-y-3">
					<Input
						aria-label="红包金额"
						addonBefore="¥"
						value={redPacket.amount}
						onChange={(event) => setRedPacket((prev) => ({ ...prev, amount: event.target.value }))}
					/>
					<Input
						aria-label="红包说明"
						placeholder="恭喜发财，大吉大利"
						value={redPacket.note}
						onChange={(event) => setRedPacket((prev) => ({ ...prev, note: event.target.value }))}
					/>
				</div>
			</Modal>

			<Modal
				open={transferOpen}
				title="添加转账消息"
				okText="添加"
				cancelText="取消"
				onCancel={() => setTransferOpen(false)}
				onOk={() => {
					sendTransferFromCurrentSender(transfer);
					setTransferOpen(false);
				}}
			>
				<div className="space-y-3">
					<Input
						aria-label="转账金额"
						addonBefore="¥"
						value={transfer.amount}
						onChange={(event) => setTransfer((prev) => ({ ...prev, amount: event.target.value }))}
					/>
					<Input
						aria-label="转账说明"
						value={transfer.note}
						onChange={(event) => setTransfer((prev) => ({ ...prev, note: event.target.value }))}
					/>
				</div>
			</Modal>

			<Modal
				open={cardOpen}
				title="添加个人名片"
				okText="添加"
				cancelText="取消"
				onCancel={() => setCardOpen(false)}
				onOk={() => {
					const selected = cardProfiles.find((profile) => profile.id === cardProfileId) ?? cardProfiles[0];
					if (!selected) {
						messageApi.warning("请先添加至少一个联系人");
						return;
					}
					sendPersonalCard({ avatarInfo: selected.avatarInfo, nickname: selected.nickname });
					setCardOpen(false);
				}}
			>
				<Select
					aria-label="选择名片联系人"
					className="w-full"
					value={cardProfileId}
					placeholder="选择联系人"
					onChange={setCardProfileId}
					options={cardProfiles.map((profile) => ({
						value: profile.id,
						label: profile.remark ?? profile.nickname,
					}))}
				/>
			</Modal>
		</div>
	);
};

export default MobileCreatorPanel;
