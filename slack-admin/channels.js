// channels.js
import { getMembers, getLatestMessage } from './api.js';
import { countMembers } from './members.js';

export const fetchAllChannels = async (channels) => {
  const channelPromises = channels.map(async (channel) => {
    let adobeMemberCount = 0;
    let nonAdobeMemberCount = 0;
    let message = null;

    try {
      if (!channel.adobeMemberCount || !channel.nonAdobeMemberCount) {
        const members = await getMembers(channel.id);
        const counts = await countMembers(members);
        adobeMemberCount = counts.adobeMemberCount;
        nonAdobeMemberCount = counts.nonAdobeMemberCount;
      }

      if (!channel.lastMessageTimestamp) {
        message = await getLatestMessage(channel.id);
      }

      return { channelId: channel.id, message, adobeMemberCount, nonAdobeMemberCount };
    } catch (error) {
      return { channelId: channel.id, message: null, adobeMemberCount: 0, nonAdobeMemberCount: 0 };
    }
  });

  try {
    return await Promise.all(channelPromises);
  } catch (error) {
    return [];
  }
};
