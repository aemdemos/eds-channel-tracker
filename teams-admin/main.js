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
import API_ENDPOINT from './config.js';
import {
  getMyTeams,
  getFilteredTeams,
  addRemoveMemberFromTeams,
  getTeamSummaries,
  getTeamMembers,
  addMembersToTeam,
} from './api.js';

import {
  decodeHTML,
  escapeHTML,
  getActiveTeamsCount,
  sortTable,
  renderMemberList,
  handleModalInteraction,
  sleep,
} from './utils.js';

let userProfile = null;
let sortDirection = 'asc'; // Default sort direction
let currentTeams = [];
let currentInviteTeamId = null;
let currentInviteTeamRow = null;

const pendingApiCalls = new Set();

const teamsContainer = document.getElementById('teams-container');

const doReload = () => window.location.reload();

const sk = document.querySelector('aem-sidekick');

if (sk) {
  sk.addEventListener('logged-out', doReload);
  sk.addEventListener('logged-in', doReload);
} else {
  document.addEventListener('sidekick-ready', () => {
    document.querySelector('aem-sidekick').addEventListener('logged-out', doReload);
    document.querySelector('aem-sidekick').addEventListener('logged-in', doReload);
  }, { once: true });
}

const searchButton = document.getElementById('teams');

if (!userProfile) {
  try {
    userProfile = await getUserProfile();
    if (!userProfile || !userProfile.email) {
      searchButton.disabled = true;
      teamsContainer.innerHTML = '<h3 class="error">\n'
        + '  Please login via the \n'
        + '  <a href="https://www.aem.live/docs/sidekick" target="_blank" rel="noopener noreferrer">\n'
        + '    AEM Sidekick Plugin\n'
        + '  </a>\n'
        + '</h3>\n';
    } else {
      const searchBox = document.getElementById('search-box');
      searchBox.style.display = 'flex';
    }
  } catch (error) {
    teamsContainer.innerHTML = '<p class="error">An error occurred while fetching user email. Please try again later.</p>';
  }
}

const addRemoveMemberFromTeamsWithTracking = async (email, body) => {
  const call = addRemoveMemberFromTeams(email, body);
  pendingApiCalls.add(call);
  try {
    await call;
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

function renderSingleTeamRow(team) {
  const tr = document.createElement('tr');
  tr.classList.add('team-row');
  tr.setAttribute('data-team-id', team.id);

  // Name column with optional webUrl link
  const nameCell = document.createElement('td');
  nameCell.className = 'name-column';

  if (team.webUrl) {
    nameCell.innerHTML = `<a href="${escapeHTML(team.webUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(team.displayName)}</a>`;
  } else {
    nameCell.textContent = team.displayName;
  }
  tr.appendChild(nameCell);

  // Read-only Member column
  const memberCell = document.createElement('td');
  memberCell.className = 'member-column';

  const checkmark = document.createElement('span');
  checkmark.className = 'checkmark';
  if (team.isMember) {
    memberCell.innerHTML = `
        <svg viewBox="0 0 20 20" width="18" height="18" xmlns="http://www.w3.org/2000/svg" class="checkmark-badge">
          <rect width="20" height="20" rx="4" fill="#22c55e"/>
          <path d="M6 10.5l2.5 2.5L14 8" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        `;
  }
  memberCell.appendChild(checkmark);

  tr.appendChild(memberCell);

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

  // Actions cell
  const actionsCell = document.createElement('td');
  actionsCell.style.textAlign = 'center';
  const addButton = document.createElement('button');
  addButton.textContent = '+';
  addButton.title = 'Add Users';
  addButton.classList.add('add-users-button');

  addButton.textContent = '👤 +';

  addButton.addEventListener('click', (e) => {
    document.getElementById('modal-team-name').textContent = `Add users to ${team.displayName}`;
    currentInviteTeamId = team.id;
    currentInviteTeamRow = tr; // store row reference

    const modal = document.getElementById('add-users-modal');
    const rect = e.target.getBoundingClientRect();
    modal.style.position = 'absolute';
    modal.style.top = `${rect.top + window.scrollY - 50}px`;
    modal.style.left = `${rect.right + 10 + window.scrollX}px`;
    modal.style.display = 'block';
  });

  actionsCell.appendChild(addButton);

  tr.append(
    nameCell,
    memberCell,
    descriptionCell,
    createdCell,
    totalMessagesCell,
    lastMessageCell,
    membersCountCell,
    actionsCell,
  );

  return tr;
}

const renderTable = (teams) => {
  const tbody = document.querySelector('tbody');
  tbody.innerHTML = '';

  teams.forEach((team) => {
    const tr = renderSingleTeamRow(team);
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
        <th data-sort="isMember" class="member">Are You a Member?</th>
        <th class="description sorting-disabled">Description</th>
        <th data-sort="created" class="created">Created</th>
        <th data-sort="messageCount">Total Threads</th>
        <th data-sort="lastMessage">Last Message</th>
        <th data-sort="memberCount">Total Members</th>
        <th class="sorting-disabled">Actions</th>
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
  searchButton.disabled = true;
  sortDirection = 'asc'; // Reset sort direction to default
  const rawName = document.getElementById('team-name').value.trim();
  const rawDescription = document.getElementById('team-description').value.trim();

  const nameFilter = rawName === '' || rawName === '*' ? undefined : rawName;
  const descriptionFilter = rawDescription === '' || rawDescription === '*' ? undefined : rawDescription;

  const spinner = document.getElementsByClassName('spinner')[0];
  spinner.style.display = 'block';

  const progressContainer = document.getElementById('progress-container');
  progressContainer.style.display = 'block';

  const progressBar = document.getElementById('progress-bar');
  const progressFill = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('progress-label');

  progressLabel.innerHTML = '';
  progressBar.style.display = 'none';

  teamsContainer.innerHTML = ''; // Clear any existing content

  // Wait for all pending API calls to complete
  await Promise.all(pendingApiCalls);

  const myTeams = await getMyTeams(userProfile.email);
  if (myTeams.length === 0) {
    teamsContainer.innerHTML = `
    <p>No teams found. Click <a href="#" id="send-invitation-link">here</a> to send an invitation.</p>
   `;
    document.getElementById('send-invitation-link').addEventListener('click', async (event) => {
      event.preventDefault();

      try {
        const url = new URL(`${API_ENDPOINT}/teams/invitation`);
        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userProfile?.email || '',
            name: userProfile?.name || '',
          }),
        });

        if (response.ok) {
          // eslint-disable-next-line no-alert
          alert('Invitation sent successfully!  Please check your email.');
        } else {
          // eslint-disable-next-line no-alert
          alert('Failed to send the invitation. Please try again.');
        }
      } catch (error) {
        // eslint-disable-next-line no-alert
        alert('An error occurred while sending the invitation.');
      }
    });
    return;
  }

  teamsContainer.innerHTML = ''; // Clear any existing content


  let teams = await getFilteredTeams(nameFilter, descriptionFilter);
  teams = teams.filter((team) => team && typeof team === 'object');

  const myTeamIds = myTeams.map((myTeam) => myTeam.id);
  teams.forEach((team) => {
    // Ensure `isMember` is updated based on `myTeams`
    team.isMember = myTeamIds.includes(team.id);
  });
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
      isMember: team.isMember || false, // Include isMember property
    };
  });

  // Hide the spinner and show the fully populated table
  teamsContainer.innerHTML = ''; // Clear spinner
  initTable(combinedTeams); // Pass combined teams to initTable

  // Update active team count
  document.getElementById('active-teams-count').textContent = getActiveTeamsCount(combinedTeams).toString();

  searchButton.disabled = false;
};

async function updateTeamRowAfterDelay() {
  await sleep(5000); // Wait 5 seconds

  try {
    modal.style.display = 'none';
    submitButton.disabled = false;
    textarea.style.display = 'block';
    document.getElementById('close-add-users').style.display = 'block';
    document.getElementById('modal-team-name').style.display = 'block';
    textarea.value = '';
    modalUsersAdded.style.display = 'none';

    if (currentInviteTeamRow) {
      const summary = await getTeamSummaries([currentInviteTeamId]);
      const updated = summary[0];
      const team = currentTeams.find(t => t.id === currentInviteTeamId);

      const myTeams = await getMyTeams(userProfile.email);
      const myTeamIds = myTeams.map(t => t.id);
      const isMember = myTeamIds.includes(currentInviteTeamId);

      if (team && updated) {
        Object.assign(team, {
          webUrl: updated.webUrl || '',
          created: updated.created || '',
          messageCount: updated.messageCount || 0,
          lastMessage: updated.lastMessage || '',
          memberCount: updated.memberCount || 0,
          isMember: isMember,
        });

        const newRow = renderSingleTeamRow(team);
        currentInviteTeamRow.replaceWith(newRow);
      }
    }
  } catch (err) {
    console.error("Failed to update team row after delay:", err);
  }
}


// search triggered by pressing enter
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    displayTeams().then(() => {});
  }
});

// Disable Search button if there are pending API calls

searchButton.addEventListener('click', async () => {
  await displayTeams();
});

document.getElementById('close-add-users').addEventListener('click', () => {
  document.getElementById('add-users-modal').style.display = 'none';
});

document.getElementById('submit-add-users').addEventListener('click', async () => {
  const textarea = document.getElementById('user-emails');
  const rawInput = textarea.value;

  const emails = rawInput.split(/[\n,]+/).map((e) => e.trim()).filter((e) => e);
  const payload = { guests: emails };

  const modal = document.getElementById('add-users-modal');
  const submitButton = document.getElementById('submit-add-users');

  // Create or select a spinner inside the modal
  let spinner = modal.querySelector('.spinner');
  let modalUsersAdded = document.getElementById('modal-users-added');

  if (currentInviteTeamId && emails.length > 0) {
    try {
      // Show spinner and disable submit button
      spinner.style.display = 'block';
      textarea.style.display = 'none';
      submitButton.disabled = true;

      await addMembersToTeam(currentInviteTeamId, payload);

      // Hide spinner, enable submit button
      spinner.style.display = 'none';

      document.getElementById('modal-team-name').style.display = 'none';
      document.getElementById('close-add-users').style.display = 'none';
      modalUsersAdded.style.display = 'block';
      modalUsersAdded.innerHTML = emails.length +  ` user(s) added.  They may have to accept the email invitation first.`;

      updateTeamRowAfterDelay();

    } catch (err) {
      modal.style.display = 'none';
      submitButton.disabled = false;
      textarea.style.display = 'block';
      modalUsersAdded.style.display = 'none';
      document.getElementById('close-add-users').style.display = 'block';
      document.getElementById('modal-team-name').style.display = 'block';
      alert('Failed to send invitations.');
    }
  }
});
