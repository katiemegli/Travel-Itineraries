/**
 * Helper for Bookshelf of Memories: expands short Google Maps links and stores the shared board.
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
/*
 * Shared board storage. Everyone with the board's link reads and writes the same
 * documents, kept in this script's properties. Each write bumps a version number so
 * open boards can poll for changes.
 */
function doGet(e) {
  var op = e && e.parameter && e.parameter.op ? String(e.parameter.op) : '';
  if (op === 'all') return reply_(readAll_(), e);
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

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return reply_({ ok: false, error: 'bad json' }); }
  var props = PropertiesService.getScriptProperties();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var v = Number(props.getProperty('v') || 0) + 1;
    var writes = body.op === 'batch' ? (body.writes || []) : [body];
    writes.forEach(function (w) {
      var key = w.kind === 'trip' ? 'trip:' + w.id : 'event:' + w.tripId + ':' + w.id;
      if (w.op === 'set') props.setProperty(key, JSON.stringify(w.data));
      else if (w.op === 'delete') props.deleteProperty(key);
      else if (w.op === 'deleteTrip') {
        var all = props.getProperties();
        Object.keys(all).forEach(function (k) { if (k === 'trip:' + w.id || k.indexOf('event:' + w.id + ':') === 0) props.deleteProperty(k); });
      }
    });
    props.setProperty('v', String(v));
    return reply_({ ok: true, v: v });
  } finally { lock.releaseLock(); }
}
function readAll_() {
  var all = PropertiesService.getScriptProperties().getProperties();
  var out = { v: Number(all.v || 0), trips: {}, events: {} };
  Object.keys(all).forEach(function (k) {
    try {
      if (k.indexOf('trip:') === 0) out.trips[k.slice(5)] = JSON.parse(all[k]);
      else if (k.indexOf('event:') === 0) { var parts = k.split(':'); (out.events[parts[1]] = out.events[parts[1]] || {})[parts.slice(2).join(':')] = JSON.parse(all[k]); }
    } catch (err) {}
  });
  return out;
}
function reply_(obj, e) {
  var body = JSON.stringify(obj);
  var cb = e && e.parameter && e.parameter.callback ? String(e.parameter.callback) : '';
  if (cb && /^[\w$.]+$/.test(cb)) return ContentService.createTextOutput(cb + '(' + body + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
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
