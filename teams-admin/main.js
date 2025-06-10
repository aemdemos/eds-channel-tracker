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
import renderMemberList from './members.js';
import API_ENDPOINT from './config.js';
import {
  getMyTeams,
  getFilteredTeams,
  getTeamSummaries,
  getTeamMembers,
  addMembersToTeam,
  getTeamMessageStats,
  onTurnstileLoad,
} from './api.js';
import {
  sortTable,
  decodeHTML,
  escapeHTML,
  sleep,
} from './utils.js';
import {
  handleModalInteraction,
  showSuccessModal,
  setupModalDrag,
} from './modal.js';

// Ensure the userProfile is fetched if not set
let userProfile;

const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

if (!isLocalhost) {
  window.requestIdleCallback = () => {
    onTurnstileLoad();
  };
}


// If running on localhost, fetch userProfile from query params
if (isLocalhost) {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email');
  const name = params.get('name');

  if (email && name) {
    userProfile = { email, name };
  } else {
    // eslint-disable-next-line no-alert
    alert('missing email and name query params for local debug');
  }
}

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
const membersModal = document.getElementById('members-modal');
const addUsersModal = document.getElementById('add-users-modal');

document.addEventListener('DOMContentLoaded', () => {
  if (membersModal) setupModalDrag(membersModal);
  if (addUsersModal) setupModalDrag(addUsersModal);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    membersModal.style.display = 'none';
    addUsersModal.style.display = 'none';
  }
});

document.getElementById('success-modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    addUsersModal.style.display = 'none';
  }
});

let sortDirection = 'asc'; // Default sort direction
let currentTeams = [];
let currentInviteTeamId = null;
let currentInviteTeamRow = null;

const searchButton = document.getElementById('teams');
const teamsContainer = document.getElementById('teams-container');

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

  // Name column with optional webUrl link (only if isMember)
  if (team.webUrl && team.isMember) {
    nameCell.innerHTML = `<a href="${escapeHTML(team.webUrl)}" target="_blank" rel="noopener noreferrer" title="Open in Microsoft Teams">${escapeHTML(team.displayName)}</a>`;
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

  const totalMessagesCell = document.createElement('td');
  totalMessagesCell.classList.add('msg-count');

  const lastMessageCell = document.createElement('td');
  lastMessageCell.classList.add('latest-msg');

  const recentCountCell = document.createElement('td');
  recentCountCell.classList.add('recent-count');

  if (team.messageCount != null) {
    totalMessagesCell.textContent = team.messageCount ?? '—';
    lastMessageCell.textContent = team.latestMessage ?? '—';
    recentCountCell.textContent = team.recentCount ?? '—';
  } else {
    totalMessagesCell.innerHTML = '<span class="spinner" data-loading="true"></span>';
    lastMessageCell.innerHTML = '<span class="spinner" data-loading="true"></span>';
    recentCountCell.innerHTML = '<span class="spinner" data-loading="true"></span>';
  }

  const membersCountCell = createCell(team.memberCount ?? '');
  membersCountCell.classList.add('members-count-cell');

  // Modify the membersCountCell to make it look like a hyperlink
  const membersLink = document.createElement('a');
  membersLink.textContent = `${team.memberCount ?? 0}`; // You can append "Members" text or leave it as just the count
  membersLink.title = 'View Members';
  membersCountCell.innerHTML = ''; // Clear current content
  membersCountCell.appendChild(membersLink); // Add the hyperlink

  membersCountCell.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    membersModal.dataset.teamId = team.id; // Store team ID in modal for later use
    membersModal.dataset.removedBy = userProfile.name;
    membersModal.dataset.currentUserEmail = userProfile.email;
    await handleModalInteraction(membersCountCell, team.id, membersModal, async () => {
      const members = await getTeamMembers(team.id);
      return {
        modalContent: renderMemberList(members),
        teamName: `Members of ${team.displayName}`,
        members,
      };
    });
  });

  async function updateTeamRowAfterDelay() {
    await sleep(5000); // Wait 4 seconds

    try {
      if (currentInviteTeamRow) {
        const currentTeam = currentTeams.find((t) => t.id === currentInviteTeamId);
        const currentTeamMembers = await getTeamMembers(currentInviteTeamId);
        const memberEmails = currentTeamMembers.map((t) => t.email);
        const isMember = memberEmails.includes(userProfile.email);

        if (team) {
          Object.assign(team, {
            webUrl: team.webUrl || '',
            created: team.created || '',
            messageCount: currentTeam.messageCount || 0,
            latestMessage: currentTeam.latestMessage || '-',
            recentCount: currentTeam.recentCount || '0',
            memberCount: memberEmails.length || 0,
            isMember,
          });

          const newRow = renderSingleTeamRow(team);
          currentInviteTeamRow.replaceWith(newRow);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update team row after delay:', err);
    }
  }

  // Actions cell
  const actionsCell = document.createElement('td');
  actionsCell.style.textAlign = 'center';
  const addButton = document.createElement('button');
  addButton.textContent = '+';
  addButton.title = 'Add Members';
  addButton.classList.add('add-users-button');
  addButton.textContent = '👤 +';

  addButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    currentInviteTeamId = team.id;
    currentInviteTeamRow = tr; // store row reference
    await handleModalInteraction(
      addButton, // trigger element for positioning
      team.id,
      addUsersModal,
      async () => ({
        modalContent: `
          <form id="add-users-form">
            <div id="user-rows-container">
              <div class="user-row">
                <input type="text" name="displayName" placeholder="Display Name" required>
                <input type="email" name="email" placeholder="Email" required>
                <button type="button" class="remove-row" title="Remove">−</button>
              </div>
            </div>
            <button type="button" id="add-row-button">+ Add Row</button>
            <button id="submit-users-btn" class="button" type="submit">Submit</button>
          </form>
          <div id="add-users-error" style="color: red; margin-top: 10px; display: none;"></div>
          <span class="spinner" style="display:none"></span>
        `,
        teamName: `Add members to ${team.displayName}`,
      }),
    );
    const firstInput = addUsersModal.querySelector('input[name="displayName"]');
    if (firstInput) firstInput.focus();

    // Now select the elements inside the modal
    const form = addUsersModal.querySelector('#add-users-form');
    const container = addUsersModal.querySelector('#user-rows-container');
    const addRowBtn = addUsersModal.querySelector('#add-row-button');
    const submitButton = addUsersModal.querySelector('#submit-users-btn');
    const spinner = addUsersModal.querySelector('.spinner');
    const errorDiv = addUsersModal.querySelector('#add-users-error');

    // Add row handler
    addRowBtn.addEventListener('click', () => {
      const userRow = document.createElement('div');
      userRow.classList.add('user-row');
      userRow.innerHTML = `
    <input type="text" name="displayName" placeholder="Display Name" required>
    <input type="email" name="email" placeholder="Email" required>
    <button type="button" class="remove-row" title="Remove">−</button>
  `;
      container.appendChild(userRow);
    });
    // Remove row handler
    container.addEventListener('click', (event) => {
      if (event.target.classList.contains('remove-row')) {
        event.target.closest('.user-row')
          .remove();
      }
    });
    // Form submit handler
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';
      const rows = container.querySelectorAll('.user-row');
      const users = Array.from(rows).map((row) => ({
        displayName: row.querySelector('input[name="displayName"]').value.trim(),
        email: row.querySelector('input[name="email"]').value.trim(),
      }));

      try {
        // Show spinner and disable submit button
        spinner.style.display = 'block';
        form.style.display = 'none';
        submitButton.disabled = true;

        const addedBy = userProfile.name || userProfile.email;
        const result = await addMembersToTeam(currentInviteTeamId, users, addedBy);
        const addedCount = result.filter((user) => user.added).length;

        spinner.style.display = 'none';
        form.style.display = 'flex';
        submitButton.disabled = false;

        // Reset form
        container.innerHTML = '';
        const row = document.createElement('div');
        row.classList.add('user-row');
        row.innerHTML = `
      <input type="text" name="displayName" placeholder="Display Name" required>
      <input type="email" name="email" placeholder="Email" required>
      <button type="button" class="remove-row" title="Remove">−</button>
    `;
        container.appendChild(row);

        // Close the modal
        addUsersModal.classList.remove('show');
        addUsersModal.style.display = 'none';

        // eslint-disable-next-line no-use-before-define
        showSuccessModal(`Added ${addedCount} member${addedCount !== 1 ? 's' : ''} to  <b> ${escapeHTML(team.displayName)}</b><br>If a member is new to the organization, they must accept the email invitation sent to them before they can access the team. Please allow a few minutes for the updates to take effect. A refresh of the page may be required.`);

        await updateTeamRowAfterDelay(team);
      } catch (err) {
        spinner.style.display = 'none';
        form.style.display = 'flex';
        submitButton.disabled = false;
        errorDiv.textContent = 'Failed to add members. Please try again.';
        errorDiv.style.display = 'block';
      }
    });
  });

  actionsCell.appendChild(addButton);

  tr.append(
    nameCell,
    memberCell,
    descriptionCell,
    createdCell,
    totalMessagesCell,
    lastMessageCell,
    recentCountCell,
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
      currentTeams = sortTable(currentTeams, columnKey, sortDirection);
      header.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
      renderTable(currentTeams);
      toggleSortDirection();
    });
  });
};

async function lazyLoadMessageStats() {
  const rows = document.querySelectorAll('.team-row');
  const teamIds = Array.from(rows).map((row) => row.dataset.teamId);

  const MAX_CONCURRENT = 5;

  const updateRow = (teamId, stats) => {
    const team = currentTeams.find((t) => t.id === teamId);
    if (!team || team.messageCount) return; // 🧠 Already loaded

    const row = Array.from(rows).find((r) => r.dataset.teamId === teamId);
    if (!row) return;

    const msgCountCell = row.querySelector('.msg-count');
    const latestMsgCell = row.querySelector('.latest-msg');
    const recentMsgsCell = row.querySelector('.recent-count');

    // 🗃️ Cache message stats
    team.messageCount = stats?.messageCount;
    team.latestMessage = stats?.latestMessage;
    team.recentCount = stats?.recentCount;

    msgCountCell.textContent = stats?.messageCount ?? '-';
    latestMsgCell.textContent = stats?.latestMessage ?? '-';
    recentMsgsCell.textContent = stats?.recentCount ?? '-';

    // increment active teams count if there are recent messages
    if (stats?.recentCount > 0) {
      const el = document.getElementById('active-teams-count');
      el.textContent = (parseInt(el.textContent, 10) || 0) + 1;
    }
  };

  let index = 0;
  let active = 0;

  return new Promise((resolve) => {
    function next() {
      if (index >= teamIds.length && active === 0) {
        return resolve();
      }

      while (active < MAX_CONCURRENT && index < teamIds.length) {
        const teamId = teamIds[index];
        index += 1;
        active += 1;
        getTeamMessageStats(teamId)
          .then((stats) => updateRow(teamId, stats))
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.error(`Error loading team ${teamId}:`, err);
            updateRow(teamId, {
              messageCount: '-',
              latestMessage: '-',
              recentCount: '-',
            });
          })
        // eslint-disable-next-line no-loop-func
          .finally(() => {
            active -= 1;
            next();
          });
      }
      return null;
    }

    next();
  });
}

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
        <th data-sort="messageCount">Total Messages</th>
        <th data-sort="latestMessage">Last Message</th>
        <th data-sort="recentCount">
          Messages (Last 30 days)
        </th>
        <th data-sort="memberCount">Current Members</th>
        <th class="sorting-disabled">Actions</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  teamsContainer.appendChild(table);

  const initialSortKey = 'displayName';
  currentTeams = sortTable(teams, initialSortKey, sortDirection);
  document.querySelector(`th[data-sort="${initialSortKey}"]`).classList.add('sorted-asc');
  renderTable(currentTeams);

  // After initial render, lazy load the message stats
  lazyLoadMessageStats().then(() => {
    addSortingToTable(table);
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Error loading message stats:', err);
  });
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

  if (!userProfile) {
    try {
      userProfile = await getUserProfile();
    } catch (error) {
      teamsContainer.innerHTML = '<p class="error">An error occurred while fetching user email. Please try again later.</p>';
    }
  }
  const myTeams = await getMyTeams(userProfile.email);

  if (myTeams.length === 0) {
    teamsContainer.innerHTML = `
  <div class="no-teams-message">
    <p>
      <span class="no-teams-icon">🚫</span>
      It appears that you are not a member of the Adobe Enterprise Support Teams Organization. Please click <a href="#" id="send-invitation-link">here</a> to receive an invitation. Once you accept the invitation, you will be able to run queries.
    </p>
  </div>
`;
    document.getElementById('send-invitation-link').addEventListener('click', async (event) => {
      event.preventDefault();

      try {
        const url = new URL(`${API_ENDPOINT}/users/invitation`);
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

  const progressContainer = document.getElementById('progress-container');
  progressContainer.style.display = 'block';

  const progressBar = document.getElementById('progress-bar');
  const progressFill = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('progress-label');

  progressLabel.innerHTML = '';
  progressBar.style.display = 'none';

  teamsContainer.innerHTML = ''; // Clear any existing content

  let teams = await getFilteredTeams(userProfile, nameFilter, descriptionFilter);
  teams = teams.filter((team) => team && typeof team === 'object');

  const myTeamIds = myTeams.map((myTeam) => myTeam.id);
  teams.forEach((t) => {
    // Ensure `isMember` is updated based on `myTeams`
    t.isMember = myTeamIds.includes(t.id);
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
      memberCount: teamSummary?.memberCount || 0, // Add summary data like memberCount
      description: teamSummary?.description,
      isMember: team.isMember || false, // Include isMember property
    };
  });

  // Hide the spinner and show the fully populated table
  teamsContainer.innerHTML = ''; // Clear spinner
  initTable(combinedTeams); // Pass combined teams to initTable

  searchButton.disabled = false;
};

const teamNameInput = document.getElementById('team-name');
const teamDescriptionInput = document.getElementById('team-description');

[teamNameInput, teamDescriptionInput].forEach((input) => {
  input.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      await displayTeams();
    }
  });
});

searchButton.addEventListener('click', async () => {
  await displayTeams();
});
