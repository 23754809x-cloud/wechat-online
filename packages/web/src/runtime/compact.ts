import { useEffect, useState } from "react";
import { isMobileOnly } from "react-device-detect";

const COMPACT_MEDIA = "(max-width: 1023px)";
const COARSE_POINTER_MEDIA = "(pointer: coarse)";

/**
 * Runtime snapshot used by non-hook helpers.
 *
 * Do not rely on user-agent detection alone: iOS webviews and iPadOS may report
 * desktop-like user agents. A compact viewport or coarse primary pointer should
 * still use the phone/tablet preview runtime rather than the desktop editor.
 */
export function isCompactRuntimeSnapshot() {
	if (typeof window === "undefined") return isMobileOnly;
	return (
		isMobileOnly ||
		window.matchMedia(COMPACT_MEDIA).matches ||
		window.matchMedia(COARSE_POINTER_MEDIA).matches
	);
}

export function useCompactRuntime() {
	const [compact, setCompact] = useState(isCompactRuntimeSnapshot);

	useEffect(() => {
		const viewport = window.matchMedia(COMPACT_MEDIA);
		const pointer = window.matchMedia(COARSE_POINTER_MEDIA);
		const update = () => setCompact(isCompactRuntimeSnapshot());

		viewport.addEventListener("change", update);
		pointer.addEventListener("change", update);
		window.addEventListener("resize", update, { passive: true });
		update();

		return () => {
			viewport.removeEventListener("change", update);
			pointer.removeEventListener("change", update);
			window.removeEventListener("resize", update);
		};
	}, []);

	return compact;
}
