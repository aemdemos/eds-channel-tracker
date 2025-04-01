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

const getAllSlackChannels = async (channelName = "aem-", description = "Edge Delivery") => {
  try {
    const url = new URL(`${API_ENDPOINT}/slack/channels`);
    url.searchParams.append("channelName", channelName.replace(/\*/g, ""));
    url.searchParams.append("description", description);

    const response = await fetch(url.toString());
    return response.ok ? response.json() : [];
  } catch (e) { /* Handle error */ }
  return [];
};

const getAllMessagesWithRateLimit = async (channelId) => {
  const fetchWithRetry = async () => {
    let response;
    let retry = true;

    while (retry) {
      response = await fetch(`${API_ENDPOINT}/slack/latest/message?channelId=${channelId}`);
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After'), 10) || 1;
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        } else {
          retry = false;
          return null;
        }
      } else {
        retry = false;
        return response.json();
      }
    }
  };
  return fetchWithRetry();
};

const fetchAllConversations = async (channels) => {
  return channels.map(async (channel) => {
    if (!channel.lastMessageTimestamp) {
      const message = await getAllMessagesWithRateLimit(channel.id);
      return { channelId: channel.id, message };
    }
    return { channelId: channel.id, message: null };
  });
};

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
        <th data-sort="adobeMembers" >Adobe Members</th>
        <th data-sort="nonAdobeMembers" >Non-Adobe Members</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  table.classList.add('styled-table');
  const tbody = table.querySelector('tbody');

  const renderRows = (data) => {
    tbody.innerHTML = '';
    const currentDate = new Date();
    const thirtyDaysAgo = new Date(currentDate.setDate(currentDate.getDate() - 30));

    data.forEach((channel) => {
      const tr = document.createElement('tr');
      const createdDate = new Date(channel.created * 1000).toISOString().split('T')[0];
      const lastMessageDate = channel.lastMessageDate || '<div class="spinner"></div>';
      const messageTimestamp = channel.lastMessageTimestamp;
      const messageClass = messageTimestamp && messageTimestamp > thirtyDaysAgo ? 'recent-message' : 'old-message';

      tr.innerHTML = `
        <td><a href="slack://channel?team=T0385CHDU9E&id=${channel.id}" target="_blank">${channel.name}</a></td>
        <td>${channel.purpose.value}</td>
        <td>${createdDate}</td>
        <td class="last-message ${messageClass}" data-channel-id="${channel.id}">${lastMessageDate}</td>
         <td>${channel.adobeMembers || 'N/A'}</td>
          
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

    const dataType = typeof all[0][key];

    const sortedData = [...all].sort((a, b) => {
      if (dataType === 'string') {
        return sortDirection === 'asc' ? a[key].localeCompare(b[key]) : b[key].localeCompare(a[key]);
      }
      if (key === 'created') {
        return sortDirection === 'asc' ? a.created - b.created : b.created - a.created;
      }
      if (key === 'message') {
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
  const lastMessagePromises = await fetchAllConversations(all);
  let activeChannelsCount = 0;
  const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)); // Calculate once

  for (const promise of lastMessagePromises) {
    const { channelId, message } = await promise;
    const messageCell = tbody.querySelector(`.last-message[data-channel-id="${channelId}"]`);

    if (messageCell) {
      const msgDate = message?.messages?.[0]?.ts
        ? new Date(message.messages[0].ts * 1000).toISOString().split('T')[0]
        : 'No date';
      const msgTs = message?.messages?.[0]?.ts ? new Date(message.messages[0].ts * 1000) : null;

      if (msgDate === '<div class="spinner"></div>') {
        messageCell.classList.remove('recent-message', 'old-message');
      } else if (msgTs && msgTs > thirtyDaysAgo) {
        messageCell.classList.add('recent-message');
        activeChannelsCount += 1;
      } else {
        messageCell.classList.add('old-message');
      }

      messageCell.textContent = msgDate || 'Error loading message';
      // Store the last message data in the all array
      const channel = all.find((ch) => ch.id === channelId);
      if (channel) {
        channel.lastMessageDate = msgDate;
        channel.lastMessageTimestamp = msgTs;
      }
    }
  }

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
