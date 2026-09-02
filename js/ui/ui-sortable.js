"use strict";

function makeSortable(listElement, onSave) {
  let draggedItem = null;
  let touchItem = null;

  // --- Souris (Desktop) ---
  listElement.addEventListener('dragstart', (e) => {
    const row = e.target.closest('.wrow');
    if (row && e.target.closest('.sort-grip')) {
      draggedItem = row;
      draggedItem.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', ''); // Requis pour Firefox
    }
  });

  listElement.addEventListener('dragend', () => {
    if (draggedItem) {
      draggedItem.classList.remove('dragging');
      draggedItem = null;
      onSave();
    }
  });

  listElement.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggedItem) return;
    const target = e.target.closest('.wrow');
    if (target && target !== draggedItem) {
      const rect = target.getBoundingClientRect();
      const next = (e.clientY - rect.top) > (rect.height / 2);
      listElement.insertBefore(draggedItem, next ? target.nextSibling : target);
    }
  });

  // --- Tactile (Mobile) ---
  listElement.addEventListener('touchstart', (e) => {
    const grip = e.target.closest('.sort-grip');
    if (grip) {
      touchItem = grip.closest('.wrow');
      touchItem.classList.add('dragging');
    }
  }, { passive: true });

  listElement.addEventListener('touchmove', (e) => {
    if (!touchItem) return;
    e.preventDefault(); // Empêche le scroll de la page pendant le drag
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.wrow');
    if (target && target !== touchItem) {
      const rect = target.getBoundingClientRect();
      const next = (touch.clientY - rect.top) > (rect.height / 2);
      listElement.insertBefore(touchItem, next ? target.nextSibling : target);
    }
  }, { passive: false });

  listElement.addEventListener('touchend', () => {
    if (touchItem) {
      touchItem.classList.remove('dragging');
      touchItem = null;
      onSave();
    }
  });
}

function initSortableCSS() {
  if (document.getElementById('sortable-style')) return;
  const style = document.createElement('style');
  style.id = 'sortable-style';
  style.textContent = `
    .wrow { display: flex; align-items: center; gap: 8px; padding: 10px 0; border-bottom: 1px solid var(--line); transition: background 0.2s; }
    .sort-grip { cursor: grab; padding: 0 8px; color: var(--ink-soft); font-size: 18px; user-select: none; touch-action: none; }
    .sort-grip:active { cursor: grabbing; }
    .wrow.dragging { opacity: 0.4; background: var(--card); }
    .wrow input[type="checkbox"] { margin-left: 4px; accent-color: var(--accent); }
  `;
  document.head.appendChild(style);
}