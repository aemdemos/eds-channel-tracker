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

// API Configuration
export const API_CONFIG = {
  MAX_RETRY_ATTEMPTS: 10,
  DEFAULT_RETRY_DELAY: 1000,
  BATCH_SIZE: 15,
  ENDPOINTS: {
    LOCAL: 'http://localhost:8787',
    PRODUCTION: 'https://eds-slack-channels-worker.chrislotton.workers.dev',
    USER_PROFILE: 'https://admin.hlx.page/status/aemdemos/eds-channel-tracker/main/index.html',
  },
};

// UI Configuration
export const UI_CONFIG = {
  MAX_MESSAGES_COUNT: 10,
  MODAL_MAX_WIDTH: 700,
  MODAL_MAX_HEIGHT: 400,
};

// Slack Configuration
export const SLACK_CONFIG = {
  TEAM_ID: 'T0385CHDU9E',
  LOGO_URL: 'https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png',
  FEEDBACK_CHANNEL: 'C08LDR6NP1V',
  BASE_URL: 'https://adobe-dx-support.enterprise.slack.com',
};

// Table Configuration
export const TABLE_CONFIG = {
  DEFAULT_SORT_DIRECTION: 'asc',
  DEFAULT_SORT_COLUMN: 'name',
  COLUMNS: {
    NAME: 'name',
    DESCRIPTION: 'description',
    CREATED: 'created',
    MESSAGES: 'messages',
    ENGAGEMENT: 'engagement',
    LAST_MESSAGE: 'lstMsgDt',
    MEMBERS_COUNT: 'membersCount',
  },
};

// CSS Classes
export const CSS_CLASSES = {
  MODAL: {
    MODAL: 'modal',
    SHOW: 'show',
    CONTENT: 'modal-content',
    HEADER: 'modal-header',
    BODY: 'modal-body',
    CLOSE_BUTTON: 'modal-close-button',
  },
  TABLE: {
    STYLED_TABLE: 'styled-table',
    SORTED_ASC: 'sorted-asc',
    SORTED_DESC: 'sorted-desc',
    CHANNEL_ROW: 'channel-row',
    STAT_COLUMN: 'stat-column',
    MEMBERS_COUNT: 'members-count',
    TOTAL_MESSAGES: 'total-messages',
    MESSAGES_COUNT: 'messages-count',
    LAST_MESSAGE: 'last-message',
  },
  PROGRESS: {
    CONTAINER: 'progress-container',
    BAR: 'progress-bar',
    FILL: 'progress-fill',
    LABEL: 'progress-label',
  },
  THERMOMETER: {
    THERMOMETER: 'thermometer',
    FILL: 'thermometer-fill',
    LABEL: 'thermometer-label',
  },
};

// Default Values
export const DEFAULTS = {
  CHANNEL_NAME_FILTER: 'aem-',
  DESCRIPTION_FILTER: '*',
  NO_MESSAGES_TEXT: 'No Messages',
  ERROR_MESSAGES: {
    FETCH_MEMBERS: 'Failed to fetch members',
    LOAD_DATA: 'Error loading data',
    USER_EMAIL: 'An error occurred while fetching user email. Please try again later.',
  },
};

// DOM Element IDs
export const ELEMENT_IDS = {
  SLACK_CHANNELS_CONTAINER: 'slack-channels-container',
  CHANNEL_NAME: 'channel-name',
  CHANNEL_DESCRIPTION: 'channel-description',
  CHANNELISATION: 'channelisation',
  MODAL: 'modal',
  SPINNER: 'spinner',
  ACTIVE_CHANNELS_COUNT: 'active-channels-count',
};
