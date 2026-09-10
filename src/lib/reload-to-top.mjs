/**
 * Blocking head script: a refresh of /#invoicing (or any leftover hash) must
 * start at the top of the page. In-page nav clicks still scroll to the section.
 */
export const RELOAD_TO_TOP_SCRIPT = `(function(){
  try {
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    var reload = nav ? nav.type === 'reload' : (typeof performance.navigation !== 'undefined' && performance.navigation.type === 1);
    if (!reload) return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    window.scrollTo(0, 0);
  } catch (e) {}
})();`
