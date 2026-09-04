// Runs in the ISOLATED world, so it has access to chrome.* APIs.
// Its only job: read the toggle state and forward it into the page's
// own JS context (MAIN world) via postMessage, since content-main.js
// cannot call chrome.storage directly.

const CHANNEL = "__CANAD_REGION_SPOOFER__";

function broadcast(isOn) {
  window.postMessage({ channel: CHANNEL, canadOn: !!isOn }, "*");
}

chrome.storage.local.get(["canadOn"], (result) => {
  broadcast(result.canadOn);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && "canadOn" in changes) {
    broadcast(changes.canadOn.newValue);
  }
});

// Also respond to explicit re-broadcast requests from the MAIN world
// (in case it loaded before this script's initial storage read landed).
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data && event.data.channel === CHANNEL && event.data.requestState) {
    chrome.storage.local.get(["canadOn"], (result) => broadcast(result.canadOn));
  }
});
