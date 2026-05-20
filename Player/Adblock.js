(() => {
  'use strict';

  /* =========================
     CONFIG
  ========================= */

  const FILTER_URLS = [
    'https://easylist.to/easylist/easyprivacy.txt',
    'https://ublockorigin.github.io/uAssets/filters/filters.txt',
    'https://easylist.to/easylist/easylist.txt'
  ];

  const AD_NETWORK_PATTERNS = [
    /doubleclick\.net/,
    /googlesyndication\.com/,
    /googleads/,
    /adservice\.google\.com/,
    /youtube\.com\/get_video_ads/
  ];

  const FALLBACK_SELECTORS = new Set([
    '[id*="ad"]',
    '[class*="ad"]',
    '[class*="ads"]',
    '.video-ads',
    '.ytp-ad-module',
    '.ytp-ad-overlay-container',
    '.ytp-ad-skip-button',
    'iframe[src*="doubleclick"]',
    '.banner-ad',
    '.native-ad'
  ]);

  const STYLE_ID = '__adblock_style__';

  /* =========================
     STATE
  ========================= */

  const adSelectors = new Set();
  let lastScan = 0;
  const SCAN_COOLDOWN = 500;

  /* =========================
     FILTER LOADER (cached)
  ========================= */

  async function loadFilters() {
    const cacheKey = 'adblock_filters_v1';
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        JSON.parse(cached).forEach(s => adSelectors.add(s));
        console.log('[AdBlock] Loaded filters from cache');
        return;
      } catch {}
    }

    const fetchText = async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(url);
      return res.text();
    };

    for (const url of FILTER_URLS) {
      try {
        const text = await fetchText(url);

        text.split('\n').forEach(line => {
          const l = line.trim();
          if (!l || l.startsWith('!')) return;

          // cosmetic filters only
          if (l.includes('##')) {
            const sel = l.split('##')[1]?.trim();
            if (sel) adSelectors.add(sel);
          }
        });

      } catch (e) {
        console.warn('[AdBlock] Failed:', url);
      }
    }

    localStorage.setItem(
      cacheKey,
      JSON.stringify([...adSelectors])
    );

    console.log('[AdBlock] Filters cached:', adSelectors.size);
  }

  /* =========================
     STYLE INJECTION
  ========================= */

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;

    const css = [
      ...FALLBACK_SELECTORS,
      ...adSelectors
    ].join(',');

    style.textContent = `
      ${css} {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        pointer-events: none !important;
      }
    `;

    document.documentElement.appendChild(style);
    console.log('[AdBlock] Styles injected');
  }

  /* =========================
     SMART SCANNER
  ========================= */

  function scan(root = document) {
    const now = performance.now();
    if (now - lastScan < SCAN_COOLDOWN) return;
    lastScan = now;

    let removed = 0;

    const selectors = [...adSelectors, ...FALLBACK_SELECTORS];

    for (const sel of selectors) {
      try {
        root.querySelectorAll(sel).forEach(el => {
          if (el.style.display !== 'none') {
            el.style.setProperty('display', 'none', 'important');
            removed++;
          }
        });
      } catch {}
    }

    if (removed) {
      console.debug(`[AdBlock] removed ${removed} nodes`);
    }
  }

  /* =========================
     NETWORK GUARD (safer)
  ========================= */

  function patchWindowOpen() {
    const original = window.open;

    window.open = function(url, ...args) {
      if (!url) return original.apply(this, arguments);

      if (AD_NETWORK_PATTERNS.some(r => r.test(url))) {
        console.log('[AdBlock] blocked popup:', url);
        return null;
      }

      return original.apply(this, arguments);
    };
  }

  /* =========================
     OBSERVER (throttled)
  ========================= */

  function observe() {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;

      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1) {
            shouldScan = true;
            break;
          }
        }
      }

      if (shouldScan) scan();
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  /* =========================
     INIT
  ========================= */

  async function init() {
    injectStyles();
    patchWindowOpen();

    await loadFilters();

    scan();
    observe();

    console.log('[AdBlock] 🚀 Active (optimized mode)');
  }

  init();
})();
