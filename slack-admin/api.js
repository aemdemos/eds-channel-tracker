// api.js
import API_ENDPOINT from './config.js';

export const fetchWithRetry = async (url) => {
  let retry = true;
  while (retry) {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After'), 10) || 1;
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      } else {
        retry = false;
        return null;
      }
    } else {
      retry = false;
      return await response.json();
    }
  }
};

export const getAllSlackChannels = async (channelName, description) => {
  try {
    const url = new URL(`${API_ENDPOINT}/slack/channels`);
    url.searchParams.append("channelName", channelName.replace(/\*/g, ""));
    url.searchParams.append("description", description);
    return await fetchWithRetry(url.toString());
  } catch (e) {
    return [];
  }
};

export const getLatestMessage = async (channelId) => {
  return await fetchWithRetry(`${API_ENDPOINT}/slack/latest/message?channelId=${channelId}`);
};

export const getMembers = async (channelId) => {
  const response = await fetchWithRetry(`${API_ENDPOINT}/slack/members?channelId=${channelId}`);
  response.members = undefined;
  return response ? response.members : [];
};

export const getUserInfo = async (userId) => {
  return await fetchWithRetry(`${API_ENDPOINT}/slack/user/info?userId=${userId}`);
};
