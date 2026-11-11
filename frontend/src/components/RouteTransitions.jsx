import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop - Silently resets scroll restoration to top (0,0) only on real page (pathname) navigation.
 * Does not fire on query string changes (such as search filters, tabs, or pagination).
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const targetId = hash.replace('#', '');
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    if (typeof window !== 'undefined' && window.scrollY > 0) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
