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
    const response = await fetch(API_ENDPOINT);
    if (response.ok) return await response.json();
  } catch (e) { /* Handle error */ }
  return [];
};

const displayChannels = async () => {
  slackChannelsContainer.innerHTML = '<span class="spinner"></span>';
  const all = await getAllSlackChannels();
  all.sort((a, b) => a.name.localeCompare(b.name));

  const summary = document.createElement('div');
  summary.classList.add('table-summary');
  summary.innerHTML = `
    <span>Total Channels: ${all.length}</span> |
    <span style="color: green;">Active Channels: </span>   
  `;

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th data-sort="name">Name</th>
        <th data-sort="purpose">Description</th>
        <th data-sort="created">Created</th>
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

      tr.innerHTML = `
        <td><a href="slack://channel?team=T0385CHDU9E&id=${channel.id}" target="_blank">${channel.name}</a></td>
        <td>${channel.purpose.value}</td>
        <td>${createdDate}</td>
      `;

      tbody.appendChild(tr);
    });
  };

  renderRows(all);

  const sortTable = (key) => {
    const sortedData = [...all].sort((a, b) => {
      if (key === 'name' || key === 'purpose') {
        return sortDirection === 'asc' ? a[key].localeCompare(b[key]) : b[key].localeCompare(a[key]);
      }
      return sortDirection === 'asc' ? new Date(a[key]) - new Date(b[key]) : new Date(b[key]) - new Date(a[key]);
    });
    renderRows(sortedData);

    // Add visual cue for sorted column
    table.querySelectorAll('th').forEach((th) => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.getAttribute('data-sort') === key) {
        th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
      }
    });
    // Toggle sort direction
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  };

  table.querySelectorAll('th').forEach((th) => {
    th.addEventListener('click', () => {
      const sortKey = th.getAttribute('data-sort');
      sortTable(sortKey);
    });
  });

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
