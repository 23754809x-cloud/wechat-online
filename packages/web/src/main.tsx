import "./preflight.css";
import "./index.css";
import "animate.css";

import "./i18n";
import { Provider } from "jotai";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createHashRouter } from "react-router-dom";
import { initDBImagesCacheStore } from "./db";
import { migrateLegacyStorageOnce } from "./migrations/storage";
import { routes } from "./router/index.tsx";
import { mainStore } from "./stateV2/store.ts";
import { initDayjs } from "./time.ts";

migrateLegacyStorageOnce();
initDayjs();
initDBImagesCacheStore();

// Hash routing keeps every in-app route reload-safe on static hosts such as GitHub Pages.
const router = createHashRouter(routes);

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<Provider store={mainStore}>
			<RouterProvider router={router} />
		</Provider>
	</React.StrictMode>,
);
