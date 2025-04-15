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
import { getMessageStats, getMemberIds, getAllSlackChannels } from './api.js';
import { countMembers } from './members.js';
import {
  sortTable,
  alphaSort,
  renderMembersTable,
  handleModalInteraction,
} from './utils.js';

let sortDirection = 'asc';
let activeChannelsCount = 0;
let isSortingEnabled = false;
const maxMessagesCount = 10;
const slackChannelsContainer = document.getElementById('slack-channels-container');

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
    const channelId = row.getAttribute('data-channel-id');

    if (cell._handlerAttached) return;
    cell._handlerAttached = true;

    cell.addEventListener('click', async (e) => {
      e.stopPropagation();
      const channel = { id: channelId, name: row.querySelector('td:first-child').textContent };

      await handleModalInteraction(cell, channelId, modal, async (id) => {
        const response = await getMemberIds(id);
        if (!response.ok) throw new Error('Failed to fetch members');
        const { adobeMembers, nonAdobeMembers } = await countMembers(response.members);
        adobeMembers.sort(alphaSort);
        nonAdobeMembers.sort(alphaSort);
        return { modalContent: renderMembersTable(channel.name, adobeMembers, nonAdobeMembers) };
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

const renderTable = (channels) => {
  const tbody = document.querySelector('tbody');
  tbody.innerHTML = '';

  channels.forEach((channel) => {
    const tr = document.createElement('tr');
    tr.classList.add('channel-row');
    tr.setAttribute('data-channel-id', channel.id);

    const nameCell = document.createElement('td');
    const link = document.createElement('a');
    link.href = `slack://channel?team=T0385CHDU9E&id=${channel.id}`;
    link.target = '_blank';
    link.textContent = channel.name;
    nameCell.appendChild(link);

    const purposeText = decodeHTML(channel.purpose?.value || '');
    const purposeCell = createCell(purposeText);
    const createdDate = new Date(channel.created * 1000).toISOString().split('T')[0];
    const createdCell = createCell(createdDate, 'stat-column');
    const messagesCell = createCell(channel.messages ?? '', 'stat-column total-messages');

    const thermometerCell = document.createElement('td');
    thermometerCell.className = 'stat-column messages-count';
    const thermometer = document.createElement('div');
    thermometer.className = 'thermometer';
    const fill = document.createElement('div');
    fill.className = 'thermometer-fill';
    const label = document.createElement('div');
    label.className = 'thermometer-label';
    const fillPercentage = Math.min((channel.engagement / maxMessagesCount) * 100, 100);
    fill.style.width = `${fillPercentage}%`;
    label.textContent = channel.engagement ?? '';
    thermometer.append(fill, label);
    thermometerCell.appendChild(thermometer);

    const lastMessageCell = createCell(channel.lstMsgDt || '', 'stat-column last-message');
    const membersCountCell = createCell(channel.membersCount ?? '', 'stat-column members-count');
    membersCountCell.title = 'View members';

    tr.append(nameCell, purposeCell, createdCell, messagesCell, thermometerCell, lastMessageCell, membersCountCell);
    tbody.appendChild(tr);
  });

  reattachModalHandlers();
};

const toggleSortDirection = () => {
  sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
};

const addSortingToTable = (table, channels) => {
  const headers = table.querySelectorAll('th[data-sort]');
  headers.forEach((header) => {
    header.addEventListener('click', () => {
      if (!isSortingEnabled) return;

      const columnKey = header.getAttribute('data-sort');
      // Remove sort classes from all headers
      headers.forEach((h) => h.classList.remove('sorted-asc', 'sorted-desc'));
      // Sort data
      const sortedData = sortTable(channels, columnKey, sortDirection);
      // Add the appropriate arrow class
      header.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
      renderTable(sortedData);
      toggleSortDirection();
    });
  });
};

const initTable = (channels) => {
  slackChannelsContainer.innerHTML = '';
  activeChannelsCount = 0;

  const summaryWrapper = document.createElement('div');
  summaryWrapper.classList.add('table-summary-wrapper');

  const progressBarContainer = document.createElement('div');
  progressBarContainer.classList.add('progress-container');
  progressBarContainer.innerHTML = `
  <div class="progress-bar">
    <div class="progress-fill" style="width: 0"></div>
  </div>
  <div class="progress-label">Loading 0 of ${escapeHTML(channels.length.toString())} channels…</div>
`;

  const summary = document.createElement('div');
  summary.classList.add('table-summary');
  summary.style.display = 'none';
  summary.innerHTML = `
  <span>Total Channels: ${escapeHTML(channels.length.toString())}</span> |
  <span>Active Channels (Last 30 days): <span id="active-channels-count">0</span></span>
`;

  summaryWrapper.appendChild(progressBarContainer);
  summaryWrapper.appendChild(summary);

  slackChannelsContainer.appendChild(summaryWrapper);

  const table = document.createElement('table');
  table.classList.add('styled-table');

  table.innerHTML = `
    <thead>
      <tr>
        <th data-sort="name">Name</th>
        <th class="sorting-disabled">Description</th>
        <th data-sort="created">Created</th>
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
  addSortingToTable(table, channels);
  slackChannelsContainer.appendChild(table);

  const initialSortKey = 'name';
  const sortedChannels = sortTable(channels, initialSortKey, sortDirection);
  document.querySelector(`th[data-sort="${initialSortKey}"]`).classList.add('sorted-asc');
  renderTable(sortedChannels);
  toggleSortDirection();

  renderTable(channels);
};

const updateMessageCells = (channel, messages, engagement, lstMsgDt) => {
  const row = document.querySelector(`tr[data-channel-id="${channel.id}"]`);
  if (!row) return;

  row.querySelector('.total-messages').textContent = messages;

  const engagementCell = row.querySelector('.messages-count');
  engagementCell.querySelector('.thermometer-label').textContent = engagement;
  const fillPercentage = Math.min((engagement / maxMessagesCount) * 100, 100);
  engagementCell.querySelector('.thermometer-fill').style.width = `${fillPercentage}%`;

  row.querySelector('.last-message').textContent = lstMsgDt;

  if (engagement > 0) {
    activeChannelsCount += 1;
    document.getElementById('active-channels-count').textContent = activeChannelsCount;
  }

  channel.messages = messages;
  channel.engagement = engagement;
  channel.lstMsgDt = lstMsgDt;
};

const updateMembersCountCell = (channel, membersCount) => {
  const row = document.querySelector(`tr[data-channel-id="${channel.id}"]`);
  if (!row) return;

  const membersCountCell = row.querySelector('.members-count');
  membersCountCell.textContent = membersCount;
  channel.membersCount = membersCount;
  membersCountCell._fetched = false;
  membersCountCell._modalData = null;

  const modal = document.getElementById('modal');

  membersCountCell.addEventListener('click', async (e) => {
    e.stopPropagation();
    await handleModalInteraction(membersCountCell, channel.id, modal, async (id) => {
      const response = await getMemberIds(id);
      if (!response.ok) throw new Error('Failed to fetch members');

      const { adobeMembers, nonAdobeMembers } = await countMembers(response.members);
      adobeMembers.sort(alphaSort);
      nonAdobeMembers.sort(alphaSort);
      return { modalContent: renderMembersTable(channel.name, adobeMembers, nonAdobeMembers) };
    });
  });
};

const startFetching = async () => {
  slackChannelsContainer.innerHTML = '<span class="spinner"></span>';

  const rawChannel = document.getElementById('channel-name').value.trim();
  const rawDescription = document.getElementById('channel-description').value.trim();

  const channelNameFilter = rawChannel === '' || rawChannel === '*' ? undefined : rawChannel;
  const descriptionFilter = rawDescription === '' || rawDescription === '*' ? undefined : rawDescription;

  const channels = await getAllSlackChannels(channelNameFilter, descriptionFilter);

  channels.sort((a, b) => a.name.localeCompare(b.name));
  initTable(channels);

  const progressLabel = document.querySelector('.progress-label');
  const progressFill = document.querySelector('.progress-fill');
  let loadedCount = 0;

  const batchSize = 15;
  for (let i = 0; i < channels.length; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);

    const messagePromises = batch.map((channel) => {
      if (!channel.messages || !channel.engagement || !channel.lstMsgDt) {
        return getMessageStats(channel.id).then((msg) => ({
          channelId: channel.id,
          messages: msg?.totalMessages || 0,
          engagement: msg?.recentMessageCount || 0,
          lstMsgDt: msg?.lastMessageTimestamp ? new Date(msg.lastMessageTimestamp * 1000).toISOString().split('T')[0] : 'No Messages',
        }));
      }
      return Promise.resolve({
        channelId: channel.id,
        messages: channel.messages,
        engagement: channel.engagement,
        lstMsgDt: channel.lstMsgDt,
      });
    });

    const memberPromises = batch.map((channel) => {
      if (!channel.membersCount) {
        return getMemberIds(channel.id).then((m) => ({
          channelId: channel.id,
          membersCount: m?.members?.length || 0,
        }));
      }
      return Promise.resolve({ channelId: channel.id, membersCount: channel.membersCount });
    });

    const messageResults = await Promise.all(messagePromises);
    const memberResults = await Promise.all(memberPromises);

    messageResults.forEach(({
      channelId, messages, engagement, lstMsgDt,
    }) => {
      const channel = channels.find((c) => c.id === channelId);
      updateMessageCells(channel, messages, engagement, lstMsgDt);
    });

    memberResults.forEach(({ channelId, membersCount }) => {
      const channel = channels.find((c) => c.id === channelId);
      updateMembersCountCell(channel, membersCount);
    });

    loadedCount += batch.length;
    const percentage = Math.min((loadedCount / channels.length) * 100, 100);
    progressFill.style.width = `${percentage}%`;
    progressLabel.textContent = `Loading ${loadedCount} of ${channels.length} channels…`;
  }

  isSortingEnabled = true;

  document.querySelector('.progress-container').style.display = 'none';
  document.querySelector('.table-summary').style.display = 'block';
};

document.getElementById('channelisation').addEventListener('click', startFetching);
