import { CloseCircleFilled } from "@ant-design/icons";
import { Button, Modal } from "antd";
import type { FallbackProps } from "react-error-boundary";

const Fallback = (props: FallbackProps) => {
	return (
		<Modal
			open={true}
			title={
				<div className="flex space-x-2">
					<CloseCircleFilled className="text-2xl text-red-600" />
					<div>出错啦</div>
				</div>
			}
			maskClosable={false}
			keyboard={false}
			cancelButtonProps={{ hidden: true }}
			okText="重新加载"
			onOk={() => {
				props.resetErrorBoundary?.();
				location.reload();
			}}
		>
			<div>应用运行出现异常。重新加载不会删除聊天记录、本地设置或 IndexedDB 素材。</div>
			<div>
				如果一直出现该提示，请联系
				<Button type="link" href="mailto:liangniangbaby@gmail.com" target="_blank" className="px-0">
					开发者
				</Button>
			</div>
		</Modal>
	);
};

export default Fallback;
