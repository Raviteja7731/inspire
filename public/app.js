/**
 * Daily Inspiration App - Client Application Logic
 */

(function () {
  'use strict';

  // --- STATE ---
  let allItems = [];
  let currentItem = null;
  let history = [];
  let historyIndex = -1;
  let activeFilter = 'all'; // 'all' | 'quote' | 'memory' | 'goal' | 'idea' | 'note' | 'favorites'
  let favoritesSet = new Set();
  let dailyItem = null;
  let isOnlineApi = false;
  let baseFontSize = 18; // px

  // Ambient soundscape audio state
  let audioCtx = null;
  let ambientSourceNode = null;
  let activeSound = 'none';

  // --- DOM ELEMENTS ---
  const inspirationCard = document.getElementById('inspiration-card');
  const cardPickBadge = document.getElementById('card-pick-badge');
  const badgeText = document.getElementById('badge-text');
  const cardTypeIcon = document.getElementById('card-type-icon');
  const cardTypeText = document.getElementById('card-type-text');
  const cardCategoryBadge = document.getElementById('card-category-badge');
  const cardTitle = document.getElementById('card-title');
  const cardQuote = document.getElementById('card-quote');
  const cardTextContainer = document.getElementById('card-text-container');
  const cardReflection = document.getElementById('card-reflection');
  const cardReflectionText = document.getElementById('card-reflection-text');
  const quoteOrnamentOpen = document.getElementById('quote-ornament-open');
  const quoteOrnamentClose = document.getElementById('quote-ornament-close');
  const cardAuthor = document.getElementById('card-author');
  const cardSourceSep = document.getElementById('card-source-sep');
  const cardSource = document.getElementById('card-source');
  const cardDate = document.getElementById('card-date');
  const cardFilePath = document.getElementById('card-file-path');
  const cardTags = document.getElementById('card-tags');
  const btnCardFav = document.getElementById('btn-card-fav');
  const cardFavText = document.getElementById('card-fav-text');

  const btnShowAnother = document.getElementById('btn-show-another');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnTodayPick = document.getElementById('btn-today-pick');
  const btnCopyCard = document.getElementById('btn-copy-card');
  const btnReadAloud = document.getElementById('btn-read-aloud');
  const btnShareCard = document.getElementById('btn-share-card');

  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const filterBtns = document.querySelectorAll('.filter-btn');

  const toast = document.getElementById('toast');
  const statusHistoryIndex = document.getElementById('status-history-index');
  const headerDateDisplay = document.getElementById('header-date-display');

  // Count Badges
  const badgeTotalCount = document.getElementById('badge-total-count');
  const countAll = document.getElementById('count-all');
  const countQuote = document.getElementById('count-quote');
  const countMemory = document.getElementById('count-memory');
  const countGoal = document.getElementById('count-goal');
  const countIdea = document.getElementById('count-idea');
  const countNote = document.getElementById('count-note');
  const countFav = document.getElementById('count-fav');

  // Drawer
  const btnBrowseDrawer = document.getElementById('btn-browse-drawer');
  const collectionDrawer = document.getElementById('collection-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const drawerList = document.getElementById('drawer-list');
  const drawerSearch = document.getElementById('drawer-search');
  const drawerPills = document.querySelectorAll('.drawer-pill');
  const drawerCountSubtitle = document.getElementById('drawer-count-subtitle');

  // New Entry Modal
  const btnNewEntry = document.getElementById('btn-new-entry');
  const newEntryModal = document.getElementById('new-entry-modal');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelEntry = document.getElementById('btn-cancel-entry');
  const newEntryForm = document.getElementById('new-entry-form');
  const entryDate = document.getElementById('entry-date');

  // Time Capsule
  const timeCapsuleBanner = document.getElementById('time-capsule-banner');
  const tcMonthName = document.getElementById('tc-month-name');
  const tcSnippet = document.getElementById('tc-snippet');
  const btnTcView = document.getElementById('btn-tc-view');
  let timeCapsuleItem = null;

  // Dropdowns (Theme, Font, Sound)
  const btnThemeMenu = document.getElementById('btn-theme-menu');
  const themeDropdown = document.getElementById('theme-dropdown');
  const themeOptions = document.querySelectorAll('.theme-option');

  const btnFontMenu = document.getElementById('btn-font-menu');
  const fontDropdown = document.getElementById('font-dropdown');
  const fontOptions = document.querySelectorAll('.font-option');
  const btnFontDecrease = document.getElementById('btn-font-decrease');
  const btnFontReset = document.getElementById('btn-font-reset');
  const btnFontIncrease = document.getElementById('btn-font-increase');

  const btnSoundMenu = document.getElementById('btn-sound-menu');
  const soundDropdown = document.getElementById('sound-dropdown');
  const soundOptions = document.querySelectorAll('.sound-option');
  const ambientBanner = document.getElementById('ambient-banner');
  const ambientStatusText = document.getElementById('ambient-status-text');
  const btnAmbientStop = document.getElementById('btn-ambient-stop');

  // --- HELPER: FORMAT DATES ---
  function getTodayString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr || dateStr.toLowerCase().includes('undated')) return 'Undated Reflection';
    const parts = dateStr.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (parts) {
      const d = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1, parseInt(parts[3], 10));
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  }

  function getRelativeTimeString(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (!parts) return '';
    const then = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1, parseInt(parts[3], 10));
    const now = new Date();
    const diffYears = now.getFullYear() - then.getFullYear();
    if (diffYears >= 2) return `• ${diffYears} years ago`;
    if (diffYears === 1) return `• Last year`;
    const diffMonths = (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
    if (diffMonths > 1) return `• ${diffMonths} months ago`;
    return '';
  }

  // Deterministic hash of string
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2400);
  }

  // --- INITIALIZATION ---
  async function init() {
    // Set Header Today String
    const today = new Date();
    headerDateDisplay.textContent = today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (entryDate) {
      entryDate.value = getTodayString();
    }

    // Load Saved Preferences (Theme, Font)
    loadUserPreferences();

    // Fetch Collection & Favorites
    await loadData();

    // Determine Today's Daily Item
    computeDailyItem();

    // Setup Time Capsule banner
    checkTimeCapsule();

    // Set Initial Item: Today's Daily Pick
    displayItem(dailyItem, false);

    // Setup Event Listeners
    setupEventListeners();
  }

  // Load preferences from localStorage
  function loadUserPreferences() {
    const savedTheme = localStorage.getItem('inspire_theme') || 'parchment';
    setTheme(savedTheme);

    const savedFont = localStorage.getItem('inspire_font') || 'serif';
    setFont(savedFont);

    const savedFontSize = localStorage.getItem('inspire_fontsize');
    if (savedFontSize) {
      baseFontSize = parseInt(savedFontSize, 10);
      document.documentElement.style.setProperty('--base-font-size', baseFontSize + 'px');
    }

    // Load Local Favorites if offline
    try {
      const savedFavs = localStorage.getItem('inspire_favorites');
      if (savedFavs) {
        const parsed = JSON.parse(savedFavs);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => favoritesSet.add(id));
        }
      }
    } catch (e) {}
  }

  // Load Data from API or Fallback
  async function loadData() {
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          allItems = data.items;
          isOnlineApi = true;
          // Load favorites from server
          const favRes = await fetch('/api/favorites');
          if (favRes.ok) {
            const favData = await favRes.json();
            if (Array.isArray(favData.favorites)) {
              favoritesSet = new Set(favData.favorites);
            }
          }
        }
      }
    } catch (err) {
      console.log('API not reachable, using bundled offline collection data');
    }

    // Fallback to pre-bundled data.js if empty
    if (allItems.length === 0 && window.COLLECTION_ITEMS) {
      allItems = window.COLLECTION_ITEMS;
    }

    // Enrich with favoritesSet
    allItems.forEach((item) => {
      item.isFavorite = favoritesSet.has(item.id);
    });

    updateCounters();
  }

  function computeDailyItem() {
    if (allItems.length === 0) return;
    const todayStr = getTodayString();
    const hash = hashString(todayStr);
    const index = hash % allItems.length;
    dailyItem = {
      ...allItems[index],
      isDailyPick: true,
      dailyDate: todayStr,
    };
  }

  function checkTimeCapsule() {
    if (allItems.length === 0) return;
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentMonthPadded = String(currentMonth).padStart(2, '0');
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });

    // Look for a memory or quote written in this month in a previous year
    const pastMatches = allItems.filter((i) => {
      if (!i.date) return false;
      const m = i.date.match(/(\d{4})-(\d{2})/);
      return m && m[2] === currentMonthPadded && parseInt(m[1], 10) < now.getFullYear();
    });

    if (pastMatches.length > 0) {
      // Pick a memory or note
      const memoryMatch = pastMatches.find((i) => i.type === 'memory') || pastMatches[0];
      timeCapsuleItem = memoryMatch;
      tcMonthName.textContent = monthName;
      tcSnippet.textContent = `"${memoryMatch.title}"`;
      timeCapsuleBanner.classList.remove('hidden');
    }
  }

  function updateCounters() {
    const total = allItems.length;
    const quoteCount = allItems.filter((i) => i.type === 'quote').length;
    const memoryCount = allItems.filter((i) => i.type === 'memory').length;
    const goalCount = allItems.filter((i) => i.type === 'goal').length;
    const ideaCount = allItems.filter((i) => i.type === 'idea').length;
    const noteCount = allItems.filter((i) => i.type === 'note').length;
    const favCount = favoritesSet.size;

    badgeTotalCount.textContent = total;
    countAll.textContent = total;
    countQuote.textContent = quoteCount;
    countMemory.textContent = memoryCount;
    countGoal.textContent = goalCount;
    countIdea.textContent = ideaCount;
    countNote.textContent = noteCount;
    countFav.textContent = favCount;
    drawerCountSubtitle.textContent = `${total} items found in folder`;
  }

  // --- DISPLAY AN ITEM ---
  function displayItem(item, addToHistory = true) {
    if (!item) return;
    currentItem = item;

    if (addToHistory) {
      // If we're not at the end of history, truncate future
      if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
      }
      history.push(item);
      historyIndex = history.length - 1;
    } else {
      if (history.length === 0) {
        history.push(item);
        historyIndex = 0;
      }
    }

    // Trigger card enter animation
    inspirationCard.classList.remove('card-enter');
    void inspirationCard.offsetWidth; // trigger reflow
    inspirationCard.classList.add('card-enter');

    // Pick Badge: Today's Pick vs Random Discovery vs Favorite
    const isToday = dailyItem && item.id === dailyItem.id;
    if (isToday) {
      cardPickBadge.classList.add('is-daily');
      badgeText.textContent = "Today's Daily Pick";
      btnTodayPick.classList.add('active-nav');
    } else if (item.isFavorite) {
      cardPickBadge.classList.remove('is-daily');
      badgeText.textContent = 'From Favorites';
      btnTodayPick.classList.remove('active-nav');
    } else {
      cardPickBadge.classList.remove('is-daily');
      badgeText.textContent = 'Personal Reflection';
      btnTodayPick.classList.remove('active-nav');
    }

    // Category Badge
    const categoryInfo = {
      quote: { icon: '💬', label: 'Quote', class: 'cat-quote' },
      memory: { icon: '📖', label: 'Memory & Journal', class: 'cat-memory' },
      goal: { icon: '🎯', label: 'Life Goal & Intention', class: 'cat-goal' },
      idea: { icon: '💡', label: 'Creative Idea', class: 'cat-idea' },
      note: { icon: '📝', label: 'Marginalia & Insight', class: 'cat-note' },
    };
    const cat = categoryInfo[item.type] || categoryInfo.note;
    cardTypeIcon.textContent = cat.icon;
    cardTypeText.textContent = cat.label;

    // Reset styles for category
    cardCategoryBadge.style.backgroundColor = `var(--${cat.class}-bg)`;
    cardCategoryBadge.style.color = `var(--${cat.class})`;

    // Title
    cardTitle.textContent = item.title;

    // Quote vs Standard Body
    if (item.type === 'quote') {
      quoteOrnamentOpen.style.display = 'block';
      quoteOrnamentClose.style.display = 'block';
      cardTextContainer.innerHTML = '';
      const bq = document.createElement('blockquote');
      bq.className = 'card-quote';
      bq.textContent = item.quoteText || item.text;
      cardTextContainer.appendChild(bq);
    } else {
      quoteOrnamentOpen.style.display = 'none';
      quoteOrnamentClose.style.display = 'none';
      cardTextContainer.innerHTML = '';
      
      // Split paragraphs
      const paragraphs = item.text.split(/\n\n+/);
      for (const p of paragraphs) {
        const cleanP = p.trim();
        if (cleanP) {
          const pEl = document.createElement('p');
          pEl.textContent = cleanP;
          cardTextContainer.appendChild(pEl);
        }
      }
    }

    // Reflection Callout
    if (item.reflection) {
      cardReflection.style.display = 'block';
      cardReflectionText.textContent = item.reflection;
    } else {
      cardReflection.style.display = 'none';
    }

    // Attribution: Author & Source
    if (item.author) {
      cardAuthor.textContent = item.author;
      cardAuthor.style.display = 'inline';
    } else {
      cardAuthor.style.display = 'none';
    }

    if (item.source) {
      cardSource.textContent = item.source;
      cardSource.style.display = 'inline';
      cardSourceSep.style.display = item.author ? 'inline' : 'none';
    } else {
      cardSource.style.display = 'none';
      cardSourceSep.style.display = 'none';
    }

    // Date & Relative Time
    const displayDate = formatDisplayDate(item.date);
    const relTime = getRelativeTimeString(item.date);
    cardDate.textContent = `${displayDate} ${relTime}`;

    // File Path Pill
    cardFilePath.textContent = item.filePath || item.fileBasename || 'Local file';

    // Tags
    cardTags.innerHTML = '';
    if (item.tags && item.tags.length > 0) {
      item.tags.forEach((t) => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        tagSpan.textContent = `#${t}`;
        tagSpan.addEventListener('click', () => {
          searchInput.value = t;
          filterBySearch(t);
        });
        cardTags.appendChild(tagSpan);
      });
    }

    // Favorite Button Status
    const isFav = favoritesSet.has(item.id);
    item.isFavorite = isFav;
    if (isFav) {
      btnCardFav.classList.add('is-favorited');
      cardFavText.textContent = 'Favorited';
    } else {
      btnCardFav.classList.remove('is-favorited');
      cardFavText.textContent = 'Favorite';
    }

    // Update History Arrow states
    btnPrev.disabled = historyIndex <= 0;
    btnNext.disabled = historyIndex >= history.length - 1;

    // Status bar index
    statusHistoryIndex.textContent = `Viewing ${historyIndex + 1} of ${history.length} explored`;
  }

  // --- "SHOW ME ANOTHER" SELECTION ---
  function showAnother() {
    let pool = getFilteredPool();

    if (pool.length === 0) {
      showToast('No entries in current filter. Resetting to all.');
      setActiveFilter('all');
      pool = allItems;
    }

    // Exclude current item if pool has more than 1
    let candidates = pool;
    if (currentItem && pool.length > 1) {
      candidates = pool.filter((i) => i.id !== currentItem.id);
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    const nextItem = candidates[randomIndex];
    displayItem(nextItem, true);

    // Play subtle soft chime
    playHapticChime();
  }

  function getFilteredPool() {
    let pool = allItems;
    if (activeFilter === 'favorites') {
      pool = pool.filter((i) => favoritesSet.has(i.id));
    } else if (activeFilter !== 'all') {
      pool = pool.filter((i) => i.type === activeFilter);
    }

    const searchQuery = searchInput.value.trim().toLowerCase();
    if (searchQuery) {
      pool = pool.filter(
        (i) =>
          i.title.toLowerCase().includes(searchQuery) ||
          i.text.toLowerCase().includes(searchQuery) ||
          (i.source && i.source.toLowerCase().includes(searchQuery)) ||
          (i.author && i.author.toLowerCase().includes(searchQuery)) ||
          (i.tags && i.tags.some((t) => t.toLowerCase().includes(searchQuery)))
      );
    }
    return pool;
  }

  // --- FAVORITE TOGGLE ---
  async function toggleFavorite(item) {
    if (!item) return;
    const isCurrentlyFav = favoritesSet.has(item.id);

    if (isCurrentlyFav) {
      favoritesSet.delete(item.id);
      item.isFavorite = false;
    } else {
      favoritesSet.add(item.id);
      item.isFavorite = true;
    }

    // Persist to server if available
    if (isOnlineApi) {
      try {
        await fetch('/api/favorites/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id }),
        });
      } catch (err) {
        console.error('Failed to sync favorite with server:', err);
      }
    }

    // Always persist to localStorage
    try {
      localStorage.setItem('inspire_favorites', JSON.stringify(Array.from(favoritesSet)));
    } catch (e) {}

    // Update UI
    if (currentItem && currentItem.id === item.id) {
      if (item.isFavorite) {
        btnCardFav.classList.add('is-favorited');
        cardFavText.textContent = 'Favorited';
        showToast('❤️ Saved to Favorites');
      } else {
        btnCardFav.classList.remove('is-favorited');
        cardFavText.textContent = 'Favorite';
        showToast('Removed from Favorites');
      }
    }

    updateCounters();
    renderDrawerList();
  }

  // --- FILTERS & SEARCH ---
  function setActiveFilter(filterType) {
    activeFilter = filterType;
    filterBtns.forEach((btn) => {
      if (btn.dataset.type === filterType) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Check if current item matches filter, else pick one that does
    const pool = getFilteredPool();
    if (pool.length > 0) {
      if (!currentItem || !pool.some((i) => i.id === currentItem.id)) {
        displayItem(pool[0], true);
      }
    } else {
      showToast('No entries found for this category');
    }
  }

  function filterBySearch(query) {
    const q = query.trim().toLowerCase();
    searchClear.classList.toggle('hidden', !q);
    const pool = getFilteredPool();
    if (pool.length > 0) {
      displayItem(pool[0], true);
    } else {
      showToast(`No matches for "${query}"`);
    }
  }

  // --- DRAWER: BROWSE COLLECTION ---
  function openDrawer() {
    collectionDrawer.classList.remove('hidden');
    drawerBackdrop.classList.remove('hidden');
    renderDrawerList();
  }

  function closeDrawer() {
    collectionDrawer.classList.add('hidden');
    drawerBackdrop.classList.add('hidden');
  }

  function renderDrawerList() {
    drawerList.innerHTML = '';
    const activePill = document.querySelector('.drawer-pill.active');
    const pillType = activePill ? activePill.dataset.drawerType : 'all';
    const query = drawerSearch.value.trim().toLowerCase();

    let list = allItems;
    if (pillType === 'favorites') {
      list = list.filter((i) => favoritesSet.has(i.id));
    } else if (pillType !== 'all') {
      list = list.filter((i) => i.type === pillType);
    }

    if (query) {
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(query) ||
          i.text.toLowerCase().includes(query) ||
          (i.source && i.source.toLowerCase().includes(query)) ||
          (i.author && i.author.toLowerCase().includes(query))
      );
    }

    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '2rem 1rem';
      empty.style.textAlign = 'center';
      empty.style.color = 'var(--text-muted)';
      empty.textContent = 'No entries match your search or filter.';
      drawerList.appendChild(empty);
      return;
    }

    list.forEach((item) => {
      const card = document.createElement('div');
      card.className = `drawer-item-card ${currentItem && currentItem.id === item.id ? 'is-active-card' : ''}`;

      const top = document.createElement('div');
      top.className = 'drawer-item-top';

      const badge = document.createElement('span');
      badge.className = 'drawer-item-badge';
      badge.style.backgroundColor = `var(--cat-${item.type}-bg, var(--bg-secondary))`;
      badge.style.color = `var(--cat-${item.type}, var(--text-primary))`;
      badge.textContent = item.type;

      const favIcon = document.createElement('span');
      favIcon.textContent = favoritesSet.has(item.id) ? '❤️' : '';

      top.appendChild(badge);
      top.appendChild(favIcon);

      const title = document.createElement('div');
      title.className = 'drawer-item-title';
      title.textContent = item.title;

      const snippet = document.createElement('div');
      snippet.className = 'drawer-item-snippet';
      snippet.textContent = item.quoteText || item.text;

      const meta = document.createElement('div');
      meta.className = 'drawer-item-meta';
      meta.innerHTML = `<span>${item.author || item.source || ''}</span><span>${item.date || ''}</span>`;

      card.appendChild(top);
      card.appendChild(title);
      card.appendChild(snippet);
      card.appendChild(meta);

      card.addEventListener('click', () => {
        displayItem(item, true);
        closeDrawer();
      });

      drawerList.appendChild(card);
    });
  }

  // --- NEW ENTRY MODAL ---
  function openNewEntryModal() {
    newEntryModal.classList.remove('hidden');
    modalBackdrop.classList.remove('hidden');
  }

  function closeNewEntryModal() {
    newEntryModal.classList.add('hidden');
    modalBackdrop.classList.add('hidden');
    newEntryForm.reset();
  }

  async function handleCreateEntry(e) {
    e.preventDefault();
    const type = document.getElementById('entry-type').value;
    const title = document.getElementById('entry-title').value.trim();
    const text = document.getElementById('entry-text').value.trim();
    const date = document.getElementById('entry-date').value || getTodayString();
    const source = document.getElementById('entry-source').value.trim();
    const author = document.getElementById('entry-author').value.trim();
    const reflection = document.getElementById('entry-reflection').value.trim();
    const tags = document.getElementById('entry-tags').value.trim();

    if (!text) {
      showToast('Please enter some text');
      return;
    }

    const payload = {
      type,
      title: title || text.slice(0, 40),
      text: reflection ? `${text}\n\n*Note to self: ${reflection}*` : text,
      source,
      author,
      date,
      tags: tags ? tags.split(',').map((t) => t.trim()) : [],
    };

    let newItem = null;

    if (isOnlineApi) {
      try {
        const res = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          newItem = data.item;
        }
      } catch (err) {
        console.error('API create failed:', err);
      }
    }

    if (!newItem) {
      // Local fallback
      newItem = {
        id: 'local-' + Date.now(),
        title: payload.title,
        text: payload.text,
        quoteText: payload.type === 'quote' ? payload.text : '',
        author: payload.author,
        source: payload.source || 'Personal Note',
        date: payload.date,
        type: payload.type,
        tags: payload.tags,
        reflection,
        filePath: `${payload.type}s/${payload.date}.md`,
        isFavorite: false,
      };
      allItems.unshift(newItem);
    } else {
      allItems.unshift(newItem);
    }

    updateCounters();
    closeNewEntryModal();
    showToast('✨ Added to your personal collection!');
    displayItem(newItem, true);
  }

  // --- THEMES & TYPOGRAPHY ---
  function setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('inspire_theme', themeName);
    themeOptions.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.theme === themeName);
    });
    const icons = {
      parchment: '📜',
      midnight: '🌌',
      cedar: '🌿',
      dawn: '🌅',
      minimal: '⚪',
    };
    document.getElementById('theme-icon').textContent = icons[themeName] || '📜';
  }

  function setFont(fontName) {
    document.body.setAttribute('data-font', fontName);
    localStorage.setItem('inspire_font', fontName);
    fontOptions.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.font === fontName);
    });
  }

  function adjustFontSize(delta) {
    baseFontSize = Math.min(26, Math.max(14, baseFontSize + delta));
    document.documentElement.style.setProperty('--base-font-size', baseFontSize + 'px');
    localStorage.setItem('inspire_fontsize', baseFontSize);
  }

  // --- AMBIENT AUDIO SOUNDSCAPES (WEB AUDIO API) ---
  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playHapticChime() {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.52);
    } catch (e) {}
  }

  function stopAmbientSound() {
    if (ambientSourceNode) {
      try {
        ambientSourceNode.stop();
        ambientSourceNode.disconnect();
      } catch (e) {}
      ambientSourceNode = null;
    }
    activeSound = 'none';
    ambientBanner.classList.add('hidden');
    soundOptions.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.sound === 'none');
    });
    document.getElementById('sound-icon').textContent = '🎧';
  }

  function playAmbientSound(type) {
    stopAmbientSound();
    if (type === 'none') return;

    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let filterType = 'lowpass';
    let filterFreq = 600;
    let gainVal = 0.08;

    if (type === 'rain') {
      // Pink-ish soft noise
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
      filterFreq = 900;
      gainVal = 0.12;
      ambientStatusText.textContent = 'Soundscape: Gentle Rain on Window';
    } else if (type === 'hearth') {
      // Fireplace crackle & rumble
      for (let i = 0; i < bufferSize; i++) {
        const crackle = Math.random() < 0.003 ? (Math.random() * 2 - 1) * 0.7 : 0;
        data[i] = (Math.random() * 0.1 - 0.05) + crackle;
      }
      filterFreq = 400;
      gainVal = 0.15;
      ambientStatusText.textContent = 'Soundscape: Warm Cabin Fireplace';
    } else if (type === 'chimes') {
      // Wind chimes loop
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 0.04 - 0.02;
      }
      filterFreq = 1200;
      gainVal = 0.05;
      ambientStatusText.textContent = 'Soundscape: Temple Wind Chimes';
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;
    noiseNode.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(gainVal, ctx.currentTime);

    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noiseNode.start();
    ambientSourceNode = noiseNode;
    activeSound = type;

    ambientBanner.classList.remove('hidden');
    soundOptions.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.sound === type);
    });
    document.getElementById('sound-icon').textContent = '🎵';
  }

  // --- READ ALOUD / SPEECH SYNTHESIS ---
  let isSpeaking = false;
  function toggleReadAloud() {
    if (!('speechSynthesis' in window)) {
      showToast('Text-to-speech not supported in this browser');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
      document.getElementById('read-aloud-icon').textContent = '🔊';
      return;
    }

    if (!currentItem) return;

    const textToRead = [
      currentItem.title,
      currentItem.quoteText || currentItem.text,
      currentItem.author ? `by ${currentItem.author}` : '',
      currentItem.reflection ? `Reflection: ${currentItem.reflection}` : '',
    ].filter(Boolean).join('. ');

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.92; // reflective, unhurried cadence
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      isSpeaking = true;
      document.getElementById('read-aloud-icon').textContent = '⏹️';
    };

    utterance.onend = utterance.onerror = () => {
      isSpeaking = false;
      document.getElementById('read-aloud-icon').textContent = '🔊';
    };

    window.speechSynthesis.speak(utterance);
  }

  // --- COPY & SHARE ---
  function copyCardContent() {
    if (!currentItem) return;
    const lines = [
      `"${currentItem.quoteText || currentItem.text}"`,
      '',
      currentItem.author ? `— ${currentItem.author}` : null,
      currentItem.source ? `Source: ${currentItem.source}` : null,
      currentItem.date ? `Date: ${formatDisplayDate(currentItem.date)}` : null,
      currentItem.reflection ? `\nReflection: ${currentItem.reflection}` : null,
    ].filter(Boolean).join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lines).then(() => {
        showToast('📋 Copied reflection to clipboard!');
      }).catch(() => {
        showToast('Unable to copy to clipboard');
      });
    } else {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = lines;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('📋 Copied reflection to clipboard!');
    }
  }

  function shareCard() {
    if (!currentItem) return;
    const title = currentItem.title || 'Daily Inspiration';
    const text = `"${currentItem.quoteText || currentItem.text}" — ${currentItem.author || currentItem.source || ''}`;

    if (navigator.share) {
      navigator.share({ title, text, url: window.location.href }).catch(() => {});
    } else {
      copyCardContent();
    }
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Show Me Another
    btnShowAnother.addEventListener('click', showAnother);

    // Favorite Toggle
    btnCardFav.addEventListener('click', () => toggleFavorite(currentItem));

    // Navigation History
    btnPrev.addEventListener('click', () => {
      if (historyIndex > 0) {
        historyIndex--;
        displayItem(history[historyIndex], false);
      }
    });

    btnNext.addEventListener('click', () => {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        displayItem(history[historyIndex], false);
      }
    });

    // Jump to Today's Daily Pick
    btnTodayPick.addEventListener('click', () => {
      if (dailyItem) {
        displayItem(dailyItem, true);
        showToast("🌟 Loaded Today's Daily Pick");
      }
    });

    // Copy, Listen, Share
    btnCopyCard.addEventListener('click', copyCardContent);
    btnReadAloud.addEventListener('click', toggleReadAloud);
    btnShareCard.addEventListener('click', shareCard);

    // Category Filter Strip
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        setActiveFilter(btn.dataset.type);
      });
    });

    // Search Box
    searchInput.addEventListener('input', (e) => {
      filterBySearch(e.target.value);
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      filterBySearch('');
    });

    // Time Capsule Revisit
    btnTcView.addEventListener('click', () => {
      if (timeCapsuleItem) {
        displayItem(timeCapsuleItem, true);
        showToast('⏳ Reopened Time Capsule memory');
      }
    });

    // Drawer Controls
    btnBrowseDrawer.addEventListener('click', openDrawer);
    btnCloseDrawer.addEventListener('click', closeDrawer);
    drawerBackdrop.addEventListener('click', closeDrawer);

    drawerSearch.addEventListener('input', renderDrawerList);

    drawerPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        drawerPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        renderDrawerList();
      });
    });

    // New Entry Modal Controls
    btnNewEntry.addEventListener('click', openNewEntryModal);
    btnCloseModal.addEventListener('click', closeNewEntryModal);
    btnCancelEntry.addEventListener('click', closeNewEntryModal);
    modalBackdrop.addEventListener('click', closeNewEntryModal);
    newEntryForm.addEventListener('submit', handleCreateEntry);

    // Theme Dropdown
    btnThemeMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      themeDropdown.classList.toggle('hidden');
      fontDropdown.classList.add('hidden');
      soundDropdown.classList.add('hidden');
    });

    themeOptions.forEach((btn) => {
      btn.addEventListener('click', () => {
        setTheme(btn.dataset.theme);
        themeDropdown.classList.add('hidden');
      });
    });

    // Font Dropdown
    btnFontMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      fontDropdown.classList.toggle('hidden');
      themeDropdown.classList.add('hidden');
      soundDropdown.classList.add('hidden');
    });

    fontOptions.forEach((btn) => {
      btn.addEventListener('click', () => {
        setFont(btn.dataset.font);
        fontDropdown.classList.add('hidden');
      });
    });

    btnFontDecrease.addEventListener('click', () => adjustFontSize(-2));
    btnFontIncrease.addEventListener('click', () => adjustFontSize(2));
    btnFontReset.addEventListener('click', () => {
      baseFontSize = 18;
      document.documentElement.style.setProperty('--base-font-size', '18px');
      localStorage.setItem('inspire_fontsize', 18);
    });

    // Sound Dropdown
    btnSoundMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      soundDropdown.classList.toggle('hidden');
      themeDropdown.classList.add('hidden');
      fontDropdown.classList.add('hidden');
    });

    soundOptions.forEach((btn) => {
      btn.addEventListener('click', () => {
        playAmbientSound(btn.dataset.sound);
        soundDropdown.classList.add('hidden');
      });
    });

    btnAmbientStop.addEventListener('click', stopAmbientSound);

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
      themeDropdown.classList.add('hidden');
      fontDropdown.classList.add('hidden');
      soundDropdown.classList.add('hidden');
    });

    // KEYBOARD SHORTCUTS
    document.addEventListener('keydown', (e) => {
      // Ignore shortcuts if typing in an input/textarea
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.code === 'Space') {
        e.preventDefault();
        showAnother();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFavorite(currentItem);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (historyIndex > 0) {
          historyIndex--;
          displayItem(history[historyIndex], false);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          historyIndex++;
          displayItem(history[historyIndex], false);
        }
      } else if (e.key === 't' || e.key === 'T') {
        // Cycle theme
        const themes = ['parchment', 'midnight', 'cedar', 'dawn', 'minimal'];
        const currentTheme = document.body.getAttribute('data-theme') || 'parchment';
        const nextIdx = (themes.indexOf(currentTheme) + 1) % themes.length;
        setTheme(themes[nextIdx]);
        showToast(`Theme: ${themes[nextIdx]}`);
      } else if (e.key === 'Escape') {
        closeDrawer();
        closeNewEntryModal();
      }
    });
  }

  // Start app on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

