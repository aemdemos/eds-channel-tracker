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
/* eslint-disable no-await-in-loop */
/* eslint-disable max-len */
import {
  getTeamsActivity,
  getUserProfile,
  getTeamSummaries, addRemoveMemberFromTeams,
} from './api.js';

import {
  sortTable,
  decodeHTML,
  getActiveTeamsCount,
  escapeHTML,
} from './utils.js';

let sortDirection = 'asc';

const teamsContainer = document.getElementById('teams-container');

const doLogout = () => window.location.reload();

const sk = document.querySelector('aem-sidekick');
if (sk) {
  sk.addEventListener('logged-out', doLogout);
} else {
  document.addEventListener('sidekick-ready', () => {
    document.querySelector('aem-sidekick').addEventListener('logged-out', doLogout);
  }, { once: true });
}

const createCell = (content, className = '') => {
  const td = document.createElement('td');
  if (className) td.className = className;
  td.textContent = content;
  return td;
};
const refreshSaveButton = () => {
  const button = document.getElementById('save');
  const add = document.querySelectorAll('tr.add');
  const remove = document.querySelectorAll('tr.remove');

  button.disabled = !(add.length || remove.length);
};

const renderTable = (teams) => {
  const tbody = document.querySelector('tbody');
  tbody.innerHTML = '';

  teams.forEach((team) => {
    const tr = document.createElement('tr');
    tr.classList.add('team-row');
    tr.setAttribute('data-team-id', team.teamId);

    const nameCell = document.createElement('td');
    nameCell.className = 'name';
    if (team.webUrl) {
      const link = document.createElement('a');
      link.textContent = team.teamName;
      link.href = team.webUrl;
      link.target = '_blank';
      link.title = 'Open in Microsoft Teams';
      nameCell.appendChild(link);
    } else {
      nameCell.textContent = team.teamName;
    }

    // Add membership badge
    if (team.isMember) {
      const badge = document.createElement('span');
      badge.className = 'badge badge-member';
      badge.textContent = 'Member';
      nameCell.appendChild(badge);
    }

    const descriptionText = decodeHTML(team.description || '');
    const descriptionCell = createCell(descriptionText);
    const dateOnly = team.created ? new Date(team.created).toISOString().split('T')[0] : 'N/A';
    const createdCell = createCell(dateOnly, 'stat-column created');
    const channelCountCell = createCell(team.activeChannels || '', 'stat-column channels-count');
    const totalMessagesCell = createCell(team.channelMessages ?? '', 'stat-column total-messages');

    const lastMessageCell = createCell(team.lastActivityDate || '', 'stat-column last-message');
    const membersCountCell = createCell(team.memberCount ?? '', 'stat-column members-count');
    membersCountCell.title = 'View members';

    tr.append(nameCell, descriptionCell, createdCell, channelCountCell, totalMessagesCell, lastMessageCell, membersCountCell);
    tbody.appendChild(tr);
    tr.addEventListener('click', () => {
      if (team.isMember) {
        tr.classList.toggle('remove'); // Mark for removal
      } else {
        tr.classList.toggle('add'); // Mark for addition
      }
      refreshSaveButton();
    });
  });
};

const toggleSortDirection = () => {
  sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
};

const addSortingToTable = (table, teams) => {
  const headers = table.querySelectorAll('th[data-sort]');
  headers.forEach((header) => {
    header.addEventListener('click', () => {
      const columnKey = header.getAttribute('data-sort');
      // Remove sort classes from all headers
      headers.forEach((h) => h.classList.remove('sorted-asc', 'sorted-desc'));
      // Sort data
      const sortedData = sortTable(teams, columnKey, sortDirection);
      // Add the appropriate arrow class
      header.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
      renderTable(sortedData);
      toggleSortDirection();
    });
  });
};

const initTable = (email, teams) => {
  teamsContainer.innerHTML = '';

  const summaryWrapper = document.createElement('div');
  summaryWrapper.classList.add('table-summary-wrapper');

  const summary = document.createElement('div');
  summary.classList.add('table-summary');
  summary.innerHTML = `
  <span>Total Teams: ${escapeHTML(teams.length.toString())}</span> |
  <span>Active Teams (Last 30 days): <span id="active-teams-count">0</span></span>
`;

  summaryWrapper.appendChild(summary);
  teamsContainer.appendChild(summaryWrapper);

  document.getElementById('active-teams-count').textContent = getActiveTeamsCount(teams).toString();

  const table = document.createElement('table');
  table.classList.add('styled-table');

  table.innerHTML = `
    <thead>
      <tr>
        <th data-sort="teamName">Name</th>
        <th class=" description sorting-disabled">Description</th>
        <th data-sort="created">Created</th>
        <th data-sort="activeChannels">Total Channels</th>
        <th data-sort="messageCount">Total Messages</th>
        <th data-sort="lastActivityDate">Last Activity</th>
        <th data-sort="memberCount">Total Members</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  addSortingToTable(table, teams);
  teamsContainer.appendChild(table);

  const initialSortKey = 'teamName';
  const sortedTeams = sortTable(teams, initialSortKey, sortDirection);
  document.querySelector(`th[data-sort="${initialSortKey}"]`).classList.add('sorted-asc');
  renderTable(sortedTeams);
  toggleSortDirection();

  renderTable(teams);

  // Add the Save button after the table is initialized
  // eslint-disable-next-line no-use-before-define
  addSaveButton(email);
};

const displayTeams = async () => {
  teamsContainer.innerHTML = '<span class="spinner"></span>';

  const rawName = document.getElementById('team-name')
    .value
    .trim();
  const rawDescription = document.getElementById('team-description')
    .value
    .trim();

  const nameFilter = rawName === '' || rawName === '*' ? undefined : rawName;
  const descriptionFilter = rawDescription === '' || rawDescription === '*' ? undefined
    : rawDescription;

  const userProfile = await getUserProfile();

  let teams = await getTeamsActivity(userProfile.email, nameFilter, descriptionFilter);

  // Filter out null or invalid items
  teams = teams.filter((team) => team && typeof team === 'object');

  // Extract teamIds from teams to fetch summaries
  const teamIds = teams.map((team) => team.id);

  // Fetch summaries for teams (up to 40 per request)
  const teamSummaries = await getTeamSummaries(teamIds);

  // Merge the fetched summaries with teams data
  teams = teams.map((team) => {
    const summary = teamSummaries.find((s) => s.teamId === team.id);
    return {
      ...team,
      created: summary ? summary.created : null,
      memberCount: summary ? summary.memberCount : null,
      webUrl: summary ? summary.webUrl : null,
    };
  });

  // Sort safely by teamName
  teams.sort((a, b) => {
    const nameA = a.teamName || '';
    const nameB = b.teamName || '';
    return nameA.localeCompare(nameB);
  });

  initTable(userProfile.email, teams);
};

const addSaveButton = (email) => {
  const button = document.createElement('button');
  button.id = 'save';
  button.textContent = 'Save';
  button.disabled = true;
  button.classList.add('button');

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span>';

    const body = {
      add: [],
      remove: [],
    };

    // Collect teams to add
    document.querySelectorAll('tr.add').forEach((tr) => {
      const teamId = tr.getAttribute('data-team-id');
      body.add.push(teamId);
    });

    // Collect teams to remove
    document.querySelectorAll('tr.remove').forEach((tr) => {
      const teamId = tr.getAttribute('data-team-id');
      console.log('Removing teamId:', teamId);
      body.remove.push(teamId);
    });

    console.log('body:', body);
    await addRemoveMemberFromTeams(email, body);

    await displayTeams();
  });

  const wrapper = document.createElement('p');
  wrapper.classList.add('button-wrapper');
  wrapper.appendChild(button);
  teamsContainer.appendChild(wrapper);
};

// search triggered by pressing enter
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    displayTeams().then(() => {});
  }
});
document.getElementById('teams').addEventListener('click', displayTeams);
