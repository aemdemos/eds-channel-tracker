export const sortTable = (teams, columnKey, direction) => {
  const sortedTeams = [...teams];
  sortedTeams.sort((a, b) => {
    let valA = a[columnKey];
    let valB = b[columnKey];

    if (columnKey === 'displayName') { // Handle sorting by displayName
      valA = a.displayName.toLowerCase();
      valB = b.displayName.toLowerCase();
    } else if (columnKey === 'isMember') {
      valA = a.isMember ? 1 : 0; // Convert boolean to numeric for sorting
      valB = b.isMember ? 1 : 0;
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  return sortedTeams;
};

export const decodeHTML = (str) => {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
};

export const escapeHTML = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

export function sleep(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}
