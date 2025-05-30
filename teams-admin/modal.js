function positionModal(modal, triggerElement) {
  const rect = triggerElement.getBoundingClientRect();
  const modalWidth = modal.offsetWidth || 300;
  const maxLeft = window.innerWidth - modalWidth - 10;

  modal.style.position = 'absolute';
  modal.style.top = `${rect.top + window.scrollY - 50}px`;
  modal.style.left = `${Math.min(rect.right + 10 + window.scrollX, maxLeft)}px`;
}

function showModal(modal, triggerElement) {
  positionModal(modal, triggerElement);
  modal.style.display = 'block';
  requestAnimationFrame(() => modal.classList.add('show'));
}

function hideModal(modal) {
  modal.classList.remove('show');
  modal.addEventListener('transitionend', () => {
    modal.style.display = 'none';
  }, { once: true });
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

  const closeBtn = wrapper.querySelector('.modal-close-button');

  // Remove all previous click listeners by cloning the node
  const newCloseBtn = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

  newCloseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClose();
  });

  return wrapper;
};

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
  } catch {
    modal.innerHTML = '<p style="color: red;">Error loading data</p>';
  }
};

export function setupModalDrag(modal) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  modal.style.cursor = 'move';

  const onMouseMove = (e) => {
    if (!isDragging) return;
    modal.style.left = `${e.clientX - offsetX}px`;
    modal.style.top = `${e.clientY - offsetY}px`;
  };

  const onMouseUp = () => {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  modal.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Only allow to left-click
    isDragging = true;
    const rect = modal.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}
