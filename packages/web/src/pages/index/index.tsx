import PlusCircleSVG from "@/assets/plus-circle.svg?react";
import SearchOutlinedSVG from "@/assets/search-outlined.svg?react";
import { canBeDetected } from "@/components/NodeDetected";
import { EBottomNavBars } from "@/stateV2/bottomNavbars";
import { EMetaDataType } from "@/stateV2/detectedNode";
import { unreadCountAtom, unreadCountEffect } from "@/stateV2/unreadCount";
import BottomNavbar, { useToggleNavbarActivated } from "@/wechatComponents/BottomNavbar";
import { useAtom, useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import DialogueList from "./DialogueList";
import MultipleDeviceLogin from "./MultipleDeviceLogin";

const WechatIndex = () => {
	const { count } = useAtomValue(unreadCountAtom);
	const { t } = useTranslation();
	useToggleNavbarActivated(EBottomNavBars.WECHAT);
	useAtom(unreadCountEffect);

	return (
		<>
			<div className="grid h-12 shrink-0 grid-cols-3 items-center bg-[#ededed] px-4">
				<div />
				<canBeDetected.span
					className="flex items-center justify-center whitespace-nowrap font-medium text-[17px]"
					metaData={{
						type: EMetaDataType.UnreadCount,
						treeItemDisplayName: (d) => `顶栏 ${d.count} 个未读消息`,
					}}
				>
					{count > 0
						? t("wechatPage.main.title", {
								totalUnreadCount: count,
							})
						: t("wechatPage.main.title2")}
				</canBeDetected.span>
				<div className="flex items-center justify-end">
					<PlusCircleSVG width={20} height={20} fill="black" className="cursor-pointer" />
				</div>
			</div>
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
				<div className="flex shrink-0 bg-[#ededed] px-2 pb-2">
					<div className="flex h-9 flex-1 items-center justify-center rounded-[5px] bg-white text-sm">
						<SearchOutlinedSVG fill="rgba(0, 0, 0, 0.42)" width={17} height={17} />
						<span className="ml-2 text-[#9b9b9b]">{t("wechatPage.main.search")}</span>
					</div>
				</div>
				<div className="max-lg:hidden">
					<MultipleDeviceLogin />
				</div>
				<DialogueList />
			</div>
			<BottomNavbar />
		</>
	);
};

export default WechatIndex;
