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

import { getTeamMembers, getTeamMessageStats } from '../api.js';
import { sortTable, decodeHTML, escapeHTML, sleep } from '../utils.js';
import { handleModalInteraction, showSuccessModal } from '../modal.js';
import renderMemberList from '../members.js';
import { showAddUsersModal } from './teamForms.js';
import { PerformanceOptimizer } from './performanceOptimizer.js';
import { ErrorHandler } from './errorHandler.js';

export class TeamTable {
  constructor(userProfile) {
    this.userProfile = userProfile;
    this.currentTeams = [];
    this.sortDirection = 'asc';
    this.teamsContainer = PerformanceOptimizer.getElementById('teams-container');
    this.membersModal = PerformanceOptimizer.getElementById('members-modal');
    this.addUsersModal = PerformanceOptimizer.getElementById('add-users-modal');
    this.currentInviteTeamId = null;
    this.currentInviteTeamRow = null;
  }

  createCell(content, nobreak = false) {
    const td = document.createElement('td');
    td.textContent = content;
    if (nobreak) {
      td.classList.add('nobreak');
    }
    return td;
  }

  renderSingleTeamRow(team) {
    const tr = document.createElement('tr');
    tr.classList.add('team-row');
    tr.setAttribute('data-team-id', team.id);

    // Name column with optional webUrl link
    const nameCell = document.createElement('td');
    nameCell.className = 'name-column';

    if (team.webUrl && team.isMember) {
      nameCell.innerHTML = `<a href="${escapeHTML(
        team.webUrl,
      )}" target="_blank" rel="noopener noreferrer" title="Open in Microsoft Teams">${escapeHTML(
        team.displayName,
      )}</a>`;
    } else {
      nameCell.textContent = team.displayName;
    }
    tr.appendChild(nameCell);

    // Member column
    const memberCell = this.createMemberCell(team.isMember);
    tr.appendChild(memberCell);

    // Description
    const descriptionText = decodeHTML(team.description || '');
    const descriptionCell = this.createCell(descriptionText);
    tr.appendChild(descriptionCell);

    // Created date
    const dateOnly = team.created ? new Date(team.created).toISOString().split('T')[0] : 'N/A';
    const createdCell = this.createCell(dateOnly, true);
    tr.appendChild(createdCell);

    // Update created teams count if recent
    this.updateCreatedTeamsCount(team.created);

    // Message stats columns
    const { totalMessagesCell, lastMessageCell, recentCountCell } = this.createMessageStatsColumns(team);
    tr.append(totalMessagesCell, lastMessageCell, recentCountCell);

    // Members count column
    const membersCountCell = this.createMembersCountCell(team);
    tr.appendChild(membersCountCell);

    // Actions column
    const actionsCell = this.createActionsCell(team, tr);
    tr.appendChild(actionsCell);

    return tr;
  }

  createMemberCell(isMember) {
    const memberCell = document.createElement('td');
    memberCell.className = 'member-column';

    if (isMember) {
      memberCell.innerHTML = `
        <svg viewBox="0 0 20 20" width="18" height="18" xmlns="http://www.w3.org/2000/svg" class="checkmark-badge">
          <rect width="20" height="20" rx="4" fill="#22c55e"/>
          <path d="M6 10.5l2.5 2.5L14 8" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }

    return memberCell;
  }

  createMessageStatsColumns(team) {
    const totalMessagesCell = document.createElement('td');
    totalMessagesCell.classList.add('msg-count');

    const lastMessageCell = document.createElement('td');
    lastMessageCell.classList.add('latest-msg');

    const recentCountCell = document.createElement('td');
    recentCountCell.classList.add('recent-count');

    if (team.messageCount != null) {
      totalMessagesCell.textContent = team.messageCount ?? '—';
      lastMessageCell.textContent = team.latestMessage ?? '—';
      recentCountCell.textContent = team.recentCount ?? '—';
    } else {
      totalMessagesCell.innerHTML = '<span class="spinner" data-loading="true"></span>';
      lastMessageCell.innerHTML = '<span class="spinner" data-loading="true"></span>';
      recentCountCell.innerHTML = '<span class="spinner" data-loading="true"></span>';
    }

    return { totalMessagesCell, lastMessageCell, recentCountCell };
  }

  createMembersCountCell(team) {
    const membersCountCell = this.createCell(team.memberCount ?? '');
    membersCountCell.classList.add('members-count-cell');

    const membersLink = document.createElement('a');
    membersLink.textContent = `${team.memberCount ?? 0}`;
    membersLink.title = 'View Members';
    membersCountCell.innerHTML = '';
    membersCountCell.appendChild(membersLink);

    membersCountCell.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      await this.showMembersModal(team, membersCountCell);
    });

    return membersCountCell;
  }

  createActionsCell(team, tr) {
    const actionsCell = document.createElement('td');
    actionsCell.style.textAlign = 'center';
    
    const addButton = document.createElement('button');
    addButton.textContent = '👤 +';
    addButton.title = 'Add Members';
    addButton.classList.add('add-users-button');

    addButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.currentInviteTeamId = team.id;
      this.currentInviteTeamRow = tr;
      await showAddUsersModal(addButton, team, this.userProfile, this.updateTeamRowAfterDelay.bind(this));
    });

    actionsCell.appendChild(addButton);
    return actionsCell;
  }

  async showMembersModal(team, triggerElement) {
    this.membersModal.dataset.teamId = team.id;
    this.membersModal.dataset.removedBy = this.userProfile.name;
    this.membersModal.dataset.currentUserEmail = this.userProfile.email;
    
    await handleModalInteraction(
      triggerElement,
      team.id,
      this.membersModal,
      async () => {
        const members = await getTeamMembers(team.id);
        return {
          modalContent: renderMemberList(members),
          teamName: `Members of ${team.displayName}`,
          members,
        };
      }
    );
  }

  updateCreatedTeamsCount(created) {
    if (created && created !== 'N/A' && created !== 'Invalid Date' && 
        new Date(created) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
      const el = PerformanceOptimizer.getElementById('created-teams-count');
      if (el) {
        el.textContent = (parseInt(el.textContent, 10) || 0) + 1;
      }
    }
  }

  async updateTeamRowAfterDelay() {
    return await ErrorHandler.withErrorHandling(async () => {
      await sleep(5000);

      if (this.currentInviteTeamRow) {
        const currentTeam = this.currentTeams.find((t) => t.id === this.currentInviteTeamId);
        const currentTeamMembers = await getTeamMembers(this.currentInviteTeamId);
        const memberEmails = currentTeamMembers.map((t) => t.email);
        const isMember = memberEmails.includes(this.userProfile.email);

        if (currentTeam) {
          Object.assign(currentTeam, {
            webUrl: currentTeam.webUrl || '',
            created: currentTeam.created || '',
            messageCount: currentTeam.messageCount || 0,
            latestMessage: currentTeam.latestMessage || '-',
            recentCount: currentTeam.recentCount || '0',
            memberCount: memberEmails.length || 0,
            isMember,
          });

          const newRow = this.renderSingleTeamRow(currentTeam);
          this.currentInviteTeamRow.replaceWith(newRow);
        }
      }
    }, 'TeamTable.updateTeamRowAfterDelay');
  }

  renderTable(teams) {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = '';

    teams.forEach((team) => {
      const tr = this.renderSingleTeamRow(team);
      tbody.appendChild(tr);
    });
  }

  toggleSortDirection() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  }

  addSortingToTable(table) {
    const headers = table.querySelectorAll('th[data-sort]');
    headers.forEach((header) => {
      header.addEventListener('click', () => {
        const columnKey = header.getAttribute('data-sort');

        // Clear all sort classes
        headers.forEach((h) => h.classList.remove('sorted-asc', 'sorted-desc'));

        // Sort and toggle direction
        this.currentTeams = sortTable(this.currentTeams, columnKey, this.sortDirection);
        header.classList.add(this.sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        this.renderTable(this.currentTeams);
        this.toggleSortDirection();
      });
    });
  }

  async lazyLoadMessageStats() {
    const rows = document.querySelectorAll('.team-row');
    const teamIds = Array.from(rows).map((row) => row.dataset.teamId);
    const MAX_CONCURRENT = 5;

    const updateRow = (teamId, stats) => {
      const team = this.currentTeams.find((t) => t.id === teamId);
      if (!team || team.messageCount) return;

      const row = Array.from(rows).find((r) => r.dataset.teamId === teamId);
      if (!row) return;

      const msgCountCell = row.querySelector('.msg-count');
      const latestMsgCell = row.querySelector('.latest-msg');
      const recentMsgsCell = row.querySelector('.recent-count');

      team.messageCount = stats?.messageCount;
      team.latestMessage = stats?.latestMessage;
      team.recentCount = stats?.recentCount;

      msgCountCell.textContent = stats?.messageCount ?? '-';
      latestMsgCell.textContent = stats?.latestMessage ?? '-';
      recentMsgsCell.textContent = stats?.recentCount ?? '-';

      if (stats?.recentCount > 0) {
        const el = PerformanceOptimizer.getElementById('active-teams-count');
        if (el) {
          el.textContent = (parseInt(el.textContent, 10) || 0) + 1;
        }
      }
    };

    let index = 0;
    let active = 0;

    return new Promise((resolve) => {
      function next() {
        if (index >= teamIds.length && active === 0) {
          return resolve();
        }

        while (active < MAX_CONCURRENT && index < teamIds.length) {
          const teamId = teamIds[index];
          index += 1;
          active += 1;
          getTeamMessageStats(teamId)
            .then((stats) => updateRow(teamId, stats))
            .catch((err) => {
              console.error(`Error loading team ${teamId}:`, err);
              updateRow(teamId, {
                messageCount: '-',
                latestMessage: '-',
                recentCount: '-',
              });
            })
            .finally(() => {
              active -= 1;
              next();
            });
        }
        return null;
      }

      next();
    });
  }

  initTable(teams) {
    this.currentTeams = [...teams];
    this.teamsContainer.innerHTML = '';

    // Create summary
    const summaryWrapper = document.createElement('div');
    summaryWrapper.classList.add('table-summary-wrapper');

    const summary = document.createElement('div');
    summary.classList.add('table-summary');
    summary.innerHTML = `
      <span>Total Teams: ${escapeHTML(teams.length.toString())}</span> |
      <span>Active Teams (Last 30 days): <span id="active-teams-count">0</span></span> |
      <span>Teams Created (Last 30 days): <span id="created-teams-count">0</span></span>
    `;

    summaryWrapper.appendChild(summary);
    this.teamsContainer.appendChild(summaryWrapper);

    // Create table
    const table = document.createElement('table');
    table.classList.add('styled-table');

    table.innerHTML = `
      <thead>
        <tr>
          <th data-sort="displayName">Team Name</th>
          <th data-sort="isMember" class="member">Are You a Member?</th>
          <th class="description sorting-disabled">Description</th>
          <th data-sort="created" class="created">Created</th>
          <th data-sort="messageCount">Total Messages</th>
          <th data-sort="latestMessage">Last Message</th>
          <th data-sort="recentCount">Messages (Last 30 days)</th>
          <th data-sort="memberCount">Current Members</th>
          <th class="sorting-disabled">Actions</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    this.teamsContainer.appendChild(table);

    // Initial sort and render
    const initialSortKey = 'displayName';
    this.currentTeams = sortTable(teams, initialSortKey, this.sortDirection);
    document.querySelector(`th[data-sort="${initialSortKey}"]`).classList.add('sorted-asc');
    this.renderTable(this.currentTeams);

    // Lazy load message stats and add sorting
    this.lazyLoadMessageStats()
      .then(() => {
        this.addSortingToTable(table);
      })
      .catch((err) => {
        console.error('Error loading message stats:', err);
      });
  }
} 