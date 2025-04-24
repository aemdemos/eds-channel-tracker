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

export const getAllTeams = async (name = '', description = '') => {
  try {
    const url = new URL(`${API_ENDPOINT}/teams/allTeams`);

    const cleanedName = name.trim();
    const cleanedDescription = description.trim();

    if (cleanedName && cleanedName !== '*') {
      url.searchParams.append('name', cleanedName.replace(/\*/g, ''));
    }

    if (cleanedDescription && cleanedDescription !== '*') {
      url.searchParams.append('description', cleanedDescription.replace(/\*/g, ''));
    }

    const response = await fetch(url.toString());
    return response.ok ? response.json() : [];
  } catch (e) { /* empty */ }
  return [];
};

export const getMessageStats = async (teamId) => fetchWithRetry(`${API_ENDPOINT}/teams/messageStats?channelId=${teamId}`);

export const getMemberIds = async (teamId) => fetchWithRetry(`${API_ENDPOINT}/teams/members?teamId=${teamId}`);

export const getUserInfo = async (userId) => fetchWithRetry(`${API_ENDPOINT}/teams/user/info?userId=${userId}`);

export const getTeam = async (teamId) => fetchWithRetry(`${API_ENDPOINT}/teams/team/${teamId}`);
export const getChannels = async (teamId) => fetchWithRetry(`${API_ENDPOINT}/teams/channels/team/${teamId}`);
