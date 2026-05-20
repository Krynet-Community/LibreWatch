(() => {
  'use strict';

  /* =========================
     CONFIG
  ========================= */

  const TRACKING_PARAMS = new Set([
    'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
    'utm_referrer','utm_name','utm_id','utm_group',
    'fbclid','gclid','msclid',
    'mc_cid','igshid',
    'ref','referrer','source','origin','came_from',
    'cid','campaignid','adgroupid','adid','keyword',
    'sessionid','affiliate','aff_id','aff_sub','aff_sub2','aff_sub3',
    'token','partner','partner_id','pp','feature','app',
    'ab_channel','list','t','start','time','timestamp',
    'si','s','hs','hss','hssi','hls','_gl'
  ]);

  const YT_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

  const YT_HOSTS = new Set([
    'youtube.com',
    'www.youtube.com',
    'youtube-nocookie.com',
    'music.youtube.com',
    'youtu.be'
  ]);

  const WATCH_PATH_REGEX = /\/(?:watch|embed|shorts|v)\//;

  /* =========================
     UTIL: VIDEO ID
  ========================= */

  function extractVideoID(input) {
    if (!input) return null;

    if (YT_ID_REGEX.test(input)) return input;

    try {
      const url = new URL(input);
      const host = url.hostname.replace(/^www\./, '');

      // youtu.be/<id>
      if (host === 'youtu.be') {
        return url.pathname.slice(1).split(/[/?#]/)[0] || null;
      }

      if (YT_HOSTS.has(host)) {
        const v = url.searchParams.get('v');
        if (v && YT_ID_REGEX.test(v)) return v;

        const match = url.pathname.match(/\/(?:watch|embed|shorts|v)\/([a-zA-Z0-9_-]{11})/);
        return match?.[1] || null;
      }

    } catch {
      // fallback below
    }

    const fallback = input.match(/[a-zA-Z0-9_-]{11}/);
    return fallback?.[0] || null;
  }

  /* =========================
     UTIL: CLEAN URL
  ========================= */

  function cleanURL(input) {
    try {
      const url = new URL(input);

      for (const key of [...url.searchParams.keys()]) {
        if (TRACKING_PARAMS.has(key)) {
          url.searchParams.delete(key);
        }
      }

      return url.searchParams.toString()
        ? url.toString()
        : url.origin + url.pathname;

    } catch {
      return input;
    }
  }

  /* =========================
     DOM PROCESSING (optimized)
  ========================= */

  const processed = new WeakSet();
  let scheduled = false;

  function rewriteLinks(root = document) {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;

      const links = root.querySelectorAll?.('a[href]') || [];
      for (const a of links) {
        if (processed.has(a)) continue;
        processed.add(a);

        const href = a.href;
        if (!href) continue;

        const videoId = extractVideoID(href);

        if (videoId) {
          const newURL = `https://youtube.com/watch?v=${videoId}`;
          if (a.href !== newURL) {
            a.href = newURL;
            a.title = '🧹 YouTube cleaned';
          }
          continue;
        }

        const cleaned = cleanURL(href);
        if (cleaned !== href) {
          a.href = cleaned;
          a.title = '🧹 URL cleaned';
        }
      }
    });
  }

  /* =========================
     MUTATION OBSERVER (throttled)
  ========================= */

  const observer = new MutationObserver((mutations) => {
    let shouldRun = false;

    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) {
          shouldRun = true;
          break;
        }
      }
    }

    if (shouldRun) rewriteLinks();
  });

  /* =========================
     PASTE HANDLER (safer)
  ========================= */

  function handlePaste(e) {
    const el = e.target.closest?.('textarea, [contenteditable="true"]');
    if (!el) return;

    setTimeout(() => {
      const text = el.value || el.innerText;
      if (!text) return;

      const ids = text.match(/[a-zA-Z0-9_-]{11}/g);
      if (!ids?.length) return;

      const urls = [...new Set(ids)].map(
        id => `https://youtube.com/watch?v=${id}`
      ).join('\n');

      if ('value' in el) el.value = urls;
      else el.innerText = urls;

    }, 20);
  }

  /* =========================
     INIT
  ========================= */

  function init() {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    document.querySelectorAll('a[href]').forEach(a => {
      const videoId = extractVideoID(a.href);
      if (videoId) {
        a.href = `https://youtube.com/watch?v=${videoId}`;
      } else {
        const cleaned = cleanURL(a.href);
        if (cleaned !== a.href) a.href = cleaned;
      }
    });

    document.addEventListener('paste', handlePaste, true);

    rewriteLinks();
    console.log('☢️ URLNUKE v2 ACTIVE');
  }

  init();

})();
