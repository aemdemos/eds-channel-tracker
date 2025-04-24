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

export const sortTable = (teams, columnKey, direction) => {
  const sortedTeams = [...teams];
  sortedTeams.sort((a, b) => {
    let valA = a[columnKey];
    let valB = b[columnKey];

    if (columnKey === 'name') { // Handle sorting by displayName
      valA = a.displayName.toLowerCase();
      valB = b.displayName.toLowerCase();
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  return sortedTeams;
};

export const alphaSort = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' });

const positionModal = (modal, cell) => {
  const { top, left } = cell.getBoundingClientRect();
  modal.style.top = `${window.scrollY + top - 15}px`;
  modal.style.left = `${window.scrollX + left + 35}px`;
};

const hideModal = (modal) => {
  modal.classList.remove('show');
  modal.addEventListener(
    'transitionend',
    () => {
      modal.innerHTML = '<span class="spinner"></span>';
      modal.style.display = 'none';
    },
    { once: true },
  );
};

export const wrapWithCloseButton = (content, onClose) => {
  const wrapper = document.createElement('div');
  wrapper.classList.add('modal-content');

  wrapper.innerHTML = `
    <div class="modal-header">
      <button class="modal-close-button" aria-label="Close modal"
        style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">
        &times;
      </button>
    </div>
    <div class="modal-body">${content}</div>
  `;

  const closeBtn = wrapper.querySelector('.modal-close-button');
  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    onClose();
  });

  return wrapper;
};

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
    modal.innerHTML = '';
    modal.appendChild(wrapped);
    cell._modalData = wrapped.outerHTML;
  } catch {
    modal.innerHTML = '<p style="color: red;">Error loading data</p>';
  }
};

export const decodeHTML = (str) => {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
};

export const renderMembersTable = (channelName, adobeMembers, nonAdobeMembers) => {
  const maxLength = Math.max(adobeMembers.length, nonAdobeMembers.length);
  const rows = Array.from({ length: maxLength }, (_, i) => {
    const adobe = adobeMembers[i] || '';
    const other = nonAdobeMembers[i] || '';
    const background = i % 2 === 0 ? '#f9f9f9' : '#ffffff';

    return `
      <tr style="background-color: ${background};">
        <td style="border: 1px solid #ddd; padding: 10px; text-align: left;">${adobe}</td>
        <td style="border: 1px solid #ddd; padding: 10px; text-align: left;">${other}</td>
      </tr>
    `;
  }).join('');

  return `
    <h4 style="margin-top: 1em; color: #333;">${channelName}</h4>
    <table style="
      width: 90%; max-width: 600px; margin: 20px auto; border-collapse: collapse;
      background-color: #fff; border-radius: 8px; overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
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
