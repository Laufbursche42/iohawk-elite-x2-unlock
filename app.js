'use strict';

// Zweisprachige Info-Seite im sf-unlock-Stil: Sprachumschalter Deutsch/Englisch, Hell/Dunkel-Umschalter.
// Alles läuft lokal, es gibt keine Netzverbindung außer dem Laden der statischen Dateien.

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
  if (b) { b.innerHTML = dark ? '&#9728;' : '&#9790;'; b.setAttribute('aria-label', t(dark ? 'themeToLight' : 'themeToDark')); b.title = b.getAttribute('aria-label'); }
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
