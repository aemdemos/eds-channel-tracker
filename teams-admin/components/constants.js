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

const CONSTANTS = {
  // UI Constants
  MAX_CONCURRENT_REQUESTS: 5,
  BATCH_SIZE: 5,
  UPDATE_DELAY_MS: 5000,
  THROTTLE_DELAY_MS: 16, // ~60fps
  DEBOUNCE_DELAY_MS: 300,

  // Time Constants
  THIRTY_DAYS_MS: 30 * 24 * 60 * 60 * 1000,

  // Element IDs
  ELEMENT_IDS: {
    TEAMS_CONTAINER: 'teams-container',
    MEMBERS_MODAL: 'members-modal',
    ADD_USERS_MODAL: 'add-users-modal',
    CREATE_TEAM_MODAL: 'create-team-modal',
    SUCCESS_MODAL_OVERLAY: 'success-modal-overlay',
    CREATED_TEAMS_COUNT: 'created-teams-count',
    ACTIVE_TEAMS_COUNT: 'active-teams-count',
    TEAM_NAME_INPUT: 'team-name',
    TEAM_DESCRIPTION_INPUT: 'team-description',
    TEAMS_BUTTON: 'teams',
    CREATE_TEAM_BTN: 'create-team-btn',
    PROGRESS_CONTAINER: 'progress-container',
    PROGRESS_BAR: 'progress-bar',
    PROGRESS_FILL: 'progress-fill',
    PROGRESS_LABEL: 'progress-label',
  },

  // CSS Classes
  CSS_CLASSES: {
    HIDDEN: 'hidden',
    NOBREAK: 'nobreak',
    ERROR: 'error',
    SPINNER: 'spinner',
    STYLED_TABLE: 'styled-table',
    TEAM_ROW: 'team-row',
    NAME_COLUMN: 'name-column',
    MEMBER_COLUMN: 'member-column',
    MEMBERS_COUNT_CELL: 'members-count-cell',
    ADD_USERS_BUTTON: 'add-users-button',
    SORTED_ASC: 'sorted-asc',
    SORTED_DESC: 'sorted-desc',
    SHOW: 'show',
    VISIBLE: 'visible',
  },

  // Default Values
  DEFAULTS: {
    SORT_DIRECTION: 'asc',
    SORT_COLUMN: 'displayName',
    TEAM_NAME_PREFIX: 'aem-',
    WILDCARD: '*',
    PLACEHOLDER_TEXT: '—',
    DESCRIPTION_TEMPLATE: 'Collaboration channel for <COMPANY_NAME> and Adobe, focused on Edge Delivery Services',
  },

  // Messages
  MESSAGES: {
    NO_TEAMS: 'It appears that you are not a member of the Adobe Enterprise Support Teams Organization. Please click here to receive an invitation. Once you accept the invitation, you will be able to run queries.',
    INVITATION_SUCCESS: 'Invitation sent successfully! Please check your email.',
    INVITATION_FAILED: 'Failed to send the invitation. Please try again.',
    INVITATION_ERROR: 'An error occurred while sending the invitation.',
    LOADING_TEAMS: 'Analyzing teams...',
    FAILED_TO_ADD_MEMBERS: 'Failed to add members. Please try again.',
    MEMBER_ADDED_SUCCESS: 'member added successfully',
    MEMBERS_ADDED_SUCCESS: 'members added successfully',
    TEAM_CREATED_SUCCESS: 'Team created successfully!',
    MISSING_PARAMS: 'missing email and name query params for local debug',
    USER_PROFILE_ERROR: 'An error occurred while fetching user email. Please try again later.',
    NETWORK_ERROR: 'An error occurred while searching teams. Please try again later.',
  },

  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
  },

  // Local Storage Keys
  STORAGE_KEYS: {
    USER_PROFILE: 'teams_admin_user_profile',
    PREFERENCES: 'teams_admin_preferences',
    CACHED_TEAMS: 'teams_admin_cached_teams',
  },

  // Validation Patterns
  VALIDATION: {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    TEAM_NAME_MIN_LENGTH: 3,
    DESCRIPTION_MAX_LENGTH: 500,
  },
};

// Note: CONSTANTS available for use throughout the application
// TODO: Export and use these constants to replace hardcoded strings

export default CONSTANTS;
