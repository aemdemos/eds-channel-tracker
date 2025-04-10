// api.js
import API_ENDPOINT from './config.js';

export const fetchWithRetry = async (url, attempts = 0) => {
  if (attempts >= 10) {
    return null;
  }
  try {
    const response = await fetch(url);
    if (response.ok) {
      return await response.json();
    }
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After'), 10) || 1;
      await new Promise((resolve) => { setTimeout(resolve, retryAfter * 1000); });
      return await fetchWithRetry(url, attempts + 1);
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const getAllSlackChannels = async (channelName = 'aem-', description = 'Edge Delivery') => {
  try {
    const url = new URL(`${API_ENDPOINT}/slack/channels`);
    url.searchParams.append('channelName', channelName.replace(/\*/g, ''));
    url.searchParams.append('description', description);
    const response = await fetch(url.toString());
    return response.ok ? response.json() : [];
  } catch (e) { /* empty */ }
  return [];
};

export const getMessageStats = async (channelId) => fetchWithRetry(`${API_ENDPOINT}/slack/messageStats?channelId=${channelId}`);

export const getMemberIds = async (channelId) => fetchWithRetry(`${API_ENDPOINT}/slack/members?channelId=${channelId}`);

export const getUserInfo = async (userId) => fetchWithRetry(`${API_ENDPOINT}/slack/user/info?userId=${userId}`);
