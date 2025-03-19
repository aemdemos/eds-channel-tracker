import { API_ENDPOINT } from './config.js';

/* eslint-disable no-alert */
const allSlackChannels = document.getElementById('myslackchannels');
const slackChannelsContainer = document.getElementById('slack-channels-container');

const getAllSlackChannels = async () => {
  try {
    const response = await fetch(`${API_ENDPOINT}`);

    if (response.ok) {
      const channels = await response.json();
      return channels;
    }
  } catch (e) {};

  return [];
}

const displayChannels = async () => {
  slackChannelsContainer.innerHTML = '<span class="spinner"></span>';

  const all = await getAllSlackChannels();

  all.sort((a, b) => a.name.localeCompare(b.name));

  const ul = document.createElement('ul');

  all.forEach(channel => {
    const li = document.createElement('li');

    const title = document.createElement('h4');
    title.textContent = channel.name;
    li.appendChild(title);

    const description = document.createElement('p');
    description.textContent = channel.purpose.value;
    li.appendChild(description);

    ul.appendChild(li);
  });

  slackChannelsContainer.innerHTML = '';
  slackChannelsContainer.appendChild(ul);
}

/**
 * Handles site admin form submission.
 * @param {Event} e - Submit event.
 */
allSlackChannels.addEventListener('click', async (e) => {
  e.preventDefault();
  displayChannels();
});

