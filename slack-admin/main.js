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
    cell._handlerAttached = true;

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
        if (!response.ok) throw new Error('Failed to fetch members');

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
  const tbody = document.getElementsByTagName('tbody').item(0);

  tbody.innerHTML = ''; // Clear previous rows

  // Loop through the channels and create rows
  channels.forEach((channel) => {
    const tr = document.createElement('tr'); // Create a row for each channel

    const createdDate = new Date(channel.created * 1000).toISOString().split('T')[0]; // Format the creation date
    const spinner = '<div class="spinner"></div>'; // Show a spinner if no message date is available

    let fillPercentage;
    if (channel.messagesCount) {
      fillPercentage = Math.min((channel.messagesCount / maxMessagesCount) * 100, 100);
    }

    // Add classes to the cells (you can apply any additional class that you need)
    tr.classList.add('channel-row');
    tr.setAttribute('data-channel-id', channel.id); // Set the channel ID as a data attribute

    tr.innerHTML = `
      <td><a href="slack://channel?team=T0385CHDU9E&id=${channel.id}" target="_blank">${channel.name}</a></td>
      <td>${channel.purpose?.value || ''}</td>
      <td class="stat-column">${createdDate}</td>
      <td class="stat-column total-messages">${channel.msgs ?? spinner}</td>
      <td class="stat-column messages-count">
        <div class="thermometer">
          <div class="thermometer-fill" style="width: ${fillPercentage}%;"></div>
          <div class="thermometer-label">${channel.messagesCount ?? spinner} </div>
        </div>
      </td>
      <td class="stat-column last-message">${typeof channel.messageDate === 'string' ? channel.messageDate : spinner}</td>
      <td class="stat-column members-count title=View members">${channel.membersCount ?? spinner}</td>
    `;

    tbody.appendChild(tr); // Add the row to the tbody

    reattachModalHandlers();
  });
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

const updateMessageCells = (channel, msgs, messagesCount, messageDate) => {
  const row = document.querySelector(`tr[data-channel-id="${channel.id}"]`);
  if (!row) return;

  // Total Messages
  const messagesCell = row.querySelector('.total-messages');
  messagesCell.textContent = msgs;

  // Engagement
  const messagesCountCell = row.querySelector('.messages-count');
  const thermometerFill = messagesCountCell.querySelector('.thermometer-fill');
  const thermometerLabel = messagesCountCell.querySelector('.thermometer-label');
  thermometerLabel.textContent = messagesCount;

  const fillPercentage = Math.min((messagesCount / maxMessagesCount) * 100, 100);
  thermometerFill.style.width = `${fillPercentage}%`;

  // Last Message
  const lastMessageCell = row.querySelector('.last-message');
  lastMessageCell.innerHTML = messageDate;

  if (messagesCount > 0) {
    activeChannelsCount += 1;
    document.getElementById('active-channels-count').textContent = activeChannelsCount;
  }

  // Save the updated values back to the channel object for sorting
  channel.msgs = msgs;
  channel.messagesCount = messagesCount;
  channel.messageDate = messageDate;
};

const updateMembersCountCell = (channel, membersCount) => {
  const row = document.querySelector(`tr[data-channel-id="${channel.id}"]`);
  if (!row) return;

  const membersCountCell = row.querySelector('.members-count');
  membersCountCell.textContent = membersCount;

  channel.membersCount = membersCount;

  membersCountCell._fetched = false;
  membersCountCell._modalData = null;

  let secondClickListener = null;
  const modal = document.getElementById('modal');

  membersCountCell.addEventListener('click', async (e) => {
    e.stopPropagation(); // prevent the event from bubbling to the document

    // Add one-time document click listener
    secondClickListener = () => {
      hideModal(modal);
      document.removeEventListener('click', secondClickListener);
      secondClickListener = null;
    };

    // Delay to avoid triggering on the same click
    setTimeout(() => {
      document.addEventListener('click', secondClickListener, { once: true });
    }, 0);

    positionModal(modal, membersCountCell);
    modal.style.display = 'block';
    requestAnimationFrame(() => modal.classList.add('show'));

    if (membersCountCell._fetched) {
      modal.innerHTML = membersCountCell._modalData;
      return;
    }

    try {
      const response = await getMemberIds(channel.id);
      if (!response.ok) throw new Error('Failed to fetch members');

      const { adobeMembers, nonAdobeMembers } = await countMembers(response.members);
      adobeMembers.sort(alphaSort);
      nonAdobeMembers.sort(alphaSort);
      const modalContent = renderMembersTable(channel.name, adobeMembers, nonAdobeMembers);
      modal.innerHTML = modalContent;
      membersCountCell._fetched = true;
      membersCountCell._modalData = modalContent;
    } catch (err) {
      modal.innerHTML = '<p style="color: red;">Error loading data</p>';
    }
  });
};

const startFetching = async () => {
  // Get the button and its parent element
  const loadButton = document.getElementById('channelisation');
  const buttonParent = loadButton.parentNode;

  // Create a spinner and replace the button with it
  const spinner = document.createElement('span');
  spinner.classList.add('spinner');
  loadButton.style.visibility = 'hidden'; // Hide the button without affecting layout
  buttonParent.appendChild(spinner); // Insert the spinner in the button's place

  slackChannelsContainer.innerHTML = '<span class="spinner"></span>';
  const channelNameFilter = document.getElementById('channel-name').value.trim(); // Get the input value
  const channels = await getAllSlackChannels(channelNameFilter);

  // SORT BY NAME initially
  channels.sort((a, b) => a.name.localeCompare(b.name));

  initTable(channels);

  // Load 20 rows at a time with a 1-second pause between each batch
  const batchSize = 15;
  const totalChannels = channels.length;

  for (let i = 0; i < totalChannels; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);

    const messagePromises = batch.map((channel) => {
      if (!channel.msgs || !channel.messagesCount || !channel.messageDate) {
        return getMessageStats(channel.id).then((messageJson) => ({
          channelId: channel.id,
          msgs: messageJson?.totalMessages || 0,
          messagesCount: messageJson?.recentMessageCount || 0,
          messageDate: messageJson?.lastMessageTimestamp
            ? new Date(messageJson.lastMessageTimestamp * 1000).toISOString().split(
              'T',
            )[0]
            : 'No Messages',
        }));
      }
      return Promise.resolve({
        channelId: channel.id, msgs: channel.msgs, messagesCount: channel.messagesCount, messageDate: channel.messageDate,
      });
    });

    const memberPromises = batch.map((channel) => {
      if (!channel.membersCount) {
        return getMemberIds(channel.id).then((membersJson) => ({
          channelId: channel.id,
          membersCount: membersJson?.members?.length || 0,
        }));
      }
      return Promise.resolve({ channelId: channel.id, membersCount: channel.membersCount });
    });

    const messageResults = await Promise.all(messagePromises);
    const memberResults = await Promise.all(memberPromises);

    // Update the table after each batch
    messageResults.forEach(({
      channelId, msgs, messagesCount, messageDate,
    }) => {
      const channel = channels.find((c) => c.id === channelId);
      updateMessageCells(channel, msgs, messagesCount, messageDate);
    });

    memberResults.forEach(({ channelId, membersCount }) => {
      const channel = channels.find((c) => c.id === channelId);
      updateMembersCountCell(channel, membersCount);
    });
  }

  // After all rows are loaded, hide the spinner and restore the button
  spinner.remove(); // Remove the spinner
  loadButton.style.visibility = 'visible'; // Restore the button visibility
  isSortingEnabled = true; // Enable sorting after all rows are loaded
};

document.getElementById('channelisation').addEventListener('click', startFetching);
