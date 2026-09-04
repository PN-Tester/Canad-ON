// Runs in the MAIN world - i.e. the actual page's JS context, with the
// page's real (unwrapped) window.fetch / XMLHttpRequest. This is what
// lets us catch AJAX/fetch/dynamic <script> calls the page itself makes,
// not just the first script tag.

(function () {
  const CHANNEL = "__CANAD_REGION_SPOOFER__";
  const TAG = "%c[Canad/Region]";
  const STYLE_ON = "color:#ff003c;font-weight:bold";
  const STYLE_OFF = "color:#888;font-weight:bold";

  let enabled = false;
  let announced = false;

  function log(msg, ...args) {
    console.log(TAG, enabled ? STYLE_ON : STYLE_OFF, msg, ...args);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (data && data.channel === CHANNEL && typeof data.canadOn === "boolean") {
      const changed = data.canadOn !== enabled;
      enabled = data.canadOn;
      if (changed || !announced) {
        log(`Interceptor is now ${enabled ? "ENABLED (forcing region=CA)" : "DISABLED (passthrough)"}`);
        announced = true;
      }
    }
  });

  // Ask the isolated-world bridge for current state, in case this script
  // executed before that one's first storage read completed.
  window.postMessage({ channel: CHANNEL, requestState: true }, "*");

  function isTargetUrl(u) {
    return u.hostname === "maps.googleapis.com";
  }

  function rewriteUrl(rawUrl, source) {
    if (!enabled || !rawUrl) return rawUrl;
    let url;
    try {
      url = new URL(rawUrl, window.location.href);
    } catch (e) {
      return rawUrl; // not a parseable absolute/relative URL, leave alone
    }

    if (!isTargetUrl(url)) return rawUrl;

    // Only touch requests that already HAVE a region param. Never inject
    // one into a request that doesn't specify region at all.
    if (!url.searchParams.has("region")) {
      log(`[${source}] no region param present - leaving request untouched`, "\n  url:", rawUrl);
      return rawUrl;
    }

    const before = url.searchParams.get("region");

    // Already CA - nothing to do (avoid noisy no-op logs/rewrites).
    if (before === "CA") {
      return rawUrl;
    }

    url.searchParams.set("region", "CA");
    const finalUrl = url.toString();

    log(
      `[${source}] rewrote region param (${before} -> CA)`,
      "\n  original:", rawUrl,
      "\n  patched: ", finalUrl
    );

    return finalUrl;
  }

  // --- Patch window.fetch ---
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      if (typeof input === "string" || input instanceof URL) {
        const newUrl = rewriteUrl(String(input), "fetch");
        return originalFetch.call(this, newUrl, init);
      }
      if (input instanceof Request) {
        const newUrl = rewriteUrl(input.url, "fetch:Request");
        if (newUrl !== input.url) {
          const cloned = new Request(newUrl, input);
          return originalFetch.call(this, cloned, init);
        }
      }
    } catch (e) {
      console.warn(TAG, STYLE_OFF, "fetch patch error, falling back to original request", e);
    }
    return originalFetch.call(this, input, init);
  };

  // --- Patch XMLHttpRequest ---
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    let newUrl = url;
    try {
      newUrl = rewriteUrl(url, "xhr");
    } catch (e) {
      console.warn(TAG, STYLE_OFF, "XHR patch error", e);
    }
    return originalOpen.call(this, method, newUrl, ...rest);
  };

  // --- Patch <script src="..."> set via property ---
  const scriptSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, "src");
  if (scriptSrcDescriptor && scriptSrcDescriptor.set) {
    Object.defineProperty(HTMLScriptElement.prototype, "src", {
      configurable: true,
      enumerable: scriptSrcDescriptor.enumerable,
      get: scriptSrcDescriptor.get,
      set: function (value) {
        let newUrl = value;
        try {
          newUrl = rewriteUrl(value, "script.src");
        } catch (e) {
          console.warn(TAG, STYLE_OFF, "script.src patch error", e);
        }
        return scriptSrcDescriptor.set.call(this, newUrl);
      }
    });
  }

  // --- Patch setAttribute('src', ...) on <script> elements ---
  const originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (this.tagName === "SCRIPT" && String(name).toLowerCase() === "src") {
      try {
        value = rewriteUrl(value, "script.setAttribute");
      } catch (e) {
        console.warn(TAG, STYLE_OFF, "setAttribute patch error", e);
      }
    }
    return originalSetAttribute.call(this, name, value);
  };

  log("Interceptor installed (fetch / XHR / <script src>)");
})();
