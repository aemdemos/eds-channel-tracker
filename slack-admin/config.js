const API_ENDPOINT = window.location.href.includes('localhost') ? 'http://localhost:8787' : 'https://eds-channels-tracker-worker.chrislotton.workers.dev/slack/channels';
export default API_ENDPOINT;
