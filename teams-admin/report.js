import API_ENDPOINT from './config.js';

const button = document.getElementById('view');
const reportContainer = document.getElementById('report-container');

const key = document.getElementById('key');

const persistFormFields = () => {
  localStorage.setItem('key', key.value);
};

const getAllTeams = async () => {
  try {
    const response = await fetch(`${API_ENDPOINT}/teams`, {
      headers: {
        'x-api-key': key.value,
      },
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (e) { /* empty */ }

  return [];
};

const getReport = async () => {
  const report = [];
  try {
    const teams = await getAllTeams();

    const promises = await Promise.all(teams.map(async team => {
      const response = await fetch(`${API_ENDPOINT}/teams/${team.displayName}/report`, {
        headers: {
          'x-api-key': key.value,
        },
      });

      if (response.ok) {
        const json = await response.json();
        report.push(json);
      }
      return null;
    }));
    await Promise.all(promises);
  } catch (e) {};

  return report;
}

const getT = (text, header = false, nobreak = false) => {
  const td = document.createElement(header ? 'th' : 'td');
  td.textContent = text;
  if (nobreak) {
    td.classList.add('nobreak');
  }
  return td;
}

const getDisplayDate = (date) => {
  if (date) {
    const d = new Date(date);
    return `${d.toISOString().substring(0, 10)}`;
  }
  return '';
}

const viewReport = async () => {
  reportContainer.innerHTML = '<span class="spinner"></span>';
  button.setAttribute('disabled', true);

  const all = await getReport();

  if (all.length === 0) {
    reportContainer.innerHTML = '<p>Nothing to report.</p>';
    return;
  }

  all.sort((a, b) => a.displayName.localeCompare(b.displayName));

  const table = document.createElement('table');

  const header = document.createElement('tr');
  header.appendChild(getT('#', true));
  header.appendChild(getT('Team', true));
  header.appendChild(getT('Creation Date', true));
  header.appendChild(getT('Channels', true));
  header.appendChild(getT('Last Activity', true));
  header.appendChild(getT('Messages', true));
  header.appendChild(getT('Customer guests', true));
  header.appendChild(getT('Customer domains', true));
  header.appendChild(getT('Adobe guests', true));
  header.appendChild(getT('Admins', true));
  table.appendChild(header);

  all.forEach((team, index) => {
    const tr = document.createElement('tr');
    tr.appendChild(getT(index + 1));
    tr.appendChild(getT(team.displayName));
    tr.appendChild(getT(getDisplayDate(team.createdDateTime), false, true));
    tr.appendChild(getT(team.channels.list.length));
    let lastActivityTxt = 'No activity';
    if (team.channels.lastActivity) {
      lastActivityTxt = getDisplayDate(team.channels.lastActivity);
    }
    const lastActivityTd = getT(lastActivityTxt, false, true);
    const d = new Date(team.channels.lastActivity);
    const today = new Date();
    // Highlight teams that have not been active in the last 30 days.
    if (today - d > 30 * 24 * 60 * 60 * 1000) {
      lastActivityTd.classList.add('inactive');
      lastActivityTd.title = 'No activity in the last 30 days.';
    } else if (today - d > 15 * 24 * 60 * 60 * 1000) {
      lastActivityTd.classList.add('slowing-down');
      lastActivityTd.title = 'No activity in the last 15 days.';
    }
    tr.appendChild(lastActivityTd);

    tr.appendChild(getT(team.channels.totalMessages));

    // customer data
    let nbCustomers = 0;
    const domainsTd = document.createElement('td');
    const domainsUl = document.createElement('ul');
    domainsTd.appendChild(domainsUl);
    Object.keys(team.members.domains).forEach(domain => {
      if (domain !== 'adobe.com' && domain !== 'adobeenterprisesupportaem.onmicrosoft.com') {
        const li = document.createElement('li');
        li.textContent = `@${domain}`;
        domainsUl.appendChild(li);
        nbCustomers += team.members.domains[domain];
      }
    });
    tr.appendChild(getT(nbCustomers));
    tr.appendChild(domainsTd);

    tr.appendChild(getT(team.members.domains['adobe.com'] || 0));

    // admins check
    const admins = team.members.domains['adobeenterprisesupportaem.onmicrosoft.com'] || 0;
    const owners = team.members.roles.owner;
    const adminTd = getT(admins);
    if (admins !== owners) {
      adminTd.classList.add('owner-mismatch');
      adminTd.title = `Number of owners (${owners}) different from number of "admin" users (${admins}).`;
    }
    adminTd.textContent = admins;

    tr.appendChild(adminTd);

    table.appendChild(tr);
  });

  reportContainer.innerHTML = '';
  reportContainer.appendChild(table);

  button.removeAttribute('disabled');
}

/**
 * Handles site admin form submission.
 * @param {Event} e - Submit event.
 */
button.addEventListener('click', async (e) => {
  e.preventDefault();
  persistFormFields();

  viewReport();
});

key.value = localStorage.getItem('key') || '';

