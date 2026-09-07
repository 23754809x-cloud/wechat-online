import DEFAULT_FRIEND_AVATAR from "@/assets/friend-avatar-default.svg";
import { h } from "@/components/HashAssets";
import { canBeDetected } from "@/components/NodeDetected";
import useModeNavigate from "@/components/useModeNavigate";
import { MYSELF_ID } from "@/faker/user";
import type { IConversationItemBase } from "@/stateV2/conversation";
import { getModeValueSnapshot } from "@/stateV2/mode";
import { type IStateProfile, profileAtom } from "@/stateV2/profile";
import { css } from "@emotion/react";
import { useDebounceFn } from "ahooks";
import { useAtomValue } from "jotai";
import type { CSSProperties, MouseEventHandler, PropsWithChildren, ReactNode } from "react";
import { twJoin, twMerge } from "tailwind-merge";
import { useConversationAPI } from "../../context";

interface Props<P = AnyObject> {
	upperText: IConversationItemBase["upperText"];
	senderId: IStateProfile["id"];
	innerBlockClassName?: string;
	blockClassName?: string;
	blockStyle?: CSSProperties;
	extraElement?: ReactNode;
	hideAvatar?: boolean;
	hideSenderName?: boolean;
	innerBlockProps?: P;
	onClick?: MouseEventHandler<HTMLDivElement>;
}

const CommonBlock = <P extends AnyObject>({
	upperText,
	senderId,
	children,
	innerBlockClassName,
	blockClassName,
	blockStyle,
	extraElement,
	hideAvatar,
	hideSenderName,
	innerBlockProps,
	onClick,
}: PropsWithChildren<Props<P>>) => {
	const profile = useAtomValue(profileAtom(senderId));
	const avatarInfo = profile?.avatarInfo || DEFAULT_FRIEND_AVATAR;
	const nickname = profile?.nickname || "已删除联系人";
	const remark = profile?.remark;
	const navigate = useModeNavigate({ silence: true });
	const { sendTickleText, isGroupChat } = useConversationAPI();

	const handleClick: MouseEventHandler<HTMLImageElement> = (ev) => {
		if (!profile) return;
		const { detail: count } = ev;
		if (count === 2) {
			handleDoubliClick();
		} else if (count === 1) {
			navigate(`/friend/${senderId}`);
		}
	};

	const handleDoubliClick = () => {
		if (!profile || getModeValueSnapshot() === "edit") return;
		sendTickleText(senderId);
	};

	const { run: debouncedHandleClick } = useDebounceFn(handleClick, { wait: 200 });

	return (
		<>
			{upperText && (
				<div className="m-auto py-[2px] text-[#A5A5A5] text-[15px] leading-[20px]">{upperText}</div>
			)}
			<div className="flex flex-col group-[.mine]:items-end group-[.friend]:items-start">
				<div
					className={twMerge(
						"relative flex max-w-[85%] items-start space-x-2 group-[.mine]:ml-auto group-[.mine]:flex-row-reverse group-[.mine]:space-x-reverse",
						blockClassName,
					)}
					style={blockStyle}
					onClick={onClick}
				>
					<h.img
						src={avatarInfo}
						className={twJoin(
							"h-10 w-10 min-w-10 cursor-pointer rounded-[4px] object-cover object-center",
							hideAvatar && "invisible",
						)}
						onClick={debouncedHandleClick}
					/>
					<div className="min-w-0">
						{isGroupChat && senderId !== MYSELF_ID && !hideSenderName && (
							<div className="mb-[3px] pl-[1px] text-[#A5A5A5] text-[12px] leading-[15px]">
								{remark ?? nickname}
							</div>
						)}
						<canBeDetected.div
							css={css`
            &::before {
              clip-path: polygon(0% 50%, 50% 100%, 0% 100%);
            }
          `}
							className={twMerge(
								"group-[.friend]:before:-left-[1px] group-[.mine]:before:-right-[1px] group-[.mine]:before:-rotate-[135deg] relative max-w-full break-words rounded-[5px] px-[12px] py-[9px] before:absolute before:top-[6px] before:h-7 before:w-7 before:rounded-sm group-[.friend]:before:rotate-45",
								innerBlockClassName,
							)}
							{...(innerBlockProps as P)}
						>
							{children}
						</canBeDetected.div>
					</div>
					{extraElement}
				</div>
			</div>
		</>
	);
};

export default CommonBlock;