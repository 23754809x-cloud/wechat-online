import BackFilledSVG from "@/assets/back-filled.svg?react";
import MoreFilledSVG from "@/assets/more-filled.svg?react";
import { canBeDetected } from "@/components/NodeDetected";
import useModeNavigate from "@/components/useModeNavigate";
import { EMetaDataType } from "@/stateV2/detectedNode";
import { groupAtom } from "@/stateV2/group";
import { unreadCountAtom } from "@/stateV2/unreadCount";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { useParams } from "react-router-dom";
import MobileGroupSettings from "./MobileGroupSettings";

const GroupConversationHeader = () => {
	const { groupId } = useParams<{ groupId: string }>();
	const groupInfo = useAtomValue(groupAtom(groupId ?? ""));
	const unreadCount = useAtomValue(unreadCountAtom);
	const navigate = useModeNavigate();
	const [settingsOpen, setSettingsOpen] = useState(false);
	if (!groupInfo) return null;

	return (
		<>
			<div className="grid h-[50px] grid-cols-[72px_minmax(0,1fr)_72px] border-black/5 border-b bg-[#EDEDED] px-[16px]">
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
				<canBeDetected.div
					className="flex min-w-0 items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[17px]"
					metaData={{
						type: EMetaDataType.GroupProfile,
						index: groupId!,
						treeItemDisplayName: (data) => `群聊（${data.name}）`,
						label: "群聊信息",
					}}
				>
					{groupInfo.name}({groupInfo.displayMemberCount ?? groupInfo.memberIds.length})
				</canBeDetected.div>
				<div className="flex items-center justify-end">
					<button
						type="button"
						aria-label="群聊信息"
						className="flex h-10 w-10 items-center justify-end border-0 bg-transparent p-0"
						onClick={() => setSettingsOpen(true)}
					>
						<MoreFilledSVG fill="black" className="h-[24px] w-[24px]" />
					</button>
				</div>
			</div>
			<MobileGroupSettings
				groupId={groupId ?? ""}
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
			/>
		</>
	);
};

export default GroupConversationHeader;
