/**
 * Blocking head script: a refresh of /#invoicing (or any leftover hash) must
 * start at the top of the page. In-page nav clicks still scroll to the section.
 */
export const RELOAD_TO_TOP_SCRIPT = `(function(){
  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    var reload = nav ? nav.type === 'reload' : (typeof performance.navigation !== 'undefined' && performance.navigation.type === 1);
    if (!reload) return;
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    document.documentElement.style.scrollBehavior = 'auto';
    var top = function () { window.scrollTo(0, 0); };
    var n = 0;
    var tick = function () {
      top();
      if (++n < 12) requestAnimationFrame(tick);
    };
    tick();
    document.addEventListener('DOMContentLoaded', top);
    window.addEventListener('load', top);
    window.addEventListener('pageshow', top);
  } catch (e) {}
})();`
