import { Global, css } from "@emotion/react";
import { type CSSProperties, memo } from "react";
import { isDesktop } from "react-device-detect";
import { ErrorBoundary } from "react-error-boundary";
import { Outlet } from "react-router-dom";

import { useCompactRuntime } from "@/runtime/compact";
import Fallback from "../Fallback";
import DetectedOverall from "../NodeDetected/DetectedFloating";
import StatusBar from "../StatusBar";
import useDeviceConfig from "../useDeviceConfig";

const Screen = () => {
	const { screenSize } = useDeviceConfig();
	const compact = useCompactRuntime();

	const style: CSSProperties = compact
		? {
				width: "100%",
				height: "100dvh",
				minHeight: "100dvh",
				maxWidth: "100%",
			}
		: {
				width: screenSize.width,
				height: screenSize.height,
			};

	return (
		<div style={style} className="relative flex min-h-0 flex-col overflow-hidden bg-white" id="screen">
			<Global
				styles={css`
          &::-webkit-scrollbar {
            display: none;
          }
          html,
          body,
          #root {
            margin: 0;
            min-height: 100%;
            max-width: 100%;
          }
          body {
            overscroll-behavior: none;
          }
        `}
			/>
			{!compact && <DetectedOverall />}
			{!compact && isDesktop && <StatusBar />}
			<ErrorBoundary FallbackComponent={Fallback}>
				<Outlet />
			</ErrorBoundary>
		</div>
	);
};

export default memo(Screen);
