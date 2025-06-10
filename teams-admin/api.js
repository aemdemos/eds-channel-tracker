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

export function onTurnstileLoad() {
  const url = new URL(`${API_ENDPOINT}/verify-turnstile`);
  // Render Turnstile widget with "invisible" mode
  turnstile.render('#turnstile-container', {
    sitekey: '0x4AAAAAABgUT3ukRO60nTNJ',
    callback: (token) => {
      // Send token to backend for verification
      fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Allow page content to show or proceed
          document.body.style.visibility = 'visible';
        } else {
          // Block access or show error
          alert('Verification failed, please try again.');
        }
      });
    }
  });

  // Execute the challenge immediately on load
  turnstile.execute();
}

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
      return { messageCount: '-', latestMessage: '-' };
    }

    // eslint-disable-next-line no-await-in-loop
    const data = await response.json();

    // Aggregate results
    messageCount = data.messageCount || 0;
    recentCount = data.recentCount || 0;

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
    };
  } catch (e) {
    // eslint-disable-next-line no-console
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

export const addMembersToTeam = async (teamId, users, addedBy) => {
  try {
    const url = new URL(`${API_ENDPOINT}/teams/${teamId}/members`);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ users, addedBy }),
    });
    return response.ok ? await response.json() : [];
  } catch (e) { /* empty */ }
  return [];
};

export const removeMemberFromTeam = async (teamId, email, removedBy) => {
  try {
    const users = [{ email }];
    const url = new URL(`${API_ENDPOINT}/teams/${teamId}/members`);
    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ users, removedBy }),
    });
    return response.ok ? await response.json() : [];
  } catch (e) { /* empty */ }
  return [];
};
