import API_ENDPOINT from './config.js';

const slackChannelsContainer = document.getElementById('slack-channels-container');

const doLogout = () => window.location.reload();

const sk = document.querySelector('aem-sidekick');
if (sk) {
  // sidekick already loaded
  sk.addEventListener('logged-out', doLogout);
} else {
  // wait for sidekick to be loaded
  document.addEventListener('sidekick-ready', () => {
    // sidekick now loaded
    document.querySelector('aem-sidekick').addEventListener('logged-out', doLogout);
  }, { once: true });
}

const getAllSlackChannels = async () => {
  try {
    const response = await fetch(API_ENDPOINT);
    if (response.ok) return await response.json();
  } catch (e) {/* Handle error */}
  return [];
}

const displayChannels = async () => {
  slackChannelsContainer.innerHTML = '<span class="spinner"></span>';
  const all = await getAllSlackChannels();
  all.sort((a, b) => a.name.localeCompare(b.name));

  const ul = document.createElement('ul');
  all.forEach((channel) => {
    const li = document.createElement('li');
    const updatedDate = new Date(channel.updated);
    const formattedDate = updatedDate.toISOString().split('T')[0];
    li.innerHTML = `
      <h4>${channel.name}</h4>
      <p>${channel.purpose.value}</p>
      <p style="color: ${new Date() - updatedDate < 30 * 24 * 60 * 60 * 1000 ? 'green' : 'red'};">
        Last Activity: ${formattedDate}
      </p>
    `;
    ul.appendChild(li);
  });

  slackChannelsContainer.innerHTML = '';
  slackChannelsContainer.appendChild(ul);
};

/**
 * Handles site admin form submission.
 * @param {Event} e - Submit event.
 */
document.getElementById('channelisation').addEventListener('click', async (e) => {
  e.preventDefault();
  await displayChannels();
});
