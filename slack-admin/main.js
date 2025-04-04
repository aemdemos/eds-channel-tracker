import { getLatestMessage, getMembers, getAllSlackChannels } from './api.js';
import { sortTable } from './utils.js';

let sortDirection = 'asc';

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

const initTable = (channels)  => {

  slackChannelsContainer.innerHTML = ''; // Clear any previous content

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

}

const renderTable = (channels) => {

  const table = document.getElementById("slack-channels-container").querySelector('table');
  const tbody = document.getElementsByTagName('tbody').item(0);

  tbody.innerHTML = ''; // Clear previous rows

  // Loop through the channels and create rows
  channels.forEach((channel) => {
    const tr = document.createElement('tr'); // Create a row for each channel

    const createdDate = new Date(channel.created * 1000).toISOString().split('T')[0]; // Format the creation date
    const spinner = '<div class="spinner"></div>'; // Show a spinner if no message date is available

    // Determine the class for the message date
    let messageDateClass = '';
    if (channel.messageDate) {
      const messageDate = new Date(channel.messageDate);
      const currentDate = new Date();
      const dateDifference = (currentDate - messageDate) / (1000 * 60 * 60 * 24); // Difference in days
      messageDateClass = dateDifference < 30 ? 'recent-message' : 'old-message';
    }

    // Add classes to the cells (you can apply any additional class that you need)
    tr.classList.add('channel-row');
    tr.setAttribute("data-channel-id", channel.id); // Set the channel ID as a data attribute

    tr.innerHTML = `
      <td><a href="slack://channel?team=T0385CHDU9E&id=${channel.id}" target="_blank">${channel.name}</a></td>
      <td>${channel.purpose?.value || ''}</td>
      <td class="stat-column">${createdDate}</td>
      <td class="stat-column last-message ${messageDateClass}">${channel.messageDate || spinner}</td>
      <td class="stat-column members-count">${channel.membersCount || spinner}</td>
    `;

    tbody.appendChild(tr); // Add the row to the tbody
  });

};

const addSortingToTable = (table, channels) => {
  const headers = table.querySelectorAll('th[data-sort]');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      if (!header.classList.contains('sorting-disabled')) {
        const columnKey = header.getAttribute('data-sort');
        const sortedData = sortTable(channels, columnKey, sortDirection);
        header.classList.remove('sorted-asc', 'sorted-desc');
        header.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        renderTable(sortedData);
        toggleSortDirection();
      }
    });
  });
}

const toggleSortDirection = () => {
  sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
};

const updateLastMessageCell = (channel, messageDate) => {
  const row = document.querySelector(`tr[data-channel-id="${channel.id}"]`);
  if (row) {
    row.querySelector('.last-message').innerHTML = messageDate;
    channel.messageDate = messageDate; // Save the last message date in the channel object
  }
};

const updateMembersCountCell = (channel, membersCount) => {
  const row = document.querySelector(`tr[data-channel-id="${channel.id}"]`);
  if (row) {
    row.querySelector('.members-count').textContent = membersCount;
    channel.membersCount = membersCount; // Save the members count in the channel object
  }
};

const startFetching = async () => {
  slackChannelsContainer.innerHTML = '<span class="spinner"></span>';
  const channelNameFilter = document.getElementById('channel-name').value.trim(); // Get the input value
  const channels = await getAllSlackChannels(channelNameFilter);

  initTable(channels);

  // Load 20 rows at a time with a 1-second pause between each batch
  const batchSize = 20;
  const totalChannels = channels.length;

  for (let i = 0; i < totalChannels; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);

    const messagePromises = batch.map(channel => {
    if (!channel.messageDate) {
      return getLatestMessage(channel.id).then(messageJson => ({
        channelId: channel.id,
        messageDate: messageJson?.messages?.[0]?.ts
          ? new Date(messageJson.messages[0].ts * 1000).toISOString().split(
            'T')[0]
          : 'No date',
      }));
    }
      return Promise.resolve({ channelId: channel.id, messageDate: channel.messageDate })
    });

    const memberPromises = batch.map(channel => {
    if (!channel.membersCount) {
      return getMembers(channel.id).then(membersJson => ({
        channelId: channel.id,
        membersCount: membersJson?.members?.length || 0
      }));
    }
      return Promise.resolve({ channelId: channel.id, membersCount: channel.membersCount });
    });

    const messageResults = await Promise.all(messagePromises);
    const memberResults = await Promise.all(memberPromises);

    // Update the table after each batch
    messageResults.forEach(({ channelId, messageDate }) => {
      const channel = channels.find(c => c.id === channelId);
      updateLastMessageCell(channel, messageDate);
    });

    memberResults.forEach(({ channelId, membersCount }) => {
      const channel = channels.find(c => c.id === channelId);
      updateMembersCountCell(channel, membersCount);
    });

    // Pause for 1 second before processing the next batch
    if (i + batchSize < totalChannels) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay
    }
  }
};

document.getElementById('channelisation').addEventListener('click', startFetching);
