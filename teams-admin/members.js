/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
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
