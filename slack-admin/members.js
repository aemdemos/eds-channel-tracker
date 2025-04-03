// members.js
import { getUserInfo } from './api.js';


export const countMembers = async (members) => {
  let adobeMemberCount = 0;
  let nonAdobeMemberCount = 0;

  for (const userId of members) {
    const userJson = await getUserInfo(userId);
    if (userJson && !userJson.user.is_bot && !userJson.user.deleted && !userJson.user.is_app_user) {
      const email = userJson.user?.profile?.email;
      if (email && email.endsWith("@adobe.com")) {
        adobeMemberCount++;
      } else {
        nonAdobeMemberCount++;
      }
    }
  }

  return { adobeMemberCount, nonAdobeMemberCount };
};
