/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
import { getMessageStats, getMemberIds, getAllSlackChannels } from './api.js';
import { countMembers } from './members.js';
import {
  sortTable, alphaSort, renderMembersTable, positionModal, hideModal,
} from './utils.js';

let sortDirection = 'asc';
let activeChannelsCount = 0;
let isSortingEnabled = false; // Flag to track sorting state
const maxMessagesCount = 10; // Adjust this value based on your data

const slackChannelsContainer = document.getElementById('slack-channels-container');

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

    // Avoid duplicate handlers
    if (cell._handlerAttached) return;
    cell._handlerAttached = true; // Dynamically define the property
    cell.addEventListener('click', async (e) => {
      e.stopPropagation();

      const channel = { id: channelId, name: row.querySelector('td:first-child').textContent };

      const secondClickListener = () => {
        hideModal(modal);
        document.removeEventListener('click', secondClickListener);
      };

      setTimeout(() => {
        document.addEventListener('click', secondClickListener, { once: true });
      }, 0);

      positionModal(modal, cell);
      modal.style.display = 'block';
      requestAnimationFrame(() => modal.classList.add('show'));

      if (cell._fetched) {
        modal.innerHTML = cell._modalData;
        return;
      }

      try {
        const response = await getMemberIds(channel.id);

        const { adobeMembers, nonAdobeMembers } = await countMembers(response.members);
        adobeMembers.sort(alphaSort);
        nonAdobeMembers.sort(alphaSort);

        const modalContent = renderMembersTable(channel.name, adobeMembers, nonAdobeMembers);
        modal.innerHTML = modalContent;
        cell._fetched = true;
        cell._modalData = modalContent;
      } catch (err) {
        modal.innerHTML = '<p style="color: red;">Error loading data</p>';
      }
    });
  });
};

const renderTable = (channels) => {
  const tbody = document.querySelector('tbody');
  tbody.innerHTML = ''; // Clear previous rows

  activeChannelsCount = 0;

  channels.forEach((channel) => {
    const tr = document.createElement('tr');
    tr.classList.add('channel-row');
    tr.setAttribute('data-channel-id', channel.id);
    const createdDate = new Date(channel.created * 1000).toISOString().split(
      'T',
    )[0];
    const lastMessage = channel.messageDate || 'No Messages';
    const totalMessages = channel.msgs ?? 0;
    const engagement = channel.messagesCount ?? 0;
    const members = channel.membersCount ?? 0;
    const fillPercentage = Math.min((engagement / maxMessagesCount) * 100, 100);

    tr.innerHTML = `
  <td><a href="slack://channel?team=T0385CHDU9E&id=${channel.id}" target="_blank">${channel.name}</a></td>
  <td>${channel.purpose?.value || ''}</td>
  <td class="stat-column">${createdDate}</td>
  <td class="stat-column total-messages">${totalMessages}</td>
  <td class="stat-column messages-count">
    <div class="thermometer">
      <div class="thermometer-fill" style="width: ${fillPercentage}%;"></div>
      <div class="thermometer-label">${engagement}</div>
    </div>
  </td>
  <td class="stat-column last-message">${lastMessage}</td>
  <td class="stat-column members-count" title="View members">${members}</td>
`;

    tbody.appendChild(tr);
    if (engagement > 3) {
      activeChannelsCount += 1;
    }
  });

  document.getElementById('active-channels-count').textContent = activeChannelsCount;

  reattachModalHandlers(); // rebinds members modal
};

const toggleSortDirection = () => {
  sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
};

const addSortingToTable = (table, channels) => {
  const headers = table.querySelectorAll('th[data-sort]');
  headers.forEach((header) => {
    header.addEventListener('click', () => {
      if (!isSortingEnabled) return; // Prevent sorting if not enabled
      headers.forEach((h) => h.classList.remove('sorted-asc', 'sorted-desc'));
      if (!header.classList.contains('sorting-disabled')) {
        const columnKey = header.getAttribute('data-sort');
        const sortedData = sortTable(channels, columnKey, sortDirection);
        header.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        renderTable(sortedData);
        toggleSortDirection();
      }
    });
  });
};

const initTable = (channels) => {
  slackChannelsContainer.innerHTML = ''; // Clear any previous content
  activeChannelsCount = 0;

  const summary = document.createElement('div');
  summary.classList.add('table-summary');
  summary.innerHTML = `
    <span>Total Channels: ${channels.length}</span> |
    <span>Active Channels: <span id="active-channels-count">0</span></span>
  `;

  slackChannelsContainer.appendChild(summary);

  // Create the table with the same classes as in your original code
  const table = document.createElement('table');
  table.classList.add('styled-table'); // Add 'styled-table' class to the table

  // Define the table headers
  table.innerHTML = `
    <thead>
      <tr>
        <th data-sort="name">Name</th>
        <th data-sort="purpose" class="sorting-disabled">Description</th>
        <th data-sort="created">Created</th>
        <th data-sort="msgs">Total Messages</th>
        <th data-sort="messagesCount">
          Engagement
            <span class="tooltip-container">
            (last 30 days)
            </span>
        </th>
        <th data-sort="messageDate">Last Message</th>
        <th data-sort="membersCount">Members</th>
      </tr>
    </thead>
  `;

  // Create the table body (with tbody)
  const tbody = document.createElement('tbody');

  // Append tbody to the table
  table.appendChild(tbody);

  addSortingToTable(table, channels);

  // Append the table to the slackChannelsContainer
  slackChannelsContainer.appendChild(table);

  renderTable(channels);
};

const startFetching = async () => {
  const loadButton = document.getElementById('channelisation');
  const buttonParent = loadButton.parentNode;

  const spinner = document.createElement('span');
  spinner.classList.add('spinner');
  loadButton.style.visibility = 'hidden';
  buttonParent.appendChild(spinner);

  slackChannelsContainer.innerHTML = '<span class="spinner"></span>';

  const channelNameFilter = document.getElementById('channel-name').value.trim();
  const channels = await getAllSlackChannels(channelNameFilter);

  const fullChannelData = [];

  // Batch-fetch all stats and members
  const batchSize = 20;
  const totalChannels = channels.length;

  for (let i = 0; i < totalChannels; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);

    const messagePromises = batch.map(async (channel) => {
      const stats = await getMessageStats(channel.id);
      return {
        ...channel,
        msgs: stats?.totalMessages || 0,
        messagesCount: stats?.messageCount || 0,
        messageDate: stats?.lastMessageTimestamp
          ? new Date(stats.lastMessageTimestamp * 1000).toISOString().split('T')[0]
          : 'No Messages',
      };
    });

    const memberPromises = batch.map(async (channel) => {
      const members = await getMemberIds(channel.id);
      return {
        channelId: channel.id,
        membersCount: members?.members?.length || 0,
      };
    });

    // Resolve all promises concurrently
    const [messageResults, memberResults] = await Promise.all([
      Promise.all(messagePromises),
      Promise.all(memberPromises),
    ]);

    // Merge message + member data
    const updatedBatch = messageResults.map((channel) => {
      const members = memberResults.find((m) => m.channelId === channel.id);
      return {
        ...channel,
        membersCount: members?.membersCount ?? 0,
      };
    });

    fullChannelData.push(...updatedBatch);

    if (i + batchSize < totalChannels) {
      await new Promise((r) => { setTimeout(r, 2000); }); // Delay between batches
    }
  }

  // FINAL sort by name and then render
  fullChannelData.sort((a, b) => a.name.localeCompare(b.name));
  initTable(fullChannelData); // sets up headers
  renderTable(fullChannelData); // renders consistent rows

  spinner.remove();
  loadButton.style.visibility = 'visible';
  isSortingEnabled = true;
};

document.getElementById('channelisation').addEventListener('click', startFetching);
