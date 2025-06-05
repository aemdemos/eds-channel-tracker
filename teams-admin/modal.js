function positionModal(modal, triggerElement) {
  const rect = triggerElement.getBoundingClientRect();

  // Temporarily make modal visible to measure its size
  modal.style.visibility = 'hidden';
  modal.style.display = 'block';

  const modalWidth = modal.offsetWidth || 300;
  const modalHeight = modal.offsetHeight || 200;

  const maxLeft = window.innerWidth - modalWidth - 10;
  const maxTop = window.innerHeight - modalHeight - 10;

  const left = Math.min(rect.right + 10, maxLeft);
  const top = Math.max(Math.min(rect.top - 50, maxTop), 10);

  modal.style.left = `${left}px`;
  modal.style.top = `${top}px`;

  // Store initial positions as data attributes
  modal.dataset.initialLeft = left;
  modal.dataset.initialTop = top;

  modal.style.visibility = '';
}

function showModal(modal, triggerElement = null) {
  if (triggerElement) {
    positionModal(modal, triggerElement);
  } else {
    // Center modal if no trigger provided
    const modalWidth = modal.offsetWidth || 300;
    const modalHeight = modal.offsetHeight || 200;

    modal.style.position = 'absolute';
    modal.style.left = `${(window.innerWidth - modalWidth) / 2 + window.scrollX}px`;
    modal.style.top = `${(window.innerHeight - modalHeight) / 2 + window.scrollY}px`;
  }

  modal.style.display = 'block';
  requestAnimationFrame(() => modal.classList.add('show'));
}

function hideModal(modal) {
  modal.classList.remove('show');
  modal.addEventListener(
    'transitionend',
    () => {
      modal.style.display = 'none';
    },
    { once: true },
  );
}

const wrapWithCloseButton = (content, onClose, title = '') => {
  const wrapper = document.createElement('div');
  wrapper.classList.add('modal-content');

  wrapper.innerHTML = `
      <button class="modal-close-button" aria-label="Close modal"
        style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">
        &times;
      </button>
    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <strong>${title}</strong>
    </div>
    <div class="modal-body">${content}</div>
  `;

  wrapper.querySelector('.modal-close-button').addEventListener('click', (e) => {
    e.stopPropagation();
    onClose();
  });

  return wrapper;
};

export function setupModalDrag(modal) {
  const header = modal.querySelector('.modal-header');
  if (!header) return;

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  header.style.cursor = 'move';
  modal.style.position = 'fixed';

  const onMouseMove = (e) => {
    if (!isDragging) return;

    const modalWidth = modal.offsetWidth;
    const modalHeight = modal.offsetHeight;

    let newLeft = e.clientX - offsetX;
    let newTop = e.clientY - offsetY;

    const maxLeft = window.innerWidth - modalWidth;
    const maxTop = window.innerHeight - modalHeight;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    modal.style.left = `${newLeft}px`;
    modal.style.top = `${newTop}px`;
  };

  const onMouseUp = () => {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  header.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDragging = true;

    const rect = modal.getBoundingClientRect();

    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

export const handleModalInteraction = async (cell, teamId, modal, fetchDataCallback) => {
  // Always position the modal first
  showModal(modal, cell);

  // Set the spinner immediately so it's visible before fetching data
  modal.innerHTML = '<span class="spinner"></span>';
  modal.style.display = 'block';

  requestAnimationFrame(() => modal.classList.add('show'));

  try {
    // Fetch the modal content
    const data = await fetchDataCallback(teamId);

    const title = `${data.teamName}`;
    const wrapped = wrapWithCloseButton(data.modalContent, () => hideModal(modal), title);

    modal.innerHTML = ''; // Clear any existing content
    modal.appendChild(wrapped); // Append the new content
    setupModalDrag(modal); // Setup drag functionality
  } catch {
    modal.innerHTML = '<p style="color: red;">Error loading data</p>';
  }
};

export function showSuccessModal(message) {
  const overlay = document.getElementById('success-modal-overlay');
  const messageEl = document.getElementById('success-modal-message');
  const closeButton = document.getElementById('success-modal-close');

  messageEl.innerHTML = message;

  overlay.classList.remove('hidden');
  requestAnimationFrame(() => overlay.classList.add('visible'));

  const close = () => {
    overlay.classList.remove('visible');
    overlay.addEventListener('transitionend', () => {
      overlay.classList.add('hidden');
    }, { once: true });
    // eslint-disable-next-line no-use-before-define
    overlay.removeEventListener('click', onOverlayClick);
    closeButton.removeEventListener('click', close);
  };

  const onOverlayClick = (e) => {
    if (e.target === overlay) close();
  };

  overlay.addEventListener('click', onOverlayClick);
  closeButton.addEventListener('click', close);
}
