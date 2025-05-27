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

export const getMyTeams = async (email) => {
  try {
    const url = new URL(`${API_ENDPOINT}/users/${email}/teams`);
    const response = await fetch(url.toString());
    return response.ok ? await response.json() : [];
  } catch (e) { /* empty */ }
  return [];
};

export const getFilteredTeams = async (name = '', description = '') => {
  try {
    const url = new URL(`${API_ENDPOINT}/teams`);
    const cleanedName = name.trim();
    const cleanedDescription = description.trim();

    if (cleanedName && cleanedName !== '*') {
      url.searchParams.append('nameFilter', cleanedName.replace(/\*/g, ''));
    }

    if (cleanedDescription && cleanedDescription !== '*') {
      url.searchParams.append('descriptionFilter', cleanedDescription.replace(/\*/g, ''));
    }

    const response = await fetch(url.toString());

    return response.ok ? await response.json() : [];
  } catch (e) { /* empty */ }
  return [];
};

export async function getTeamMembers(teamId) {
  try {
    const url = new URL(`${API_ENDPOINT}/teams/${teamId}/members`);
    const response = await fetch(url.toString());
    return response.ok ? response.json() : [];
  } catch (e) { /* empty */ }
  return [];
}

export const getTeamMessageStats = async (teamId) => {
  try {
    const url = new URL(`${API_ENDPOINT}/teams/messages`);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ teamId }),
    });

    if (!response.ok) {
      console.warn(`Non-OK response for team ${teamId}`, response.status);
      return { messageCount: '-', latestMessage: '-' };
    }

    const data = await response.json(); // ✅ await
    return data;
  } catch (e) {
    console.error('Error in getTeamMessageStats', e);
    return { messageCount: '-', latestMessage: '-' };
  }
};

export const getTeamSummaries = async (teamIds) => {
  try {
    const url = new URL(`${API_ENDPOINT}/teams/summary`);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ teamIds }),
    });
    return response.ok ? response.json() : [];
  } catch (e) { /* empty */ }
  return [];
};

export const addRemoveMemberFromTeams = async (email, body) => {
  try {
    const url = new URL(`${API_ENDPOINT}/users/${email}/teams`);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body), // Send body as JSON payload
    });
    return response.ok ? await response.json() : [];
  } catch (e) { /* empty */ }
  return [];
};

export const addMembersToTeam = async (teamId, users) => {
  try {
    const url = new URL(`${API_ENDPOINT}/teams/${teamId}/members`);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(users),
    });
    return response.ok ? await response.json() : [];
  } catch (e) { /* empty */ }
  return [];
};
