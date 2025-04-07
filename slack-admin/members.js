// members.js
import { getUserInfo } from './api.js';


export const countMembers = async (members) => {
  let adobeMembers = [];
  let nonAdobeMembers = [];

  for (const userId of members) {
    const userJson = await getUserInfo(userId);
    if (userJson && !userJson.user.is_bot && !userJson.user.deleted && !userJson.user.is_app_user) {
      const email = userJson.user?.profile?.email;
      if (email && email.endsWith("@adobe.com")) {
        adobeMembers.push(userJson.user.real_name);
      } else {
        nonAdobeMembers.push(userJson.user.real_name);
      }
    }
  }

  return { adobeMembers, nonAdobeMembers };
};
