import { useState } from "react";

const MobileCreatorPanel = () => {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				aria-label="creator-entry"
				className="fixed top-3 left-1/2 z-50 h-8 w-8 -translate-x-1/2 opacity-0"
				onClick={() => setOpen(true)}
			/>
			{open && (
				<div className="fixed inset-0 z-[100] bg-black/40 p-5">
					<div className="mx-auto mt-10 rounded-xl bg-white p-5 text-sm">
						<div className="mb-4 text-lg font-semibold">创作中心</div>
						<div className="space-y-2">
							<div>联系人管理</div>
							<div>头像与资料设置</div>
							<div>聊天消息编辑</div>
							<div>图片 / 语音 / 红包 / 转账</div>
						</div>
						<button className="mt-5" onClick={() => setOpen(false)}>关闭</button>
					</div>
				</div>
			)}
		</>
	);
};

export default MobileCreatorPanel;
