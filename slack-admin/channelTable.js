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

import { getMemberIds } from './api.js';
import { countMembers } from './members.js';
import {
  sortTable,
  alphaSort,
  renderMembersTable,
  handleModalInteraction,
  decodeHTML,
  escapeHTML,
} from './utils.js';
import {
  UI_CONFIG,
  SLACK_CONFIG,
  TABLE_CONFIG,
  CSS_CLASSES,
  ELEMENT_IDS,
} from './constants.js';

/**
 * Channel Table Module
 * Handles rendering and interaction of the Slack channels table
 */
export class ChannelTable {
  constructor() {
    this.sortDirection = TABLE_CONFIG.DEFAULT_SORT_DIRECTION;
    this.activeChannelsCount = 0;
    this.isSortingEnabled = false;
    this.maxMessagesCount = UI_CONFIG.MAX_MESSAGES_COUNT;
    this.slackChannelsContainer = document.getElementById(ELEMENT_IDS.SLACK_CHANNELS_CONTAINER);
  }

  /**
   * Creates a table cell with optional CSS class
   * @param {string} content - Cell content
   * @param {string} className - Optional CSS class
   * @returns {HTMLTableDataCellElement} The created cell
   */
  static createCell(content, className = '') {
    const td = document.createElement('td');
    if (className) td.className = className;
    td.textContent = content;
    return td;
  }

  /**
   * Reattaches modal handlers to member count cells
   */
  static reattachModalHandlers() {
    const modal = document.getElementById(ELEMENT_IDS.MODAL);
    document.querySelectorAll(`.${CSS_CLASSES.TABLE.MEMBERS_COUNT}`).forEach((cell) => {
      const row = cell.closest('tr');
      const channelId = row.getAttribute('data-channel-id');

      if (cell.handlerAttached) return;
      cell.handlerAttached = true;

      cell.addEventListener('click', async (e) => {
        e.stopPropagation();
        const channel = {
          id: channelId,
          name: row.querySelector('td:first-child').textContent,
        };

        await handleModalInteraction(cell, channelId, modal, async (id) => {
          const response = await getMemberIds(id);
          if (!response.ok) throw new Error('Failed to fetch members');
          const { adobeMembers, nonAdobeMembers } = await countMembers(response.members);
          adobeMembers.sort(alphaSort);
          nonAdobeMembers.sort(alphaSort);
          return { modalContent: renderMembersTable(channel.name, adobeMembers, nonAdobeMembers) };
        });
      });
    });
  }

  /**
   * Renders the table body with channel data
   * @param {Array} channels - Array of channel objects
   */
  renderTable(channels) {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = '';

    channels.forEach((channel) => {

      const tr = document.createElement('tr');
      tr.classList.add(CSS_CLASSES.TABLE.CHANNEL_ROW);
      tr.setAttribute('data-channel-id', channel.id);

      // Channel name cell with Slack link
      const nameCell = document.createElement('td');
      const link = document.createElement('a');
      link.href = `slack://channel?team=${SLACK_CONFIG.TEAM_ID}&id=${channel.id}`;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = channel.name;
      link.title = 'View channel';
      nameCell.appendChild(link);

      // Purpose/Description cell
      const purposeText = decodeHTML(channel.purpose?.value || '');
      const purposeCell = ChannelTable.createCell(purposeText, 'description');
      // Created date cell
      const createdDate = new Date(channel.created * 1000).toISOString().split('T')[0];
      const createdCell = ChannelTable.createCell(createdDate, CSS_CLASSES.TABLE.STAT_COLUMN);

      // Total messages cell
      const messagesCell = ChannelTable.createCell(
        channel.messages ?? '',
        `${CSS_CLASSES.TABLE.STAT_COLUMN} ${CSS_CLASSES.TABLE.TOTAL_MESSAGES}`,
      );

      // Engagement thermometer cell
      const thermometerCell = document.createElement('td');
      thermometerCell.className = `${CSS_CLASSES.TABLE.STAT_COLUMN} ${CSS_CLASSES.TABLE.MESSAGES_COUNT}`;
      const thermometer = document.createElement('div');
      thermometer.className = CSS_CLASSES.THERMOMETER.THERMOMETER;
      const fill = document.createElement('div');
      fill.className = CSS_CLASSES.THERMOMETER.FILL;
      const label = document.createElement('div');
      label.className = CSS_CLASSES.THERMOMETER.LABEL;
      const fillPercentage = Math.min((channel.engagement / this.maxMessagesCount) * 100, 100);
      fill.style.width = `${fillPercentage}%`;
      label.textContent = channel.engagement ?? '';
      thermometer.append(fill, label);
      thermometerCell.appendChild(thermometer);

      // Last message cell
      const lastMessageCell = ChannelTable.createCell(
        channel.lstMsgDt || '',
        `${CSS_CLASSES.TABLE.STAT_COLUMN} ${CSS_CLASSES.TABLE.LAST_MESSAGE}`,
      );

      // Members count cell
      const membersCountCell = ChannelTable.createCell(
        channel.membersCount ?? '',
        `${CSS_CLASSES.TABLE.STAT_COLUMN} ${CSS_CLASSES.TABLE.MEMBERS_COUNT}`,
      );
      membersCountCell.title = 'View members';

      tr.append(
        nameCell,
        purposeCell,
        createdCell,
        messagesCell,
        thermometerCell,
        lastMessageCell,
        membersCountCell,
      );
      tbody.appendChild(tr);
    });

    ChannelTable.reattachModalHandlers();
  }

  /**
   * Toggles the sort direction between ascending and descending
   */
  toggleSortDirection() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  }

  /**
   * Adds sorting functionality to table headers
   * @param {HTMLTableElement} table - The table element
   * @param {Array} channels - Array of channel objects
   */
  addSortingToTable(table, channels) {
    const headers = table.querySelectorAll('th[data-sort]');
    headers.forEach((header) => {
      header.addEventListener('click', () => {
        if (!this.isSortingEnabled) return;

        const columnKey = header.getAttribute('data-sort');
        // Remove sort classes from all headers
        headers.forEach((h) => h.classList.remove(
          CSS_CLASSES.TABLE.SORTED_ASC,
          CSS_CLASSES.TABLE.SORTED_DESC,
        ));

        // Sort data
        const sortedData = sortTable(channels, columnKey, this.sortDirection);

        // Add the appropriate arrow class
        header.classList.add(
          this.sortDirection === 'asc'
            ? CSS_CLASSES.TABLE.SORTED_ASC
            : CSS_CLASSES.TABLE.SORTED_DESC,
        );

        this.renderTable(sortedData);
        this.toggleSortDirection();
      });
    });
  }

  /**
   * Initializes the table with channels data
   * @param {Array} channels - Array of channel objects
   */
  initTable(channels) {
    this.slackChannelsContainer.innerHTML = '';
    this.activeChannelsCount = 0;

    // Create summary wrapper
    const summaryWrapper = document.createElement('div');
    summaryWrapper.classList.add('table-summary-wrapper');

    // Create progress bar container
    const progressBarContainer = document.createElement('div');
    progressBarContainer.classList.add(CSS_CLASSES.PROGRESS.CONTAINER);
    progressBarContainer.innerHTML = `
      <div class="${CSS_CLASSES.PROGRESS.BAR}">
        <div class="${CSS_CLASSES.PROGRESS.FILL}" style="width: 0"></div>
      </div>
      <div class="${CSS_CLASSES.PROGRESS.LABEL}">Analyzing 0 of ${escapeHTML(channels.length.toString())} channels…</div>
    `;

    // Create summary section
    const summary = document.createElement('div');
    summary.classList.add('table-summary');
    summary.style.display = 'none';
    summary.innerHTML = `
      <span>Total Channels: ${escapeHTML(channels.length.toString())}</span> |
      <span>Active Channels (Last 30 days): <span id="${ELEMENT_IDS.ACTIVE_CHANNELS_COUNT}">0</span></span>
    `;

    summaryWrapper.appendChild(progressBarContainer);
    summaryWrapper.appendChild(summary);
    this.slackChannelsContainer.appendChild(summaryWrapper);

    // Create table structure
    const table = document.createElement('table');
    table.classList.add(CSS_CLASSES.TABLE.STYLED_TABLE);

    table.innerHTML = `
      <thead>
        <tr>
          <th data-sort="${TABLE_CONFIG.COLUMNS.NAME}">Name</th>
          <th class="sorting-disabled">Description</th>
          <th data-sort="${TABLE_CONFIG.COLUMNS.CREATED}">Created</th>
          <th data-sort="${TABLE_CONFIG.COLUMNS.MESSAGES}">Total Messages</th>
          <th data-sort="${TABLE_CONFIG.COLUMNS.ENGAGEMENT}">
            Messages <span class="tooltip-container">(Last 30 days)</span>
          </th>
          <th data-sort="${TABLE_CONFIG.COLUMNS.LAST_MESSAGE}">Last Message</th>
          <th data-sort="${TABLE_CONFIG.COLUMNS.MEMBERS_COUNT}">Members</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    this.addSortingToTable(table, channels);
    this.slackChannelsContainer.appendChild(table);

    // Apply initial sorting
    const initialSortKey = TABLE_CONFIG.DEFAULT_SORT_COLUMN;
    const sortedChannels = sortTable(channels, initialSortKey, this.sortDirection);
    document.querySelector(`th[data-sort="${initialSortKey}"]`).classList.add(CSS_CLASSES.TABLE.SORTED_ASC);
    this.renderTable(sortedChannels);
    this.toggleSortDirection();

    // Render initial data
    this.renderTable(channels);
  }

  /**
   * Updates message-related cells for a specific channel
   * @param {Object} channel - Channel object
   * @param {number} messages - Total messages count
   * @param {number} engagement - Recent messages count
   * @param {string} lstMsgDt - Last message date
   */
  updateMessageCells(channel, messages, engagement, lstMsgDt) {
    const row = document.querySelector(`tr[data-channel-id="${channel.id}"]`);
    if (!row) return;

    row.querySelector(`.${CSS_CLASSES.TABLE.TOTAL_MESSAGES}`).textContent = messages.toString();

    const engagementCell = row.querySelector(`.${CSS_CLASSES.TABLE.MESSAGES_COUNT}`);
    engagementCell.querySelector(`.${CSS_CLASSES.THERMOMETER.LABEL}`).textContent = engagement.toString();
    const fillPercentage = Math.min((engagement / this.maxMessagesCount) * 100, 100);
    engagementCell.querySelector(`.${CSS_CLASSES.THERMOMETER.FILL}`).style.width = `${fillPercentage}%`;

    row.querySelector(`.${CSS_CLASSES.TABLE.LAST_MESSAGE}`).textContent = lstMsgDt;

    if (engagement > 0) {
      this.activeChannelsCount += 1;
      const activeCountElement = document.getElementById(ELEMENT_IDS.ACTIVE_CHANNELS_COUNT);
      if (activeCountElement) {
        activeCountElement.textContent = this.activeChannelsCount;
      }
    }

    // Update channel object
    channel.messages = messages;
    channel.engagement = engagement;
    channel.lstMsgDt = lstMsgDt;
  }

  /**
   * Updates members count cell for a specific channel
   * @param {Object} channel - Channel object
   * @param {number} membersCount - Members count
   */
  static updateMembersCountCell(channel, membersCount) {
    const row = document.querySelector(`tr[data-channel-id="${channel.id}"]`);
    if (!row) return;

    const membersCountCell = row.querySelector(`.${CSS_CLASSES.TABLE.MEMBERS_COUNT}`);
    membersCountCell.textContent = membersCount.toString();
    channel.membersCount = membersCount;
    membersCountCell.fetched = false;
    membersCountCell.modalData = null;

    const modal = document.getElementById(ELEMENT_IDS.MODAL);

    membersCountCell.addEventListener('click', async (e) => {
      e.stopPropagation();
      await handleModalInteraction(membersCountCell, channel.id, modal, async (id) => {
        const response = await getMemberIds(id);
        if (!response.ok) throw new Error('Failed to fetch members');

        const { adobeMembers, nonAdobeMembers } = await countMembers(response.members);
        adobeMembers.sort(alphaSort);
        nonAdobeMembers.sort(alphaSort);
        return { modalContent: renderMembersTable(channel.name, adobeMembers, nonAdobeMembers) };
      });
    });
  }

  /**
   * Enables sorting functionality for the table
   */
  enableSorting() {
    this.isSortingEnabled = true;
  }

  /**
   * Hides the progress bar and shows the summary
   */
  static showTableSummary() {
    document.querySelector(`.${CSS_CLASSES.PROGRESS.CONTAINER}`).style.display = 'none';
    document.querySelector('.table-summary').style.display = 'block';
  }

  /**
   * Updates the progress bar
   * @param {number} loaded - Number of loaded items
   * @param {number} total - Total number of items
   */
  static updateProgress(loaded, total) {
    const progressLabel = document.querySelector(`.${CSS_CLASSES.PROGRESS.LABEL}`);
    const progressFill = document.querySelector(`.${CSS_CLASSES.PROGRESS.FILL}`);

    const percentage = Math.min((loaded / total) * 100, 100);
    progressFill.style.width = `${percentage}%`;
    progressLabel.textContent = `Analyzing ${loaded} of ${total} channels…`;
  }
}

// Export a default instance for backwards compatibility
export default new ChannelTable();
