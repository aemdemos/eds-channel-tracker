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

export function renderMemberList(members, teamName) {
  return `
    <div style="padding: 1em;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <strong>${teamName} – ${members.length} member${members.length !== 1 ? 's' : ''}</strong>
      </div>
      <ul style="list-style: none; padding: 0; margin: 0; max-height: 300px; overflow-y: auto;">
        ${members.map(m => `
          <li style="padding: 6px 0; border-bottom: 1px solid #eee;">
            <strong>${m.displayName}</strong><br>
            <span style="color: #555;">${m.email}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

export const handleModalInteraction = async (cell, teamId, modal, fetchDataCallback) => {
  positionModal(modal, cell);
  modal.style.display = 'block';
  requestAnimationFrame(() => modal.classList.add('show'));

  if (cell._fetched) {
    modal.innerHTML = cell._modalData;
    return;
  }

  try {
    const data = await fetchDataCallback(teamId);
    const wrapped = wrapWithCloseButton(data.modalContent, () => hideModal(modal));
    modal.innerHTML = '';
    modal.appendChild(wrapped);
    cell._modalData = wrapped.outerHTML;
  } catch {
    modal.innerHTML = '<p style="color: red;">Error loading data</p>';
  }
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

const wrapWithCloseButton = (content, onClose) => {
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

const positionModal = (modal, cell) => {
  const { top, left } = cell.getBoundingClientRect();
  modal.style.top = `${window.scrollY + top - 15}px`;
  modal.style.left = `${window.scrollX + left + 35}px`;
};

