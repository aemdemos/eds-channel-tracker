import { removeMemberFromTeam } from './api.js';

export function updateTeamRowMemberCount(teamId) {
  const row = document.querySelector(`.team-row[data-team-id="${teamId}"]`);
  if (!row) return;

  const membersCountCell = row.querySelector('.members-count-cell');
  if (!membersCountCell) return;

  // Get the number from the current members list in the modal
  const membersList = document.querySelector('#members-modal ul');
  const newCount = membersList ? membersList.querySelectorAll('li').length : 0;

  // Update the count displayed in the table cell
  const link = membersCountCell.querySelector('a');
  if (link) {
    link.textContent = newCount.toString();
  }
}

export function updateIsMemberBadge(teamId, isMember) {
  const row = document.querySelector(`.team-row[data-team-id="${teamId}"]`);
  if (!row) return;

  const memberCell = row.querySelector('.member-column');
  if (!memberCell) return;

  // Clear existing content
  memberCell.innerHTML = '';

  if (isMember) {
    // Add checkmark badge if still a member
    memberCell.innerHTML = `
      <svg viewBox="0 0 20 20" width="18" height="18" xmlns="http://www.w3.org/2000/svg" class="checkmark-badge">
        <rect width="20" height="20" rx="4" fill="#22c55e"/>
        <path d="M6 10.5l2.5 2.5L14 8" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }
}

export default function renderMemberList(members) {
  // Sort the members array by displayName (alphabetically)
  const sortedMembers = [...members].sort((a, b) => {
    const valA = a.displayName.toLowerCase();
    const valB = b.displayName.toLowerCase();

    if (valA < valB) return -1;
    if (valA > valB) return 1;
    return 0;
  });

  // Render the sorted list
  return `
    <ul style="list-style: none; padding: 0; margin: 0; max-height: 300px; overflow-y: auto;">
      ${sortedMembers.map((m) => `
        <li style="padding: 6px 0; border-bottom: 1px solid #eee;" data-email="${m.email}">
          <strong>${m.displayName}</strong><br>
          <span style="color: #555;">${m.email}</span>
          ${m.role === 'guest' ? `
           <button class="remove-member-btn" title="Remove guest ${m.displayName}" aria-label="Remove guest ${m.displayName}" style=" opacity: 0.6; float: right; background: none; border: none; cursor: pointer; padding: 0; font-size: 1.8em; line-height: 1;">
  &times;
</button>
          ` : ''}
        </li>
      `).join('')}
    </ul>
  `;
}

document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('remove-member-btn')) {
    const listItem = e.target.closest('li');
    const { email } = listItem.dataset;
    const btn = e.target;

    // Get teamId and removedBy from the modal's dataset
    const membersModal = document.getElementById('members-modal');
    const { teamId, removedBy, currentUserEmail } = membersModal.dataset;
    btn.disabled = true;

    try {
      const results = await removeMemberFromTeam(teamId, email, removedBy);
      const result = results[0];
      if (result.removed === true) {
        listItem.remove();
        updateTeamRowMemberCount(teamId);
        if (email === currentUserEmail) {
          updateIsMemberBadge(teamId, false);
        }
      } else {
        console.warn('Member removal not confirmed:', result);
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      btn.disabled = false;
    }
  }
});
