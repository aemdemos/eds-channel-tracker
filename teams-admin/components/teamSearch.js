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

import API_ENDPOINT from '../config.js';
import {
  getMyTeams,
  getFilteredTeams,
  getTeamSummaries,
} from '../api.js';
import { showSuccessModal } from '../modal.js';
import ErrorHandler from './errorHandler.js';

class TeamSearch {
  constructor() {
    this.searchButton = document.getElementById('teams');
    this.teamNameInput = document.getElementById('team-name');
    this.teamDescriptionInput = document.getElementById('team-description');
    this.teamsContainer = document.getElementById('teams-container');
    this.progressContainer = document.getElementById('progress-container');
    this.progressBar = document.getElementById('progress-bar');
    this.progressFill = document.getElementById('progress-fill');
    this.progressLabel = document.getElementById('progress-label');
    this.spinner = document.querySelector('._spinner');
  }

  setupEventListeners(searchCallback) {
    // Search button click
    this.searchButton.addEventListener('click', async () => {
      await searchCallback();
    });

    // Enter key on input fields
    [this.teamNameInput, this.teamDescriptionInput].forEach((input) => {
      input.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter') {
          await searchCallback();
        }
      });
    });
  }

  getSearchFilters() {
    const rawName = this.teamNameInput.value.trim();
    const rawDescription = this.teamDescriptionInput.value.trim();

    return {
      nameFilter: rawName === '' || rawName === '*' ? undefined : rawName,
      descriptionFilter: rawDescription === '' || rawDescription === '*' ? undefined : rawDescription,
    };
  }

  showProgress() {
    this.progressContainer.style.display = 'block';
    this.progressLabel.innerHTML = '';
    this.progressBar.style.display = 'none';
    this.teamsContainer.innerHTML = '';
  }

  updateProgress(loaded, total) {
    const percent = Math.round((loaded / total) * 100);
    this.progressFill.style.width = `${percent}%`;

    // Show progress bar, hide spinner once loading begins
    this.spinner.style.display = 'none';
    this.progressBar.style.display = 'block';
    this.progressLabel.textContent = `Analyzing ${loaded} of ${total} teams...`;
  }

  hideProgress() {
    this.progressContainer.style.display = 'none';
    document.getElementById('progress').style.display = 'none';
  }

  enableSearchButton() {
    this.searchButton.disabled = false;
  }

  disableSearchButton() {
    this.searchButton.disabled = true;
  }

  showSpinner() {
    this.spinner.style.display = 'block';
  }

  async checkUserAccess(userProfile) {
    const myTeams = await getMyTeams(userProfile.email);

    if (myTeams.length === 0) {
      this.showNoAccessMessage(userProfile);
      return false;
    }

    return myTeams;
  }

  showNoAccessMessage(userProfile) {
    this.teamsContainer.innerHTML = `
      <div class="no-teams-message">
        <p>
          <span class="no-teams-icon">🚫</span>
          It appears that you are not a member of the Adobe Enterprise Support Teams Organization. 
          Please click <a href="#" id="send-invitation-link">here</a> to receive an invitation. 
          Once you accept the invitation, you will be able to run queries.
        </p>
      </div>
    `;

    TeamSearch.setupInvitationLink(userProfile);
  }

  static setupInvitationLink(userProfile) {
    const invitationLink = document.getElementById('send-invitation-link');
    if (!invitationLink) return;
    invitationLink.addEventListener('click', async (event) => {
      event.preventDefault();

      try {
        const url = new URL(`${API_ENDPOINT}/users/invitation`);
        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userProfile?.email || '',
            name: userProfile?.name || '',
          }),
        });

        if (response.ok) {
          showSuccessModal('Invitation sent successfully! Please check your email.');
        } else {
          ErrorHandler.displayUserError('Failed to send the invitation. Please try again.');
        }
      } catch (error) {
        ErrorHandler.displayUserError('An error occurred while sending the invitation.');
      }
    });
  }

  async loadTeamData(userProfile, myTeams) {
    const { nameFilter, descriptionFilter } = this.getSearchFilters();

    let teams = await getFilteredTeams(userProfile, nameFilter, descriptionFilter);
    teams = teams.filter((team) => team && typeof team === 'object');

    // Update isMember status
    const myTeamIds = myTeams.map((myTeam) => myTeam.id);
    teams.forEach((t) => {
      t.isMember = myTeamIds.includes(t.id);
    });

    return teams;
  }

  async loadTeamSummaries(teams) {
    const teamIds = teams.map((team) => team.id);
    const totalTeams = teamIds.length;

    // Chunk team IDs for batch processing
    const chunkedTeamIds = [];
    for (let i = 0; i < totalTeams; i += 5) {
      chunkedTeamIds.push(teamIds.slice(i, i + 5));
    }

    const teamSummaries = [];
    let loaded = 0;

    await Promise.all(
      chunkedTeamIds.map(async (chunk) => {
        try {
          const summaries = await getTeamSummaries(chunk);
          teamSummaries.push(...summaries);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Error loading team summaries:', err);
        }

        loaded += chunk.length;
        this.updateProgress(loaded, totalTeams);
      }),
    );

    return teamSummaries;
  } // Fixed: close loadTeamSummaries method

  static combineTeamsWithSummaries(teams, teamSummaries) {
    return teams.map((team) => {
      const teamSummary = teamSummaries.find((summary) => summary.teamId === team.id);
      return {
        ...team,
        webUrl: teamSummary?.webUrl || '',
        created: teamSummary?.created || '',
        memberCount: teamSummary?.memberCount || 0,
        description: teamSummary?.description,
        isMember: team.isMember || false,
      };
    });
  }

  async performSearch(userProfile, initTableCallback) {
    this.disableSearchButton();

    try {
      // Check user access
      const myTeams = await this.checkUserAccess(userProfile);
      if (!myTeams) {
        this.enableSearchButton();
        return;
      }

      // Show progress and load teams
      this.showProgress();
      this.showSpinner();

      const teams = await this.loadTeamData(userProfile, myTeams);
      const teamSummaries = await this.loadTeamSummaries(teams);

      // Hide progress
      this.hideProgress();

      // Combine data and initialize table
      const combinedTeams = TeamSearch.combineTeamsWithSummaries(teams, teamSummaries);
      this.teamsContainer.innerHTML = '';
      initTableCallback(combinedTeams);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Search error:', error);
      this.teamsContainer.innerHTML = '<p class="error">An error occurred while searching teams. Please try again later.</p>';
    } finally {
      this.enableSearchButton();
    }
  }
}

export default TeamSearch;
