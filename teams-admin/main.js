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
  addRemoveMemberFromTeams, getTeamsActivity, getTeamSummaries, getTeamMembers,
} from './api.js';

import {
  decodeHTML,
  escapeHTML,
  getActiveTeamsCount,
  sortTable,
  renderMemberList,
  handleModalInteraction,
} from './utils.js';

let userEmail = null;
let sortDirection = 'asc';
let currentTeams = [];

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
  }
};

window.addEventListener('beforeunload', (event) => {
  if (pendingApiCalls.size > 0) {
    event.preventDefault();
  }
});

const createCell = (content, nobreak = false) => {
  const td = document.createElement('td');
  td.textContent = content;
  if (nobreak) {
    td.classList.add('nobreak');
  }
  return td;
};

const renderTable = (teams) => {
  const tbody = document.querySelector('tbody');
  tbody.innerHTML = '';

  teams.forEach((team) => {
    const tr = document.createElement('tr');
    tr.classList.add('team-row');
    tr.setAttribute('data-team-id', team.id);

    // Name column with optional webUrl link
    const nameCell = document.createElement('td');

    if (team.webUrl) {
      nameCell.innerHTML = `<a href="${escapeHTML(team.webUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(team.displayName)}</a>`;
    } else {
      nameCell.textContent = team.displayName;
    }
    tr.appendChild(nameCell);

    const memberCell = document.createElement('td');
    memberCell.className = 'member-column';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = team.isMember;
    checkbox.title = team.isMember
      ? 'Uncheck to remove your account from this team.'
      : 'Check to add your account to this team';
    checkbox.addEventListener('change', async () => {
      const body = {
        add: [],
        remove: [],
      };

      const previousState = checkbox.checked;

      if (checkbox.checked) {
        body.add.push(team.id);
      } else {
        body.remove.push(team.id);
      }

      try {
        await addRemoveMemberFromTeamsWithTracking(userEmail, body);
        // Update the `isMember` state in `currentTeams`
        const teamToUpdate = currentTeams.find((t) => t.id === team.id);
        if (teamToUpdate) {
          teamToUpdate.isMember = checkbox.checked;
        }
      } catch (error) {
        checkbox.checked = previousState;
      }
    });

    memberCell.appendChild(checkbox);

    const descriptionText = decodeHTML(team.description || '');
    const descriptionCell = createCell(descriptionText);

    const dateOnly = team.created ? new Date(team.created).toISOString().split('T')[0] : 'N/A';
    const createdCell = createCell(dateOnly, true);
    const totalMessagesCell = createCell(team.messageCount ?? '');
    const lastMessageCell = createCell(team.lastMessage || '');
    const membersCountCell = createCell(team.memberCount ?? '');

    membersCountCell.classList.add('members-count-cell');

    // Modify the membersCountCell to make it look like a hyperlink
    const membersLink = document.createElement('a');
    membersLink.textContent = `${team.memberCount ?? 0}`; // You can append "Members" text or leave it as just the count

    membersCountCell.innerHTML = ''; // Clear current content
    membersCountCell.appendChild(membersLink); // Add the hyperlink

    const modal = document.getElementById('modal');

    membersCountCell.addEventListener('click', async (e) => {
      e.stopPropagation();
      await handleModalInteraction(membersCountCell, team.id, modal, async () => {
        const members = await getTeamMembers(team.id);
        return {
          modalContent: renderMemberList(members),
          teamName: team.displayName,
          members,
        };
      });
    });

    tr.append(
      nameCell,
      memberCell,
      descriptionCell,
      createdCell,
      totalMessagesCell,
      lastMessageCell,
      membersCountCell,
    );

    tbody.appendChild(tr);
  });
};

const toggleSortDirection = () => {
  sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
};

const addSortingToTable = (table) => {
  const headers = table.querySelectorAll('th[data-sort]');
  headers.forEach((header) => {
    header.addEventListener('click', () => {
      const columnKey = header.getAttribute('data-sort');

      // Clear all sort classes
      headers.forEach((h) => h.classList.remove('sorted-asc', 'sorted-desc'));

      // Sort and toggle direction
      const sorted = sortTable(currentTeams, columnKey, sortDirection);
      header.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
      renderTable(sorted);
      toggleSortDirection();
    });
  });
};

// Modify initTable to accept the combinedTeams array
const initTable = (teams) => {
  currentTeams = [...teams]; // Save for sorting

  teamsContainer.innerHTML = ''; // Clear any existing spinner or content

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

  const table = document.createElement('table');
  table.classList.add('styled-table');

  table.innerHTML = `
    <thead>
      <tr>
        <th data-sort="displayName">Team Name</th>
        <th data-sort="isMember" class="member">Member?</th>
        <th class=" description sorting-disabled">Description</th>
        <th data-sort="created" class="created">Created</th>
        <th data-sort="messageCount">Total Threads</th>
        <th data-sort="lastMessage">Last Message</th>
        <th data-sort="memberCount">Total Members</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  teamsContainer.appendChild(table);

  const initialSortKey = 'displayName';
  const sortedTeams = sortTable(teams, initialSortKey, sortDirection);
  document.querySelector(`th[data-sort="${initialSortKey}"]`).classList.add('sorted-asc');
  renderTable(sortedTeams);
  addSortingToTable(table);
};

const displayTeams = async () => {
  teamsContainer.innerHTML = ''; // Clear any existing content
  const spinner = document.getElementsByClassName('spinner')[0];
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const progressFill = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('progress-label');

  progressLabel.innerHTML = '';
  progressBar.style.display = 'none';

  const rawName = document.getElementById('team-name').value.trim();
  const rawDescription = document.getElementById('team-description').value.trim();

  const nameFilter = rawName === '' || rawName === '*' ? undefined : rawName;
  const descriptionFilter = rawDescription === '' || rawDescription === '*' ? undefined : rawDescription;

  if (!userEmail) {
    try {
      const userProfile = await getUserProfile();
      if (!userProfile || !userProfile.email) {
        teamsContainer.innerHTML = '<p class="error">\n'
          + '  Please login via the \n'
          + '  <a href="https://www.aem.live/docs/sidekick" target="_blank" rel="noopener noreferrer">\n'
          + '    AEM Sidekick Plugin\n'
          + '  </a>\n'
          + '</p>\n';
        return;
      }
      userEmail = userProfile.email;
      progressContainer.style.display = 'block';
      spinner.style.display = 'block';
    } catch (error) {
      teamsContainer.innerHTML = '<p class="error">An error occurred while fetching user email. Please try again later.</p>';
      return;
    }
  }

  let teams = await getTeamsActivity(userEmail, nameFilter, descriptionFilter);
  teams = teams.filter((team) => team && typeof team === 'object');

  const teamIds = teams.map((team) => team.id);

  const totalTeams = teamIds.length;
  const chunkedTeamIds = [];
  for (let i = 0; i < totalTeams; i += 5) {
    chunkedTeamIds.push(teamIds.slice(i, i + 5));
  }

  const teamSummaries = [];
  let loaded = 0;

  await Promise.all(
    chunkedTeamIds.map(async (chunk) => {
      try {
        const summaries = await getTeamSummaries(chunk);
        teamSummaries.push(...summaries);
      } catch (err) { /* empty */ }
      loaded += chunk.length;
      const percent = Math.round((loaded / totalTeams) * 100);
      progressFill.style.width = `${percent}%`;
      // Once loading begins, show progress bar, hide spinner
      spinner.style.display = 'none';
      progressBar.style.display = 'block';
      progressLabel.textContent = `Analyzing ${loaded} of ${totalTeams} teams...`;
    }),
  );

  // Hide the progress bar after loading
  progressContainer.style.display = 'none';

  // Combine the teams and summaries into one object
  const combinedTeams = teams.map((team) => {
    const teamSummary = teamSummaries.find((summary) => summary.teamId === team.id);
    return {
      ...team, // Spread the original team data
      webUrl: teamSummary?.webUrl || '', // Add summary data like webUrl
      created: teamSummary?.created || '', // Add summary data like created date
      messageCount: teamSummary?.messageCount || 0, // Add summary data like messageCount
      lastMessage: teamSummary?.lastMessage || '', // Add summary data like lastMessage
      memberCount: teamSummary?.memberCount || 0, // Add summary data like memberCount
    };
  });

  // Hide the spinner and show the fully populated table
  teamsContainer.innerHTML = ''; // Clear spinner
  initTable(combinedTeams); // Pass combined teams to initTable

  // Update active team count
  document.getElementById('active-teams-count').textContent = getActiveTeamsCount(combinedTeams).toString();
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
  if (pendingApiCalls.size > 0) {
    // eslint-disable-next-line no-alert
    alert('Please wait for all pending changes to complete before searching.');
    return;
  }
  await displayTeams();
});
