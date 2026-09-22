/**
 * Universal clipboard utility that works across HTTPS, HTTP (e.g. direct server IP),
 * localhost, iframes, and mobile browsers.
 */
export async function copyToClipboard(text) {
  if (text === null || text === undefined) return false;
  const str = String(text);

  // 1. Try modern Async Clipboard API (available in HTTPS / localhost)
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(str);
      return true;
    } catch (e) {
      // Fallback if permission denied or non-secure context
    }
  }

  // 2. Fallback using document.execCommand('copy') (works on HTTP / IP addresses)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = str;
    
    // Prevent scrolling and keep it invisible
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.setAttribute('readonly', '');
    
    document.body.appendChild(textArea);
    textArea.focus({ preventScroll: true });
    textArea.select();
    
    // For iOS compatibility
    if (textArea.setSelectionRange) {
      textArea.setSelectionRange(0, str.length);
    }

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Copy to clipboard failed:', err);
    return false;
  }
}

export default copyToClipboard;
