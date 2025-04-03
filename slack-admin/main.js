import API_ENDPOINT from './config.js';
import { getLatestMessage, getMembers, getAllSlackChannels } from './api.js';

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

const renderTable = (channels) => {
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
        <th data-sort="message" class="sorting-disabled">Last Message</th>
        <th data-sort="members" class="sorting-disabled">Members</th>
      </tr>
    </thead>
  `;

  // Create the table body (with tbody)
  const tbody = document.createElement('tbody');

  // Loop through the channels and create rows
  channels.forEach((channel) => {
    const tr = document.createElement('tr'); // Create a row for each channel

    const createdDate = new Date(channel.created * 1000).toISOString().split('T')[0]; // Format the creation date
    const spinner = '<div class="spinner"></div>'; // Show a spinner if no message date is available


    // Add classes to the cells (you can apply any additional class that you need)
    tr.classList.add('channel-row');
    tr.setAttribute("data-channel-id", channel.id); // Set the channel ID as a data attribute

    tr.innerHTML = `
      <td><a href="slack://channel?team=T0385CHDU9E&id=${channel.id}" target="_blank">${channel.name}</a></td>
      <td>${channel.purpose?.value || ''}</td>
      <td class="stat-column">${createdDate}</td>
      <td class="stat-column last-message">${spinner}</td>
      <td class="stat-column members-count">${spinner}</td>

    `;

    tbody.appendChild(tr); // Add the row to the tbody
  });

  // Append tbody to the table
  table.appendChild(tbody);

  // Append the table to the slackChannelsContainer
  slackChannelsContainer.appendChild(table);
};

const updateLastMessageCell = (channel, messageDate) => {
  const row = document.querySelector(`tr[data-channel-id="${channel.id}"]`);
  if (row) {
    row.querySelector('.last-message').innerHTML = messageDate;
  }
};

const updateMembersCountCell = (channel, membersCount) => {
  const row = document.querySelector(`tr[data-channel-id="${channel.id}"]`);
  if (row) {
    row.querySelector('.members-count').textContent = membersCount;
  }
};

const startFetching = async () => {
  slackChannelsContainer.innerHTML = '<span class="spinner"></span>';
  const channels = await getAllSlackChannels();
  renderTable(channels);

  // Load 10 rows at a time with a 1-second pause between each batch
  const batchSize = 20;
  const totalChannels = channels.length;

  for (let i = 0; i < totalChannels; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);

    const messagePromises = batch.map(channel =>
      getLatestMessage(channel.id).then(messageJson => ({
        channelId: channel.id,
        messageDate: messageJson?.messages?.[0]?.ts
          ? new Date(messageJson.messages[0].ts * 1000).toISOString().split('T')[0]
          : 'No date'
      }))
    );

    const memberPromises = batch.map(channel =>
      getMembers(channel.id).then(membersJson => ({
        channelId: channel.id,
        membersCount: membersJson?.members?.length || 0
      }))
    );

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
