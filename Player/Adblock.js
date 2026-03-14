(function() {
    'use strict';
    
    let adSelectors=[],filterListsLoaded=0,totalLists=0;
    const LISTS=[
        'https://raw.githubusercontent.com/easylist/easylist/master/easyprivacy/easyprivacy.txt',
        'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',  
        'https://raw.githubusercontent.com/AdguardTeam/AdguardFilters/master/AntiAdblockFilters/filter.txt',
        'https://raw.githubusercontent.com/easylist/easylist/master/easylist/easylist.txt'
    ],adNetworks=['googleads.g.doubleclick.net','pagead2.googlesyndication.com','adservice.google.com','ad.doubleclick.net','youtube.com/get_video_ads'];
    
    async function fetchFilterList(url){
        try{
            console.log(`[AdBlock] Fetching ${url.split('/').pop()}...`);
            const res=await fetch(url,{cache:'no-cache',mode:'cors'});
            if(!res.ok){console.warn(`[AdBlock] ${url} failed: ${res.status}`);return;}
            
            const text=await res.text();
            const rules=text.split('\n')
                .filter(line=>line.trim()&&!line.startsWith('!')&&!line.includes('@@'))
                .filter(line=>line.includes('##')||line.includes('###')||line.includes('#@'))
                .slice(0,300); // Max 300 per list
            
            let count=0;
            rules.forEach(rule=>{
                const match=rule.match(/(?:##|###|#@#)(.*)/);
                if(match){adSelectors.push(match[1].trim());count++;}
            });
            
            filterListsLoaded++;
            totalLists++;
            console.log(`[AdBlock] ✅ Loaded ${count} rules from ${url.split('/').pop()} (${filterListsLoaded}/${totalLists})`);
        }catch(e){
            console.warn(`[AdBlock] ❌ Failed ${url.split('/').pop()}:`,e);
            filterListsLoaded++;
            totalLists++;
        }
    }
    
    // FAILSAFE: Basic selectors if lists fail
    const fallbackSelectors=[
        '[id*="ad"]','[class*="ad"]','.ytp-ad-module','.video-ads','.ytp-ad-overlay',
        '.ad-container','.banner-ad','iframe[src*="doubleclick"]','.native-ad'
    ];
    
    const hideCss=`[id*="ad"],[class*="ad"],${adSelectors.length?adSelectors.slice(0,100).join(','):fallbackSelectors.join(',')}{display:none!important;visibility:hidden!important;height:0!important;width:0!important;pointer-events:none!important;opacity:0!important;position:absolute!important;left:-9999px!important;}`,
    antiAdblock={AdBlock:false,adblock:false,blockAdblock:false,_AdBlock_:false,canRunAds:true,checkAdblock:()=>false,isAdblockActive:false};
    
    function injectHideCss(){try{const s=document.createElement('style');s.textContent=hideCss,document.head.appendChild(s),console.log('[AdBlock] 💉 CSS injected')}catch(e){console.error('[AdBlock] CSS inject failed:',e)}}
    function circumventAntiAdblock(){Object.keys(antiAdblock).forEach(k=>Object.defineProperty(window,k,{value:antiAdblock[k],writable:false,configurable:true})),console.log('[AdBlock] 🛡️ Anti-adblock bypassed')}
    function blockPopunders(){const o=window.open;window.open=(u,n,f)=>adNetworks.some(n=>u?.includes(n))?(console.log(`[AdBlock] 🚫 Popunder blocked: ${u}`),null):o.call(this,u,n,f),console.log('[AdBlock] 🔒 window.open protected')}
    function blockAds(container=document){let count=0;adSelectors.concat(fallbackSelectors).forEach(sel=>{try{container.querySelectorAll(sel).forEach(el=>{if(el.style.display!=='none'){el.style.cssText='display:none!important;visibility:hidden!important;height:0!important;',el.remove?el.remove():el.parentNode.removeChild(el),count++}})}catch{}});count&&console.log(`[AdBlock] 💥 Nuked ${count} elements`)}
    
    // IMMEDIATE START
    circumventAntiAdblock(),blockPopunders(),injectHideCss(),blockAds();
    
    // LOAD LISTS (with timeout fallback)
    const loadTimeout=setTimeout(()=>{console.log('[AdBlock] ⏰ Lists timed out - using fallback selectors');filterListsLoaded=totalLists=4,injectHideCss()},8000);
    
    Promise.all(LISTS.map(fetchFilterList)).then(()=>{
        clearTimeout(loadTimeout);
        console.log(`[AdBlock] 🎉 ALL LISTS LOADED: ${filterListsLoaded}/${totalLists} (${adSelectors.length} total selectors)`);
        injectHideCss(); // Refresh CSS with real lists
        blockAds();
    });
    
    // MUTATION OBSERVER
    if(document.body)new MutationObserver(muts=>muts.forEach(mut=>mut.addedNodes.forEach(node=>node.nodeType===1&&blockAds(node)))).observe(document.body,{childList:true,subtree:true}),console.log('[AdBlock] 👁️ Live scanning active');
    
    // REPEATED CLEANUP
    const intervals=[500,1500,3500,7500].map(i=>setInterval(blockAds,i));
    
    // 24HR REFRESH
    setInterval(()=>LISTS.forEach(fetchFilterList),24*60*60*1000);
    
    console.log('[AdBlock] 🚀 LIVE uBlock/AdGuard/EasyList/EasyPrivacy - Streaming...');
})();
