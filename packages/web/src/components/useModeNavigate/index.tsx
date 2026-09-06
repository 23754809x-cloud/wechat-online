import { isCompactRuntimeSnapshot } from "@/runtime/compact";
import { getModeValueSnapshot } from "@/stateV2/mode";
import { showToast } from "@/wechatComponents/Toast";
import { noop } from "lodash-es";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { type NavigateFunction, useNavigate } from "react-router-dom";

type Options = {
	errorMsg?: string;
	silence?: boolean;
};

export default function useModeNavigate(options?: Options): NavigateFunction {
	const { t, i18n } = useTranslation();
	const { errorMsg = t("base.safeNavigateNotice"), silence = false } = options ?? {};
	const baseNavigate = useNavigate();

	const navigate = useCallback(
		(...args: Parameters<NavigateFunction>) => {
			// Edit mode is a desktop authoring concern. Phones and compact touch
			// runtimes must remain navigable even if a desktop editing action left the
			// shared in-memory mode flag set to "edit".
			if (getModeValueSnapshot() === "edit" && !isCompactRuntimeSnapshot()) {
				!silence &&
					showToast({
						type: "error",
						content: errorMsg,
					});
				return noop;
			}
			return baseNavigate(...args);
		},
		[i18n.language, errorMsg, silence, baseNavigate],
	);

	return navigate as NavigateFunction;
}
