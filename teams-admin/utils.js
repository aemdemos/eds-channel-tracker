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
/* eslint-disable no-underscore-dangle */

export const sortTable = (teams, columnKey, direction) => {
  const sortedTeams = [...teams];
  sortedTeams.sort((a, b) => {
    let valA = a[columnKey];
    let valB = b[columnKey];

    if (columnKey === 'displayName') { // Handle sorting by displayName
      valA = a.displayName.toLowerCase();
      valB = b.displayName.toLowerCase();
    } else if (columnKey === 'isMember') {
      valA = a.isMember ? 1 : 0; // Convert boolean to numeric for sorting
      valB = b.isMember ? 1 : 0;
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  return sortedTeams;
};

export const decodeHTML = (str) => {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
};

export const getActiveTeamsCount = (teams) => {
  const now = new Date();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  return teams.filter((team) => {
    if (!team.lastMessage) return false;
    const lastMessage = new Date(team.lastMessage);
    return now - lastMessage <= THIRTY_DAYS_MS;
  }).length;
};

export const escapeHTML = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};
