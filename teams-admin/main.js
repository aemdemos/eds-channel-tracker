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

import { ApplicationSetup } from './components/applicationSetup.js';
import { TeamTable } from './components/teamTable.js';
import { TeamSearch } from './components/teamSearch.js';
import { setupCreateTeamButton } from './components/teamForms.js';
import './members.js'; // Import to ensure global event listeners are attached

class TeamsAdminApp {
  constructor() {
    this.appSetup = new ApplicationSetup();
    this.teamTable = null;
    this.teamSearch = new TeamSearch();
    this.userProfile = null;
  }

  async initialize() {
    try {
      // Initialize application
      this.userProfile = await this.appSetup.initialize();

      // Initialize team table with user profile
      this.teamTable = new TeamTable(this.userProfile);

      // Setup search functionality
      this.teamSearch.setupEventListeners(async () => {
        const userProfile = await this.appSetup.getUserProfile();
        await this.teamSearch.performSearch(userProfile, (teams) => {
          this.teamTable.initTable(teams);
        });
      });

      // Setup create team button
      setupCreateTeamButton(this.userProfile);
    } catch (error) { /* empty */ }
  }
}

// Initialize the application when the page loads
const app = new TeamsAdminApp();
app.initialize();
