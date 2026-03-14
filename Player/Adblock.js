(function() {
    'use strict';
    
    let adSelectors=[],filterListsLoaded=0;
    const LISTS=[
        'https://easylist.to/easylist/easyprivacy.txt',
        'https://ublockorigin.github.io/uAssets/filters/filters.txt',
        'https://raw.githubusercontent.com/AdguardTeam/AdguardFilters/master/AnnoyancesFilter/sections/adguard_dns_filter.txt',
        'https://easylist.to/easylist/easylist.txt'
    ],adNetworks=['googleads.g.doubleclick.net','pagead2.googlesyndication.com','adservice.google.com','ad.doubleclick.net','youtube.com/get_video_ads'];
    
    async function fetchFilterList(url){
        try{
            console.log(`[AdBlock] Fetching ${url.split('/').pop()}...`);
            const res=await fetch(url,{cache:'no-cache',mode:'cors'});
            if(!res.ok){console.warn(`[AdBlock] ${url.split('/')[url.split('/').length-1]} failed: ${res.status}`);return;}
            
            const text=await res.text();
            const rules=text.split('\n')
                .filter(line=>line.trim()&&!line.startsWith('!')&&!line.includes('@@'))
                .filter(line=>line.includes('##')||line.includes('###')||line.includes('#@'))
                .slice(0,200);
            
            let count=0;
            rules.forEach(rule=>{
                const match=rule.match(/(?:##|###|#@#)(.*)/);
                if(match){adSelectors.push(match[1].trim());count++;}
            });
            
            filterListsLoaded++;
            console.log(`[AdBlock] ✅ Loaded ${count} rules from ${url.split('/').pop()} (${filterListsLoaded}/4)`);
        }catch(e){
            console.warn(`[AdBlock] ❌ Failed ${url.split('/').pop()}:`,e);
            filterListsLoaded++;
        }
    }
    
    const fallbackSelectors=[
        '[id*="ad"]','[class*="ad"]','.ytp-ad-module','.video-ads','.ytp-ad-overlay',
        '.ad-container','.banner-ad','iframe[src*="doubleclick"]','.native-ad','.ytp-ad-skip-button'
    ];
    
    let hideCss=`[id*="ad"],[class*="ad"],${fallbackSelectors.join(',')}{display:none!important;visibility:hidden!important;height:0!important;pointer-events:none!important;}`;
    
    const antiAdblock={AdBlock:false,adblock:false,blockAdblock:false,_AdBlock_:false,canRunAds:true,checkAdblock:()=>false,isAdblockActive:false};
    
    function injectHideCss(){try{const s=document.createElement('style');s.textContent=hideCss,document.head.appendChild(s),console.log('[AdBlock] 💉 CSS injected')}catch(e){console.error('[AdBlock] CSS failed:',e)}}
    function circumventAntiAdblock(){Object.keys(antiAdblock).forEach(k=>Object.defineProperty(window,k,{value:antiAdblock[k],writable:false,configurable:true})),console.log('[AdBlock] 🛡️ Anti-adblock bypassed')}
    function blockPopunders(){const o=window.open;window.open=(u,n,f)=>adNetworks.some(n=>u?.includes(n))?(console.log(`[AdBlock] 🚫 Popunder: ${u}`),null):o.call(this,u,n,f),console.log('[AdBlock] 🔒 Popunders blocked')}
    function blockAds(container=document){let count=0;adSelectors.concat(fallbackSelectors).forEach(sel=>{try{container.querySelectorAll(sel).forEach(el=>{if(el.style.display!=='none'){el.style.cssText='display:none!important;height:0!important;',count++}})}catch{}});count&&console.log(`[AdBlock] 💥 Nuked ${count} ads`)}
    
    circumventAntiAdblock(),blockPopunders(),injectHideCss(),blockAds();
    
    LISTS.forEach(fetchFilterList);
    
    if(document.body)new MutationObserver(muts=>muts.forEach(mut=>mut.addedNodes.forEach(node=>node.nodeType===1&&blockAds(node)))).observe(document.body,{childList:true,subtree:true}),console.log('[AdBlock] 👁️ Live scanning');
    
    setInterval(blockAds,1000);
    
    console.log('[AdBlock] 🚀 uBlock/AdGuard Fallback + LIVE scanning ACTIVE');
