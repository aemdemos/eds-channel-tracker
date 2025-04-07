import { getMessageStats, getMemberIds, getAllSlackChannels, getUserInfo } from './api.js';
import { countMembers } from './members.js';
import { sortTable, alphaSort, renderMembersTable, positionModal, hideModal } from './utils.js';

let sortDirection = 'asc';
let activeChannelsCount = 0;

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
  activeChannelsCount = 0;

  const summary = document.createElement('div');
  summary.classList.add('table-summary');
  summary.innerHTML = `
    <span>Total Channels: ${channels.length}</span> |
    <span style="color: green;">Active Channels: <span id="active-channels-count">0</span></span></span>
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
        <th data-sort="messagesCount">Messages</th>
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
      <td class="stat-column messages-count">${channel.messagesCount || spinner}</td>
      <td class="stat-column last-message ${messageDateClass}">${channel.messageDate || spinner}</td>
      <td class="stat-column members-count title="View members">${channel.membersCount || spinner}</td>
    `;

    tbody.appendChild(tr); // Add the row to the tbody
  });

};

const addSortingToTable = (table, channels) => {
  const headers = table.querySelectorAll('th[data-sort]');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      headers.forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));
      if (!header.classList.contains('sorting-disabled')) {
        const columnKey = header.getAttribute('data-sort');
        const sortedData = sortTable(channels, columnKey, sortDirection);
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

const updateMessageCells = (channel, messagesCount, messageDate) => {
  const row = document.querySelector(`tr[data-channel-id="${channel.id}"]`);
  if (row) {
    const messagesCountCell = row.querySelector('.messages-count');
    messagesCountCell.textContent = messagesCount;
    channel.messagesCount = messagesCount; // Save the messages count in the channel object
    channel.messageDate = messageDate; // Save the last message date in the channel object
    const lastMessageCell = row.querySelector('.last-message');
    lastMessageCell.innerHTML = messageDate;
    const currentDate = new Date();
    const lastMessageDate = new Date(messageDate); // Convert to Date object
    const thirtyDaysAgo = new Date(currentDate.setDate(currentDate.getDate() - 30));
    const messageClass = lastMessageDate.getTime() && lastMessageDate.getTime() > thirtyDaysAgo ? 'recent-message' : 'old-message';
    lastMessageCell.classList.remove('recent-message', 'old-message');
    lastMessageCell.classList.add(messageClass);

    if (messageClass === "recent-message") {
      activeChannelsCount++;
      document.getElementById('active-channels-count').textContent = activeChannelsCount;
    }
  }
};

const updateMembersCountCell = (channel, membersCount) => {
  const row = document.querySelector(`tr[data-channel-id="${channel.id}"]`);
  if (!row) return;

  const membersCountCell = row.querySelector('.members-count');
  membersCountCell.textContent = membersCount;

  membersCountCell._fetched = false;
  membersCountCell._modalData = null;

  let modalVisible = false;
  let secondClickListener = null;
  const modal = document.getElementById('modal');

  membersCountCell.addEventListener('click', async (e) => {
    e.stopPropagation(); // prevent the event from bubbling to the document

    modalVisible = true;

    // Add one-time document click listener
    secondClickListener = () => {
      hideModal(modal);
      modalVisible = false;
      document.removeEventListener("click", secondClickListener);
      secondClickListener = null;
    };

    // Delay to avoid triggering on the same click
    setTimeout(() => {
      document.addEventListener("click", secondClickListener, { once: true });
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
      modal.innerHTML = `<p style="color: red;">Error loading data</p>`;
      console.error(err);
    }
  });
};


const startFetching = async () => {
  slackChannelsContainer.innerHTML = '<span class="spinner"></span>';
  const channelNameFilter = document.getElementById('channel-name').value.trim(); // Get the input value
  const channels = await getAllSlackChannels(channelNameFilter);


  // SORT BY NAME initially
  channels.sort((a, b) => a.name.localeCompare(b.name));

  initTable(channels);

  // Load 20 rows at a time with a 1-second pause between each batch
  const batchSize = 20;
  const totalChannels = channels.length;

  for (let i = 0; i < totalChannels; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);

    const messagePromises = batch.map(channel => {
    if (!channel.messagesCount || !channel.messageDate || channel.messageDate === 'No date') {
      return getMessageStats(channel.id).then(messageJson => ({
        channelId: channel.id,
        messagesCount: messageJson?.messageCount || 0,
        messageDate: messageJson?.lastMessageTimestamp
          ? new Date(messageJson.lastMessageTimestamp * 1000).toISOString().split(
            'T')[0]
          : 'No date',
      }));
    }
      return Promise.resolve({ channelId: channel.id, messagesCount: channel.messagesCount, messageDate: channel.messageDate })
    });

    const memberPromises = batch.map(channel => {
    if (!channel.membersCount) {
      return getMemberIds(channel.id).then(membersJson => ({
        channelId: channel.id,
        membersCount: membersJson?.members?.length || 0
      }));
    }
      return Promise.resolve({ channelId: channel.id, membersCount: channel.membersCount });
    });

    const messageResults = await Promise.all(messagePromises);
    const memberResults = await Promise.all(memberPromises);

    // Update the table after each batch
    messageResults.forEach(({ channelId, messagesCount, messageDate }) => {
      const channel = channels.find(c => c.id === channelId);
      updateMessageCells(channel, messagesCount, messageDate);
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
