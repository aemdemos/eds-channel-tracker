let cachedUserProfile = null;
let fetchPromise = null;

const getUserProfile = async () => {
  if (cachedUserProfile) return cachedUserProfile;

  if (!fetchPromise) {
    fetchPromise = (async () => {
      try {
        const response = await fetch('https://admin.hlx.page/status/aemdemos/eds-channel-tracker/main/index.html');
        if (!response.ok) throw new Error('Failed to fetch user profile');
        const data = await response.json();
        cachedUserProfile = data.profile;
        return cachedUserProfile;
      } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
      } finally {
        fetchPromise = null; // Reset fetchPromise after completion
      }
    })();
  }

  return fetchPromise;
};

export default getUserProfile;
