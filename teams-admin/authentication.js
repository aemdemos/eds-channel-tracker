/* global turnstile */
const verifyTurnstile = () => new Promise((resolve, reject) => {
  const widgetId = turnstile.render('#turnstile-container', {
    sitekey: '0x4AAAAAABgUT3ukRO60nTNJ',
    size: 'invisible',
    callback: (token) => { // Used by Turnstile library
      if (!token) {
        reject(new Error('Turnstile token missing'));
        return;
      }
      resolve(token);
    },
    'error-callback': () => reject(new Error('Turnstile error')),
    'expired-callback': () => reject(new Error('Turnstile expired')),
  });

  turnstile.execute(widgetId);
});

export const postWithTurnstile = async (url, body = {}) => {
  const token = await verifyTurnstile();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Turnstile-Token': token,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  return response.json();
};

export const deleteWithTurnstile = async (url, body) => {
  const token = await verifyTurnstile(); // you need to implement this
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-Turnstile-Token': token,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Delete request failed');
  return response.json();
};
