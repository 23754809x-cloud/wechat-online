import AddFriendSVG from "@/assets/add-friend-outlined.svg?react";
import { useCompactRuntime } from "@/runtime/compact";
import { EBottomNavBars } from "@/stateV2/bottomNavbars";
import { activatedNodeAtom } from "@/stateV2/detectedNode";
import { modeAtom } from "@/stateV2/mode";
import BottomNavbar, { useToggleNavbarActivated } from "@/wechatComponents/BottomNavbar";
import Loading from "@/wechatComponents/Loading";
import { useSetAtom } from "jotai";
import { Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import AddFriendModal from "./AddFriendModal";
import MainSection from "./MainSection";

const Contacts = () => {
	useToggleNavbarActivated(EBottomNavBars.ADDRESS_BOOK);
	const { t } = useTranslation();
	const compact = useCompactRuntime();
	const setMode = useSetAtom(modeAtom);
	const setActivatedNode = useSetAtom(activatedNodeAtom);
	const [addFriendOpen, setAddFriendOpen] = useState(false);

	const handleAddFriend = () => {
		if (compact) {
			setAddFriendOpen(true);
			return;
		}
		setMode("edit");
		setActivatedNode("contacts-container");
	};

	return (
		<>
			<div className="grid shrink-0 grid-cols-3 justify-center bg-[rgba(237,237,237,1)] px-4 py-2">
				<div />
				<div className="flex items-center justify-center font-medium">
					{t("wechatPage.contacts.title")}
				</div>
				<div className="flex items-center justify-end">
					<button type="button" aria-label="添加朋友" onClick={handleAddFriend}>
						<AddFriendSVG height={20} width={20} fill="black" className="cursor-pointer" />
					</button>
				</div>
			</div>
			<Suspense
				fallback={
					<div className="flex flex-1 items-center justify-center">
						<Loading className="h-8 w-8 text-wechatBrand-2" />
					</div>
				}
			>
				<MainSection />
			</Suspense>
			<BottomNavbar />
			<AddFriendModal open={addFriendOpen} onClose={() => setAddFriendOpen(false)} />
		</>
	);
};

export default Contacts;
