import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base = process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : "/";

// https://vitejs.dev/config/
export default defineConfig({
	base,
	plugins: [
		react({ jsxImportSource: "@emotion/react" }),
		svgr(),
	],
	server: {
		port: 4444,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	build: {
		chunkSizeWarningLimit: 1024,
		rollupOptions: {
			output: {
				manualChunks: {
					react: ["react", "react-dom", "react-router-dom"],
					antd: ["antd", "@ant-design/icons", "dayjs"],
					dexie: ["dexie"],
					slate: ["slate", "slate-history", "slate-react"],
					faker: ["@faker-js/faker"],
					i18n: [
						"i18next",
						"i18next-browser-languagedetector",
						"i18next-http-backend",
						"react-i18next",
					],
					"pinyin-pro": ["pinyin-pro"],
				},
			},
		},
	},
});
