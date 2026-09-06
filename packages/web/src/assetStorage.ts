import { hashAssetsDB } from "@/db";
import { getFileMD5 } from "@/utils";

export const saveImageAsset = async (file: File) => {
	const hash = await getFileMD5(file);
	await hashAssetsDB.images.put({ id: hash, file });
	return hash;
};

export const saveFileAsset = async (file: File) => {
	const hash = await getFileMD5(file);
	await hashAssetsDB.files.put({ id: hash, file });
	return hash;
};
