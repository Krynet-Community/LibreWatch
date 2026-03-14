(function() {
    'use strict';
    
    let adSelectors=[],filterListsLoaded=0;const LISTS=[
        'https://raw.githubusercontent.com/easylist/easylist/master/easyprivacy/easyprivacy.txt',
        'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
        'https://raw.githubusercontent.com/AdguardTeam/AdguardFilters/master/AntiAdblockFilters/filter.txt',
        'https://raw.githubusercontent.com/easylist/easylist/master/easylist/easylist.txt'
    ];
    
    async function fetchFilterList(url,i){
        try{const res=await fetch(url,{cache:'no-cache'});if(!res.ok)return;
            const text=await res.text(),rules=text.split('\n').filter(e=>e.trim()&&
                !e.startsWith('!')&&!e.includes('@@')&&(
                    e.includes('##')||e.includes('###')||e.includes('#@')||
                    e.match(/\[-(?:ext-]bg-|abp:][^)]+\)/)||
                    e.match(/##\w/)||e.includes('|http')||e.includes('ad$')
                )).slice(0,500); // Limit to 500 rules per list
            rules.forEach(rule=>{
                const match=rule.match(/##(.*)/);if(match)adSelectors.push(match[1]);
                const cosmetic=rule.match(/#@#(.*)/);if(cosmetic)adSelectors.push(cosmetic[1]);
                const elemhide=rule.match(/#@\^#(.*)/);if(elemhide)adSelectors.push(elemhide[1]);
            }),console.log(`[AdBlock] Loaded ${rules.length} rules from ${url.split('/').pop()} (${++filterListsLoaded}/4)`);
        }catch(e){console.warn(`[AdBlock] Failed ${url}:`,e)}
    }
    
    const hideCss='[style*="position:fixed"][style*="z-index"],[id*="ad"],[class*="ad"],'+adSelectors.join(',')+'{display:none!important;visibility:hidden!important;height:1px!important;width:1px!important;pointer-events:none!important;opacity:0!important;}',
    antiAdblock={AdBlock:false,adblock:false,blockAdblock:false,_AdBlock_:false,canRunAds:true,checkAdblock:()=>false,isAdblockActive:false};
    
    function injectHideCss(){const e=document.createElement('style');e.type='text/css',e.appendChild(document.createTextNode(hideCss)),document.head.appendChild(e)}
    function circumventAntiAdblock(){Object.keys(antiAdblock).forEach(e=>Object.defineProperty(window,e,{value:antiAdblock[e],writable:false,configurable:true}));console.log('[AdBlock] Anti-adblock bypassed')}
    function blockPopunders(){const e=window.open;window.open=t=>adNetworks.some(n=>t?.includes(n))?(console.log(`[AdBlock] Blocked: ${t}`),null):e.apply(this,arguments)}
    function blockAds(e=document){let t=0;adSelectors.forEach(n=>{e.querySelectorAll(n).forEach(e=>e.style.cssText='display:none!important;visibility:hidden!important;height:1px!important;',t++)}),t&&console.log(`[AdBlock] Nuked ${t} elements`)}
    
    // LOAD ALL 4 LISTS PARALLEL
    LISTS.forEach((url,i)=>fetchFilterList(url,i));
    
    circumventAntiAdblock(),blockPopunders(),injectHideCss(),blockAds(),
    new MutationObserver(e=>e.forEach(e=>e.addedNodes.forEach(e=>e.nodeType===1&&blockAds(e)))).observe(document.body||document.documentElement,{childList:true,subtree:true}),
    setTimeout(blockAds,1000),setTimeout(blockAds,3000),setTimeout(blockAds,5000),
    console.log('[AdBlock] LIVE uBlock/AdGuard/EasyList/EasyPrivacy - AUTO-UPDATING');
    
    // REFRESH EVERY 24 HOURS
    setInterval(async()=>{
        filterListsLoaded=0,adSelectors.length=0,
        console.log('[AdBlock] Refreshing filter lists...'),
        LISTS.forEach((url,i)=>fetchFilterList(url,i))
    },24*60*60*1000);
})();
