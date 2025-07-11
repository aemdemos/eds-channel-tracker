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
import { postWithTurnstile, deleteWithTurnstile } from './authentication.js';

export const getMyTeams = async (email) => {
  try {
    const url = new URL(`${API_ENDPOINT}/users/${email}/teams`);
    const response = await fetch(url.toString());
    return response.ok ? await response.json() : [];
  } catch (e) { /* empty */ }
  return [];
};

export const getFilteredTeams = async (userProfile, name = '', description = '') => {
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

    const searchBy = userProfile.name || userProfile.email;
    if (searchBy) {
      url.searchParams.append('searchBy', searchBy);
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
  let messageCount = 0;
  let recentCount = 0;
  let questionCount = 0;
  let latestMessage = null;

  try {
    const url = new URL(`${API_ENDPOINT}/teams/messages`);

    // eslint-disable-next-line no-await-in-loop
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ teamId }),
    });

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.warn(`Non-OK response for team ${teamId}`, response.status);
      return {
        messageCount: '-', recentCount: '-', latestMessage: '-', questionCount: '-', created: '-',
      };
    }

    // eslint-disable-next-line no-await-in-loop
    const data = await response.json();

    // Aggregate results
    messageCount = data.messageCount || 0;
    recentCount = data.recentCount || 0;
    questionCount = data.questionCount || 0;

    // Keep the latest message date
    if (data.latestMessage) {
      const current = new Date(data.latestMessage);
      if (!latestMessage || current > new Date(latestMessage)) {
        latestMessage = current.toISOString().split('T')[0];
      }
    }

    return {
      messageCount,
      recentCount,
      latestMessage,
      questionCount,
      created: data.created ? new Date(data.created).toISOString().split('T')[0] : '-',
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error in getTeamMessageStats', e);
    return {
      messageCount: '-', recentCount: '-', latestMessage: '-', questionCount: '-', created: '-',
    };
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

export const addMembersToTeam = async (teamId, users, addedBy) => {
  try {
    const url = `${API_ENDPOINT}/teams/${teamId}/members`;
    return await postWithTurnstile(url, { users, addedBy });
  } catch (e) {
    // optionally log error
  }
  return [];
};

export const removeMemberFromTeam = async (teamId, email, removedBy) => {
  try {
    const users = [{ email }];
    const url = `${API_ENDPOINT}/teams/${teamId}/members`;
    return await deleteWithTurnstile(url, { users, removedBy });
  } catch (e) {
    // optionally log error
  }
  return [];
};
