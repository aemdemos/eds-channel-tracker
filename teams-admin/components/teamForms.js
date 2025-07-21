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
import { addMembersToTeam } from '../api.js';
import { escapeHTML } from '../utils.js';
import { 
  handleModalInteraction, 
  showSpinner, 
  hideSpinner, 
  wrapWithCloseButton,
  showModal,
  hideModal,
  showSuccessModal 
} from '../modal.js';

export class TeamForms {
  constructor() {
    this.createTeamModal = document.getElementById('create-team-modal');
    this.addUsersModal = document.getElementById('add-users-modal');
  }

  showCreateTeamModal(userProfile) {
    const formHtml = this.generateCreateTeamFormHtml();
    const modalContent = wrapWithCloseButton(
      formHtml,
      () => hideModal(this.createTeamModal),
      'Create New Team',
    );

    this.createTeamModal.innerHTML = '';
    this.createTeamModal.appendChild(modalContent);
    showModal(this.createTeamModal);

    this.setupCreateTeamFormHandlers(userProfile);
  }

  generateCreateTeamFormHtml() {
    return `
      <form id="create-team-form">
        <label for="new-team-name">Team Name</label>
        <input type="text" id="new-team-name" name="team-name" value="aem-" required />
        <label for="new-company-name">Company Name</label>
        <input type="text" id="new-company-name" />
        <label for="new-team-description">Description</label>
        <textarea id="new-team-description" name="description" rows="3" required
           style="width:100%;resize:vertical;font-size:15px;padding:8px 10px;margin-bottom:18px;">Collaboration channel for <COMPANY_NAME> and Adobe, focused on Edge Delivery Services</textarea>
        <div class="button-wrapper" style="margin-top: 1em;">
          <button type="submit" class="button">Submit</button>
        </div>
      </form>
      <div id="create-team-error" style="color: red; margin-top: 10px; display: none;"></div>
      <span class="spinner" style="display:none"></span>
    `;
  }

  setupCreateTeamFormHandlers(userProfile) {
    const companyInput = this.createTeamModal.querySelector('#new-company-name');
    const descriptionInput = this.createTeamModal.querySelector('#new-team-description');
    const createTeamForm = this.createTeamModal.querySelector('#create-team-form');

    let userHasEditedDescription = false;

    // Description auto-fill based on company name
    descriptionInput.addEventListener('input', () => {
      userHasEditedDescription = true;
    });

    companyInput.addEventListener('input', () => {
      const company = companyInput.value.trim();
      const defaultTemplate = `Collaboration channel for ${company || '<COMPANY_NAME>'} and Adobe, focused on Edge Delivery Services`;
      
      if (!userHasEditedDescription || descriptionInput.value.includes('<COMPANY_NAME>')) {
        descriptionInput.value = defaultTemplate;
        userHasEditedDescription = false;
      }
    });

    // Form submission
    createTeamForm.addEventListener('submit', async (e) => {
      await this.handleCreateTeamSubmit(e, userProfile);
    });
  }

  async handleCreateTeamSubmit(e, userProfile) {
    e.preventDefault();
    
    const form = e.target;
    const errorDiv = this.createTeamModal.querySelector('#create-team-error');
    const fields = form.querySelectorAll('input, textarea, button');

    // Ensure user profile
    if (!userProfile) {
      errorDiv.textContent = 'An error occurred while fetching your user profile. Please try again later.';
      errorDiv.style.display = 'block';
      return;
    }

    // Disable form
    fields.forEach((field) => { field.disabled = true; });
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
    showSpinner(this.createTeamModal);

    const name = form.querySelector('#new-team-name').value.trim();
    const description = form.querySelector('#new-team-description').value.trim();
    const createdBy = userProfile.name || userProfile.email;

    try {
      const response = await fetch(`${API_ENDPOINT}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createdBy, name, description }),
      });

      if (response.ok) {
        hideSpinner(this.createTeamModal);
        this.createTeamModal.classList.remove('show');
        this.createTeamModal.style.display = 'none';
        showSuccessModal(`Team <b>${escapeHTML(name)}</b> created successfully!`);
      } else {
        const errorText = await response.text();
        hideSpinner(this.createTeamModal);
        errorDiv.textContent = `Error creating team: ${errorText}`;
        errorDiv.style.display = 'block';
        fields.forEach((field) => { field.disabled = false; });
      }
    } catch (err) {
      hideSpinner(this.createTeamModal);
      errorDiv.textContent = `Error creating team: ${err.message}`;
      errorDiv.style.display = 'block';
      fields.forEach((field) => { field.disabled = false; });
    }
  }

  generateAddUsersFormHtml() {
    return `
      <form id="add-users-form">
        <div id="user-rows-container">
          <div class="user-row">
            <input type="text" name="displayName" placeholder="Display Name" required>
            <input type="email" name="email" placeholder="Email" required>
            <button type="button" class="remove-row" title="Remove">−</button>
          </div>
        </div>
        <button type="button" id="add-row-button">+ Add Row</button>
        <div class="button-wrapper" style="margin-top: 1em;">
          <button type="submit" class="button">Submit</button>
        </div>
      </form>
      <div id="add-users-error" style="color: red; margin-top: 10px; display: none;"></div>
      <span class="spinner" style="display:none"></span>
    `;
  }

  setupAddUsersFormHandlers(team, userProfile, updateTeamRowCallback) {
    const form = this.addUsersModal.querySelector('#add-users-form');
    const container = this.addUsersModal.querySelector('#user-rows-container');
    const addRowBtn = this.addUsersModal.querySelector('#add-row-button');
    const submitButton = this.addUsersModal.querySelector('.button-wrapper .button');
    const spinner = this.addUsersModal.querySelector('.spinner');
    const errorDiv = this.addUsersModal.querySelector('#add-users-error');

    // Add row handler
    addRowBtn.addEventListener('click', () => {
      const userRow = document.createElement('div');
      userRow.classList.add('user-row');
      userRow.innerHTML = `
        <input type="text" name="displayName" placeholder="Display Name" required>
        <input type="email" name="email" placeholder="Email" required>
        <button type="button" class="remove-row" title="Remove">−</button>
      `;
      container.appendChild(userRow);
    });

    // Remove row handler
    container.addEventListener('click', (event) => {
      if (event.target.classList.contains('remove-row')) {
        event.target.closest('.user-row').remove();
      }
    });

    // Form submit handler
    form.addEventListener('submit', async (event) => {
      await this.handleAddUsersSubmit(event, team, userProfile, container, form, spinner, errorDiv, updateTeamRowCallback);
    });
  }

  async handleAddUsersSubmit(event, team, userProfile, container, form, spinner, errorDiv, updateTeamRowCallback) {
    event.preventDefault();
    
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
    
    const rows = container.querySelectorAll('.user-row');
    const users = Array.from(rows).map((row) => ({
      displayName: row.querySelector('input[name="displayName"]').value.trim(),
      email: row.querySelector('input[name="email"]').value.trim(),
    }));

    try {
      // Show spinner and disable submit button
      spinner.style.display = 'block';
      form.style.display = 'none';

      const addedBy = userProfile.name || userProfile.email;
      const result = await addMembersToTeam(team.id, users, addedBy);
      const addedCount = result.filter((user) => user.added).length;

      spinner.style.display = 'none';
      form.style.display = 'flex';

      // Reset form
      this.resetAddUsersForm(container);

      // Close the modal
      this.addUsersModal.classList.remove('show');
      this.addUsersModal.style.display = 'none';

      showSuccessModal(`Added ${addedCount} member${addedCount !== 1 ? 's' : ''} to  <b> ${escapeHTML(team.displayName)}</b><br>If a member is new to the organization, they must accept the email invitation sent to them before they can access the team. Please allow a few minutes for the updates to take effect. A refresh of the page may be required.`);

      if (updateTeamRowCallback) {
        await updateTeamRowCallback();
      }
    } catch (err) {
      spinner.style.display = 'none';
      form.style.display = 'flex';
      errorDiv.textContent = 'Failed to add members. Please try again.';
      errorDiv.style.display = 'block';
    }
  }

  resetAddUsersForm(container) {
    container.innerHTML = '';
    const row = document.createElement('div');
    row.classList.add('user-row');
    row.innerHTML = `
      <input type="text" name="displayName" placeholder="Display Name" required>
      <input type="email" name="email" placeholder="Email" required>
      <button type="button" class="remove-row" title="Remove">−</button>
    `;
    container.appendChild(row);
  }
}

// Convenience function for use in other modules
export async function showAddUsersModal(triggerElement, team, userProfile, updateTeamRowCallback) {
  const teamForms = new TeamForms();
  
  await handleModalInteraction(
    triggerElement,
    team.id,
    teamForms.addUsersModal,
    async () => ({
      modalContent: teamForms.generateAddUsersFormHtml(),
      teamName: `Add members to ${team.displayName}`,
    }),
  );

  const firstInput = teamForms.addUsersModal.querySelector('input[name="displayName"]');
  if (firstInput) firstInput.focus();

  teamForms.setupAddUsersFormHandlers(team, userProfile, updateTeamRowCallback);
}

export function setupCreateTeamButton(userProfile) {
  const createTeamBtn = document.getElementById('create-team-btn');
  const teamForms = new TeamForms();
  
  createTeamBtn.addEventListener('click', () => {
    teamForms.showCreateTeamModal(userProfile);
  });
} 