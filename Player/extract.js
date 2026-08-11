"use strict";

const CLEAR_URLS_RULES_API = "https://raw.githubusercontent.com/ClearURLs/Rules/master/data.min.json";
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=)|(?:piped|invidious)[^/]*\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/i;
const TRACKING_HASH_PATTERN = /utm_|fbclid|gclid/i;

let compiledRules = [];
let rulesLoaded = false;

/**
 * Compiles a provider's rules into regex patterns
 * @param {Object} provider - Provider object from ClearURLs data
 * @returns {Object|null} Compiled rule object or null if no URL pattern
 */
function compileProviderRules(provider) {
  if (!provider.urlPattern) return null;
  
  return {
    urlPattern: new RegExp(provider.urlPattern, "i"),
    queryRules: provider.rules?.map(r => new RegExp(r, "i")).filter(Boolean) ?? [],
    rawRules: provider.rawRules?.map(r => new RegExp(r, "i")).filter(Boolean) ?? [],
    exceptions: provider.exceptions?.map(e => new RegExp(e, "i")).filter(Boolean) ?? []
  };
}

/**
 * Dynamically fetches and parses the global ClearURLs ruleset
 */
async function initClearUrls() {
  try {
    const res = await fetch(CLEAR_URLS_RULES_API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    
    compiledRules = Object.values(data.providers)
      .map(compileProviderRules)
      .filter(Boolean);
    
    rulesLoaded = true;
  } catch (err) {
    console.error("Failed to dynamically populate ClearURLs ruleset:", err);
  }
}

// Initialize ClearURLs rules asynchronously on module load
initClearUrls();

/**
 * Removes tracking parameters from a URL using ClearURLs rules
 * @param {string} urlString - The URL to clean
 * @returns {string} Cleaned URL or original if parsing fails
 */
function cleanTrackingParams(urlString) {
  let urlObj;
  try {
    urlObj = new URL(urlString);
  } catch {
    return urlString;
  }

  if (!rulesLoaded || !urlObj.searchParams.toString()) {
    return urlString;
  }

  for (const rule of compiledRules) {
    if (!rule.urlPattern.test(urlObj.href)) continue;
    if (rule.exceptions.some(exc => exc.test(urlObj.href))) continue;

    removeMatchingQueryParams(urlObj, rule.queryRules);
    applyRawRules(urlObj, rule.rawRules);

    // Scrub generic target definitions in hash
    if (urlObj.hash && TRACKING_HASH_PATTERN.test(urlObj.hash)) {
      urlObj.hash = "";
    }
  }

  return urlObj.toString();
}

/**
 * Removes query parameters that match any of the provided regex rules
 * @param {URL} urlObj - URL object to modify
 * @param {RegExp[]} rules - Array of regex patterns to match against param names
 */
function removeMatchingQueryParams(urlObj, rules) {
  if (rules.length === 0) return;
  
  [...urlObj.searchParams].forEach(([key]) => {
    if (rules.some(rx => rx.test(key))) {
      urlObj.searchParams.delete(key);
    }
  });
}

/**
 * Applies raw regex replacement rules to the URL
 * @param {URL} urlObj - URL object to modify
 * @param {RegExp[]} rules - Array of regex patterns to replace
 */
function applyRawRules(urlObj, rules) {
  if (rules.length === 0) return;
  
  for (const rx of rules) {
    try {
      urlObj = new URL(urlObj.href.replace(rx, ""));
    } catch {
      // Continue on invalid URL after replacement
    }
  }
}

/**
 * Extracts a YouTube video ID from various URL formats or raw ID strings
 * @param {string} input - URL or video ID string
 * @returns {string|null} 11-character video ID or null if not found
 */
export function extractVideoID(input) {
  if (!input) return null;
  
  const cleanStr = cleanTrackingParams(input.trim());

  // Check if input is already a valid 11-character video ID
  if (VIDEO_ID_PATTERN.test(cleanStr)) {
    return cleanStr;
  }

  // Match standard YouTube URLs, Shorts, embeds, and alternative frontends
  const match = cleanStr.match(YOUTUBE_REGEX);
  
  return match ? match[1] : null;
}
