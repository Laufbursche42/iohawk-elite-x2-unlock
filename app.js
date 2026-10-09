'use strict';

// Zweisprachige Info-Seite im sf-unlock-Stil: Sprachumschalter Deutsch/Englisch, Hell/Dunkel-Umschalter.
// Alles läuft lokal, es gibt keine Netzverbindung außer dem Laden der statischen Dateien.

// Shared markdown renderer (fleet-wide): esc + inlineMd + mdToHtml, same engine as lb-tool-web.
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function inlineMd(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, text, href) {
      return '<a href="' + href + '" target="_blank" rel="noopener">' + text + '</a>';
    });
}
function mdToHtml(md) {
  var codeBlocks = [];
  // 1) pull fenced code blocks out first so their content is never treated as markdown
  md = String(md).replace(/```[^\n]*\n?([\s\S]*?)```/g, function (m, code) {
    var i = codeBlocks.length;
    codeBlocks.push('<pre><code>' + esc(code.replace(/\n$/, '')) + '</code></pre>');
    return '\x00CB' + i + '\x00';
  });
  var lines = md.split(/\r?\n/);
  var out = [], para = [], list = null;
  function flushPara() { if (para.length) { out.push('<p>' + inlineMd(esc(para.join(' '))) + '</p>'); para = []; } }
  function flushList() { if (list) { out.push('<' + list.type + '>' + list.items.join('') + '</' + list.type + '>'); list = null; } }
  function isTableSep(s) { var tt = s.replace(/\s/g, ''); return /^\|?:?-+:?(\|:?-+:?)+\|?$/.test(tt); }
  function splitRow(s) { return s.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); }); }
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i];
    var cb = ln.match(/^\x00CB(\d+)\x00$/);
    if (cb) { flushPara(); flushList(); out.push(codeBlocks[Number(cb[1])]); continue; }
    if (/^\s*$/.test(ln)) { flushPara(); flushList(); continue; }
    var h = ln.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flushPara(); flushList(); var lvl = Math.min(h[1].length, 4); out.push('<h' + lvl + '>' + inlineMd(esc(h[2])) + '</h' + lvl + '>'); continue; }
    if (/^---+$/.test(ln.trim())) { flushPara(); flushList(); out.push('<hr>'); continue; }
    if (ln.indexOf('|') >= 0 && i + 1 < lines.length && isTableSep(lines[i + 1])) {   // GFM table: header, |---| sep, rows
      flushPara(); flushList();
      var head = splitRow(ln); i++;   // consume the separator row
      var body = '';
      while (i + 1 < lines.length && lines[i + 1].indexOf('|') >= 0 && lines[i + 1].trim() !== '') {
        body += '<tr>' + splitRow(lines[++i]).map(function (c) { return '<td>' + inlineMd(esc(c)) + '</td>'; }).join('') + '</tr>';
      }
      out.push('<table><thead><tr>' + head.map(function (c) { return '<th>' + inlineMd(esc(c)) + '</th>'; }).join('') + '</tr></thead><tbody>' + body + '</tbody></table>');
      continue;
    }
    if (/^\s*>/.test(ln)) {                             // merge consecutive > lines into ONE callout
      flushPara(); flushList();
      var q = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      i--;                                              // step back; the for-loop re-increments
      while (q.length && /^\s*$/.test(q[0])) q.shift();
      while (q.length && /^\s*$/.test(q[q.length - 1])) q.pop();
      if (q.length) out.push('<blockquote>' + mdToHtml(q.join('\n')) + '</blockquote>');  // inner rendered as markdown
      continue;
    }
    var ul = ln.match(/^\s*[-*]\s+(.*)$/);
    var ol = ln.match(/^\s*\d+\.\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      var type = ul ? 'ul' : 'ol';
      if (!list || list.type !== type) { flushList(); list = { type: type, items: [] }; }
      list.items.push('<li>' + inlineMd(esc((ul ? ul[1] : ol[1]))) + '</li>');
      continue;
    }
    para.push(ln.trim());
  }
  flushPara(); flushList();
  return out.join('\n');
}

const BUILD = 'v1';
const $ = (id) => document.getElementById(id);
let lang = 'de';

function table() { return (window.I18N && window.I18N[lang]) || {}; }
function t(key) { const v = table()[key]; return (typeof v === 'string') ? v : ''; }

function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach((n) => { n.textContent = t(n.getAttribute('data-t')); });
  const de = $('content-de'), en = $('content-en');
  if (de) de.hidden = (lang !== 'de');
  if (en) en.hidden = (lang !== 'en');
  const sd = $('sunset-de'), se = $('sunset-en');   // language-matched deprecation banner
  if (sd) sd.hidden = (lang !== 'de');
  if (se) se.hidden = (lang !== 'en');
  document.querySelectorAll('#langs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  { const el = $('langs'); if (el) el.setAttribute('aria-label', t('langGroup')); }
  { const dark = document.documentElement.getAttribute('data-theme') !== 'light'; const b = $('btn-theme');
    if (b) { b.setAttribute('aria-label', t(dark ? 'themeToLight' : 'themeToDark')); b.title = b.getAttribute('aria-label'); } }
  { const el = $('build-ver'); if (el) el.textContent = t('buildLabel') + ' ' + BUILD; }
  { const ti = table().pageTitle; if (ti) document.title = ti; }
}
function initLang() {
  // Deutsch ist Standard. Nur eine bewusste, gespeicherte Wahl schaltet auf Englisch.
  let saved = null; try { saved = localStorage.getItem('ex2_lang'); } catch (e) {}
  lang = (saved === 'en') ? 'en' : 'de';
  document.querySelectorAll('#langs button').forEach((b) => b.addEventListener('click', () => {
    lang = b.dataset.lang; try { localStorage.setItem('ex2_lang', lang); } catch (e) {} applyLang();
  }));
}

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const b = $('btn-theme');
  if (b) { b.textContent = dark ? '\u2600' : '\u263E'; b.setAttribute('aria-label', t(dark ? 'themeToLight' : 'themeToDark')); b.title = b.getAttribute('aria-label'); }
  try { localStorage.setItem('ex2_theme', dark ? 'dark' : 'light'); } catch (e) {}
}
function initTheme() {
  let saved = null; try { saved = localStorage.getItem('ex2_theme'); } catch (e) {}
  applyTheme(saved !== 'light');
  const b = $('btn-theme'); if (b) b.addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme') === 'light'));
}

window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLang();
  applyLang();
});
