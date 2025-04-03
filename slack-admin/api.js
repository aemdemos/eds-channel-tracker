// api.js
import API_ENDPOINT from './config.js';

export const fetchWithRetry = async (url, attempts = 0) => {
  if (attempts >= 10) {
    console.error("Max retry attempts reached for URL:", url);
    return null;
  }
  try {
    const response = await fetch(url);
    if (response.ok) {
      return await response.json();
    } else if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After'), 10) || 1;
      console.warn(`Rate limited, retrying after ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return await fetchWithRetry(url, attempts + 1);
    } else {
      console.error("Fetch failed: ", response.status);
      return null;
    }
  } catch (e) {
    console.error("Error during fetch:", e);
    return null;
  }
};


export const getAllSlackChannels = async (channelName = "aem-", description = "Edge Delivery") => {
  try {
    const url = new URL(`${API_ENDPOINT}/slack/channels`);
    url.searchParams.append("channelName", channelName.replace(/\*/g, ""));
    url.searchParams.append("description", description);
    const response = await fetch(url.toString());
    return response.ok ? response.json() : [];
  } catch (e) { }
  return [];
};

export const getLatestMessage = async (channelId) => {
  return await fetchWithRetry(`${API_ENDPOINT}/slack/latest/message?channelId=${channelId}`);
};

export const getMembers = async (channelId) => {
  return  await fetchWithRetry(`${API_ENDPOINT}/slack/members?channelId=${channelId}`);
};

export const getUserInfo = async (userId) => {
  return await fetchWithRetry(`${API_ENDPOINT}/slack/user/info?userId=${userId}`);
};
