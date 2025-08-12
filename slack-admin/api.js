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
import API_ENDPOINT from './config.js';
import { API_CONFIG } from './constants.js';

export const fetchWithRetry = async (url, attempts = 0) => {
  if (attempts >= API_CONFIG.MAX_RETRY_ATTEMPTS) {
    return null;
  }
  try {
    const response = await fetch(url);
    if (response.ok) {
      return await response.json();
    }
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After'), 10) || 1;
      await new Promise((resolve) => {
        setTimeout(resolve, retryAfter * API_CONFIG.DEFAULT_RETRY_DELAY);
      });
      return await fetchWithRetry(url, attempts + 1);
    }
    return null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Fetch attempt ${attempts + 1} failed for ${url}:`, e);
    return null;
  }
};

export const getAllSlackChannels = async (userProfile, channelName = '', description = '') => {
  try {
    const url = new URL(`${API_ENDPOINT}/slack/channels`);

    const cleanedChannelName = channelName.trim();
    const cleanedDescription = description.trim();

    if (cleanedChannelName && cleanedChannelName !== '*') {
      url.searchParams.append('channelName', cleanedChannelName.replace(/\*/g, ''));
    }

    if (cleanedDescription && cleanedDescription !== '*') {
      url.searchParams.append('description', cleanedDescription.replace(/\*/g, ''));
    }

    const searchBy = userProfile.name || userProfile.email;
    if (searchBy) {
      url.searchParams.append('searchBy', searchBy);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error(`API Error: ${response.status} ${response.statusText}`);
      if (response.status === 403) {
        // eslint-disable-next-line no-console
        console.error('403 Forbidden: Check if the API server is properly configured and running');
        // eslint-disable-next-line no-console
        console.error('Current endpoint:', API_ENDPOINT);
      }
      return [];
    }

    return await response.json();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error fetching channels:', e);
    return [];
  }
};

export const getMessageStats = async (channelId) => fetchWithRetry(`${API_ENDPOINT}/slack/messageStats?channelId=${channelId}`);

export const getMemberIds = async (channelId) => fetchWithRetry(`${API_ENDPOINT}/slack/members?channelId=${channelId}`);

export const getUserInfo = async (userId) => fetchWithRetry(`${API_ENDPOINT}/slack/user/info?userId=${userId}`);
