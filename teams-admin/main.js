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
  getMessageStats, getMemberIds, getAllTeams, getTeam, getChannels,
} from './api.js';
import { countMembers } from './members.js';
import {
  sortTable,
  alphaSort,
  renderMembersTable,
  handleModalInteraction,
  decodeHTML,
} from './utils.js';

let sortDirection = 'asc';
let activeTeamsCount = 0;
let isSortingEnabled = false;
const maxMessagesCount = 10;
const teamsContainer = document.getElementById('teams-container');
const BATCH_SIZE = 20;

const escapeHTML = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

const doLogout = () => window.location.reload();

const sk = document.querySelector('aem-sidekick');
if (sk) {
  sk.addEventListener('logged-out', doLogout);
} else {
  document.addEventListener('sidekick-ready', () => {
    document.querySelector('aem-sidekick').addEventListener('logged-out', doLogout);
  }, { once: true });
}

const reattachModalHandlers = () => {
  const modal = document.getElementById('modal');
  document.querySelectorAll('.members-count').forEach((cell) => {
    const row = cell.closest('tr');
    const teamId = row.getAttribute('data-team-id');

    if (cell._handlerAttached) return;
    cell._handlerAttached = true;

    cell.addEventListener('click', async (e) => {
      e.stopPropagation();
      const team = { id: teamId, name: row.querySelector('td:first-child').textContent };

      await handleModalInteraction(cell, teamId, modal, async (id) => {
        const response = await getMemberIds(id);
        if (!response.ok) throw new Error('Failed to fetch members');
        const { adobeMembers, nonAdobeMembers } = await countMembers(response.members);
        adobeMembers.sort(alphaSort);
        nonAdobeMembers.sort(alphaSort);
        return { modalContent: renderMembersTable(team.name, adobeMembers, nonAdobeMembers) };
      });
    });
  });
};

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
    tr.setAttribute('data-team-id', team.id);

    const nameCell = document.createElement('td');
    nameCell.className = 'name';
    if (team.webUrl) {
      const link = document.createElement('a');
      link.textContent = team.displayName;
      link.href = team.webUrl;
      link.target = '_blank';
      link.title = 'Open in Microsoft Teams';
      nameCell.appendChild(link);
    } else {
      nameCell.textContent = team.displayName;
    }

    const descriptionText = decodeHTML(team.description);
    const descriptionCell = createCell(descriptionText);
    const createdCell = createCell(team.created || '', 'stat-column created');
    const channelsCountCell = createCell(team.channelsCount || '', 'stat-column channels-count');
    const messagesCell = createCell(team.messages ?? '', 'stat-column total-messages');
    const thermometerCell = document.createElement('td');
    thermometerCell.className = 'stat-column messages-count';
    const thermometer = document.createElement('div');
    thermometer.className = 'thermometer';
    const fill = document.createElement('div');
    fill.className = 'thermometer-fill';
    const label = document.createElement('div');
    label.className = 'thermometer-label';
    const fillPercentage = Math.min((team.engagement / maxMessagesCount) * 100, 100);
    fill.style.width = `${fillPercentage}%`;
    label.textContent = team.engagement ?? '';
    thermometer.append(fill, label);
    thermometerCell.appendChild(thermometer);

    const lastMessageCell = createCell(team.lstMsgDt || '', 'stat-column last-message');
    const membersCountCell = createCell(team.membersCount ?? '', 'stat-column members-count');
    membersCountCell.title = 'View members';

    tr.append(nameCell, descriptionCell, createdCell, channelsCountCell, messagesCell, thermometerCell, lastMessageCell, membersCountCell);
    tbody.appendChild(tr);
  });

  // reattachModalHandlers();
};

const toggleSortDirection = () => {
  sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
};

const addSortingToTable = (table, teams) => {
  const headers = table.querySelectorAll('th[data-sort]');
  headers.forEach((header) => {
    header.addEventListener('click', () => {
      if (!isSortingEnabled) return;

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
  activeTeamsCount = 0;

  const summaryWrapper = document.createElement('div');
  summaryWrapper.classList.add('table-summary-wrapper');

  const progressBarContainer = document.createElement('div');
  progressBarContainer.classList.add('progress-container');
  progressBarContainer.innerHTML = `
  <div class="progress-bar">
    <div class="progress-fill" style="width: 0"></div>
  </div>
  <div class="progress-label">Loading 0 of ${escapeHTML(teams.length.toString())} teams…</div>
`;

  const summary = document.createElement('div');
  summary.classList.add('table-summary');
  summary.style.display = 'none';
  summary.innerHTML = `
  <span>Total Teams: ${escapeHTML(teams.length.toString())}</span> |
  <span>Active Teams (Last 30 days): <span id="active-teams-count">0</span></span>
`;

  summaryWrapper.appendChild(progressBarContainer);
  summaryWrapper.appendChild(summary);

  teamsContainer.appendChild(summaryWrapper);

  const table = document.createElement('table');
  table.classList.add('styled-table');

  table.innerHTML = `
    <thead>
      <tr>
        <th data-sort="name">Team</th>
        <th class=" description sorting-disabled">Description</th>
        <th data-sort="created">Created</th>
        <th data-sort="channelsCount">Channels</th>
        <th data-sort="messages">Total Messages</th>
        <th data-sort="engagement">
          Messages <span class="tooltip-container">(Last 30 days)</span>
        </th>
        <th data-sort="lstMsgDt">Last Message</th>
        <th data-sort="membersCount">Members</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  addSortingToTable(table, teams);
  teamsContainer.appendChild(table);

  const initialSortKey = 'name';
  const sortedTeams = sortTable(teams, initialSortKey, sortDirection);
  document.querySelector(`th[data-sort="${initialSortKey}"]`).classList.add('sorted-asc');
  renderTable(sortedTeams);
  toggleSortDirection();

  renderTable(teams);
};

const addLinkToCell = (cell, linkText, linkHref) => {
  // Clear the cell's existing content
  cell.textContent = '';

  // Create the link element
  const link = document.createElement('a');
  link.textContent = linkText; // Set the link text
  link.href = linkHref; // Set the link URL
  link.target = '_blank'; // Open the link in a new tab
  link.title = 'Open in Microsoft Teams'; // Optional: Set a tooltip

  // Append the link to the cell
  cell.appendChild(link);
};

const updateTeamCells = (team, created, webUrl) => {
  const row = document.querySelector(`tr[data-team-id="${team.id}"]`);

  if (!row) return;
  const nameCell = row.querySelector('.name'); // Select the target cell
  addLinkToCell(nameCell, team.displayName, webUrl);
  row.querySelector('.created').textContent = created;

  team.created = created;
  team.webUrl = webUrl;
};
const updateChannelCells = (team, channelsCount) => {
  const row = document.querySelector(`tr[data-team-id="${team.id}"]`);
  if (!row) return;

  const channelsCountCell = row.querySelector('.channels-count');
  channelsCountCell.textContent = channelsCount;
  team.channelsCount = channelsCount;
};

const updateMessageCells = (team, messages, engagement, lstMsgDt) => {
  const row = document.querySelector(`tr[data-team-id="${team.id}"]`);
  if (!row) return;

  row.querySelector('.total-messages').textContent = messages;

  const engagementCell = row.querySelector('.messages-count');
  engagementCell.querySelector('.thermometer-label').textContent = engagement;
  const fillPercentage = Math.min((engagement / maxMessagesCount) * 100, 100);
  engagementCell.querySelector('.thermometer-fill').style.width = `${fillPercentage}%`;

  row.querySelector('.last-message').textContent = lstMsgDt;

  if (engagement > 0) {
    activeTeamsCount += 1;
    document.getElementById('active-teams-count').textContent = activeTeamsCount;
  }

  team.messages = messages;
  team.engagement = engagement;
  team.lstMsgDt = lstMsgDt;
};

const updateMembersCountCell = (team, membersCount) => {
  const row = document.querySelector(`tr[data-team-id="${team.id}"]`);
  if (!row) return;

  const membersCountCell = row.querySelector('.members-count');
  membersCountCell.textContent = membersCount;
  team.membersCount = membersCount;
  membersCountCell._fetched = false;
  membersCountCell._modalData = null;

  const modal = document.getElementById('modal');

  membersCountCell.addEventListener('click', async (e) => {
    e.stopPropagation();
    await handleModalInteraction(membersCountCell, team.id, modal, async (id) => {
      const response = await getMemberIds(id);
      if (!response.ok) throw new Error('Failed to fetch members');

      const { adobeMembers, nonAdobeMembers } = await countMembers(response.members);
      adobeMembers.sort(alphaSort);
      nonAdobeMembers.sort(alphaSort);
      return { modalContent: renderMembersTable(team.name, adobeMembers, nonAdobeMembers) };
    });
  });
};

const startFetching = async () => {
  teamsContainer.innerHTML = '<span class="spinner"></span>';

  const rawName = document.getElementById('team-name').value.trim();
  const rawDescription = document.getElementById('team-description').value.trim();

  const nameFilter = rawName === '' || rawName === '*' ? undefined : rawName;
  const descriptionFilter = rawDescription === '' || rawDescription === '*' ? undefined : rawDescription;

  const teams = await getAllTeams(nameFilter, descriptionFilter);

  teams.sort((a, b) => a.displayName.localeCompare(b.displayName));
  initTable(teams);

  const progressLabel = document.querySelector('.progress-label');
  const progressFill = document.querySelector('.progress-fill');
  let loadedCount = 0;

  const batchSize = BATCH_SIZE;
  for (let i = 0; i < teams.length; i += batchSize) {
    const batch = teams.slice(i, i + batchSize);
    const teamPromises = batch.map((team) => {
      if (!team.created) {
        return getTeam(team.id).then((t) => ({
          teamId: team.id,
          created: t?.createdDateTime ? new Date(t.createdDateTime).toISOString().split('T')[0] : 'No Date',
          webUrl: t?.webUrl || '',
        }));
      }

      return Promise.resolve({ teamId: team.id, created: team.created, webUrl: team.webUrl });
    });

    const channelPromises = batch.map((team) => {
      if (!team.channelsCount) {
        return getChannels(team.id).then((t) => ({
          teamId: team.id,
          channelsCount: t?.['@odata.count'] || 0,
        }));
      }

      return Promise.resolve({ teamId: team.id, channelsCount: team.channelsCount });
    });

    const messagePromises = batch.map((team) => {
      if (!team.messages || !team.engagement || !team.lstMsgDt) {
        return getMessageStats(team.id).then((msg) => ({
          teamId: team.id,
          messages: msg?.totalMessages || 0,
          engagement: msg?.recentMessageCount || 0,
          lstMsgDt: msg?.lastMessageTimestamp ? new Date(msg.lastMessageTimestamp * 1000).toISOString().split('T')[0] : 'No Messages',
        }));
      }
      return Promise.resolve({
        teamId: team.id,
        messages: team.messages,
        engagement: team.engagement,
        lstMsgDt: team.lstMsgDt,
      });
    });

    const memberPromises = batch.map((team) => {
      if (!team.membersCount) {
        return getMemberIds(team.id).then((m) => ({
          teamId: team.id,
          membersCount: m?.members?.length || 0,
        }));
      }
      return Promise.resolve({ teamId: team.id, membersCount: team.membersCount });
    });

    const teamResults = await Promise.all(teamPromises);
    const channelResults = await Promise.all(channelPromises);
    //  const messageResults = await Promise.all(messagePromises);
    //  const memberResults = await Promise.all(memberPromises);

    teamResults.forEach(({ teamId, created, webUrl }) => {
      const team = teams.find((t) => t.id === teamId);
      updateTeamCells(team, created, webUrl);
    });
    channelResults.forEach(({ teamId, channelsCount }) => {
      const team = teams.find((t) => t.id === teamId);
      updateChannelCells(team, channelsCount);
    });
/*
    messageResults.forEach(({
      teamId, messages, engagement, lstMsgDt,
    }) => {
      const team = teams.find((t) => t.id === teamId);
      updateMessageCells(team, messages, engagement, lstMsgDt);
    });

    memberResults.forEach(({ teamId, membersCount }) => {
      const team = teams.find((t) => t.id === teamId);
      updateMembersCountCell(team, membersCount);
    });
*/
    loadedCount += batch.length;
    const percentage = Math.min((loadedCount / teams.length) * 100, 100);
    progressFill.style.width = `${percentage}%`;
    progressLabel.textContent = `Loading ${loadedCount} of ${teams.length} teams…`;
  }

  isSortingEnabled = true;

  document.querySelector('.progress-container').style.display = 'none';
  document.querySelector('.table-summary').style.display = 'block';
};

document.getElementById('teams').addEventListener('click', startFetching);
