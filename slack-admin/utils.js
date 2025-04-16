/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
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
  positionModal(modal, cell);
  modal.style.display = 'block';
  requestAnimationFrame(() => modal.classList.add('show'));

  if (cell._fetched) {
    modal.innerHTML = cell._modalData;
    return;
  }

  try {
    const data = await fetchDataCallback(channelId);
    const wrapped = wrapWithCloseButton(data.modalContent, () => hideModal(modal));
    modal.innerHTML = ''; // clear previous content
    modal.appendChild(wrapped);
    cell._modalData = wrapped.outerHTML; // for caching (optional, or update if needed)
  } catch (err) {
    modal.innerHTML = '<p style="color: red;">Error loading data</p>';
  }
};

export const wrapWithCloseButton = (content, onClose) => {
  const wrapper = document.createElement('div');
  wrapper.classList.add('modal-content');
  wrapper.innerHTML = `
    <div class="modal-header">
      <button class="modal-close-button" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;" aria-label="Close modal">&times;</button>
    </div>
    <div class="modal-body">${content}</div>
  `;

  const closeBtn = wrapper.querySelector('.modal-close-button');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClose();
    });
  }

  return wrapper; // return the actual DOM node
};


export const decodeHTML = (str) => {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
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
