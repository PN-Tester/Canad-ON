// Network-level BACKSTOP rule (declarativeNetRequest). Primary interception
// now happens in-page via content-main.js (fetch/XHR/script patching), but
// this catches anything that slips past that layer - e.g. requests issued
// from a context the content script can't patch (workers, prefetch, some
// browser-internal fetches).
//
// By design this only rewrites a region= value that's already present in
// the URL - it never adds region= to a request that doesn't have it
// (matches the in-page interceptor's behavior in content-main.js).
const REPLACE_RULE_ID = 1;

const RESOURCE_TYPES = [
  "main_frame",
  "sub_frame",
  "script",
  "xmlhttprequest",
  "image",
  "other",
  "ping",
  "media",
  "object",
  "stylesheet",
  "font",
  "websocket"
];

function log(...args) {
  console.log("%c[Canad/Region bg]", "color:#ff003c;font-weight:bold", ...args);
}

function buildRules() {
  return [
    {
      id: REPLACE_RULE_ID,
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          regexSubstitution: "\\1CA\\2"
        }
      },
      condition: {
        regexFilter: "^(https://maps\\.googleapis\\.com/[^?\\s]*\\?[^\\s]*region=)[^&\\s]*(.*)$",
        resourceTypes: RESOURCE_TYPES
      }
    }
  ];
}

async function applyState(isOn) {
  const removeRuleIds = [REPLACE_RULE_ID];
  try {
    if (isOn) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules: buildRules()
      });
      log("Rule ENABLED - region= on maps.googleapis.com requests will be forced to CA");
    } else {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds });
      log("Rule DISABLED - passthrough");
    }

    const current = await chrome.declarativeNetRequest.getDynamicRules();
    log("Current dynamic rules:", current);
  } catch (e) {
    console.error("%c[Canad/Region bg]", "color:#ff003c;font-weight:bold", "Failed to update rules", e);
  }
}

// Live feedback on every request that actually matches our rule.
// Requires "declarativeNetRequestFeedback" permission; only fires for
// unpacked/dev-mode extensions.
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    log("Rule matched a live request:", info);
  });
}

chrome.runtime.onStartup.addListener(async () => {
  const { canadOn } = await chrome.storage.local.get(["canadOn"]);
  applyState(!!canadOn);
});

chrome.runtime.onInstalled.addListener(async () => {
  const { canadOn } = await chrome.storage.local.get(["canadOn"]);
  applyState(!!canadOn);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === "CANAD_TOGGLE") {
    applyState(!!message.value);
  }
});
