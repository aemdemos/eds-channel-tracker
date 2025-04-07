// utils.js
export const sortTable = (data, key, direction) => {
  const dataType = typeof data[0][key];
  return [...data].sort((a, b) => {
    if (dataType === 'string') {
      return direction === 'asc' ? a[key].localeCompare(b[key]) : b[key].localeCompare(a[key]);
    }
    if (dataType === 'number') {
      return direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
    }
    if (dataType === 'object' && a[key] instanceof Date && b[key] instanceof Date) {
      return direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
    }
    return 0;
  });
};


export const alphaSort = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' });

export const positionModal = (modal, cell) => {
  const rect = cell.getBoundingClientRect();
  modal.style.top = `${window.scrollY + rect.top - 15}px`;
  modal.style.left = `${window.scrollX + rect.left + 35}px`;
};

export const hideModal = (modal) => {
  modal.classList.remove('show');
  modal.addEventListener('transitionend', () => {
    modal.innerHTML = '<span class="spinner"></span>';
    modal.style.display = 'none';
  }, { once: true });
};

export const renderMembersTable = (adobeMembers, nonAdobeMembers) => {
  const maxLength = Math.max(adobeMembers.length, nonAdobeMembers.length);
  let rows = '';

  for (let i = 0; i < maxLength; i++) {
    const adobe = adobeMembers[i] || '';
    const other = nonAdobeMembers[i] || '';
    const background = i % 2 === 0 ? '#f9f9f9' : '#ffffff';

    rows += `
      <tr style="background-color: ${background};">
        <td style="border: 1px solid #ccc; padding: 8px;">${adobe}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${other}</td>
      </tr>
    `;
  }

  return `
    <h4 style="margin-top: 1em;">Channel Members</h4>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 1em;">
      <thead>
        <tr style="background-color: #eaeaea;">
          <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Adobe Members</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Other Members</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};

