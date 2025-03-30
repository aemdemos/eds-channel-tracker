import API_ENDPOINT from './config.js';

let sortDirection = 'asc';

const slackChannelsContainer = document.getElementById('slack-channels-container');

const doLogout = () => window.location.reload();

const sk = document.querySelector('aem-sidekick');
if (sk) {
  // sidekick already loaded
  sk.addEventListener('logged-out', doLogout);
} else {
  // wait for sidekick to be loaded
  document.addEventListener('sidekick-ready', () => {
    // sidekick now loaded
    document.querySelector('aem-sidekick').addEventListener('logged-out', doLogout);
  }, { once: true });
}

const getAllSlackChannels = async () => {
  try {
    const response = await fetch(`${API_ENDPOINT}/slack/channels`);
    if (response.ok) return response.json();
  } catch (e) { /* Handle error */ }
  return [];
};

const getConversationWithRateLimit = async (channelId) => {
  const fetchWithRetry = async () => {
    let response;

    while (true) {
      response = await fetch(
        `${API_ENDPOINT}/slack/lastmessage?channelId=${channelId}`);
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After'),
            10) || 1;
          console.warn(
            `Rate limit exceeded. Retrying after ${retryAfter} seconds...`);
          await new Promise(
            (resolve) => setTimeout(resolve, retryAfter * 1000));
        } else {
          console.error(`API Error (Status ${response.status}):`, response.statusText);
          return null;
        }
      } else {
        return response.json();
      }
    }
  };
  return fetchWithRetry();
};

const fetchAllConversations = async (channels) => {
  const promises = channels.map((channel) => {
    if (!channel.lastMessageTimestamp) {
      return getConversationWithRateLimit(channel.id);
    }
    return Promise.resolve(null);
  });

  return Promise.all(promises);
};

const displayChannels = async () => {
  slackChannelsContainer.innerHTML = '<span class="spinner"></span>';
  const all = await getAllSlackChannels();
  if (all.length === 0) {
    slackChannelsContainer.innerHTML = '<span class="error">Failed to load channels. Please try again later.</span>';
    return;
  }

  all.sort((a, b) => a.name.localeCompare(b.name));

  const summary = document.createElement('div');
  summary.classList.add('table-summary');
  summary.innerHTML = `
    <span>Total Channels: ${all.length}</span> |
    <span style="color: green;">Active Channels: <span id="active-channels-count"></span></span></span>
  `;

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th data-sort="name">Name</th>
        <th data-sort="purpose" class="sorting-disabled">Description</th>
        <th data-sort="created">Created</th>
        <th data-sort="message" class="sorting-disabled">Last Message</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  table.classList.add('styled-table');
  const tbody = table.querySelector('tbody');

  const renderRows = (data) => {
    tbody.innerHTML = '';
    data.forEach((channel) => {
      const tr = document.createElement('tr');
      const createdDate = new Date(channel.created * 1000).toISOString().split('T')[0];
      const lastMessageDate = channel.lastMessageDate || 'Loading...';
      const messageTimestamp = channel.lastMessageTimestamp;
      const currentDate = new Date();
      const thirtyDaysAgo = new Date(currentDate.setDate(currentDate.getDate() - 30));
      const messageClass = messageTimestamp && messageTimestamp > thirtyDaysAgo ? 'recent-message' : 'old-message';

      tr.innerHTML = `
        <td><a href="slack://channel?team=T0385CHDU9E&id=${channel.id}" target="_blank">${channel.name}</a></td>
        <td>${channel.purpose.value}</td>
        <td>${createdDate}</td>
         <td class="last-message ${messageClass}" data-channel-id="${channel.id}">${lastMessageDate}</td>
      `;

      tbody.appendChild(tr);
    });
  };

  renderRows(all);

  const sortTable = (key) => {
    const th = table.querySelector(`th[data-sort="${key}"]`);
    if (th.classList.contains('sorting-disabled')) {
      return; // Prevent sorting if the column is disabled
    }

    const dataType = typeof all[0][key];

    const sortedData = [...all].sort((a, b) => {
      if (dataType === 'string') {
        return sortDirection === 'asc' ? a[key].localeCompare(b[key]) : b[key].localeCompare(a[key]);
      } else if (key === 'created') {
        return sortDirection === 'asc' ? a.created - b.created : b.created - a.created;
      } else if (key === 'message') {
        return sortDirection === 'asc' ? a.lastMessageTimestamp - b.lastMessageTimestamp : b.lastMessageTimestamp - a.lastMessageTimestamp;
      }
      return 0; // Default case if types do not match
    });

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
  const lastMessageData = await fetchAllConversations(all);
  let activeChannelsCount = 0;
  const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)); // Calculate once

  lastMessageData.forEach((message, index) => {
    const messageCell = tbody.querySelector(`.last-message[data-channel-id="${all[index].id}"]`);

    if (messageCell) {
      const messageDate = message && message.messages && message.messages[0] && message.messages[0].ts
        ? new Date(message.messages[0].ts * 1000).toISOString().split('T')[0]
        : 'No date';
      const messageTimestamp = message && message.messages && message.messages[0] && message.messages[0].ts ? new Date(message.messages[0].ts * 1000) : null;
      if (messageTimestamp && messageTimestamp > thirtyDaysAgo) {
        messageCell.classList.add('recent-message');
        activeChannelsCount += 1;
      } else {
        messageCell.classList.add('old-message');
      }

      messageCell.textContent = messageDate || 'Error loading message';
      // Store the last message data in the all array
      all[index].lastMessageDate = messageDate;
      all[index].lastMessageTimestamp = messageTimestamp;
    } else {
      console.error(`Message cell not found for channel ID: ${all[index].id}`);
    }
  });
  document.getElementById('active-channels-count').textContent = activeChannelsCount.toString();

  // Enable sorting for the "Last Message" column after data is loaded
  table.querySelector('th[data-sort="message"]').classList.remove('sorting-disabled');
};

/**
 * Handles site admin form submission.
 * @param {Event} e - Submit event.
 */
document.getElementById('channelisation').addEventListener('click', async (e) => {
  e.preventDefault();
  await displayChannels();
});
