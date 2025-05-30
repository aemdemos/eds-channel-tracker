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
        <li style="padding: 6px 0; border-bottom: 1px solid #eee;">
          <strong>${m.displayName}</strong><br>
          <span style="color: #555;">${m.email}</span>
        </li>
      `)
    .join('')}
    </ul>
  `;
}
