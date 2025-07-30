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

import { getMessageStats, getMemberIds, getAllSlackChannels } from './api.js';
import getUserProfile from './userProfile.js';
import channelTable, { ChannelTable } from './channelTable.js';
import { API_CONFIG, DEFAULTS, ELEMENT_IDS } from './constants.js';

/**
 * Slack Channel Tracker Application
 * Simplified main application controller
 */
class SlackChannelApp {
  constructor() {
    this.userProfile = null;
    this.channels = [];
    this.isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

    this.init();
  }

  /**
   * Initialize the application
   */
  init() {
    this.setupUserProfile();
    this.setupEventListeners();
    SlackChannelApp.setupSidekickLogout();
  }

  /**
   * Setup user profile for localhost development
   */
  setupUserProfile() {
    if (this.isLocalhost) {
      const params = new URLSearchParams(window.location.search);
      const email = params.get('email');
      const name = params.get('name');

      if (email && name) {
        this.userProfile = { email, name };
      } else {
        // eslint-disable-next-line no-alert
        alert('missing email and name query params for local debug');
      }
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Search button click
    document.getElementById(ELEMENT_IDS.CHANNELISATION)?.addEventListener('click', () => {
      this.startChannelSearch();
    });

    // Enter key search
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.startChannelSearch();
      }
    });
  }

  /**
   * Setup AEM sidekick logout functionality
   */
  static setupSidekickLogout() {
    const doLogout = () => window.location.reload();

    const sk = document.querySelector('aem-sidekick');
    if (sk) {
      sk.addEventListener('logged-out', doLogout);
    } else {
      document.addEventListener('sidekick-ready', () => {
        document.querySelector('aem-sidekick')?.addEventListener('logged-out', doLogout);
      }, { once: true });
    }
  }

  /**
   * Get filter values from form inputs
   */
  static getFilters() {
    const rawChannel = document.getElementById(ELEMENT_IDS.CHANNEL_NAME)?.value.trim() || '';
    const rawDescription = document.getElementById(ELEMENT_IDS.CHANNEL_DESCRIPTION)?.value.trim() || '';

    return {
      channelName: rawChannel === '' || rawChannel === '*' ? undefined : rawChannel,
      description: rawDescription === '' || rawDescription === '*' ? undefined : rawDescription,
    };
  }

  /**
   * Ensure user profile is available
   */
  async ensureUserProfile() {
    if (!this.userProfile) {
      try {
        this.userProfile = await getUserProfile();
      } catch (error) {
        const container = document.getElementById(ELEMENT_IDS.SLACK_CHANNELS_CONTAINER);
        if (container) {
          container.innerHTML = `<p class="error">${DEFAULTS.ERROR_MESSAGES.USER_EMAIL}</p>`;
        }
        throw error;
      }
    }
  }

  /**
   * Fetch and process message statistics
   */
  static async fetchMessageStats(channels) {
    const batchSize = API_CONFIG.BATCH_SIZE;
    let loadedCount = 0;

    // eslint-disable-next-line no-await-in-loop
    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = channels.slice(i, i + batchSize);

      const messagePromises = batch.map((channel) => {
        if (!channel.messages || !channel.engagement || !channel.lstMsgDt) {
          return getMessageStats(channel.id).then((msg) => ({
            channelId: channel.id,
            messages: msg?.totalMessages || 0,
            engagement: msg?.recentMessageCount || 0,
            lstMsgDt: msg?.lastMessageTimestamp
              ? new Date(msg.lastMessageTimestamp * 1000).toISOString().split('T')[0]
              : DEFAULTS.NO_MESSAGES_TEXT,
          }));
        }
        return Promise.resolve({
          channelId: channel.id,
          messages: channel.messages,
          engagement: channel.engagement,
          lstMsgDt: channel.lstMsgDt,
        });
      });

      const memberPromises = batch.map((channel) => {
        if (!channel.membersCount) {
          return getMemberIds(channel.id).then((m) => ({
            channelId: channel.id,
            membersCount: m?.members?.length || 0,
          }));
        }
        return Promise.resolve({
          channelId: channel.id,
          membersCount: channel.membersCount,
        });
      });

      // eslint-disable-next-line no-await-in-loop
      const [messageResults, memberResults] = await Promise.all([
        Promise.all(messagePromises),
        Promise.all(memberPromises),
      ]);

      // Update table with results
      messageResults.forEach(({
        channelId, messages, engagement, lstMsgDt,
      }) => {
        const channel = channels.find((c) => c.id === channelId);
        if (channel) {
          channelTable.updateMessageCells(channel, messages, engagement, lstMsgDt);
        }
      });

      memberResults.forEach(({ channelId, membersCount }) => {
        const channel = channels.find((c) => c.id === channelId);
        if (channel) {
          ChannelTable.updateMembersCountCell(channel, membersCount);
        }
      });

      loadedCount += batch.length;
      ChannelTable.updateProgress(loadedCount, channels.length);
    }

    channelTable.enableSorting();
    ChannelTable.showTableSummary();
  }

  /**
   * Start the channel search and display process
   */
  async startChannelSearch() {
    try {
      await this.ensureUserProfile();

      const filters = SlackChannelApp.getFilters();

      // Show loading state
      channelTable.initTable([]);

      // Fetch channels
      this.channels = await getAllSlackChannels(
        this.userProfile,
        filters.channelName,
        filters.description,
      );

      // Check if we got any channels
      if (!this.channels || this.channels.length === 0) {
        const container = document.getElementById(ELEMENT_IDS.SLACK_CHANNELS_CONTAINER);
        if (container) {
          container.innerHTML = `
            <div class="error-message">
              <h3>No channels found</h3>
              <p>This could be due to:</p>
              <ul>
                <li>No channels matching your search criteria</li>
                <li>API connection issues (check browser console)</li>
                <li>Authentication problems with the Slack API</li>
              </ul>
              <p><small>Check the browser console for more detailed error information.</small></p>
            </div>
          `;
        }
        return;
      }

      // Sort channels alphabetically for predictable loading
      this.channels.sort((a, b) => a.name.localeCompare(b.name));

      // Initialize table with channels
      channelTable.initTable(this.channels);

      // Fetch additional data in batches
      await SlackChannelApp.fetchMessageStats(this.channels);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error in channel search:', error);
      const container = document.getElementById(ELEMENT_IDS.SLACK_CHANNELS_CONTAINER);
      if (container) {
        container.innerHTML = `<p class="error">${DEFAULTS.ERROR_MESSAGES.LOAD_DATA}</p>`;
      }
    }
  }
}

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SlackChannelApp());
} else {
  // eslint-disable-next-line no-new
  new SlackChannelApp();
}
