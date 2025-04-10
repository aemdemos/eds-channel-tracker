/* eslint-disable no-underscore-dangle */

export const sortTable = (data, key, direction) => {
  const dataType = typeof data[0][key];
  return [...data].sort((a, b) => {
    let valueA = a[key];
    let valueB = b[key];

    if (key === 'lstMsgDt') {
      // Handle "No Messages" as a special case
      valueA = valueA === 'No Messages' ? null : new Date(valueA);
      valueB = valueB === 'No Messages' ? null : new Date(valueB);

      if (valueA === null) return direction === 'asc' ? -1 : 1;
      if (valueB === null) return direction === 'asc' ? 1 : -1;
    }

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

const positionModal = (modal, cell) => {
  const rect = cell.getBoundingClientRect();
  modal.style.top = `${window.scrollY + rect.top - 15}px`;
  modal.style.left = `${window.scrollX + rect.left + 35}px`;
};

const hideModal = (modal) => {
  modal.classList.remove('show');
  modal.addEventListener('transitionend', () => {
    modal.innerHTML = '<span class="spinner"></span>';
    modal.style.display = 'none';
  }, { once: true });
};

// Utility function to handle modal interactions
export const handleModalInteraction = async (cell, channelId, modal, fetchDataCallback) => {
  const secondClickListener = () => {
    hideModal(modal);
    document.removeEventListener('click', secondClickListener);
  };

  setTimeout(() => {
    document.addEventListener('click', secondClickListener, { once: true });
  }, 0);

  positionModal(modal, cell);
  modal.style.display = 'block';
  requestAnimationFrame(() => modal.classList.add('show'));

  if (cell._fetched) {
    modal.innerHTML = cell._modalData;
    return;
  }

  try {
    const data = await fetchDataCallback(channelId);
    modal.innerHTML = data.modalContent;
    cell._fetched = true;
    cell._modalData = data.modalContent;
  } catch (err) {
    modal.innerHTML = '<p style="color: red;">Error loading data</p>';
  }
};

export const renderMembersTable = (channelName, adobeMembers, nonAdobeMembers) => {
  const maxLength = Math.max(adobeMembers.length, nonAdobeMembers.length);
  let rows = '';

  for (let i = 0; i < maxLength; i += 1) {
    const adobe = adobeMembers[i] || '';
    const other = nonAdobeMembers[i] || '';
    const background = i % 2 === 0 ? '#f9f9f9' : '#ffffff';

    rows += `
      <tr style="background-color: ${background};">
        <td style="border: 1px solid #ddd; padding: 10px; text-align: left;">${adobe}</td>
        <td style="border: 1px solid #ddd; padding: 10px; text-align: left;">${other}</td>
      </tr>
    `;
  }

  return `
    <h4 style="margin-top: 1em; color: #333;">${channelName}</h4>
    <table style="width: 90%; max-width: 600px; margin: 20px auto; border-collapse: collapse; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
      <thead>
        <tr style="background-color: #f4f4f4;">
          <th style="border: 1px solid #ddd; padding: 12px 15px; text-align: left; color: #444;">Adobe Members</th>
          <th style="border: 1px solid #ddd; padding: 12px 15px; text-align: left; color: #444;">Other Members</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};
