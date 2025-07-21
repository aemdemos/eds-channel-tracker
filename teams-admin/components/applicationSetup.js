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

import getUserProfile from '../userProfile.js';
import { setupModalDrag } from '../modal.js';

export class ApplicationSetup {
  constructor() {
    this.userProfile = null;
    this.isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    this.params = new URLSearchParams(window.location.search);
  }

  async initializeUserProfile() {
    // If running on localhost, fetch userProfile from query params
    if (this.isLocalhost) {
      const email = this.params.get('email');
      const name = this.params.get('name');

      if (email && name) {
        this.userProfile = { email, name };
      } else {
        alert('missing email and name query params for local debug');
      }
    }

    return this.userProfile;
  }

  async ensureUserProfile() {
    if (!this.userProfile) {
      try {
        this.userProfile = await getUserProfile();
      } catch (error) {
        const teamsContainer = document.getElementById('teams-container');
        teamsContainer.innerHTML = '<p class="error">An error occurred while fetching user email. Please try again later.</p>';
        throw error;
      }
    }
    return this.userProfile;
  }

  setupCreateTeamButton() {
    const createTeams = this.params.get('createTeams');
    
    if (createTeams === 'true' || this.isLocalhost) {
      document.getElementById('create-team-btn').classList.remove('hidden');
    }
  }

  setupSidekickListeners() {
    const doReload = () => window.location.reload();
    const sk = document.querySelector('aem-sidekick');

    if (sk) {
      sk.addEventListener('logged-out', doReload);
      sk.addEventListener('logged-in', doReload);
    } else {
      document.addEventListener('sidekick-ready', () => {
        const sidekick = document.querySelector('aem-sidekick');
        if (sidekick) {
          sidekick.addEventListener('logged-out', doReload);
          sidekick.addEventListener('logged-in', doReload);
        }
      }, { once: true });
    }
  }

  setupModalElements() {
    const membersModal = document.getElementById('members-modal');
    const addUsersModal = document.getElementById('add-users-modal');
    const createTeamModal = document.getElementById('create-team-modal');

    document.addEventListener('DOMContentLoaded', () => {
      if (membersModal) setupModalDrag(membersModal);
      if (addUsersModal) setupModalDrag(addUsersModal);
      if (createTeamModal) setupModalDrag(createTeamModal);
    });
  }

  setupGlobalKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const membersModal = document.getElementById('members-modal');
        const addUsersModal = document.getElementById('add-users-modal');
        const createTeamModal = document.getElementById('create-team-modal');
        
        membersModal.style.display = 'none';
        addUsersModal.style.display = 'none';
        createTeamModal.style.display = 'none';
      }
    });
  }

  setupSuccessModalListeners() {
    document.getElementById('success-modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        const addUsersModal = document.getElementById('add-users-modal');
        addUsersModal.style.display = 'none';
      }
    });
  }

  async initialize() {
    // Initialize user profile
    await this.initializeUserProfile();
    
    // Setup UI elements
    this.setupCreateTeamButton();
    this.setupSidekickListeners();
    this.setupModalElements();
    this.setupGlobalKeyboardListeners();
    this.setupSuccessModalListeners();

    return this.userProfile;
  }

  async getUserProfile() {
    return await this.ensureUserProfile();
  }
} 