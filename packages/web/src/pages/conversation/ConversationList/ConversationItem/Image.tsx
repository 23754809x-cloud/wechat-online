import PlayFilledSVG from "@/assets/play-filled.svg?react";
import { h } from "@/components/HashAssets";
import { IMAGES_CACHE, initDBImagesCacheStore } from "@/db";
import { useCompactRuntime } from "@/runtime/compact";
import type { IConversationTypeImage } from "@/stateV2/conversation";
import type { IStateProfile } from "@/stateV2/profile";
import { isMD5 } from "@/utils";
import { memo, useEffect, useState } from "react";
import { twJoin } from "tailwind-merge";
import CommonBlock from "./CommonBlock";

type Props = {
	imageInfo: IConversationTypeImage["imageInfo"];
	upperText: IConversationTypeImage["upperText"];
	senderId: IStateProfile["id"];
	role: IConversationTypeImage["role"];
	isVideo?: boolean;
};

const Image = ({ imageInfo, upperText, senderId, role, isVideo }: Props) => {
	const compact = useCompactRuntime();
	const [imageShape, setimageShape] = useState<"wide" | "long" | null>(null);
	const [previewOpen, setPreviewOpen] = useState(false);

	useEffect(() => {
		if (isMD5(imageInfo)) {
			initDBImagesCacheStore().then(() => {
				calcShape(IMAGES_CACHE.get(imageInfo) ?? "");
			});
		} else {
			calcShape(imageInfo);
		}
	}, [imageInfo]);

	const calcShape = (src: string) => {
		const img = new window.Image();
		img.src = src;
		img.onload = () => {
			const { width, height } = img;
			if (width >= height) {
				setimageShape("wide");
			} else if (width < height) {
				setimageShape("long");
			}
		};
	};

	if (imageShape === null) return null;

	return (
		<>
			<CommonBlock
				upperText={upperText}
				senderId={senderId}
				innerBlockClassName={twJoin("p-0 flex", role === "mine" ? "justify-end" : "justify-start")}
			>
				<button
					type="button"
					aria-label={isVideo ? "查看视频封面" : "查看图片"}
					className={twJoin(
						"border-0 bg-transparent p-0 text-left",
						imageShape === "wide" && "max-w-[80%]",
						imageShape === "long" && "max-w-[40%]",
						isVideo && "relative",
					)}
					onClick={() => compact && setPreviewOpen(true)}
				>
					<h.img src={imageInfo} className="rounded object-contain object-center" />
					{isVideo && (
						<div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 cursor-pointer rounded-full border border-white p-1">
							<PlayFilledSVG fill="white" width={32} height={32} />
						</div>
					)}
				</button>
			</CommonBlock>

			{compact && previewOpen && (
				<div
					className="fixed inset-0 z-[940] flex items-center justify-center bg-black"
					data-testid="mobile-image-preview"
					role="dialog"
					aria-modal="true"
				>
					<button
						type="button"
						aria-label="关闭图片预览"
						className="absolute inset-0 z-0 h-full w-full bg-transparent"
						onClick={() => setPreviewOpen(false)}
					/>
					<div className="pointer-events-none relative z-10 flex h-full w-full items-center justify-center px-2 py-12">
						<h.img src={imageInfo} className="max-h-full max-w-full object-contain object-center" />
						{isVideo && (
							<div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 rounded-full border border-white/90 bg-black/20 p-2">
								<PlayFilledSVG fill="white" width={42} height={42} />
							</div>
						)}
					</div>
				</div>
			)}
		</>
	);
};

export default memo(Image);
