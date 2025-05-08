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
import getUserProfile from './userProfile.js';

import {
  getTeamsActivity,
  getTeamSummaries,
  addRemoveMemberFromTeams,
} from './api.js';

import {
  sortTable,
  decodeHTML,
  getActiveTeamsCount,
  escapeHTML,
} from './utils.js';

let userEmail = null;
let sortDirection = 'asc';
const pendingApiCalls = new Set();

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

const addRemoveMemberFromTeamsWithTracking = async (email, body) => {
  const call = addRemoveMemberFromTeams(email, body);
  pendingApiCalls.add(call);
  try {
    await addRemoveMemberFromTeams(email, body);
  } finally {
    pendingApiCalls.delete(call);
    console.log('addRemoveMemberFromTeamsWithTracking  pendingApiCalls:', pendingApiCalls);
  }
};

window.addEventListener('beforeunload', (event) => {
  console.log('beforeunload pendingApiCalls:', pendingApiCalls.size);
  if (pendingApiCalls.size > 0) {
    event.preventDefault();
    event.returnValue = 'There are pending changes. Are you sure you want to leave?';
  }
});

const createCell = (content, className = '') => {
  const td = document.createElement('td');
  if (className) td.className = className;
  td.textContent = content;
  return td;
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

    const descriptionText = decodeHTML(team.description || '');
    const descriptionCell = createCell(descriptionText);
    const dateOnly = team.created ? new Date(team.created).toISOString().split('T')[0] : 'N/A';
    const createdCell = createCell(dateOnly, 'stat-column created');
    const channelCountCell = createCell(team.activeChannels || '', 'stat-column channels-count');
    const totalMessagesCell = createCell(team.channelMessages ?? '', 'stat-column total-messages');
    const lastMessageCell = createCell(team.lastActivityDate || '', 'stat-column last-message');
    const membersCountCell = createCell(team.memberCount ?? '', 'stat-column members-count');
    membersCountCell.title = 'View members';

    const memberCell = document.createElement('td');
    memberCell.className = 'member-column';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = team.isMember;
    checkbox.title = 'Check to add user to team; uncheck to remove.';
    checkbox.addEventListener('change', async () => {
      const body = {
        add: [],
        remove: [],
      };

      const previousState = checkbox.checked;

      if (checkbox.checked) {
        body.add.push(team.teamId);
      } else {
        body.remove.push(team.teamId);
      }

      try {
        await addRemoveMemberFromTeamsWithTracking(userEmail, body);
      } catch (error) {
        console.error('Error updating team membership:', error);
        // Revert checkbox state if the API call fails
        checkbox.checked = previousState;
      }
    });

    memberCell.appendChild(checkbox);

    tr.append(
      nameCell,
      descriptionCell,
      createdCell,
      channelCountCell,
      totalMessagesCell,
      lastMessageCell,
      membersCountCell,
      memberCell,
    );
    tbody.appendChild(tr);
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

const initTable = (teams) => {
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
        <th class="member sorting-disabled">Member</th>
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

  if (!userEmail) {
    try {
      const userProfile = await getUserProfile();
      if (!userProfile || !userProfile.email) {
        console.error('User profile is invalid or email is missing');
        teamsContainer.innerHTML = '<p class="error">Failed to fetch user email. Please log in again and try.</p>';
        return;
      }
      userEmail = userProfile.email;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      teamsContainer.innerHTML = '<p class="error">An error occurred while fetching user email. Please try again later.</p>';
      return;
    }
  }

  let teams = await getTeamsActivity(nameFilter, descriptionFilter);

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

  initTable(teams);
};

// search triggered by pressing enter
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    displayTeams().then(() => {});
  }
});

// Disable Search button if there are pending API calls
const searchButton = document.getElementById('teams');
searchButton.addEventListener('click', async () => {
  console.log('search pendingApiCalls:', pendingApiCalls.size);
  if (pendingApiCalls.size > 0) {
    alert('Please wait for all pending changes to complete before searching.');
    return;
  }
  await displayTeams();
});
