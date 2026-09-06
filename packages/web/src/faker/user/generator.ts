import FRIEND_AVATAR_2 from "@/assets/friend-avatar-2.svg";
import FRIEND_AVATAR_3 from "@/assets/friend-avatar-3.svg";
import DEFAULT_FRIEND_AVATAR from "@/assets/friend-avatar-default.svg";
import DEFAULT_MOMENTS_COVER from "@/assets/moments-cover-default.svg";
import getFakerInstanceByLang from "@/faker/core";
import type { IStateProfile } from "@/stateV2/profile";
import { nanoid } from "nanoid";

const LOCAL_DEMO_AVATARS = [DEFAULT_FRIEND_AVATAR, FRIEND_AVATAR_2, FRIEND_AVATAR_3];

export function randomAvatar() {
	const faker = getFakerInstanceByLang();
	return faker.helpers.arrayElement(LOCAL_DEMO_AVATARS);
}

export function randomUserId() {
	return nanoid(8);
}

export function randomGender() {
	const faker = getFakerInstanceByLang();
	return faker.person.sexType();
}

export function randomNickname() {
	const faker = getFakerInstanceByLang();
	const gender = randomGender();
	return faker.person.fullName({
		sex: gender,
	});
}

export function generateFakeUser(preData: Partial<IStateProfile> = {}): IStateProfile {
	const faker = getFakerInstanceByLang();
	const gender = randomGender();
	return {
		id: randomUserId(),
		nickname: randomNickname(),
		gender,
		avatarInfo: randomAvatar(),
		wechat: faker.internet.userName({
			firstName: faker.person.firstName(gender),
			lastName: faker.person.lastName(gender),
		}),
		momentsBackgroundLike: false,
		privacy: "all",
		momentsPrivacy: "all",
		thumbnailInfo: [],
		momentsBackgroundInfo: DEFAULT_MOMENTS_COVER,
		...preData,
	};
}
