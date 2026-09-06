import CATERPILLAR_AVATAR from "@/assets/caterpillar-avatar.jpg";
import FRIEND_AVATAR_2 from "@/assets/friend-avatar-2.svg";
import FRIEND_AVATAR_3 from "@/assets/friend-avatar-3.svg";
import DEFAULT_FRIEND_AVATAR from "@/assets/friend-avatar-default.svg";
import MEI_AVATAR from "@/assets/mei-avatar.jpg";
import DEFAULT_MOMENTS_COVER from "@/assets/moments-cover-default.svg";
import type { IStateProfile, TStateAllProfiles } from "@/stateV2/profile";

export const MYSELF_ID = "0";

export const INIT_MY_PROFILE: IStateProfile = {
	id: MYSELF_ID,
	nickname: "毛毛虫",
	avatarInfo: CATERPILLAR_AVATAR,
	wechat: "*",
	gender: "male",
	momentsBackgroundInfo: DEFAULT_MOMENTS_COVER,
	momentsPrivacy: "all",
	thumbnailInfo: [],
	momentsBackgroundLike: false,
	privacy: "all",
	area: "中国大陆",
	signature: "不学习是🐶再熬夜是🐷",
};

/**
 * 好友列表。ID 1-4 与内置朋友圈、点赞/评论示例保持一致。
 */
export const INIT_FRIENDS: TStateAllProfiles = [
	{
		id: "1",
		nickname: "唐吉诃德",
		avatarInfo: MEI_AVATAR,
		wechat: "*",
		gender: "female",
		privacy: "all",
		thumbnailInfo: [],
		momentsBackgroundInfo: DEFAULT_MOMENTS_COVER,
		momentsBackgroundLike: false,
		momentsPrivacy: "all",
		signature: "Cr",
		area: "韩国 仁川 仁川市",
		isStarred: true,
	},
	{
		id: "2",
		nickname: "星之笨比",
		avatarInfo: DEFAULT_FRIEND_AVATAR,
		wechat: "*",
		privacy: "all",
		thumbnailInfo: [],
		momentsBackgroundInfo: DEFAULT_MOMENTS_COVER,
		momentsBackgroundLike: false,
		momentsPrivacy: "all",
	},
	{
		id: "3",
		nickname: "马里奥",
		avatarInfo: FRIEND_AVATAR_2,
		wechat: "*",
		privacy: "all",
		thumbnailInfo: [],
		momentsBackgroundInfo: DEFAULT_MOMENTS_COVER,
		momentsBackgroundLike: false,
		momentsPrivacy: "all",
	},
	{
		id: "4",
		nickname: "路易吉",
		avatarInfo: FRIEND_AVATAR_3,
		wechat: "*",
		privacy: "all",
		thumbnailInfo: [],
		momentsBackgroundInfo: DEFAULT_MOMENTS_COVER,
		momentsBackgroundLike: false,
		momentsPrivacy: "all",
	},
];
