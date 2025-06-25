// report.js
import { getFilteredTeams, getTeamMessageStats } from './api.js';

async function loadReport() {
  const container = document.getElementById('report-container');
  const spinner = container.getElementsByClassName('spinner')[0];
  spinner.style.display = 'block';

  // Fetch all teams (no filters)
  const teams = await getFilteredTeams({ name: 'Christa Kovac', email: 'kovac@adobe.com' });

  // Fetch message stats for each team
  const statsPromises = teams.map(async (team) => {
    const stats = await getTeamMessageStats(team.id);
    return {
      name: team.displayName,
      questionCount: stats.questionCount ?? '-',
    };
  });

  const stats = await Promise.all(statsPromises);

  // Build table
  const table = document.createElement('table');
  table.className = 'styled-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Team Name</th>
        <th>Question Count</th>
      </tr>
    </thead>
    <tbody>
      ${stats.map((row) => `
        <tr>
          <td>${row.name}</td>
          <td>${row.questionCount}</td>
        </tr>
      `).join('')}
    </tbody>
  `;

  container.innerHTML = '';
  container.appendChild(table);
}

document.addEventListener('DOMContentLoaded', loadReport);
