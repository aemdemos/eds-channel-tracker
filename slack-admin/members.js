// members.js
import { getUserInfo } from './api.js';


export const countMembers = async (members) => {
  let adobeMembers = [];
  let nonAdobeMembers = [];

  for (const userId of members) {
    const userJson = await getUserInfo(userId);
    const email = userJson.user?.profile?.email;
    if (email && email.endsWith("@adobe.com")) {
      adobeMembers.push(userJson.user.real_name);
    } else {
      let name = userJson.user?.real_name || userJson.user?.name;
      if (userJson.user.is_bot || userJson.user.is_app_user) {
        name = '' + name + ' (bot)';
      }
      nonAdobeMembers.push(name);
    }
  }

  return { adobeMembers, nonAdobeMembers };
};
