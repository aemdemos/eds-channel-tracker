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
    const url = new URL(`${API_ENDPOINT}/teams/userTeams?emailId=${email}`);
    const response = await fetch(url.toString());
    return response.ok ? await response.json() : [];
  } catch (e) { /* empty */ }
  return [];
};

export const getTeamsActivity = async (email, name = '', description = '') => {
  try {
    const url = new URL(`${API_ENDPOINT}/teams/allTeams`);

    const cleanedName = name.trim();
    const cleanedDescription = description.trim();

    if (cleanedName && cleanedName !== '*') {
      url.searchParams.append('nameFilter', cleanedName.replace(/\*/g, ''));
    }

    if (cleanedDescription && cleanedDescription !== '*') {
      url.searchParams.append('descriptionFilter', cleanedDescription.replace(/\*/g, ''));
    }

    const response = await fetch(url.toString());
    const allTeams = response.ok ? await response.json() : [];

    // Fetch user's teams
    const myTeams = await getMyTeams(email);
    const myTeamIds = new Set(myTeams.map((team) => team.id));
    // Add `isMember` property to each team
    return allTeams.map((team) => ({
      ...team,
      isMember: myTeamIds.has(team.teamId),
    }));
  } catch (e) { /* empty */ }
  return [];
};

export const getUserProfile = async () => {
  try {
    const response = await fetch('https://admin.hlx.page/status/aemdemos/eds-channel-tracker/main/index.html');

    if (!response.ok) return null;

    const json = await response.json();
    return json.profile;
  } catch (e) {
    return null;
  }
};

export const addRemoveMemberFromTeams = async (email, body) => {
  try {
    const url = new URL(`${API_ENDPOINT}/teams/addRemoveTeamMember?emailId=${email}`);
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

export const getTeamSummaries = async (teamIds) => {

  const url = new URL(`${API_ENDPOINT}/teams/summary`);

  // Ensure the request is limited to 40 teamIds
  const chunkedTeamIds = [];
  for (let i = 0; i < teamIds.length; i += 40) {
    chunkedTeamIds.push(teamIds.slice(i, i + 40));
  }

  // Fetch summaries for all chunks concurrently
  const allSummaries = await Promise.all(
    chunkedTeamIds.map(async (chunk) => {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamIds: chunk }),
      });

      if (!response.ok) {
        throw new Error(`Error fetching summaries for chunk: ${response.statusText}`);
      }

      return response.json();
    }),
  );

  // Flatten the array of results
  return allSummaries.flat();
};
