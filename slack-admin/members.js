// members.js
import { getUserInfo } from './api.js';

// eslint-disable-next-line import/prefer-default-export
export const countMembers = async (members) => {
  const adobeMembers = [];
  const nonAdobeMembers = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const userId of members) {
    // eslint-disable-next-line no-await-in-loop
    const userJson = await getUserInfo(userId);
    const email = userJson.user?.profile?.email;
    if (email && email.endsWith('@adobe.com')) {
      adobeMembers.push(userJson.user.real_name);
    } else {
      let name = userJson.user?.real_name || userJson.user?.name;
      if (userJson.user.is_bot || userJson.user.is_app_user) {
        name = `${name} (bot)`;
      }
      nonAdobeMembers.push(name);
    }
  }

  return { adobeMembers, nonAdobeMembers };
};
