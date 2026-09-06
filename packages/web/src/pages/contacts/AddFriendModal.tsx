import DEFAULT_FRIEND_AVATAR from "@/assets/friend-avatar-default.svg";
import DEFAULT_MOMENTS_COVER from "@/assets/moments-cover-default.svg";
import { saveImageAsset } from "@/assetStorage";
import HashAssets from "@/components/HashAssets";
import { setAllProfilesValue } from "@/stateV2/profile";
import { Form, Input, Modal, message } from "antd";
import { nanoid } from "nanoid";
import { useRef, useState } from "react";

type FormValue = {
	nickname: string;
	wechat?: string;
	remark?: string;
};

type Props = {
	open: boolean;
	onClose: () => void;
};

const AddFriendModal = ({ open, onClose }: Props) => {
	const [form] = Form.useForm<FormValue>();
	const [avatarInfo, setAvatarInfo] = useState(DEFAULT_FRIEND_AVATAR);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [messageApi, contextHolder] = message.useMessage();

	const resetAndClose = () => {
		form.resetFields();
		setAvatarInfo(DEFAULT_FRIEND_AVATAR);
		onClose();
	};

	const handleAvatar = async (file?: File) => {
		if (!file) return;
		try {
			setAvatarInfo(await saveImageAsset(file));
		} catch {
			messageApi.error("头像保存失败");
		} finally {
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const createFriend = (values: FormValue) => {
		const id = nanoid(8);
		setAllProfilesValue((prev) => [
			...prev,
			{
				id,
				nickname: values.nickname.trim(),
				remark: values.remark?.trim() || undefined,
				wechat: values.wechat?.trim() || `wxid_${nanoid(6)}`,
				avatarInfo,
				momentsBackgroundInfo: DEFAULT_MOMENTS_COVER,
				momentsBackgroundLike: false,
				momentsPrivacy: "all",
				privacy: "all",
				thumbnailInfo: [],
			},
		]);
		messageApi.success("联系人已添加");
		resetAndClose();
	};

	return (
		<>
			{contextHolder}
			<Modal
				open={open}
				title="添加朋友"
				okText="添加"
				cancelText="取消"
				onCancel={resetAndClose}
				onOk={() => form.submit()}
				destroyOnClose
			>
				<Form<FormValue> form={form} layout="vertical" onFinish={createFriend}>
					<div className="mb-4 flex items-center gap-4">
						<HashAssets src={avatarInfo} className="h-16 w-16 rounded-lg object-cover" />
						<button
							type="button"
							className="rounded-md border border-black/10 px-3 py-2 text-sm"
							onClick={() => fileInputRef.current?.click()}
						>
							选择头像
						</button>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							className="hidden"
							onChange={(event) => void handleAvatar(event.target.files?.[0])}
						/>
					</div>
					<Form.Item
						name="nickname"
						label="昵称"
						rules={[{ required: true, whitespace: true, message: "请输入昵称" }]}
					>
						<Input aria-label="联系人昵称" maxLength={30} />
					</Form.Item>
					<Form.Item name="remark" label="备注">
						<Input aria-label="联系人备注" maxLength={30} />
					</Form.Item>
					<Form.Item name="wechat" label="微信号">
						<Input aria-label="联系人微信号" maxLength={40} placeholder="不填则自动生成" />
					</Form.Item>
				</Form>
			</Modal>
		</>
	);
};

export default AddFriendModal;
