// main.js
import { getAllSlackChannels } from './api.js';
import { fetchAllChannels } from './channels.js';
import { sortData } from './utils.js';

const slackChannelsContainer = document.getElementById('slack-channels-container');
let sortDirection = 'asc';

const displayChannels = async () => {
  slackChannelsContainer.innerHTML = '<span class="spinner"></span>';

  const channelName = document.getElementById("channel-name").value;
  const description = document.getElementById("description").value;

  const all = await getAllSlackChannels(channelName, description);
  if (all.length === 0) {
    slackChannelsContainer.innerHTML = '<span class="error">Failed to load channels. Please try again later.</span>';
    return;
  }

  all.sort((a, b) => a.name.localeCompare(b.name));

  const summary = document.createElement('div');
  summary.classList.add('table-summary');
  summary.innerHTML = `
    <span>Channels Found: ${all.length}</span> |
    <span style="color: green;">Active Channels: <span id="active-channels-count"></span></span>
  `;

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th data-sort="name">Name</th>
        <th data-sort="purpose" class="sorting-disabled">Description</th>
        <th data-sort="created">Created</th>
        <th data-sort="message" class="sorting-disabled">Last Message</th>
        <th data-sort="adobe" class="sorting-disabled">Adobe Members</th>
        <th data-sort="nonAdobe" class="sorting-disabled">Non-Adobe Members</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  table.classList.add('styled-table');
  const tbody = table.querySelector('tbody');

  const renderRows = (data) => {
    tbody.innerHTML = '';
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));

    data.forEach((channel) => {
      const tr = document.createElement('tr');
      const createdDate = new Date(channel.created * 1000).toISOString().split('T')[0];
      const lastMessageDate = channel.lastMessageDate || '<div class="spinner"></div>';
      const messageTimestamp = channel.lastMessageTimestamp;
      const messageClass = messageTimestamp && messageTimestamp > thirtyDaysAgo ? 'recent-message' : 'old-message';
      const adobeMemberCount = channel.adobeMemberCount || '<div class="spinner"></div>';
      const nonAdobeMemberCount = channel.nonAdobeMemberCount || '<div class="spinner"></div>';

      tr.innerHTML = `
        <td><a href="slack://channel?team=T0385CHDU9E&id=${channel.id}" target="_blank">${channel.name}</a></td>
        <td>${channel.purpose.value}</td>
        <td>${createdDate}</td>
        <td class="last-message ${messageClass}" data-channel-id="${channel.id}">${lastMessageDate}</td>
        <td data-channel-id="${channel.id}">${adobeMemberCount}</td>
        <td data-channel-id="${channel.id}">${nonAdobeMemberCount}</td>
      `;

      tbody.appendChild(tr);
    });
  };

  renderRows(all);

  const sortTable = (key) => {
    const header = table.querySelector(`th[data-sort="${key}"]`);
    if (header.classList.contains('sorting-disabled')) {
      return; // Prevent sorting if the column is disabled
    }

    const sortedData = sortData(all, key, sortDirection);
    renderRows(sortedData);

    // Add visual cue for sorted column
    table.querySelectorAll('th').forEach((th) => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.getAttribute('data-sort') === key && !th.classList.contains('sorting-disabled')) {
        th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
      }
    });

    // Toggle sort direction
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  };

  table.querySelectorAll('th').forEach((header) => {
    header.addEventListener('click', () => {
      const sortKey = header.getAttribute('data-sort');
      sortTable(sortKey);
    });
  });

  slackChannelsContainer.innerHTML = '';
  slackChannelsContainer.appendChild(summary);
  slackChannelsContainer.appendChild(table);

  // Fetch last message data only if not already present
  const channelPromises = await fetchAllChannels(all);
  let activeChannelsCount = 0;
  const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)); // Calculate once

  for (const promise of channelPromises) {
    const { channelId, message, adobeMemberCount, nonAdobeMemberCount } = await promise;
    const messageCell = tbody.querySelector(`.last-message[data-channel-id="${channelId}"]`);

    const adobeCell = tbody.querySelector(`td[data-channel-id="${channelId}"]:nth-child(5)`);
    const nonAdobeCell = tbody.querySelector(`td[data-channel-id="${channelId}"]:nth-child(6)`);

    if (messageCell) {
      const msgDate = message?.messages?.[0]?.ts
        ? new Date(message.messages[0].ts * 1000).toISOString().split('T')[0]
        : 'No date';
      const msgTs = message?.messages?.[0]?.ts ? new Date(message.messages[0].ts * 1000) : null;

      messageCell.classList.remove('recent-message', 'old-message');
      if (msgTs && msgTs > thirtyDaysAgo) {
        messageCell.classList.add('recent-message');
        activeChannelsCount += 1;
      } else {
        messageCell.classList.add('old-message');
      }

      messageCell.textContent = msgDate || 'Error loading message';

      adobeCell.textContent = adobeMemberCount;
      nonAdobeCell.textContent = nonAdobeMemberCount;

      // Store the channel data in the all array
      const channel = all.find((ch) => ch.id === channelId);
      if (channel) {
        channel.lastMessageDate = msgDate;
        channel.lastMessageTimestamp = msgTs;
        channel.adobeMemberCount = adobeMemberCount;
        channel.nonAdobeMemberCount = nonAdobeMemberCount;
      }
    }
  }

  document.getElementById('active-channels-count').textContent = activeChannelsCount.toString();

  // Enable sorting after data is loaded
  table.querySelector('th[data-sort="message"]').classList.remove('sorting-disabled');
  table.querySelector('th[data-sort="adobe"]').classList.remove('sorting-disabled');
  table.querySelector('th[data-sort="nonAdobe"]').classList.remove('sorting-disabled');
};

document.getElementById('channelisation').addEventListener('click', async (e) => {
  e.preventDefault();
  await displayChannels();
});
