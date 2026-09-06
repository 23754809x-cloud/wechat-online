import { App as AntdApp, ConfigProvider } from "antd";
import { useTranslation } from "react-i18next";

import LeftPanel from "./components/LeftPanel";
import RightPanel from "./components/RightPanel";
import Screen from "./components/Screen";
import TopPopover from "./components/TopPopover";
import Tour from "./components/Tour";
import MobileCreatorPanel from "./components/MobileCreatorPanel";
import { ANTD_LANG_MAP } from "./i18n";

const App = () => {
	const { i18n } = useTranslation();

	return (
		<ConfigProvider locale={ANTD_LANG_MAP[i18n.language as keyof typeof ANTD_LANG_MAP]}>
			<div className="grid h-screen grid-cols-3 overflow-hidden max-lg:h-[100dvh] max-lg:grid-cols-1">
				<AntdApp className="max-lg:hidden">
					<LeftPanel />
				</AntdApp>
				<div className="flex min-h-0 items-end justify-center overflow-auto border-orange-400 border-r border-l border-dashed max-lg:items-stretch max-lg:justify-start max-lg:border-none max-lg:overflow-hidden" id="center">
					<div className="border max-lg:w-full max-lg:border-0">
						<TopPopover>
							<Screen />
						</TopPopover>
					</div>
				</div>
				<RightPanel />
			</div>
			<MobileCreatorPanel />
			<Tour />
		</ConfigProvider>
	);
};

export default App;
