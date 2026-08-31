// client.mjs
/**
 * Initialize MDefender Pro WAF client-side protection for SPAs.
 * @param {Object} options - Client configuration
 * @param {string} options.backendUrl - Base URL of your backend API server (e.g. 'http://localhost:5005')
 */
export function initWaf(options = {}) {
  if (typeof window === 'undefined') return;

  const backendUrl = options.backendUrl || '';
  const currentSearch = decodeURIComponent(window.location.search);

  // Helper to render WAF block page
  const handleWafBlock = (htmlText) => {
    if (htmlText && (htmlText.includes('MDefender-Pro') || htmlText.includes('Access Denied') || htmlText.includes('MDefender'))) {
      document.open();
      document.write(htmlText);
      document.close();
      throw new Error("MDefender WAF Blocked Request");
    }
  };

  // 1. Instant check on page load
  if (currentSearch) {
    const attackRegex = /(<script|onerror|onload|javascript:|alert\(|confirm\(|prompt\(|\.\.\/|\.\.\\|union.*select|drop.*table|'\s*(or|and)\s+['\w]|etc\/passwd|;\s*(whoami|id|cat|ls|cmd|sh|bash))/i;
    if (attackRegex.test(currentSearch)) {
      const origFetch = window.fetch;
      const testUrl = backendUrl + (backendUrl.endsWith('/') ? '' : '/') + 'api/books/' + window.location.search;
      
      origFetch(testUrl)
        .then(response => {
          if (response.status === 403) {
            return response.text();
          }
        })
        .then(htmlText => {
          if (htmlText) {
            handleWafBlock(htmlText);
          }
        })
        .catch(() => {});

      // Halt immediate execution while fetching block page
      throw new Error("MDefender WAF Blocked Request");
    }
  }

  // 2. Intercept window.fetch to propagate query params and catch 403
  const originalFetch = window.fetch;
  window.fetch = async (input, init, ...args) => {
    let url = input;
    const searchStr = window.location.search;
    
    if (searchStr) {
      if (typeof url === 'string') {
        if (url.startsWith('/') || url.includes(backendUrl) || url.includes('/api/')) {
          const separator = url.includes('?') ? '&' : '?';
          url = url + separator + searchStr.substring(1);
        }
      } else if (url instanceof Request) {
        if (url.url.startsWith('/') || url.url.includes(backendUrl) || url.url.includes('/api/')) {
          const separator = url.url.includes('?') ? '&' : '?';
          const newUrl = url.url + separator + searchStr.substring(1);
          url = new Request(newUrl, url);
        }
      }
    }

    const response = await originalFetch(url, init, ...args);
    if (response.status === 403) {
      const clone = response.clone();
      try {
        const text = await clone.text();
        handleWafBlock(text);
      } catch (e) {}
    }
    return response;
  };

  // 3. Intercept XMLHttpRequest.prototype.open to propagate query params
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    const searchStr = window.location.search;
    if (searchStr && (url.startsWith('/') || url.includes(backendUrl) || url.includes('/api/'))) {
      const separator = url.includes('?') ? '&' : '?';
      url = url + separator + searchStr.substring(1);
    }
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  // 4. Intercept XMLHttpRequest.prototype.send to catch 403
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', function() {
      if (this.status === 403) {
        handleWafBlock(this.responseText);
      }
    });
    return originalSend.apply(this, args);
  };
}
