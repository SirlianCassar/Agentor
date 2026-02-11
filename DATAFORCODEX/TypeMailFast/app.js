// Import éditeur simple
import { createSimpleEditor } from './simple-editor.js';

// Constantes pour les regex (compilées une seule fois pour meilleure performance)
const REGEX_TAG = /\*([^*\n]+)\*/g;
const REGEX_TAG_MATCH = /^\*([^*\n]+)\*$/;
const REGEX_SELECTOR = /#([^#\n]+):\s*([^#\n]+)#/g;
const REGEX_SELECTOR_MATCH = /^#([^#\n]+):([^#\n]+)#$/;

// Variables globales pour les éditeurs à deux couches
let emailEditor = null;
let taskEditor = null;

// Clé pour le stockage local
const STORAGE_KEY = 'typemailfast-state';

const CATEGORY_COLORS = [
  '#FF0000', '#FF8700', '#FFD300', '#DEFF0A', '#A1FF0A',
  '#0AFF99', '#0AEFFF', '#147DF5', '#580AFF', '#BE0AFF'
];

const defaultState = {
  categories: [],
  bullets: [],
  chargers: [],
  taskTemplates: [],
  selectedCategoryId: null,
  activeBulletId: null,
  emailText: '',
  taskText: '',
  noteText: '',
  chargerLang: 'en',
  zenPunchCount: 0,
  zenCurrentProduct: 0,
  zenProductHealth: 100,
  zenDestroyCount: { solr: 0, t598: 0, t818: 0, sf1000: 0 },
  copiedEmails: [],
};

const ZEN_PRODUCTS = [
  { id: 'solr', name: 'SOLR', image: 'SOLR.png', emoji: 'red-heart_2764-fe0f.png', hitsToDestroy: 20, colors: ['#ff69b4', '#87ceeb', '#ff1493'] },
  { id: 't598', name: 'T598', image: 'T598.png', emoji: 'high-voltage_26a1.png', hitsToDestroy: 25, colors: ['#ffd700', '#ffec8b', '#ffa500'] },
  { id: 't818', name: 'T818', image: 'T818.png', emoji: 'fire_1f525.png', hitsToDestroy: 30, colors: ['#ff8c00', '#ffa500', '#ff4500'] },
  { id: 'sf1000', name: 'SF1000', image: 'SF1000.png', emoji: 'wireless_1f6dc.png', hitsToDestroy: 35, colors: ['#0096ff', '#00bfff', '#1e90ff'] },
];

let state = { ...defaultState };

// Charger l'état depuis le stockage local
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...defaultState, ...parsed };
    }
  } catch (e) {
    console.error('Erreur lors du chargement de l\'état:', e);
    state = { ...defaultState };
  }
}

const elements = {
  categorySelect: document.getElementById('categorySelect'),
  currentCategoryName: document.getElementById('currentCategoryName'),
  bulletList: document.getElementById('bulletList'),
  emailInput: document.getElementById('emailInput'),
  tagIndicator: document.getElementById('tagIndicator'),
  copyBtn: document.getElementById('copyBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importBtn: document.getElementById('importBtn'),
  spreadsheetExportBtn: document.getElementById('spreadsheetExportBtn'),
  mailHistoryExportBtn: document.getElementById('mailHistoryExportBtn'),
  mailCountBadge: document.getElementById('mailCountBadge'),
  clearBtn: document.getElementById('clearBtn'),
  zenBtn: document.getElementById('zenBtn'),
  zenOverlay: document.getElementById('zenOverlay'),
  zenPunchButton: document.getElementById('zenPunchButton'),
  zenProductImg: document.getElementById('zenProductImg'),
  zenProductCanvas: document.getElementById('zenProductCanvas'),
  zenParticles: document.getElementById('zenParticles'),
  zenCloseBtn: document.getElementById('zenCloseBtn'),
  zenCounter: document.getElementById('zenCounter'),
  zenBtnSolr: document.getElementById('zenBtnSolr'),
  zenBtnT598: document.getElementById('zenBtnT598'),
  zenBtnT818: document.getElementById('zenBtnT818'),
  zenBtnSf1000: document.getElementById('zenBtnSf1000'),
  cursorHit: document.getElementById('cursorHit'),
  toast: document.getElementById('toast'),
  bulletTooltip: document.getElementById('bulletTooltip'),
  quickLinkTooltip: document.getElementById('quickLinkTooltip'),
  chargerSearch: document.getElementById('chargerSearch'),
  chargerResults: document.getElementById('chargerResults'),
  editionToggle: document.getElementById('editionToggle'),
  editionModal: document.getElementById('editionModal'),
  closeModal: document.getElementById('closeModal'),
  helpBtn: document.getElementById('helpBtn'),
  helpModal: document.getElementById('helpModal'),
  helpModalClose: document.getElementById('helpModalClose'),
  tabButtons: document.querySelectorAll('.nav-tab'),
  modalGlobalSearch: document.getElementById('modalGlobalSearch'),
  newCategoryBtn: document.getElementById('newCategoryBtn'),
  newBulletBtn: document.getElementById('newBulletBtn'),
  newChargerBtn: document.getElementById('newChargerBtn'),
  newTaskTemplateBtn: document.getElementById('newTaskTemplateBtn'),
  bulletCategorySelect: document.getElementById('bulletCategorySelect'),
  categoryFormTitle: document.getElementById('categoryFormTitle'),
  bulletFormTitle: document.getElementById('bulletFormTitle'),
  chargerFormTitle: document.getElementById('chargerFormTitle'),
  taskTemplateFormTitle: document.getElementById('taskTemplateFormTitle'),
  tabs: {
    categories: document.getElementById('categoriesTab'),
    bullets: document.getElementById('bulletsTab'),
    chargers: document.getElementById('chargersTab'),
    taskTemplates: document.getElementById('taskTemplatesTab'),
  },
  categoryForm: document.getElementById('categoryForm'),
  categoryName: document.getElementById('categoryName'),
  colorPicker: document.getElementById('colorPicker'),
  resetCategoryForm: document.getElementById('resetCategoryForm'),
  categoryManageList: document.getElementById('categoryManageList'),
  manageCategorySelect: document.getElementById('manageCategorySelect'),
  bulletForm: document.getElementById('bulletForm'),
  bulletTitle: document.getElementById('bulletTitle'),
  bulletContent: document.getElementById('bulletContent'),
  bulletInsertMode: document.getElementById('bulletInsertMode'),
  bulletTaskText: document.getElementById('bulletTaskText'),
  bulletTaskOptional: document.getElementById('bulletTaskOptional'),
  resetBulletForm: document.getElementById('resetBulletForm'),
  bulletManageList: document.getElementById('bulletManageList'),
  chargerForm: document.getElementById('chargerForm'),
  chargerName: document.getElementById('chargerName'),
  chargerContent: document.getElementById('chargerContent'),
  chargerLangFr: document.getElementById('chargerLangFr'),
  chargerLangEn: document.getElementById('chargerLangEn'),
  chargerTaskTemplate: document.getElementById('chargerTaskTemplate'),
  chargerTaskOptional: document.getElementById('chargerTaskOptional'),
  langBtnFr: document.getElementById('langBtnFr'),
  langBtnEn: document.getElementById('langBtnEn'),
  resetChargerForm: document.getElementById('resetChargerForm'),
  chargerManageList: document.getElementById('chargerManageList'),
  taskTemplateSearch: document.getElementById('taskTemplateSearch'),
  taskTemplateResults: document.getElementById('taskTemplateResults'),
  taskInput: document.getElementById('taskInput'),
  taskTagIndicator: document.getElementById('taskTagIndicator'),
  taskCopyBtn: document.getElementById('taskCopyBtn'),
  taskClearBtn: document.getElementById('taskClearBtn'),
  taskTemplateForm: document.getElementById('taskTemplateForm'),
  taskTemplateName: document.getElementById('taskTemplateName'),
  taskTemplateContent: document.getElementById('taskTemplateContent'),
  resetTaskTemplateForm: document.getElementById('resetTaskTemplateForm'),
  taskTemplateManageList: document.getElementById('taskTemplateManageList'),
  noteInput: document.getElementById('noteInput'),
  noteClearBtn: document.getElementById('noteClearBtn'),
};

let editingCategoryId = null;
let editingBulletId = null;
let editingChargerId = null;
let editingChargerLang = 'en'; // Langue sélectionnée dans le formulaire d'édition
let editingTaskTemplateId = null;
let editingSelectedCategoryId = null; // Catégorie sélectionnée dans le menu édition
let emailClearPendingConfirm = false;
let emailClearResetTimer = null;
// isRendering supprimé - CodeMirror gère le rendu automatiquement

window.addEventListener('DOMContentLoaded', init);

function findTagAtPosition(text, pos) {
  if (!text) return null;
  
  // Réinitialiser lastIndex pour éviter les problèmes avec les regex globales
  REGEX_TAG.lastIndex = 0;
  let match;
  
  while ((match = REGEX_TAG.exec(text)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;
    
    if (pos >= start && pos <= end) {
      return { start, end };
    }
  }
  
  return null;
}

function findSelectorAtPosition(text, pos, includeMarkers = false) {
  if (!text) return null;
  
  // Réinitialiser lastIndex pour éviter les problèmes avec les regex globales
  REGEX_SELECTOR.lastIndex = 0;
  let match;
  
  while ((match = REGEX_SELECTOR.exec(text)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;
    const fullMatch = match[0];
    const option1 = match[1];
    const option2 = match[2].trim();
    
    if (!includeMarkers && (pos === start || pos === end)) {
      continue;
    }
    
    if (includeMarkers ? (pos >= start && pos <= end) : (pos > start && pos < end)) {
      const separatorPos = start + 1 + option1.length;
      let selectedOption = 'option1';
      if (pos > separatorPos) {
        selectedOption = 'option2';
      }
      
      return { 
        start, 
        end, 
        fullMatch,
        option1, 
        option2,
        selectedOption
      };
    }
  }
  
  return null;
}

// Fonctions obsolètes supprimées - CodeMirror gère maintenant tout cela nativement

function init() {
  if (!elements.emailInput) {
    console.error('Email editor element not found');
    return;
  }
  if (!elements.taskInput) {
    console.error('Task editor element not found');
    return;
  }

  // Charger l'état sauvegardé
  loadState();

  // Initialiser les éditeurs simples
  emailEditor = createSimpleEditor(
    elements.emailInput,
    state.emailText || '',
    (text) => {
      state.emailText = text;
      updateTagIndicator();
      persistState();
    }
  );

  taskEditor = createSimpleEditor(
    elements.taskInput,
    state.taskText || '',
    (text) => {
      state.taskText = text;
      updateTaskTagIndicator();
      persistState();
    }
  );

  renderCategorySelect();
  renderBullets();
  renderManageLists();
  renderColorPicker();
  populateChargerTaskTemplateSelect();
  updateTagIndicator();
  updateTaskTagIndicator();
  updateTaskBuilderVisibility();
  updateLangButtonsUI();
  updateChargerLangButtonsUI();
  updateZenCounter();
  updateMailCountBadge();
  
  if (elements.noteInput) {
    const noteValue = state.noteText || '';
    elements.noteInput.value = noteValue;
    if (noteValue && noteValue.startsWith('\n')) {
      elements.noteInput.value = noteValue.replace(/^\n+/, '');
      state.noteText = elements.noteInput.value;
    }
  }

  bindEvents();
}

let selectedColor = CATEGORY_COLORS[0];

function renderColorPicker() {
  if (!elements.colorPicker) return;
  elements.colorPicker.innerHTML = '';
  CATEGORY_COLORS.forEach(color => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-option';
    btn.style.backgroundColor = color;
    btn.dataset.color = color;
    if (color === selectedColor) btn.classList.add('active');
    btn.addEventListener('click', () => {
      selectedColor = color;
      elements.colorPicker.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    elements.colorPicker.appendChild(btn);
  });
}

function bindEvents() {
  const brandLogo = document.getElementById('brandLogo');
  const brandPopup = document.getElementById('brandPopup');
  if (brandLogo && brandPopup) {
    brandLogo.addEventListener('click', (e) => {
      e.stopPropagation();
      brandPopup.classList.toggle('visible');
    });
    
    document.addEventListener('click', (e) => {
      if (!brandLogo.contains(e.target)) {
        brandPopup.classList.remove('visible');
      }
    });
  }

  elements.helpBtn?.addEventListener('click', () => {
    elements.helpModal?.classList.remove('hidden');
  });

  elements.helpModalClose?.addEventListener('click', () => {
    elements.helpModal?.classList.add('hidden');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.helpModal && !elements.helpModal.classList.contains('hidden')) {
      elements.helpModal.classList.add('hidden');
    }
  });

  elements.categorySelect?.addEventListener('change', () => {
    state.selectedCategoryId = elements.categorySelect.value || null;
    state.activeBulletId = null;
    renderBullets();
    persistState();
  });

  // CodeMirror gère maintenant tous les événements (paste, keydown, click, etc.)
  // Plus besoin de MutationObserver ni d'event listeners pour contenteditable

  elements.copyBtn?.addEventListener('click', handleCopy);
  elements.exportBtn?.addEventListener('click', handleExport);
  elements.importBtn?.addEventListener('click', handleImport);
  elements.spreadsheetExportBtn?.addEventListener('click', handleSpreadsheetExport);
  elements.mailHistoryExportBtn?.addEventListener('click', handleMailHistoryExport);
  elements.clearBtn?.addEventListener('click', handleClear);

  elements.langBtnFr?.addEventListener('click', () => {
    state.chargerLang = 'fr';
    updateLangButtonsUI();
    renderChargerSearchResults();
    persistState();
  });
  
  elements.langBtnEn?.addEventListener('click', () => {
    state.chargerLang = 'en';
    updateLangButtonsUI();
    renderChargerSearchResults();
    persistState();
  });

  elements.chargerLangFr?.addEventListener('click', () => {
    editingChargerLang = 'fr';
    updateChargerLangButtonsUI();
  });
  
  elements.chargerLangEn?.addEventListener('click', () => {
    editingChargerLang = 'en';
    updateChargerLangButtonsUI();
  });

  elements.editionToggle?.addEventListener('click', () => openEdition('categories'));
  elements.closeModal?.addEventListener('click', closeEdition);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !elements.editionModal.classList.contains('hidden')) {
      closeEdition();
    }
  });

  elements.tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });


  elements.modalGlobalSearch?.addEventListener('input', handleGlobalSearch);

  elements.categoryForm?.addEventListener('submit', handleCategorySubmit);
  elements.resetCategoryForm?.addEventListener('click', () => setCategoryFormMode(null));

  elements.manageCategorySelect?.addEventListener('change', (e) => {
    editingSelectedCategoryId = e.target.value;
    renderBulletManageList();
  });
  elements.bulletForm?.addEventListener('submit', handleBulletSubmit);
  elements.resetBulletForm?.addEventListener('click', () => setBulletFormMode(null));

  elements.chargerForm?.addEventListener('submit', handleChargerSubmit);
  elements.resetChargerForm?.addEventListener('click', () => setChargerFormMode(null));

  elements.taskTemplateForm?.addEventListener('submit', handleTaskTemplateSubmit);
  elements.resetTaskTemplateForm?.addEventListener('click', () => setTaskTemplateFormMode(null));
  
  document.querySelectorAll('.quick-link').forEach(link => {
    link.addEventListener('mouseenter', (e) => {
      const title = link.getAttribute('title') || '';
      if (title) {
        showQuickLinkTooltip(e, title);
      }
    });
    link.addEventListener('mousemove', (e) => {
      moveQuickLinkTooltip(e);
    });
    link.addEventListener('mouseleave', () => {
      hideQuickLinkTooltip();
    });
  });

  elements.taskTemplateSearch?.addEventListener('input', renderTaskTemplateSearchResults);
  elements.taskTemplateSearch?.addEventListener('focus', renderTaskTemplateSearchResults);
  elements.taskTemplateSearch?.addEventListener('blur', () => {
    setTimeout(() => {
      if (elements.taskTemplateSearch) {
        elements.taskTemplateSearch.value = '';
      }
      if (elements.taskTemplateResults) {
        elements.taskTemplateResults.scrollTop = 0;
      }
    }, 200);
  });
  
  elements.zenBtn?.addEventListener('click', () => {
    elements.zenOverlay?.classList.remove('hidden');
    updateZenCounter();
    updateZenProduct();
  });
  
  elements.zenPunchButton?.addEventListener('click', handleZenPunch);
  
  [elements.zenBtnSolr, elements.zenBtnT598, elements.zenBtnT818, elements.zenBtnSf1000].forEach((btn, index) => {
    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      selectZenProduct(index);
    });
  });
  
  const closeZenOverlay = () => {
    elements.zenOverlay?.classList.add('hidden');
    if (elements.zenPunchButton) {
      elements.zenPunchButton.style.animation = 'none';
      setTimeout(() => {
        if (elements.zenPunchButton) {
          elements.zenPunchButton.style.animation = '';
        }
      }, 10);
    }
  };
  
  elements.zenCloseBtn?.addEventListener('click', closeZenOverlay);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.zenOverlay && !elements.zenOverlay.classList.contains('hidden')) {
      closeZenOverlay();
    }
  });

  // CodeMirror gère maintenant tous les événements pour taskInput
  // Plus besoin d'event listeners pour contenteditable

  elements.taskCopyBtn?.addEventListener('click', handleTaskCopy);
  elements.taskClearBtn?.addEventListener('click', handleTaskClear);
  
  // Intercepter l'événement copy pour forcer la copie du texte brut (sans styles blancs)
  elements.taskInput?.addEventListener('copy', (e) => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const text = selection.toString();
      if (text) {
        // Copier le texte brut
        e.clipboardData.setData('text/plain', text);
        // Copier aussi le HTML avec une couleur noire pour éviter le texte blanc
        const html = `<span style="color: #000000;">${text.replace(/\n/g, '<br>')}</span>`;
        e.clipboardData.setData('text/html', html);
        e.preventDefault();
      }
    }
  });

  elements.noteInput?.addEventListener('input', () => {
    let value = elements.noteInput.value;
    // Supprimer la première ligne si elle est vide
    if (value && value.startsWith('\n')) {
      value = value.replace(/^\n+/, '');
      elements.noteInput.value = value;
    }
    state.noteText = value;
    persistState();
  });
  elements.noteClearBtn?.addEventListener('click', handleNoteClear);

  
  elements.chargerSearch?.addEventListener('input', renderChargerSearchResults);
  elements.chargerSearch?.addEventListener('focus', renderChargerSearchResults);
  elements.chargerSearch?.addEventListener('blur', () => {
    setTimeout(() => {
      if (elements.chargerSearch) {
        elements.chargerSearch.value = '';
      }
      if (elements.chargerResults) {
        elements.chargerResults.scrollTop = 0;
      }
    }, 200);
  });
  
  document.addEventListener('click', (e) => {
    if (elements.chargerResults && elements.chargerSearch) {
      if (!elements.chargerResults.contains(e.target) && !elements.chargerSearch.contains(e.target)) {
        elements.chargerResults.classList.remove('visible');
      }
    }
    if (elements.taskTemplateResults && elements.taskTemplateSearch) {
      if (!elements.taskTemplateResults.contains(e.target) && !elements.taskTemplateSearch.contains(e.target)) {
        elements.taskTemplateResults.classList.remove('visible');
        if (elements.taskTemplateResults) {
          elements.taskTemplateResults.scrollTop = 0;
        }
      }
    }
  });
}

function renderCategorySelect() {
  elements.categorySelect.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'Toutes les catégories';
  elements.categorySelect.appendChild(allOption);

  const sortedCategories = [...state.categories].sort((a, b) => (a.order || 0) - (b.order || 0));
  
  sortedCategories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    if (category.id === state.selectedCategoryId) option.selected = true;
    elements.categorySelect.appendChild(option);
  });

  updateCurrentCategoryLabel();
}

function updateCurrentCategoryLabel() {
  if (state.selectedCategoryId) {
    const cat = state.categories.find((c) => c.id === state.selectedCategoryId);
    elements.currentCategoryName.textContent = cat ? cat.name : 'Catégories';
  } else {
    elements.currentCategoryName.textContent = 'Toutes les catégories';
  }
}

function renderBullets() {
  elements.bulletList.innerHTML = '';
  let bullets = state.selectedCategoryId
    ? state.bullets.filter((b) => b.categoryId === state.selectedCategoryId)
    : state.bullets;

  if (!state.selectedCategoryId) {
    bullets = bullets.sort((a, b) => {
      const catA = state.categories.find(c => c.id === a.categoryId);
      const catB = state.categories.find(c => c.id === b.categoryId);
      const orderA = catA?.order ?? 999;
      const orderB = catB?.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  } else {
    bullets = bullets.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  if (!bullets.length) {
    const empty = document.createElement('li');
    empty.className = 'bullet-item';
    empty.textContent = 'Aucun snippet dans cette catégorie.';
    elements.bulletList.appendChild(empty);
  }

  bullets.forEach((bullet) => {
    const category = state.categories.find(c => c.id === bullet.categoryId);
    const color = category?.color || CATEGORY_COLORS[0];
    
    const li = document.createElement('li');
    li.className = 'bullet-item';
    li.dataset.id = bullet.id;
    li.dataset.content = bullet.content;
    
    li.innerHTML = `
      <div class="bullet-color-indicator" style="background-color: ${color}"></div>
      <div class="bullet-meta">
        <div class="bullet-title">${bullet.title}</div>
        <div class="bullet-sub">${truncate(bullet.content, 64)}</div>
      </div>
    `;
    
    li.addEventListener('click', () => {
      appendToEmail(bullet.content, bullet.id);
      state.activeBulletId = bullet.id;
      persistState();
    });
    
    li.addEventListener('mouseenter', (e) => showBulletTooltip(e, bullet.content));
    li.addEventListener('mousemove', (e) => moveBulletTooltip(e));
    li.addEventListener('mouseleave', hideBulletTooltip);
    
    elements.bulletList.appendChild(li);
  });

  updateCurrentCategoryLabel();
}

function renderEditorText() {
  // CodeMirror gère le rendu automatiquement, on met juste à jour le texte si nécessaire
  if (emailEditor && state.emailText !== emailEditor.getValue()) {
    const cursorPos = emailEditor.getCursor();
    emailEditor.setValue(state.emailText);
    emailEditor.setCursor(Math.min(cursorPos, state.emailText.length));
  }
}

function renderTaskEditorText() {
  // CodeMirror gère le rendu automatiquement, on met juste à jour le texte si nécessaire
  if (taskEditor && state.taskText !== taskEditor.getValue()) {
    const cursorPos = taskEditor.getCursor();
    taskEditor.setValue(state.taskText);
    taskEditor.setCursor(Math.min(cursorPos, state.taskText.length));
  }
  updateTaskTagIndicator();
}

// Fonction helper pour échapper les attributs HTML
function escapeHtmlAttr(str) {
  return str.replace(/"/g, '&quot;');
}

// Fonction highlightTags supprimée - CodeMirror gère maintenant le surlignage automatiquement
// Conservée uniquement pour les tooltips
function highlightTags(text) {
  if (!text) return '';
  
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Réinitialiser lastIndex pour éviter les problèmes avec les regex globales
  REGEX_SELECTOR.lastIndex = 0;
  REGEX_TAG.lastIndex = 0;
  
  // Sélectors #option1:option2# - traiter d'abord pour éviter les conflits
  let highlighted = escaped.replace(REGEX_SELECTOR, (match, option1, option2) => {
    const trimmedOption2 = option2.trim();
    return `<span class="selector">${option1}│${trimmedOption2}</span>`;
  });
  
  // Tags *tag* - champs obligatoires en rouge
  highlighted = highlighted.replace(REGEX_TAG, '<span class="tag">$1</span>');
  
  return highlighted;
}

function countTags(text) {
  if (!text) return 0;
  REGEX_TAG.lastIndex = 0;
  const matches = text.match(REGEX_TAG);
  return matches ? matches.length : 0;
}

function countSelectors(text) {
  if (!text) return 0;
  REGEX_SELECTOR.lastIndex = 0;
  const matches = text.match(REGEX_SELECTOR);
  return matches ? matches.length : 0;
}

function countTagsAndSelectors(text) {
  return countTags(text) + countSelectors(text);
}

function updateTagIndicator() {
  const count = countTagsAndSelectors(state.emailText);
  if (count === 0) {
    elements.tagIndicator.textContent = '';
    elements.tagIndicator.style.color = 'var(--muted)';
  } else {
    elements.tagIndicator.textContent = '⚠️';
    elements.tagIndicator.style.color = 'var(--tag)';
  }
}

function updateTaskTagIndicator() {
  if (!elements.taskTagIndicator) return;
  const count = countTagsAndSelectors(state.taskText);
  if (count === 0) {
    elements.taskTagIndicator.textContent = '';
    elements.taskTagIndicator.style.color = 'var(--muted)';
  } else {
    elements.taskTagIndicator.textContent = '⚠️';
    elements.taskTagIndicator.style.color = 'var(--tag)';
  }
}

async function handleCopy() {
  if (!state.emailText.trim()) {
    return;
  }
  try {
    await navigator.clipboard.writeText(state.emailText);
    addToMailHistory(state.emailText);
    animateCopySuccess();
  } catch (err) {
    fallbackCopy(state.emailText);
    addToMailHistory(state.emailText);
    animateCopySuccess();
  }
}

function addToMailHistory(emailText) {
  if (!Array.isArray(state.copiedEmails)) {
    state.copiedEmails = [];
  }
  state.copiedEmails.push(emailText);
  updateMailCountBadge();
  persistState();
}

function updateMailCountBadge() {
  if (!elements.mailCountBadge) return;
  const count = state.copiedEmails?.length || 0;
  elements.mailCountBadge.textContent = count;
  elements.mailCountBadge.style.display = count > 0 ? 'flex' : 'none';
}

function handleMailHistoryExport() {
  if (!state.copiedEmails || state.copiedEmails.length === 0) {
    showToast('Aucun mail en mémoire');
    return;
  }
  
  const separator = '\n\n' + '-'.repeat(60) + '\n\n';
  const content = state.copiedEmails.join(separator);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mails-historique-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  const count = state.copiedEmails.length;
  state.copiedEmails = [];
  updateMailCountBadge();
  persistState();
  
  showToast(`${count} mail${count > 1 ? 's' : ''} exporté${count > 1 ? 's' : ''}`);
  }

function animateCopySuccess() {
  elements.copyBtn.classList.add('copied');
  elements.copyBtn.textContent = 'Copié !';
  setTimeout(() => {
    elements.copyBtn.classList.remove('copied');
    elements.copyBtn.textContent = 'Copy Email';
  }, 1500);
}

function fallbackCopy(text) {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

function handleClear() {
  if (!state.emailText.trim()) {
    return;
  }
  
  if (emailClearPendingConfirm) {
    clearEmail();
    resetEmailClearButton();
  } else {
    emailClearPendingConfirm = true;
    elements.clearBtn.classList.add('confirm');
    elements.clearBtn.textContent = 'Confirmer ?';
    
    emailClearResetTimer = setTimeout(() => {
      resetEmailClearButton();
    }, 2000);
  }
}

function resetEmailClearButton() {
  emailClearPendingConfirm = false;
  if (emailClearResetTimer) {
    clearTimeout(emailClearResetTimer);
    emailClearResetTimer = null;
  }
  elements.clearBtn.classList.remove('confirm');
  elements.clearBtn.textContent = 'Clear';
}

function clearEmail() {
  state.emailText = '';
  state.activeBulletId = null;
  renderEditorText();
  updateTagIndicator();
  persistState();
}

function setEmailText(text, chargerId = null) {
  state.emailText = text || '';
  renderEditorText();
  updateTagIndicator();
  persistState();
  
  if (chargerId) {
    const charger = state.chargers.find(c => c.id === chargerId);
    if (charger?.taskTemplateId) {
      const taskTemplate = state.taskTemplates.find(t => t.id === charger.taskTemplateId);
      if (taskTemplate) {
        setTaskText(taskTemplate.content);
      }
    }
  }
  
  }

function appendToEmail(text, bulletId = null) {
  const currentText = emailEditor ? emailEditor.getValue() : state.emailText;
  
  // Vérifier le mode d'insertion du bullet
  const bullet = bulletId ? state.bullets.find(b => b.id === bulletId) : null;
  const insertMode = bullet?.insertMode || 'line';
  
  // Nettoyer le texte du snippet :
  // 1. Supprimer les \n en début et fin
  // 2. Remplacer les multiples sauts de ligne consécutifs (\n\n+) par un seul \n
  // 3. Supprimer les espaces en début et fin de chaque ligne
  let cleanedText = text.trim();
  // Remplacer les multiples sauts de ligne consécutifs par un seul
  cleanedText = cleanedText.replace(/\n{2,}/g, '\n');
  // Nettoyer les espaces en début/fin de chaque ligne
  cleanedText = cleanedText.split('\n').map(line => line.trim()).join('\n');
  
  let prefix = '';
  let newPos = 0;
  
  if (insertMode === 'line') {
    // Mode ligne : insérer à la ligne suivante (saut de ligne)
    if (currentText && currentText.trim()) {
      // S'assurer qu'il n'y a qu'un seul \n avant le nouveau texte
      const trimmedCurrent = currentText.trimEnd();
      prefix = trimmedCurrent.endsWith('\n') ? '' : '\n';
      state.emailText = trimmedCurrent + prefix + cleanedText + ' ';
    } else {
      state.emailText = cleanedText + ' ';
    }
    newPos = state.emailText.length;
  } else {
    // Mode curseur : insérer à la suite du précédent snippet (à la fin du texte)
    if (currentText && currentText.trim()) {
      // Ajouter un espace si le texte ne se termine pas par un espace
      const trimmedCurrent = currentText.trimEnd();
      prefix = trimmedCurrent.endsWith(' ') ? '' : ' ';
      state.emailText = trimmedCurrent + prefix + cleanedText + ' ';
    } else {
      state.emailText = cleanedText + ' ';
    }
    newPos = state.emailText.length;
  }
  
  renderEditorText();
  updateTagIndicator();
  persistState();
  
  // Placer le curseur à la fin du snippet après l'espace
  requestAnimationFrame(() => {
    if (emailEditor) {
      emailEditor.setCursor(newPos);
      emailEditor.focus();
    }
  });
  
  // Ajouter le task text si le bullet en a un
  if (bullet?.taskText) {
      const currentTaskText = taskEditor ? taskEditor.getValue() : state.taskText;
    // Chaque task data doit être à la ligne
    const taskPrefix = (currentTaskText && currentTaskText.trim() && !currentTaskText.endsWith('\n')) ? '\n' : '';
    state.taskText = currentTaskText + taskPrefix + bullet.taskText;
    renderTaskEditorText();
    persistState();
    
    // Placer le curseur à la fin du task text
    const taskNewPos = state.taskText.length;
    requestAnimationFrame(() => {
      if (taskEditor) {
        taskEditor.setCursor(taskNewPos);
      }
    });
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 2200);
}

function showBulletTooltip(e, content) {
  const tooltip = elements.bulletTooltip;
  const escaped = (content || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Traiter d'abord les selectors (pour éviter les conflits)
  REGEX_SELECTOR.lastIndex = 0;
  let highlighted = escaped.replace(REGEX_SELECTOR, (match, option1, option2) => {
    const trimmedOption2 = option2.trim();
    // Afficher les selectors en vert sans les #
    return `<span class="selector">${option1}│${trimmedOption2}</span>`;
  });
  
  // Ensuite traiter les tags
  REGEX_TAG.lastIndex = 0;
  highlighted = highlighted.replace(REGEX_TAG, '<span class="tag">$1</span>');
  
  tooltip.innerHTML = highlighted;
  tooltip.classList.add('visible');
  moveBulletTooltip(e);
}

function moveBulletTooltip(e) {
  const tooltip = elements.bulletTooltip;
  const padding = 15;
  const tooltipWidth = 340;
  const tooltipHeight = tooltip.offsetHeight || 200;
  
  let x = e.clientX + padding;
  let y = e.clientY + padding;
  
  if (x + tooltipWidth > window.innerWidth - padding) {
    x = e.clientX - tooltipWidth - padding;
  }
  
  if (y + tooltipHeight > window.innerHeight - padding) {
    y = window.innerHeight - tooltipHeight - padding;
  }
  
  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
}

function hideBulletTooltip() {
  elements.bulletTooltip.classList.remove('visible');
}

function showQuickLinkTooltip(e, text) {
  const tooltip = elements.quickLinkTooltip;
  tooltip.textContent = text;
  tooltip.classList.add('visible');
  moveQuickLinkTooltip(e);
}

function moveQuickLinkTooltip(e) {
  const tooltip = elements.quickLinkTooltip;
  const padding = 10;
  const tooltipWidth = tooltip.offsetWidth || 100;
  const tooltipHeight = tooltip.offsetHeight || 30;
  
  let x = e.clientX + padding;
  let y = e.clientY + padding;
  
  if (x + tooltipWidth > window.innerWidth - padding) {
    x = e.clientX - tooltipWidth - padding;
  }
  
  if (y + tooltipHeight > window.innerHeight - padding) {
    y = e.clientY - tooltipHeight - padding;
  }
  
  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
}

function hideQuickLinkTooltip() {
  elements.quickLinkTooltip.classList.remove('visible');
}

function handleZenPunch(e) {
  const button = elements.zenPunchButton;
  if (!button) return;
  
  const currentProduct = ZEN_PRODUCTS[state.zenCurrentProduct || 0];
  const isSolr = currentProduct.id === 'solr';
  
  // Animation au curseur (coeur pour SOLR, marteau pour les autres)
  createCursorHitEffect(e, isSolr);
  
  // Incrémenter le compteur global
  state.zenPunchCount = (state.zenPunchCount || 0) + 1;
  updateZenCounter(true);
  persistState();
  
  if (isSolr) {
    // SOLR : pas de destruction, juste des coeurs autour
    createFloatingHearts();
  } else {
    // Autres produits : désagrégation normale
    const damagePerHit = 100 / currentProduct.hitsToDestroy;
    state.zenProductHealth = Math.max(0, (state.zenProductHealth || 100) - damagePerHit);
    createDisintegrationParticles(currentProduct);
    persistState();
  }
  
  // Animations visuelles
  const animationType = Math.random();
  let randomRotate, randomScale, bounceScale;
  
  if (animationType < 0.33) {
    randomRotate = (Math.random() - 0.5) * 20;
    randomScale = 0.7 + Math.random() * 0.1;
    bounceScale = 1.2 + Math.random() * 0.08;
  } else if (animationType < 0.66) {
    randomRotate = (Math.random() - 0.5) * 25;
    randomScale = 0.75 + Math.random() * 0.08;
    bounceScale = 1.15 + Math.random() * 0.1;
  } else {
    randomRotate = (Math.random() - 0.5) * 12;
    randomScale = 0.8 + Math.random() * 0.1;
    bounceScale = 1.25 + Math.random() * 0.1;
  }
  
  button.style.transition = 'transform 0.06s cubic-bezier(0.34, 1.56, 0.64, 1)';
  button.style.transform = `scale(${randomScale}) rotate(${randomRotate}deg)`;
  
  // Effet d'impact
  const impact = button.querySelector('.zen-impact-effect');
  if (impact) {
    impact.style.animation = 'none';
    setTimeout(() => {
      impact.style.animation = 'zenImpact 0.3s ease-out';
    }, 1);
  }
  
  // Vibration
  if (navigator.vibrate) {
    navigator.vibrate(20);
  }
  
  // Rebond
  setTimeout(() => {
    button.style.transform = `scale(${bounceScale}) rotate(${-randomRotate * 0.5}deg)`;
    button.style.transition = 'transform 0.14s cubic-bezier(0.34, 1.56, 0.64, 1)';
    setTimeout(() => {
      button.style.transform = 'scale(1) rotate(0deg)';
      button.style.transition = 'transform 0.18s ease-out';
    }, 90);
  }, 50);
  
  // Shockwave
  const shockwave = button.querySelector('.zen-shockwave');
  if (shockwave) {
    shockwave.style.animation = 'none';
    setTimeout(() => {
      shockwave.style.animation = 'zenShockwave 0.5s ease-out';
    }, 1);
  }
  
  // Vérifier si le produit est détruit (pas pour SOLR)
  if (!isSolr && state.zenProductHealth <= 0) {
    destroyCurrentProduct();
  }
  
}

function createCursorHitEffect(e, isHeart) {
  const container = elements.cursorHit;
  if (!container) return;
  
  const icon = document.createElement('img');
  icon.className = isHeart ? 'cursor-hit-heart' : 'cursor-hit-icon';
  icon.src = isHeart ? './Assets/red-heart_2764-fe0f.png' : './Assets/hammer_1f528.png';
  icon.alt = isHeart ? 'heart' : 'hammer';
  icon.style.left = e.clientX + 'px';
  icon.style.top = e.clientY + 'px';
  
  container.appendChild(icon);
  setTimeout(() => icon.remove(), 500);
}

function createFloatingHearts() {
  const container = elements.zenParticles;
  const canvas = elements.zenProductCanvas;
  if (!container || !canvas) return;
  
  const canvasRect = canvas.getBoundingClientRect();
  const centerX = canvasRect.left + canvasRect.width / 2;
  const centerY = canvasRect.top + canvasRect.height / 2;
  
  // Créer 3-5 coeurs flottants
  const heartCount = 3 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < heartCount; i++) {
    const heart = document.createElement('img');
    heart.className = 'floating-heart';
    heart.src = './Assets/red-heart_2764-fe0f.png';
    heart.alt = 'heart';
    
    // Position de départ autour du produit
    const startAngle = Math.random() * Math.PI * 2;
    const startRadius = 80 + Math.random() * 60;
    const startX = centerX + Math.cos(startAngle) * startRadius;
    const startY = centerY + Math.sin(startAngle) * startRadius;
    
    heart.style.left = startX + 'px';
    heart.style.top = startY + 'px';
    
    // Direction de flottement (vers le haut avec légère déviation)
    const floatX = (Math.random() - 0.5) * 80;
    const floatY = -80 - Math.random() * 60;
    
    heart.style.setProperty('--float-x', floatX + 'px');
    heart.style.setProperty('--float-y', floatY + 'px');
    
    container.appendChild(heart);
    setTimeout(() => heart.remove(), 1200);
  }
}


function destroyCurrentProduct() {
  const currentProduct = ZEN_PRODUCTS[state.zenCurrentProduct || 0];
  
  // Incrémenter le compteur de destruction
  if (!state.zenDestroyCount) state.zenDestroyCount = { solr: 0, t598: 0, t818: 0, sf1000: 0 };
  state.zenDestroyCount[currentProduct.id] = (state.zenDestroyCount[currentProduct.id] || 0) + 1;
  persistState();
  
  // Explosion finale massive
  createDestructionExplosion();
  
  // Effacer le canvas
  const canvas = elements.zenProductCanvas;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  
  // Attendre quelques secondes puis fade in le même produit
  setTimeout(() => {
    state.zenProductHealth = 100;
    updateZenProduct(true); // true = avec fade in
    persistState();
  }, 1500);
}

function updateZenProduct(fadeIn = false) {
  const product = ZEN_PRODUCTS[state.zenCurrentProduct || 0];
  
  // Mettre à jour le thème
  if (elements.zenOverlay) {
    elements.zenOverlay.dataset.theme = product.id;
  }
  
  // Mettre à jour les boutons actifs
  [elements.zenBtnSolr, elements.zenBtnT598, elements.zenBtnT818, elements.zenBtnSf1000].forEach((btn, index) => {
    if (btn) {
      btn.classList.toggle('active', index === state.zenCurrentProduct);
    }
  });
  
  // Mettre à jour l'image source (cachée)
  if (elements.zenProductImg) {
    elements.zenProductImg.src = `./Assets/${product.image}`;
    elements.zenProductImg.alt = product.name;
    
    // Redessiner sur le canvas une fois l'image chargée
    elements.zenProductImg.onload = () => {
      drawProductOnCanvas();
      if (fadeIn && elements.zenProductCanvas) {
        elements.zenProductCanvas.classList.remove('appearing');
        void elements.zenProductCanvas.offsetWidth; // Force reflow
        elements.zenProductCanvas.classList.add('appearing');
      }
    };
    // Si déjà en cache
    if (elements.zenProductImg.complete) {
      drawProductOnCanvas();
      if (fadeIn && elements.zenProductCanvas) {
        elements.zenProductCanvas.classList.remove('appearing');
        void elements.zenProductCanvas.offsetWidth; // Force reflow
        elements.zenProductCanvas.classList.add('appearing');
      }
    }
  }
}

function selectZenProduct(index) {
  if (index === state.zenCurrentProduct) return;
  state.zenCurrentProduct = index;
  state.zenProductHealth = 100;
  updateZenProduct();
  persistState();
}

function drawProductOnCanvas() {
  const canvas = elements.zenProductCanvas;
  const img = elements.zenProductImg;
  if (!canvas || !img) return;
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Centrer l'image dans le canvas
  const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight) * 0.9;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;
  
  ctx.drawImage(img, x, y, w, h);
}

function createDisintegrationParticles(product) {
  const container = elements.zenParticles;
  const canvas = elements.zenProductCanvas;
  if (!container || !canvas) return;
  
  const ctx = canvas.getContext('2d');
  const canvasRect = canvas.getBoundingClientRect();
  
  // Fragments de taille moyenne
  const fragmentCount = 3 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < fragmentCount; i++) {
    // Taille réduite
    const fragSize = Math.floor(12 + Math.random() * 20);
    const fragWidth = fragSize + Math.floor(Math.random() * 8 - 4);
    const fragHeight = fragSize + Math.floor(Math.random() * 8 - 4);
    
    // Position aléatoire sur le canvas
    const canvasX = Math.floor(Math.random() * (canvas.width - fragWidth));
    const canvasY = Math.floor(Math.random() * (canvas.height - fragHeight));
    
    // Extraire les pixels de cette zone
    let imageData;
    try {
      imageData = ctx.getImageData(canvasX, canvasY, fragWidth, fragHeight);
    } catch (e) {
      continue;
    }
    
    // Vérifier s'il y a des pixels non-transparents à cet endroit
    let hasPixels = false;
    for (let p = 3; p < imageData.data.length; p += 4) {
      if (imageData.data[p] > 50) {
        hasPixels = true;
        break;
      }
    }
    
    if (!hasPixels) continue;
    
    // Générer une forme irrégulière très prononcée avec clip-path
    const points = [];
    const numPoints = 6 + Math.floor(Math.random() * 5);
    for (let j = 0; j < numPoints; j++) {
      const angle = (j / numPoints) * Math.PI * 2;
      // Rayons très variables pour des formes plus prononcées
      const radiusVariation = 25 + Math.random() * 25;
      const px = 50 + Math.cos(angle) * radiusVariation;
      const py = 50 + Math.sin(angle) * radiusVariation;
      points.push(`${px}% ${py}%`);
    }
    const clipPath = `polygon(${points.join(', ')})`;
    
    // Effacer cette zone du canvas avec forme irrégulière
    ctx.save();
    ctx.beginPath();
    for (let j = 0; j < numPoints; j++) {
      const angle = (j / numPoints) * Math.PI * 2;
      const rx = fragWidth * (0.3 + Math.random() * 0.4);
      const ry = fragHeight * (0.3 + Math.random() * 0.4);
      const px = canvasX + fragWidth/2 + Math.cos(angle) * rx;
      const py = canvasY + fragHeight/2 + Math.sin(angle) * ry;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.clip();
    ctx.clearRect(canvasX - 10, canvasY - 10, fragWidth + 20, fragHeight + 20);
    ctx.restore();
    
    // Créer un mini canvas pour le fragment
    const fragCanvas = document.createElement('canvas');
    fragCanvas.width = fragWidth;
    fragCanvas.height = fragHeight;
    fragCanvas.className = 'zen-fragment';
    const fragCtx = fragCanvas.getContext('2d');
    fragCtx.putImageData(imageData, 0, 0);
    
    // Calculer la position écran du fragment
    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;
    const screenX = canvasRect.left + canvasX * scaleX;
    const screenY = canvasRect.top + canvasY * scaleY;
    
    fragCanvas.style.left = screenX + 'px';
    fragCanvas.style.top = screenY + 'px';
    fragCanvas.style.width = fragWidth * scaleX + 'px';
    fragCanvas.style.height = fragHeight * scaleY + 'px';
    fragCanvas.style.clipPath = clipPath;
    
    // Effet de lueur selon le thème
    const color = product.colors[Math.floor(Math.random() * product.colors.length)];
    fragCanvas.style.filter = `drop-shadow(0 0 8px ${color})`;
    
    // Animation de chute avec plus de vélocité
    const fallX = (Math.random() - 0.5) * 350;
    const fallY = 400 + Math.random() * 500;
    const rotation = Math.random() * 1080 - 540;
    const duration = 0.5 + Math.random() * 0.4;
    
    fragCanvas.style.setProperty('--fall-x', fallX + 'px');
    fragCanvas.style.setProperty('--fall-y', fallY + 'px');
    fragCanvas.style.setProperty('--rotation', rotation + 'deg');
    fragCanvas.style.animation = `fragmentFall ${duration}s ease-in forwards`;
    
    container.appendChild(fragCanvas);
    setTimeout(() => fragCanvas.remove(), duration * 1000 + 100);
  }
}

function createDestructionExplosion() {
  const container = elements.zenParticles;
  const canvas = elements.zenProductCanvas;
  if (!container || !canvas) return;
  
  const product = ZEN_PRODUCTS[state.zenCurrentProduct || 0];
  const canvasRect = canvas.getBoundingClientRect();
  const centerX = canvasRect.left + canvasRect.width / 2;
  const centerY = canvasRect.top + canvasRect.height / 2;
  
  // Grande explosion de particules
  const particleCount = 40 + Math.floor(Math.random() * 20);
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'zen-particle';
    
    const size = 8 + Math.random() * 16;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.style.left = centerX + 'px';
    particle.style.top = centerY + 'px';
    
    const color = product.colors[Math.floor(Math.random() * product.colors.length)];
    particle.style.background = color;
    particle.style.boxShadow = `0 0 ${size * 3}px ${color}`;
    
    const angle = (Math.PI * 2 * i / particleCount) + (Math.random() - 0.5) * 0.5;
    const distance = 200 + Math.random() * 300;
    const endX = Math.cos(angle) * distance;
    const endY = Math.sin(angle) * distance;
    const rotation = Math.random() * 1440 - 720;
    const duration = 0.6 + Math.random() * 0.4;
    
    particle.style.animation = `zenParticleFly ${duration}s ease-out forwards`;
    particle.style.setProperty('--end-x', endX + 'px');
    particle.style.setProperty('--end-y', endY + 'px');
    particle.style.setProperty('--final-x', endX + 'px');
    particle.style.setProperty('--final-y', (endY + 150) + 'px');
    particle.style.setProperty('--rotation', rotation + 'deg');
    
    container.appendChild(particle);
    setTimeout(() => particle.remove(), duration * 1000 + 200);
  }
}

function updateZenCounter(shouldGiggle = false) {
  if (!elements.zenCounter) return;
  const count = state.zenPunchCount || 0;
  elements.zenCounter.textContent = count;
  
  if (shouldGiggle) {
    elements.zenCounter.classList.add('giggle');
    setTimeout(() => {
      elements.zenCounter.classList.remove('giggle');
    }, 300);
  }
}

function createZenParticles(e, button) {
  const particlesContainer = elements.zenParticles;
  if (!particlesContainer) return;
  
  const currentProduct = ZEN_PRODUCTS[state.zenCurrentProduct || 0];
  const buttonRect = button.getBoundingClientRect();
  const centerX = buttonRect.left + buttonRect.width / 2;
  const centerY = buttonRect.top + buttonRect.height / 2;
  
  // Créer 12-18 particules qui volent dans tous les sens
  const particleCount = 12 + Math.floor(Math.random() * 7);
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'zen-particle';
    
    // Angle aléatoire dans toutes les directions (360 degrés)
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 60;
    const startX = centerX;
    const startY = centerY;
    
    // Taille aléatoire (plus petite)
    const size = 4 + Math.random() * 6;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.style.left = startX + 'px';
    particle.style.top = startY + 'px';
    
    // Couleurs du thème actuel
    const color = currentProduct.colors[Math.floor(Math.random() * currentProduct.colors.length)];
    particle.style.background = color;
    particle.style.boxShadow = `0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color}`;
    
    // Animation dans toutes les directions avec chute à la fin
    const travelDistance = 250 + Math.random() * 300;
    const travelDuration = 0.4 + Math.random() * 0.3;
    const endX = Math.cos(angle) * travelDistance;
    const endY = Math.sin(angle) * travelDistance;
    const rotation = Math.random() * 1440 - 720;
    
    // Position finale avec chute (gravité)
    const fallDistance = 100 + Math.random() * 150;
    const finalX = endX;
    const finalY = endY + fallDistance; // Chute vers le bas
    
    particle.style.animation = `zenParticleFly ${travelDuration}s ease-out forwards`;
    particle.style.setProperty('--end-x', endX + 'px');
    particle.style.setProperty('--end-y', endY + 'px');
    particle.style.setProperty('--final-x', finalX + 'px');
    particle.style.setProperty('--final-y', finalY + 'px');
    particle.style.setProperty('--rotation', rotation + 'deg');
    
    particlesContainer.appendChild(particle);
    
    // Supprimer après l'animation (avec marge pour la chute)
    setTimeout(() => {
      particle.remove();
    }, (travelDuration * 1000) + 200);
  }
}

function openEdition(tabName = 'categories') {
  elements.editionModal.classList.remove('hidden');
  if (editingSelectedCategoryId === null) {
    editingSelectedCategoryId = elements.manageCategorySelect?.value || state.categories[0]?.id || null;
  }
  const tabMap = { chargers: 'chargersTab', bullets: 'bulletsTab', categories: 'categoriesTab' };
  switchTab(tabMap[tabName] || 'categoriesTab');
  renderManageLists();
}

function closeEdition() {
  elements.editionModal.classList.add('hidden');
  setCategoryFormMode(null);
  setBulletFormMode(null);
  setChargerFormMode(null);
  editingSelectedCategoryId = null;
}

function switchTab(tabId) {
  elements.tabButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  
  elements.tabs.categories.classList.toggle('hidden', tabId !== 'categoriesTab');
  elements.tabs.bullets.classList.toggle('hidden', tabId !== 'bulletsTab');
  elements.tabs.chargers.classList.toggle('hidden', tabId !== 'chargersTab');
  elements.tabs.taskTemplates.classList.toggle('hidden', tabId !== 'taskTemplatesTab');
  
  if (tabId === 'chargersTab') {
    populateChargerTaskTemplateSelect();
  }
}

function handleCategorySubmit(e) {
  e.preventDefault();
  const name = elements.categoryName.value.trim();
  if (!name) return;

  if (editingCategoryId) {
    const cat = state.categories.find((c) => c.id === editingCategoryId);
    if (cat) {
      cat.name = name;
      cat.color = selectedColor;
    }
    if (state.selectedCategoryId === editingCategoryId) updateCurrentCategoryLabel();
  } else {
    const id = createId('cat');
    const maxOrder = Math.max(...state.categories.map(c => c.order ?? 0), -1);
    state.categories.push({ id, name, color: selectedColor, order: maxOrder + 1 });
    state.selectedCategoryId = id;
  }
  persistState();
  setCategoryFormMode(null);
  renderCategorySelect();
  renderBullets();
  renderManageLists();
}


function renderManageLists() {
  renderCategoryManageList();
  renderManageCategorySelect();
  renderBulletManageList();
  renderChargerManageList();
  renderTaskTemplateManageList();
}

function renderCategoryManageList() {
  elements.categoryManageList.innerHTML = '';
  const sortedCategories = [...state.categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  
  sortedCategories.forEach((cat) => {
    const count = state.bullets.filter((b) => b.categoryId === cat.id).length;
    const color = cat.color || CATEGORY_COLORS[0];
    const item = document.createElement('li');
    item.className = 'manage-item draggable-item';
    item.draggable = true;
    item.dataset.categoryId = cat.id;
    item.innerHTML = `
      <div class="drag-handle" title="Glisser pour réorganiser">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </div>
      <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
        <div style="width: 20px; height: 20px; border-radius: 4px; background-color: ${color}; flex-shrink: 0;"></div>
      <div>
        <p class="manage-item-title">${cat.name}</p>
          <p class="manage-item-sub">${count} snippet${count > 1 ? 's' : ''}</p>
        </div>
      </div>
      <div class="manage-actions">
        <button class="small" data-action="edit">Éditer</button>
        <button class="small" data-action="delete">Supprimer</button>
      </div>
    `;
    item.querySelector('[data-action="edit"]').addEventListener('click', () => setCategoryFormMode(cat.id));
    item.querySelector('[data-action="delete"]').addEventListener('click', () => deleteCategory(cat.id));
    
    item.addEventListener('dragstart', handleCategoryDragStart);
    item.addEventListener('dragover', handleCategoryDragOver);
    item.addEventListener('drop', handleCategoryDrop);
    item.addEventListener('dragend', handleCategoryDragEnd);
    
    elements.categoryManageList.appendChild(item);
  });
}

function setCategoryFormMode(categoryId) {
  editingCategoryId = categoryId;
  if (categoryId) {
    const cat = state.categories.find((c) => c.id === categoryId);
    elements.categoryName.value = cat?.name || '';
    selectedColor = cat?.color || CATEGORY_COLORS[0];
  } else {
    elements.categoryName.value = '';
    selectedColor = CATEGORY_COLORS[0];
  }
  renderColorPicker();
  elements.categoryForm.querySelector('.primary').textContent = categoryId ? 'Mettre à jour' : 'Ajouter';
}

function deleteCategory(id) {
  if (!confirm('Supprimer cette catégorie et ses snippets ?')) return;
  state.categories = state.categories.filter((c) => c.id !== id);
  state.bullets = state.bullets.filter((b) => b.categoryId !== id);
  if (state.selectedCategoryId === id) {
    state.selectedCategoryId = state.categories[0]?.id || null;
  }
  if (state.activeBulletId && !state.bullets.find((b) => b.id === state.activeBulletId)) {
    state.activeBulletId = null;
  }
  persistState();
  renderCategorySelect();
  renderBullets();
  renderManageLists();
}

function renderManageCategorySelect() {
  const currentValue = elements.manageCategorySelect?.value || null;
  elements.manageCategorySelect.innerHTML = '';
  state.categories.forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.name;
    elements.manageCategorySelect.appendChild(option);
  });
  // Utiliser editingSelectedCategoryId pour le menu édition, pas state.selectedCategoryId
  if (editingSelectedCategoryId && state.categories.find(c => c.id === editingSelectedCategoryId)) {
    elements.manageCategorySelect.value = editingSelectedCategoryId;
  } else if (currentValue && state.categories.find(c => c.id === currentValue)) {
    elements.manageCategorySelect.value = currentValue;
    editingSelectedCategoryId = currentValue;
  } else if (state.categories.length > 0) {
    // Par défaut, première catégorie
    elements.manageCategorySelect.value = state.categories[0].id;
    editingSelectedCategoryId = state.categories[0].id;
  }
}

function handleBulletSubmit(e) {
  e.preventDefault();
  const title = elements.bulletTitle.value.trim();
  const content = elements.bulletContent.value.trim();
  const insertMode = elements.bulletInsertMode?.value || 'line';
  const taskText = elements.bulletTaskText?.value.trim() || '';
  const taskOptional = !!(elements.bulletTaskOptional && elements.bulletTaskOptional.checked);
  const categoryId = elements.manageCategorySelect.value;
  if (!title || !content || !categoryId) return;

  if (editingBulletId) {
    const bullet = state.bullets.find((b) => b.id === editingBulletId);
    if (bullet) {
      bullet.title = title;
      bullet.content = content;
      bullet.insertMode = insertMode;
      bullet.categoryId = categoryId;
      bullet.taskText = taskText;
      bullet.taskOptional = taskOptional;
    }
  } else {
    const bulletsInCategory = state.bullets.filter(b => b.categoryId === categoryId);
    const maxOrder = Math.max(...bulletsInCategory.map(b => b.order ?? 0), -1);
    state.bullets.push({ id: createId('b'), title, content, insertMode, categoryId, taskText, taskOptional, order: maxOrder + 1 });
  }
  persistState();
  setBulletFormMode(null);
  renderBullets(); // Mettre à jour la vue principale avec les nouveaux snippets
  renderManageLists();
}

function setBulletFormMode(bulletId) {
  editingBulletId = bulletId;
  if (bulletId) {
    const bullet = state.bullets.find((b) => b.id === bulletId);
    elements.bulletTitle.value = bullet?.title || '';
    elements.bulletContent.value = bullet?.content || '';
    if (elements.bulletInsertMode) {
      elements.bulletInsertMode.value = bullet?.insertMode || 'line';
    }
    if (elements.bulletTaskText) {
      elements.bulletTaskText.value = bullet?.taskText || '';
    }
    if (elements.bulletTaskOptional) {
      elements.bulletTaskOptional.checked = !!(bullet && bullet.taskOptional);
    }
    if (bullet?.categoryId) {
      elements.manageCategorySelect.value = bullet.categoryId;
      // Mettre à jour la catégorie du menu édition, pas celle de l'accueil
      editingSelectedCategoryId = bullet.categoryId;
      renderManageCategorySelect();
      renderBulletManageList();
    }
    elements.bulletForm.querySelector('.primary').textContent = 'Mettre à jour';
  } else {
    elements.bulletTitle.value = '';
    elements.bulletContent.value = '';
    if (elements.bulletInsertMode) {
      elements.bulletInsertMode.value = 'line';
    }
    if (elements.bulletTaskText) {
      elements.bulletTaskText.value = '';
    }
    if (elements.bulletTaskOptional) {
      elements.bulletTaskOptional.checked = false;
    }
    elements.bulletForm.querySelector('.primary').textContent = 'Enregistrer';
  }
}

function renderBulletManageList() {
  const categoryId = elements.manageCategorySelect.value;
  let bullets = state.bullets.filter((b) => b.categoryId === categoryId);
  // Trier par ordre
  bullets = bullets.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  
  elements.bulletManageList.innerHTML = '';
  if (!bullets.length) {
    const li = document.createElement('li');
    li.className = 'manage-item';
    li.textContent = 'Aucun snippet.';
    elements.bulletManageList.appendChild(li);
    return;
  }

  bullets.forEach((bullet) => {
    const item = document.createElement('li');
    item.className = 'manage-item draggable-item';
    item.draggable = true;
    item.dataset.bulletId = bullet.id;
    item.innerHTML = `
      <div class="drag-handle" title="Glisser pour réorganiser">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </div>
      <div style="flex: 1;">
        <p class="manage-item-title">${bullet.title}</p>
        <p class="manage-item-sub">${truncate(bullet.content, 80)}</p>
      </div>
      <div class="manage-actions">
        <button class="small" data-action="edit">Éditer</button>
        <button class="small" data-action="delete">Supprimer</button>
      </div>
    `;
    item.querySelector('[data-action="edit"]').addEventListener('click', () => setBulletFormMode(bullet.id));
    item.querySelector('[data-action="delete"]').addEventListener('click', () => deleteBullet(bullet.id));
    
    // Drag and drop
    item.addEventListener('dragstart', handleBulletDragStart);
    item.addEventListener('dragover', handleBulletDragOver);
    item.addEventListener('drop', handleBulletDrop);
    item.addEventListener('dragend', handleBulletDragEnd);
    
    elements.bulletManageList.appendChild(item);
  });
}

let draggedCategoryId = null;

function handleCategoryDragStart(e) {
  draggedCategoryId = e.target.dataset.categoryId || e.target.closest('.draggable-item')?.dataset.categoryId;
  e.target.closest('.draggable-item').classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', e.target.outerHTML);
}

function handleCategoryDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const item = e.target.closest('.draggable-item');
  if (item && item.dataset.categoryId && item.dataset.categoryId !== draggedCategoryId) {
    const rect = item.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    document.querySelectorAll('.draggable-item').forEach(i => {
      if (i !== item) {
        i.classList.remove('drag-over-top', 'drag-over-bottom');
      }
    });
    if (e.clientY < midY) {
      item.classList.add('drag-over-top');
      item.classList.remove('drag-over-bottom');
    } else {
      item.classList.add('drag-over-bottom');
      item.classList.remove('drag-over-top');
    }
  }
}

function handleCategoryDrop(e) {
  e.preventDefault();
  const targetItem = e.target.closest('.draggable-item');
  if (!targetItem || !draggedCategoryId || targetItem.dataset.categoryId === draggedCategoryId) {
    return;
  }
  
  const sorted = [...state.categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const draggedIndex = sorted.findIndex(c => c.id === draggedCategoryId);
  const targetIndex = sorted.findIndex(c => c.id === targetItem.dataset.categoryId);
  
  if (draggedIndex === -1 || targetIndex === -1) return;
  
  // Réorganiser les ordres
  const dragged = sorted[draggedIndex];
  sorted.splice(draggedIndex, 1);
  sorted.splice(targetIndex, 0, dragged);
  
  sorted.forEach((cat, index) => {
    cat.order = index;
  });
  
  // Mettre à jour state.categories avec le nouvel ordre
  state.categories = sorted;
  persistState();
  
  renderCategorySelect();
  renderBullets();
  renderManageLists();
}

function handleCategoryDragEnd(e) {
  e.target.closest('.draggable-item')?.classList.remove('dragging');
  document.querySelectorAll('.draggable-item').forEach(item => {
    item.classList.remove('drag-over-top', 'drag-over-bottom');
  });
  draggedCategoryId = null;
}

let draggedBulletId = null;

function handleBulletDragStart(e) {
  draggedBulletId = e.target.dataset.bulletId || e.target.closest('.draggable-item')?.dataset.bulletId;
  e.target.closest('.draggable-item').classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', e.target.outerHTML);
}

function handleBulletDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const item = e.target.closest('.draggable-item');
  if (item && item.dataset.bulletId && item.dataset.bulletId !== draggedBulletId) {
    const rect = item.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    document.querySelectorAll('.draggable-item').forEach(i => {
      if (i !== item) {
        i.classList.remove('drag-over-top', 'drag-over-bottom');
      }
    });
    if (e.clientY < midY) {
      item.classList.add('drag-over-top');
      item.classList.remove('drag-over-bottom');
    } else {
      item.classList.add('drag-over-bottom');
      item.classList.remove('drag-over-top');
    }
  }
}

function handleBulletDrop(e) {
  e.preventDefault();
  const targetItem = e.target.closest('.draggable-item');
  if (!targetItem || !draggedBulletId || targetItem.dataset.bulletId === draggedBulletId) {
    return;
  }
  
  const categoryId = elements.manageCategorySelect.value;
  let bullets = state.bullets.filter(b => b.categoryId === categoryId);
  bullets = bullets.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  
  const draggedIndex = bullets.findIndex(b => b.id === draggedBulletId);
  const targetIndex = bullets.findIndex(b => b.id === targetItem.dataset.bulletId);
  
  if (draggedIndex === -1 || targetIndex === -1) return;
  
  // Réorganiser les ordres
  const dragged = bullets[draggedIndex];
  bullets.splice(draggedIndex, 1);
  bullets.splice(targetIndex, 0, dragged);
  
  bullets.forEach((bullet, index) => {
    bullet.order = index;
  });
  
  // Mettre à jour state.bullets avec les nouveaux ordres
  bullets.forEach(bullet => {
    const originalBullet = state.bullets.find(b => b.id === bullet.id);
    if (originalBullet) {
      originalBullet.order = bullet.order;
    }
  });
  
  persistState();
  
  // Mettre à jour la vue principale avec les snippets réorganisés
  renderBullets();
  renderBulletManageList();
}

function handleBulletDragEnd(e) {
  e.target.closest('.draggable-item')?.classList.remove('dragging');
  document.querySelectorAll('.draggable-item').forEach(item => {
    item.classList.remove('drag-over-top', 'drag-over-bottom');
  });
  draggedBulletId = null;
}

function deleteBullet(id) {
  if (!confirm('Supprimer ce snippet ?')) return;
  state.bullets = state.bullets.filter((b) => b.id !== id);
  if (state.activeBulletId === id) {
    state.activeBulletId = null;
    state.emailText = '';
    renderEditorText();
    updateTagIndicator();
  }
  persistState();
  renderBullets();
  renderManageLists();
}

function handleChargerSubmit(e) {
  e.preventDefault();
  const name = elements.chargerName.value.trim();
  const content = elements.chargerContent.value.trim();
  const lang = editingChargerLang || 'en';
  const taskTemplateId = elements.chargerTaskTemplate?.value || '';
  const taskOptional = !!(elements.chargerTaskOptional && elements.chargerTaskOptional.checked);
  if (!name || !content) return;

  if (editingChargerId) {
    const charger = state.chargers.find((c) => c.id === editingChargerId);
    if (charger) {
      charger.name = name;
      charger.content = content;
      charger.lang = lang;
      charger.taskTemplateId = taskTemplateId || undefined;
      charger.taskOptional = taskOptional;
    }
  } else {
    state.chargers.push({ id: createId('ch'), name, content, lang, taskTemplateId: taskTemplateId || undefined, taskOptional });
  }
  persistState();
  setChargerFormMode(null);
  renderChargerManageList();
  renderChargerSearchResults();
}

function populateChargerTaskTemplateSelect() {
  if (!elements.chargerTaskTemplate) return;
  elements.chargerTaskTemplate.innerHTML = '<option value="">Aucune</option>';
  state.taskTemplates.forEach(template => {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = template.name;
    elements.chargerTaskTemplate.appendChild(option);
  });
}

function setChargerFormMode(id) {
  editingChargerId = id;
  populateChargerTaskTemplateSelect();
  if (id) {
    const charger = state.chargers.find((c) => c.id === id);
    elements.chargerName.value = charger?.name || '';
    elements.chargerContent.value = charger?.content || '';
    editingChargerLang = charger?.lang || 'en';
    updateChargerLangButtonsUI();
    if (elements.chargerTaskTemplate && charger?.taskTemplateId) {
      elements.chargerTaskTemplate.value = charger.taskTemplateId;
    }
    if (elements.chargerTaskOptional) {
      elements.chargerTaskOptional.checked = !!(charger && charger.taskOptional);
    }
    elements.chargerForm.querySelector('.primary').textContent = 'Mettre à jour';
  } else {
    elements.chargerName.value = '';
    elements.chargerContent.value = '';
    editingChargerLang = state.chargerLang || 'en';
    updateChargerLangButtonsUI();
    if (elements.chargerTaskTemplate) {
      elements.chargerTaskTemplate.value = '';
    }
    if (elements.chargerTaskOptional) {
      elements.chargerTaskOptional.checked = false;
    }
    elements.chargerForm.querySelector('.primary').textContent = 'Enregistrer';
  }
}

function renderChargerManageList() {
  elements.chargerManageList.innerHTML = '';
  
  if (!state.chargers.length) {
    const empty = document.createElement('li');
    empty.className = 'manage-item';
    empty.textContent = 'Aucun template.';
    elements.chargerManageList.appendChild(empty);
    return;
  }
  
  state.chargers.forEach((charger) => {
    const lang = charger.lang || 'en';
    const flagSrc = lang === 'fr' ? './Assets/fr.svg' : './Assets/gb.svg';
    const item = document.createElement('li');
    item.className = 'manage-item';
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
      <div>
        <p class="manage-item-title">${charger.name}</p>
        <p class="manage-item-sub">${truncate(charger.content, 80)}</p>
        </div>
        <img src="${flagSrc}" alt="${lang.toUpperCase()}" class="flag-icon" aria-hidden="true" />
      </div>
      <div class="manage-actions">
        <button class="small" data-action="use">Charger</button>
        <button class="small" data-action="edit">Éditer</button>
        <button class="small" data-action="delete">Supprimer</button>
      </div>
    `;
    item.querySelector('[data-action="use"]').addEventListener('click', () => {
      setEmailText(charger.content, charger.id);
    });
    item.querySelector('[data-action="edit"]').addEventListener('click', () => setChargerFormMode(charger.id));
    item.querySelector('[data-action="delete"]').addEventListener('click', () => deleteCharger(charger.id));
    elements.chargerManageList.appendChild(item);
  });
}

function deleteCharger(id) {
  if (!confirm('Supprimer ce template ?')) return;
  state.chargers = state.chargers.filter((c) => c.id !== id);
  persistState();
  renderChargerManageList();
}

function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

// Sauvegarder l'état dans le stockage local
function persistState() {
  try {
    const dataToSave = {
    categories: state.categories,
    bullets: state.bullets,
    chargers: state.chargers,
      taskTemplates: state.taskTemplates,
    selectedCategoryId: state.selectedCategoryId,
    activeBulletId: state.activeBulletId,
    emailText: state.emailText,
      taskText: state.taskText,
      noteText: state.noteText,
      chargerLang: state.chargerLang,
      zenPunchCount: state.zenPunchCount,
      zenCurrentProduct: state.zenCurrentProduct,
      zenProductHealth: state.zenProductHealth,
      zenDestroyCount: state.zenDestroyCount,
      copiedEmails: state.copiedEmails,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (e) {
    console.error('Erreur lors de la sauvegarde de l\'état:', e);
  }
}

function handleExport() {
  const data = {
    categories: state.categories,
    bullets: state.bullets,
    chargers: state.chargers,
    taskTemplates: state.taskTemplates,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `typefast-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Données exportées');
}

function downloadCsv(filename, rows) {
  if (!rows || !rows.length) return;
  const escapeCell = (value) => {
    if (value == null) return '';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };
  const csvContent = rows.map(row => row.map(escapeCell).join(';')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleSpreadsheetExport() {
  const allRows = [];
  const catsById = new Map(state.categories.map(c => [c.id, c]));

  // Titre
  allRows.push(['Mail Template']);
  
  // En-têtes
  allRows.push(['NAME', 'CATEGORY', '', 'IS PRESENT ?', 'TASK NEEDED ?', 'TASK NAME', 'Note']);
  
  // Grouper les chargers par nom pour avoir FR et EN ensemble
  const templatesByName = new Map();
  state.chargers.forEach(ch => {
    if (!templatesByName.has(ch.name)) {
      templatesByName.set(ch.name, { 
        name: ch.name,
        categoryId: ch.categoryId,
        fr: false, 
        en: false 
      });
    }
    const entry = templatesByName.get(ch.name);
    if ((ch.lang || 'en') === 'fr') entry.fr = true;
    if ((ch.lang || 'en') === 'en') entry.en = true;
    // Garder la categoryId si pas encore définie
    if (!entry.categoryId && ch.categoryId) entry.categoryId = ch.categoryId;
  });
  
  // Générer les lignes pour chaque template
  templatesByName.forEach((data) => {
    const cat = catsById.get(data.categoryId);
    const categoryName = cat?.name || '';
    
    // Ligne FRENCH VERSION
    allRows.push([data.name, categoryName, 'FRENCH VERSION', data.fr ? 'YES' : 'NO', '', '', '']);
    // Ligne ENGLISH VERSION
    allRows.push(['', '', 'ENGLISH VERSION', data.en ? 'YES' : 'NO', '', '', '']);
  });

  downloadCsv('typemailfast-tableur.csv', allRows);
  showToast('Fichier CSV généré');
}

function handleImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.categories && data.bullets && data.chargers) {
          if (confirm('Importer ces données remplacera toutes vos données actuelles. Continuer ?')) {
            // Fusionner avec defaultState pour s'assurer que toutes les propriétés existent
            const merged = { ...defaultState, ...data };
            
            // Valider et initialiser les tableaux
            if (!Array.isArray(merged.categories)) merged.categories = [];
            if (!Array.isArray(merged.bullets)) merged.bullets = [];
            if (!Array.isArray(merged.chargers)) merged.chargers = [];
            if (!Array.isArray(merged.taskTemplates)) merged.taskTemplates = [];
            
            // Initialiser les autres propriétés si manquantes
            if (typeof merged.emailText !== 'string') merged.emailText = '';
            if (typeof merged.taskText !== 'string') merged.taskText = '';
            if (!merged.chargerLang) merged.chargerLang = 'en';
            if (typeof merged.taskBuilderVisible !== 'boolean') merged.taskBuilderVisible = true;
            
            // Appliquer les données au state
            state.categories = merged.categories;
            state.bullets = merged.bullets;
            state.chargers = merged.chargers;
            state.taskTemplates = merged.taskTemplates;
            state.emailText = merged.emailText;
            state.taskText = merged.taskText;
            state.chargerLang = merged.chargerLang;
            state.taskBuilderVisible = merged.taskBuilderVisible;
            state.selectedCategoryId = merged.selectedCategoryId || null;
            state.activeBulletId = merged.activeBulletId || null;
            persistState();
            
            // Normaliser les catégories
            state.categories.forEach((cat, index) => {
              if (!cat.color) cat.color = CATEGORY_COLORS[0];
              if (cat.order === undefined) cat.order = index;
            });
            
            // Normaliser les bullets
            state.categories.forEach(cat => {
              const bulletsInCat = state.bullets.filter(b => b.categoryId === cat.id);
              bulletsInCat.forEach((bullet, index) => {
                if (bullet.order === undefined) bullet.order = index;
              });
            });
            
            renderCategorySelect();
            renderBullets();
            renderManageLists();
            updateTaskBuilderVisibility();
            showToast('Données importées');
          }
        }
  } catch (err) {
        console.error('Erreur import:', err);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function renderChargerSearchResults() {
  const query = elements.chargerSearch.value.trim().toLowerCase();
  
  // Filtrer d'abord par langue
  let resultsToShow = state.chargers.filter(c => (c.lang || 'en') === state.chargerLang);
  
  // Puis filtrer par recherche si une query existe
  if (query) {
    resultsToShow = resultsToShow.filter(c => {
      const matchQuery = c.name.toLowerCase().includes(query) || c.content.toLowerCase().includes(query);
      return matchQuery;
    });
  }
  
  elements.chargerResults.innerHTML = '';
  
  if (!resultsToShow.length) {
    if (query) {
      elements.chargerResults.innerHTML = '<div class="search-result-item"><span class="result-name">Aucun résultat</span></div>';
      elements.chargerResults.classList.add('visible');
    } else {
      elements.chargerResults.classList.remove('visible');
    }
    return;
  }
  
  resultsToShow.forEach(charger => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML = `
      <div class="result-name">${charger.name}</div>
      <div class="result-preview">${truncate(charger.content, 60)}</div>
    `;
    item.dataset.content = charger.content;
    
    item.addEventListener('click', () => {
      setEmailText(charger.content, charger.id);
      state.activeBulletId = null;
      elements.chargerSearch.value = '';
      elements.chargerResults.classList.remove('visible');
    });
    
    item.addEventListener('mouseenter', (e) => showBulletTooltip(e, charger.content));
    item.addEventListener('mousemove', (e) => moveBulletTooltip(e));
    item.addEventListener('mouseleave', hideBulletTooltip);
    
    elements.chargerResults.appendChild(item);
  });
  
  elements.chargerResults.classList.add('visible');
}

// Task Template Functions
function handleTaskTemplateSubmit(e) {
  e.preventDefault();
  const name = elements.taskTemplateName.value.trim();
  const content = elements.taskTemplateContent.value.trim();
  if (!name || !content) return;

  if (editingTaskTemplateId) {
    const template = state.taskTemplates.find((t) => t.id === editingTaskTemplateId);
    if (template) {
      template.name = name;
      template.content = content;
    }
  } else {
    const maxOrder = state.taskTemplates.length > 0 
      ? Math.max(...state.taskTemplates.map(t => t.order ?? 0))
      : -1;
    state.taskTemplates.push({ id: createId('tt'), name, content, order: maxOrder + 1 });
  }
  persistState();
  setTaskTemplateFormMode(null);
  renderTaskTemplateManageList();
  populateChargerTaskTemplateSelect();
}

function setTaskTemplateFormMode(id) {
  editingTaskTemplateId = id;
  if (id) {
    const template = state.taskTemplates.find((t) => t.id === id);
    elements.taskTemplateName.value = template?.name || '';
    elements.taskTemplateContent.value = template?.content || '';
    elements.taskTemplateForm.querySelector('.primary').textContent = 'Mettre à jour';
  } else {
    elements.taskTemplateName.value = '';
    elements.taskTemplateContent.value = '';
    elements.taskTemplateForm.querySelector('.primary').textContent = 'Enregistrer';
  }
}

function renderTaskTemplateManageList() {
  elements.taskTemplateManageList.innerHTML = '';
  
  if (!state.taskTemplates.length) {
    const empty = document.createElement('li');
    empty.className = 'manage-item';
    empty.textContent = 'Aucun task template.';
    elements.taskTemplateManageList.appendChild(empty);
    return;
  }
  
  const sortedTemplates = [...state.taskTemplates].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  
  sortedTemplates.forEach((template, index) => {
    if (template.order === undefined) template.order = index;
    const item = document.createElement('li');
    item.className = 'manage-item draggable-item';
    item.draggable = true;
    item.dataset.templateId = template.id;
    item.innerHTML = `
      <div class="drag-handle" title="Glisser pour réorganiser">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </div>
      <div style="flex: 1;">
        <p class="manage-item-title">${template.name}</p>
        <p class="manage-item-sub">${truncate(template.content, 80)}</p>
      </div>
      <div class="manage-actions">
        <button class="small" data-action="use">Charger</button>
        <button class="small" data-action="edit">Éditer</button>
        <button class="small" data-action="delete">Supprimer</button>
      </div>
    `;
    item.querySelector('[data-action="use"]').addEventListener('click', () => {
      setTaskText(template.content);
    });
    item.querySelector('[data-action="edit"]').addEventListener('click', () => setTaskTemplateFormMode(template.id));
    item.querySelector('[data-action="delete"]').addEventListener('click', () => deleteTaskTemplate(template.id));
    
    // Drag and drop
    item.addEventListener('dragstart', handleTaskTemplateDragStart);
    item.addEventListener('dragover', handleTaskTemplateDragOver);
    item.addEventListener('drop', handleTaskTemplateDrop);
    item.addEventListener('dragend', handleTaskTemplateDragEnd);
    
    elements.taskTemplateManageList.appendChild(item);
  });
}

function deleteTaskTemplate(id) {
  if (!confirm('Supprimer ce task template ?')) return;
  state.taskTemplates = state.taskTemplates.filter((t) => t.id !== id);
  persistState();
  renderTaskTemplateManageList();
  populateChargerTaskTemplateSelect();
}

let draggedTaskTemplateId = null;

function handleTaskTemplateDragStart(e) {
  draggedTaskTemplateId = e.target.dataset.templateId || e.target.closest('.draggable-item')?.dataset.templateId;
  e.target.closest('.draggable-item').classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', e.target.outerHTML);
}

function handleTaskTemplateDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const item = e.target.closest('.draggable-item');
  if (item && item.dataset.templateId && item.dataset.templateId !== draggedTaskTemplateId) {
    const rect = item.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    document.querySelectorAll('.draggable-item').forEach(i => {
      if (i !== item) {
        i.classList.remove('drag-over-top', 'drag-over-bottom');
      }
    });
    if (e.clientY < midY) {
      item.classList.add('drag-over-top');
      item.classList.remove('drag-over-bottom');
    } else {
      item.classList.add('drag-over-bottom');
      item.classList.remove('drag-over-top');
    }
  }
}

function handleTaskTemplateDrop(e) {
  e.preventDefault();
  const targetItem = e.target.closest('.draggable-item');
  if (!targetItem || !draggedTaskTemplateId || targetItem.dataset.templateId === draggedTaskTemplateId) {
    return;
  }
  
  let templates = [...state.taskTemplates].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  
  const draggedIndex = templates.findIndex(t => t.id === draggedTaskTemplateId);
  const targetIndex = templates.findIndex(t => t.id === targetItem.dataset.templateId);
  
  if (draggedIndex === -1 || targetIndex === -1) return;
  
  // Réorganiser les ordres
  const dragged = templates[draggedIndex];
  templates.splice(draggedIndex, 1);
  templates.splice(targetIndex, 0, dragged);
  
  templates.forEach((template, index) => {
    template.order = index;
  });
  
  // Mettre à jour state.taskTemplates avec le nouvel ordre
  state.taskTemplates = templates;
  persistState();
  
  renderTaskTemplateManageList();
}

function handleTaskTemplateDragEnd(e) {
  e.target.closest('.draggable-item')?.classList.remove('dragging');
  document.querySelectorAll('.draggable-item').forEach(item => {
    item.classList.remove('drag-over-top', 'drag-over-bottom');
  });
  draggedTaskTemplateId = null;
}

function renderTaskTemplateSearchResults() {
  const query = elements.taskTemplateSearch.value.trim().toLowerCase();
  
  const resultsToShow = query
    ? state.taskTemplates.filter(t => {
        const matchQuery = t.name.toLowerCase().includes(query) || t.content.toLowerCase().includes(query);
        return matchQuery;
      })
    : state.taskTemplates;
  
  elements.taskTemplateResults.innerHTML = '';
  
  if (!resultsToShow.length) {
    if (query) {
      elements.taskTemplateResults.innerHTML = '<div class="search-result-item"><span class="result-name">Aucun résultat</span></div>';
      elements.taskTemplateResults.classList.add('visible');
    } else {
      elements.taskTemplateResults.classList.remove('visible');
    }
    return;
  }
  
  resultsToShow.forEach(template => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML = `
      <div class="result-name">${template.name}</div>
      <div class="result-preview">${truncate(template.content, 60)}</div>
    `;
    item.dataset.content = template.content;
    
    item.addEventListener('click', () => {
      setTaskText(template.content);
      elements.taskTemplateSearch.value = '';
      elements.taskTemplateResults.classList.remove('visible');
      // Revenir en haut du menu de recherche
      if (elements.taskTemplateResults) {
        elements.taskTemplateResults.scrollTop = 0;
      }
    });
    
    item.addEventListener('mouseenter', (e) => showBulletTooltip(e, template.content));
    item.addEventListener('mousemove', (e) => moveBulletTooltip(e));
    item.addEventListener('mouseleave', hideBulletTooltip);
    
    elements.taskTemplateResults.appendChild(item);
  });
  
  elements.taskTemplateResults.classList.add('visible');
}

function setTaskText(text) {
  // Si le texte actuel n'est pas vide, ajouter à la ligne suivante
      const currentTaskText = taskEditor ? taskEditor.getValue() : state.taskText;
  // Nettoyer le texte : supprimer les \n en début et fin
  const cleanedText = text.trim();
  
  if (currentTaskText && currentTaskText.trim()) {
    // S'assurer qu'il y a un saut de ligne avant le nouveau texte
    // Vérifier si le texte se termine par \n ou si le dernier caractère est un saut de ligne visuel
    const needsNewline = !currentTaskText.endsWith('\n') && currentTaskText.trim().length > 0;
    const prefix = needsNewline ? '\n' : '';
    state.taskText = currentTaskText + prefix + cleanedText;
  } else {
    state.taskText = cleanedText;
  }
  renderTaskEditorText();
  persistState();
  
  // Placer le curseur à la fin du texte inséré
  requestAnimationFrame(() => {
    const newPos = state.taskText.length;
    if (taskEditor) {
      taskEditor.setCursor(newPos);
      taskEditor.focus();
    }
  });
}

async function handleTaskCopy() {
  if (!state.taskText || !state.taskText.trim()) {
    return;
  }
  try {
    await navigator.clipboard.writeText(state.taskText);
    animateTaskCopySuccess();
  } catch (err) {
    fallbackCopy(state.taskText);
    animateTaskCopySuccess();
  }
}

function animateTaskCopySuccess() {
  elements.taskCopyBtn.classList.add('copied');
  setTimeout(() => {
    elements.taskCopyBtn.classList.remove('copied');
  }, 2000);
  }

let taskClearPendingConfirm = false;
let taskClearResetTimer = null;

function handleTaskClear() {
  // Si pas de texte, effacer directement sans confirmation
  if (!state.taskText || !state.taskText.trim()) {
    state.taskText = '';
    renderTaskEditorText();
    persistState();
    return;
  }
  
  if (taskClearPendingConfirm) {
    state.taskText = '';
    renderTaskEditorText();
    persistState();
    taskClearPendingConfirm = false;
    elements.taskClearBtn.textContent = 'Clear';
    if (taskClearResetTimer) clearTimeout(taskClearResetTimer);
    taskClearResetTimer = null;
  } else {
    taskClearPendingConfirm = true;
    elements.taskClearBtn.textContent = 'Confirmer';
    if (taskClearResetTimer) clearTimeout(taskClearResetTimer);
    taskClearResetTimer = setTimeout(() => {
      taskClearPendingConfirm = false;
      elements.taskClearBtn.textContent = 'Clear';
    }, 3000);
  }
}

function updateTaskBuilderVisibility() {
  const rightSidebar = document.querySelector('.right-sidebar');
  const appShell = document.querySelector('.app-shell');
  
  if (!rightSidebar || !appShell) return;
  
  // Toujours afficher la sidebar (permanente)
  appShell.classList.remove('right-sidebar-hidden');
  state.taskBuilderVisible = true;
}

let noteClearPendingConfirm = false;
let noteClearResetTimer = null;

function handleNoteClear() {
  if (!state.noteText || !state.noteText.trim()) {
    return;
  }
  
  if (noteClearPendingConfirm) {
    state.noteText = '';
    if (elements.noteInput) {
      elements.noteInput.value = '';
    }
    persistState();
    resetNoteClearButton();
  } else {
    noteClearPendingConfirm = true;
    elements.noteClearBtn.classList.add('confirm');
    
    noteClearResetTimer = setTimeout(() => {
      resetNoteClearButton();
    }, 2000);
  }
}

function resetNoteClearButton() {
  noteClearPendingConfirm = false;
  if (noteClearResetTimer) {
    clearTimeout(noteClearResetTimer);
    noteClearResetTimer = null;
  }
  elements.noteClearBtn?.classList.remove('confirm');
}

function updateLangButtonsUI() {
  if (elements.langBtnFr && elements.langBtnEn) {
    elements.langBtnFr.classList.toggle('active', state.chargerLang === 'fr');
    elements.langBtnEn.classList.toggle('active', state.chargerLang === 'en');
  }
}

function updateChargerLangButtonsUI() {
  if (elements.chargerLangFr && elements.chargerLangEn) {
    elements.chargerLangFr.classList.toggle('active', editingChargerLang === 'fr');
    elements.chargerLangEn.classList.toggle('active', editingChargerLang === 'en');
  }
}
