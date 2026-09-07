import { useCompactRuntime } from "@/runtime/compact";
import { useEffect } from "react";

const BASE_SELECTOR = '[data-testid="mobile-creator-center"]';
const ADVANCED_SELECTOR = '[data-testid="advanced-creator-center"]';

const restoreBasePanel = (panel: HTMLElement) => {
	panel.style.display = "";
	panel.style.pointerEvents = "";
	panel.removeAttribute("aria-hidden");
	panel.removeAttribute("inert");
};

const MobileCreatorLayerGuard = () => {
	const compact = useCompactRuntime();

	useEffect(() => {
		if (!compact) return;

		let guardedPanel: HTMLElement | null = null;
		let activePointer: { id: number; x: number; y: number } | null = null;

		const isHeaderHotspot = (x: number, y: number) =>
			y <= 92 && x >= window.innerWidth * 0.28 && x <= window.innerWidth * 0.72;

		const syncLayerState = () => {
			const basePanel = document.querySelector<HTMLElement>(BASE_SELECTOR);
			const advancedPanel = document.querySelector<HTMLElement>(ADVANCED_SELECTOR);

			if (guardedPanel && guardedPanel !== basePanel) {
				restoreBasePanel(guardedPanel);
				guardedPanel = null;
			}

			if (!basePanel) return;
			guardedPanel = basePanel;

			if (advancedPanel) {
				basePanel.style.display = "none";
				basePanel.style.pointerEvents = "none";
				basePanel.setAttribute("aria-hidden", "true");
				basePanel.setAttribute("inert", "");
				return;
			}

			restoreBasePanel(basePanel);
		};

		const cancelUnderlyingHold = (event: PointerEvent) => {
			window.dispatchEvent(
				new PointerEvent("pointercancel", {
					bubbles: true,
					clientX: event.clientX,
					clientY: event.clientY,
					pointerId: event.pointerId,
					pointerType: event.pointerType,
					isPrimary: event.isPrimary,
				}),
			);
		};

		const handlePointerDown = (event: PointerEvent) => {
			if (document.documentElement.dataset.creatorOpen === "true") {
				activePointer = null;
				return;
			}
			activePointer = isHeaderHotspot(event.clientX, event.clientY)
				? { id: event.pointerId, x: event.clientX, y: event.clientY }
				: null;
		};

		const handlePointerMove = (event: PointerEvent) => {
			if (!activePointer || activePointer.id !== event.pointerId) return;
			if (Math.hypot(event.clientX - activePointer.x, event.clientY - activePointer.y) <= 12) return;
			cancelUnderlyingHold(event);
			activePointer = null;
		};

		const clearPointer = () => {
			activePointer = null;
		};

		const handleContextMenu = (event: MouseEvent) => {
			if (document.documentElement.dataset.creatorOpen === "true") return;
			if (!isHeaderHotspot(event.clientX, event.clientY)) return;
			event.preventDefault();
			window.dispatchEvent(new Event("pointercancel"));
			activePointer = null;
		};

		const observer = new MutationObserver(syncLayerState);
		observer.observe(document.body, { childList: true, subtree: true });
		syncLayerState();

		window.addEventListener("pointerdown", handlePointerDown, true);
		window.addEventListener("pointermove", handlePointerMove, true);
		window.addEventListener("pointerup", clearPointer, true);
		window.addEventListener("pointercancel", clearPointer, true);
		window.addEventListener("contextmenu", handleContextMenu, true);

		return () => {
			observer.disconnect();
			if (guardedPanel) restoreBasePanel(guardedPanel);
			window.removeEventListener("pointerdown", handlePointerDown, true);
			window.removeEventListener("pointermove", handlePointerMove, true);
			window.removeEventListener("pointerup", clearPointer, true);
			window.removeEventListener("pointercancel", clearPointer, true);
			window.removeEventListener("contextmenu", handleContextMenu, true);
		};
	}, [compact]);

	return null;
};

export default MobileCreatorLayerGuard;
