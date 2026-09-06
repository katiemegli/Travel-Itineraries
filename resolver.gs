/**
 * Short-link helper for Bookshelf of Memories.
 *
 * Google Maps "Share" links (https://maps.app.goo.gl/…) only reveal the
 * place they point to by redirecting, and browsers hide redirect targets
 * from web pages. This Google Apps Script follows the redirect on the
 * server and returns the full link, which the board then reads the place
 * name and pin from.
 *
 * Set up (about three minutes, free, on your own Google account):
 *   1. Open https://script.google.com and choose "New project".
 *   2. Replace the editor contents with this file and save.
 *   3. Deploy → New deployment → type "Web app".
 *        Execute as: Me.   Who has access: Anyone.
 *   4. Authorize when asked, then copy the Web app URL (ends in /exec).
 *   5. In the board, open trip settings and paste it into
 *      "Short-link helper URL".
 *
 * Test in a browser:  <your URL>?url=https://maps.app.goo.gl/XXXX
 * You should get {"url":"https://www.google.com/maps/place/…"}.
 */
function doGet(e) {
  var url = e && e.parameter && e.parameter.url ? String(e.parameter.url) : '';
  var result = { url: '', error: '' };
  if (!url) result.error = 'no url parameter';
  else if (!/^https:\/\/(maps\.app\.goo\.gl|goo\.gl|maps\.google\.[a-z.]+|www\.google\.[a-z.]+|g\.co)\//.test(url)) result.error = 'not a Google Maps link';
  else {
    try { result.url = follow_(url); }
    catch (err) { result.error = String(err && err.message || err); }
  }
  var body = JSON.stringify(result);
  // A "callback" parameter makes the reply loadable from a <script> tag, which works from any web page.
  var cb = e && e.parameter && e.parameter.callback ? String(e.parameter.callback) : '';
  if (cb && /^[\w$.]+$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + body + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

/** Follow HTTP redirects by hand so the final address can be returned. */
function follow_(url) {
  for (var i = 0; i < 6; i++) {
    var res = UrlFetchApp.fetch(url, { followRedirects: false, muteHttpExceptions: true });
    var code = res.getResponseCode();
    if (code < 300 || code >= 400) return url;
    var headers = res.getAllHeaders();
    var next = headers['Location'] || headers['location'];
    if (!next) return url;
    if (next.indexOf('/') === 0) next = url.replace(/^(https?:\/\/[^/]+).*$/, '$1') + next;
    // Consent pages wrap the real destination in a "continue" parameter.
    var m = next.match(/[?&]continue=([^&]+)/);
    if (m && /consent\.google/.test(next)) next = decodeURIComponent(m[1]);
    url = next;
  }
  return url;
}
