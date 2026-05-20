const URLNUKE = (() => {
  'use strict';

  const TRACKING_PARAMS = new Set([
    'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
    'utm_referrer','utm_name','utm_id','utm_group',
    'fbclid','gclid','msclid','mc_cid','igshid',
    'ref','referrer','source','origin','came_from',
    'cid','campaignid','adgroupid','adid','keyword',
    'sessionid','affiliate','aff_id','aff_sub','aff_sub2','aff_sub3',
    'token','partner','partner_id','pp','feature','app',
    'ab_channel','list','t','start','time','timestamp',
    'si','s','hs','hss','hssi','hls','_gl'
  ]);

  const YT_ID = /^[a-zA-Z0-9_-]{11}$/;

  function extractVideoID(input) {
    if (!input) return null;

    if (YT_ID.test(input)) return input;

    try {
      const url = new URL(input);
      const host = url.hostname.replace(/^www\./, '');

      if (host === 'youtu.be') {
        return url.pathname.split('/')[1] || null;
      }

      if (
        host.includes('youtube.com') ||
        host === 'youtube-nocookie.com' ||
        host === 'music.youtube.com'
      ) {
        const v = url.searchParams.get('v');
        if (v && YT_ID.test(v)) return v;

        const match = url.pathname.match(/\/(?:watch|embed|shorts|v)\/([a-zA-Z0-9_-]{11})/);
        return match?.[1] || null;
      }

    } catch {}

    const match = input.match(YT_ID);
    return match?.[0] || null;
  }

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
     OPT-IN HELPERS ONLY
  ========================= */

  function normalizeYouTubeLinks(nodeList) {
    const results = [];

    for (const el of nodeList) {
      if (!el?.href) continue;

      const id = extractVideoID(el.href);
      if (id) {
        const newUrl = `https://youtube.com/watch?v=${id}`;
        results.push({ element: el, url: newUrl });
        continue;
      }

      const cleaned = cleanURL(el.href);
      if (cleaned !== el.href) {
        results.push({ element: el, url: cleaned });
      }
    }

    return results;
  }

  function applyNormalization(results) {
    for (const { element, url } of results) {
      element.href = url;
      element.title = '🧹 cleaned';
    }
  }

  return {
    extractVideoID,
    cleanURL,
    normalizeYouTubeLinks,
    applyNormalization
  };

})();
