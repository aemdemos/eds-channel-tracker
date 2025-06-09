let cachedUserProfile = null;
let fetchPromise = null;

const getUserProfile = async () => {
  if (cachedUserProfile) return cachedUserProfile;

  if (!fetchPromise) {
    fetchPromise = (async () => {
      try {
        const response = await fetch('https://admin.hlx.page/status/aemdemos/eds-channel-tracker/main/index.html');
        if (response.ok) {
          const data = await response.json();
          cachedUserProfile = data.profile;
          return cachedUserProfile;
        }
        return null;
      } catch (e) {
        return null;
      } finally {
        fetchPromise = null; // Reset fetchPromise after completion
      }
    })();
  }

  return fetchPromise;
};

export default getUserProfile;
