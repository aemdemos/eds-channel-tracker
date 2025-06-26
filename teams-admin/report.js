// report.js
import { getFilteredTeams, getTeamMessageStats } from './api.js';

let stats = [];
let sortKey = 'displayName';
let sortDirection = 'asc';

function sortStats() {
  const numericSort = (a, b) => (sortDirection === 'asc' ? a - b : b - a);
  const stringSort = (a, b) => (sortDirection === 'asc' ? a.localeCompare(b) : b.localeCompare(a));

  return [...stats].sort((a, b) => {
    let aVal = a[sortKey] ?? '-';
    let bVal = b[sortKey] ?? '-';

    if (sortKey === 'questionCount') {
      aVal = parseInt(aVal, 10) || 0;
      bVal = parseInt(bVal, 10) || 0;
      return numericSort(aVal, bVal);
    }

    if (aVal === '-' || bVal === '-') return aVal === '-' ? 1 : -1;
    return stringSort(String(aVal), String(bVal));
  });
}

function renderTable(container) {
  const table = document.createElement('table');
  table.className = 'styled-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th data-sort="displayName" class="name-column">Team name</th>
        <th data-sort="created" class="created">Date created</th>
        <th data-sort="questionCount">Messages posted</th>
      </tr>
    </thead>
    <tbody>
      ${sortStats().map((row, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td >${row.displayName}</td>
          <td>${row.created}</td>
          <td>${row.questionCount}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
  // Add click handlers for sorting
  const headers = table.querySelectorAll('th[data-sort]');
  headers.forEach((th) => {
    th.style.cursor = 'pointer';
    th.classList.remove('sorted-asc', 'sorted-desc');
    th.onclick = () => {
      const key = th.getAttribute('data-sort');
      if (sortKey === key) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey = key;
        sortDirection = 'asc';
      }
      // Re-render table
      container.querySelector('table').replaceWith(renderTable(container));
    };
    // Add sort indicator
    if (sortKey === th.getAttribute('data-sort')) {
      th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
  });
  return table;
}

async function loadReport() {
  const container = document.getElementById('report-container');
  const spinner = container.getElementsByClassName('spinner')[0];
  spinner.style.display = 'block';

  // Fetch all teams (no filters)
  const teams = await getFilteredTeams({
    name: 'Christa Kovac',
    email: 'kovac@adobe.com',
  });

  // Show the number of teams fetched
  const countLabel = document.createElement('div');
  countLabel.style.margin = '10px 0';
  countLabel.textContent = `${teams.length} Teams`;

  // Fetch message stats for each team
  const statsPromises = teams.map(async (team) => {
    const statsObj = await getTeamMessageStats(team.id);
    return {
      displayName: team.displayName,
      questionCount: statsObj.questionCount ?? '-',
      created: statsObj.created ?? '-',
    };
  });

  stats = await Promise.all(statsPromises);

  container.innerHTML = '';
  container.appendChild(countLabel);
  container.appendChild(renderTable(container));
}

document.addEventListener('DOMContentLoaded', loadReport);
