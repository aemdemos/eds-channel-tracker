import API_ENDPOINT from './config.js';

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
    const response = await fetch(API_ENDPOINT);
    if (response.ok) return await response.json();
  } catch (e) {/* Handle error */}
  return [];
}

const displayChannels = async () => {
  slackChannelsContainer.innerHTML = '<span class="spinner"></span>';
  const all = await getAllSlackChannels();
  all.sort((a, b) => a.name.localeCompare(b.name));

  const activeChannels = all.filter(channel => {
    const updatedDate = new Date(channel.updated);
    return new Date() - updatedDate < 30 * 24 * 60 * 60 * 1000; // Active within 30 days
  }).length;

  const summary = document.createElement('div');
  summary.classList.add('table-summary');
  summary.innerHTML = `
  <span>Total Channels: ${all.length}</span> |
  <span style="color: green;">Active Channels: ${activeChannels}</span>
`;

  const table = document.createElement('table');
  table.innerHTML = `
  <thead>
    <tr>
      <th>Name</th>
      <th>Description</th>
      <th>Last Activity</th>
    </tr>
  </thead>
  <tbody></tbody>
`;

  table.classList.add('styled-table');
  const tbody = table.querySelector('tbody');


  all.forEach((channel) => {
    const tr = document.createElement('tr');
    const updatedDate = new Date(channel.updated);
    const formattedDate = updatedDate.toISOString().split('T')[0];
    const isActive = new Date() - updatedDate < 30 * 24 * 60 * 60 * 1000;

    tr.innerHTML = `
    <td>${channel.name}</td>
    <td>${channel.purpose.value}</td>
    <td style="color: ${isActive ? 'green' : 'red'};">${formattedDate}</td>
  `;

    tbody.appendChild(tr);
  });

  summary.textContent = `Total Channels: ${all.length}`;

  slackChannelsContainer.innerHTML = '';
  slackChannelsContainer.appendChild(summary);
  slackChannelsContainer.appendChild(table);
};

/**
 * Handles site admin form submission.
 * @param {Event} e - Submit event.
 */
document.getElementById('channelisation').addEventListener('click', async (e) => {
  e.preventDefault();
  await displayChannels();
});
