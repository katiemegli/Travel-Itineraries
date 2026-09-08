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
 *
 * Pictures: a card's pictures are kept in a Drive folder called "Bookshelf of Memories"
 * in the account that runs this script, shared to anyone with the link so every board can
 * show them. The card itself holds only the file's id. The first time this version runs,
 * Google will ask you to allow the script to use Drive; that is expected.
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
  if (body.op === 'ping') return reply_({ ok: true, pong: true, bytes: String(e.postData.contents).length });
  if (body.op === 'putChunk') return reply_(putChunk_(body));
  if (body.op === 'putImage') return reply_(putImage_(body));
  if (body.op === 'deleteImage') return reply_(deleteImage_(body));
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
/* ---- pictures, kept in Drive ---- */
var IMAGE_FOLDER = 'Bookshelf of Memories';
function folder_() {
  var it = DriveApp.getFoldersByName(IMAGE_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(IMAGE_FOLDER);
}
/* A picture arrives in pieces, each small enough to be an ordinary request, held briefly in
   the script cache until the last piece says the whole thing is there. */
function putChunk_(w) {
  var id = String(w.uploadId || ''), i = Number(w.i);
  if (!/^[\w-]{4,40}$/.test(id) || !(i >= 0 && i < 600)) return { ok: false, error: 'bad piece' }; // up to about 36 MB
  CacheService.getScriptCache().put('up:' + id + ':' + i, String(w.chunk || ''), 1200);
  return { ok: true };
}
function putImage_(w) {
  var data = String(w.data || '');
  if (!data && w.uploadId) {
    var cache = CacheService.getScriptCache(), n = Number(w.n || 0), parts = [];
    for (var i = 0; i < n; i++) {
      var c = cache.get('up:' + w.uploadId + ':' + i);
      if (c == null) return { ok: false, error: 'piece ' + (i + 1) + ' of ' + n + ' did not arrive' };
      parts.push(c);
    }
    data = parts.join('');
    for (var j = 0; j < n; j++) cache.remove('up:' + w.uploadId + ':' + j);
  }
  var m = /^data:([^;]+);base64,(.*)$/.exec(data);
  if (!m) return { ok: false, error: 'not a picture' };
  if (m[1].indexOf('image/') !== 0) return { ok: false, error: 'not a picture' };
  var name = String(w.name || 'photo').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120) || 'photo';
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name);
  var file = folder_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { ok: true, fileId: file.getId() };
}
function deleteImage_(w) {
  try { if (w.fileId) DriveApp.getFileById(String(w.fileId)).setTrashed(true); } catch (err) {}
  return { ok: true };
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
