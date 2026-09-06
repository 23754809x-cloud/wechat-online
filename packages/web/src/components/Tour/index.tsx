import { useCompactRuntime } from "@/runtime/compact";
import { EMenus, activatedMenuAtom } from "@/stateV2/activatedMenu";
import { modeAtom } from "@/stateV2/mode";
import { tourTargetAtom, touredAtom } from "@/stateV2/tour";
import { sleep } from "@/utils";
import { useInViewport } from "ahooks";
import { Tour as AntdTour } from "antd";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";

const Tour = () => {
	const [toured, setToured] = useAtom(touredAtom);
	const { ref1, ref2 } = useAtomValue(tourTargetAtom);
	const [current, setCurrent] = useState(0);
	const setMenu = useSetAtom(activatedMenuAtom);
	const setMode = useSetAtom(modeAtom);
	const { t } = useTranslation();
	const compact = useCompactRuntime();
	const leftPanel = typeof document === "undefined" ? null : document.getElementById("left-panel");
	const [inViewport] = useInViewport(leftPanel as HTMLElement | null);

	// This tour teaches the desktop metadata editor. It has no valid targets on
	// phones and used to leak overlay UI into mobile preview sessions.
	if (compact || !inViewport) return null;

	return (
		<AntdTour
			current={current}
			open={!toured}
			onClose={() => {
				setMode("preview");
				setToured(true);
				setCurrent(0);
			}}
			onFinish={() => {
				setMenu(EMenus.Main);
			}}
			steps={[
				{
					title: "进入编辑模式",
					description: t("menu.tourTip1"),
					target: ref1,
					nextButtonProps: {
						onClick: async () => {
							setMode("edit");
							setMenu(EMenus.Trees);
							await sleep(10);
							setCurrent(1);
						},
					},
				},
				{
					title: "点击第二个菜单，查看可编辑节点",
					description: (
						<>
							<p>{t("menu.tourTip2")}</p>
							<p>{t("menu.tourTip3")}</p>
						</>
					),
					target: ref2,
					prevButtonProps: {
						onClick: async () => {
							setMode("preview");
							await sleep(10);
							setCurrent(0);
						},
					},
				},
			]}
		/>
	);
};

export default memo(Tour);
