// Retired-URL pages (scripts/generate-static-html.js) load this instead of an
// inline script, so the Content-Security-Policy needs no inline allowance.
// Only same-site paths are followed; the meta refresh covers everything else.
(function () {
  var s = document.currentScript;
  var to = s && s.getAttribute('data-to');
  if (to && to.charAt(0) === '/' && to.charAt(1) !== '/') location.replace(to);
})();
