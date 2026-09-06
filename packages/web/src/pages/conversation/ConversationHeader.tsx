import BackFilledSVG from "@/assets/back-filled.svg?react";
import MoreFilledSVG from "@/assets/more-filled.svg?react";
import { canBeDetected } from "@/components/NodeDetected";
import useModeNavigate from "@/components/useModeNavigate";
import { EMetaDataType } from "@/stateV2/detectedNode";
import { profileAtom } from "@/stateV2/profile";
import { unreadCountAtom } from "@/stateV2/unreadCount";
import { useAtomValue } from "jotai";
import { useParams } from "react-router-dom";

const ConversationHeader = () => {
	const { id } = useParams<{ id: string }>();
	const friendProfile = useAtomValue(profileAtom(id ?? ""));
	const unreadCount = useAtomValue(unreadCountAtom);
	const navigate = useModeNavigate();

	return (
		<div className="grid h-[50px] grid-cols-3 border-black/5 border-b bg-[#EDEDED] px-[16px]">
			<div className="flex items-center">
				<BackFilledSVG
					fill="black"
					className="h-[22px] w-[22px] cursor-pointer"
					onClick={() => navigate("/")}
				/>
				{unreadCount.count > 0 && (
					<canBeDetected.div
						className="ml-1 rounded-2xl bg-[rgba(0,0,0,0.15)] px-2 py-[2px] text-xs"
						metaData={{
							type: EMetaDataType.UnreadCount,
							treeItemDisplayName: "未读消息数",
						}}
					>
						{unreadCount.count}
					</canBeDetected.div>
				)}
			</div>
			<div className="flex min-w-0 items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[17px]">
				{friendProfile?.remark ?? friendProfile?.nickname}
			</div>
			<div className="flex items-center justify-end">
				<MoreFilledSVG fill="black" className="h-[24px] w-[24px]" />
			</div>
		</div>
	);
};

export default ConversationHeader;
