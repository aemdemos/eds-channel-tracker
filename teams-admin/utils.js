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

export const getActiveTeamsCount = (teams) => {
  const now = new Date();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  return teams.filter((team) => {
    if (!team.lastMessage) return false;
    const lastMessage = new Date(team.lastMessage);
    return now - lastMessage <= THIRTY_DAYS_MS;
  }).length;
};

export const escapeHTML = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

export function renderMemberList(members) {
  // Sort the members array by displayName (alphabetically)
  const sortedMembers = [...members].sort((a, b) => {
    const valA = a.displayName.toLowerCase();
    const valB = b.displayName.toLowerCase();

    if (valA < valB) return -1;
    if (valA > valB) return 1;
    return 0;
  });

  // Render the sorted list
  return `
    <ul style="list-style: none; padding: 0; margin: 0; max-height: 300px; overflow-y: auto;">
      ${sortedMembers.map(m => `
        <li style="padding: 6px 0; border-bottom: 1px solid #eee;">
          <strong>${m.displayName}</strong><br>
          <span style="color: #555;">${m.email}</span>
        </li>
      `).join('')}
    </ul>
  `;
}


export const handleModalInteraction = async (cell, teamId, modal, fetchDataCallback) => {
  // Always position the modal first
  positionModal(modal, cell);

  // Set the spinner immediately so it's visible before fetching data
  modal.innerHTML = '<span class="spinner"></span>';
  modal.style.display = 'block';

  requestAnimationFrame(() => modal.classList.add('show'));

  try {
    // Fetch the modal content
    const data = await fetchDataCallback(teamId);

    const title = `${data.teamName}`;
    const wrapped = wrapWithCloseButton(data.modalContent, () => hideModal(modal), title);

    modal.innerHTML = ''; // Clear any existing content
    modal.appendChild(wrapped); // Append the new content
  } catch {
    modal.innerHTML = '<p style="color: red;">Error loading data</p>';
  }
};

// Updated hideModal to trigger closure even if modal content is already displayed
const hideModal = (modal) => {
  // Remove the 'show' class to trigger the closing animation
  modal.classList.remove('show');

  // Ensure the modal properly resets its content once the closing transition completes
  modal.addEventListener(
    'transitionend',
    () => {
      modal.style.display = 'none'; // Hide the modal
      modal.innerHTML = '<span class="spinner"></span>'; // Reset content to spinner
    },
    { once: true },
  );
};

const wrapWithCloseButton = (content, onClose, title = '') => {
  const wrapper = document.createElement('div');
  wrapper.classList.add('modal-content');

  wrapper.innerHTML = `
      <button class="modal-close-button" aria-label="Close modal"
        style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">
        &times;
      </button>
    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <strong>${title}</strong>
    </div>
    <div class="modal-body">${content}</div>
  `;

  const closeBtn = wrapper.querySelector('.modal-close-button');

  // Remove any previous listeners to avoid stacking
  closeBtn?.removeEventListener('click', onClose);

  // Add the close button listener
  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    onClose();
  });

  return wrapper;
};

const positionModal = (modal, cell) => {
  const rect = cell.getBoundingClientRect();

  // Offset from cell
  const offsetTop = rect.top - 20 ;
  const offsetLeft = rect.left + 40;

  // Prevent off-screen right
  const modalWidth = modal.offsetWidth || 300;
  const maxLeft = window.innerWidth - modalWidth + 10;
  const clampedLeft = Math.min(offsetLeft, maxLeft);

  modal.style.position = 'fixed';
  modal.style.top = `${offsetTop}px`;
  modal.style.left = `${clampedLeft}px`;
};



