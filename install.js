/*! Rainwater Games one-tap install button — © 2026 Rainwater Games (Jeff Rainwater). All rights reserved.
 * <script src="install.js?v=X" data-name="Game" data-screens="#title,#menu"></script>
 * Shows "Install <Game> vX for Android / PC" (Chrome/Edge beforeinstallprompt -> prompt()) or "for iPhone"
 * (iOS: 2-step Share -> Add to Home Screen picture overlay), only while one of data-screens is visible.
 * Hidden when running installed (display-mode standalone/fullscreen) or after appinstalled. ?install=1 opens it right away. */
(function () {
  'use strict';
  var me = document.currentScript, NAME = (me && me.dataset.name) || document.title, SCREENS = ((me && me.dataset.screens) || '').split(',').filter(Boolean);
  /* data-gate="__UF.state=title|shop": show only while window.__UF.state is one of those values; data-bottom: lift the button */
  var GATE = (me && me.dataset.gate) ? /^([\w$]+)\.([\w$]+)=(.+)$/.exec(me.dataset.gate) : null, BOTTOM = (me && me.dataset.bottom) || '14px';
  var ua = navigator.userAgent, IOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1), AND = /Android/.test(ua);
  var PLAT = IOS ? 'iPhone' : AND ? 'Android' : 'PC';
  var WANT = /[?&]install=1\b/.test(location.search);
  function installed() {
    return navigator.standalone === true || ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some(function (m) { return matchMedia('(display-mode: ' + m + ')').matches; });
  }
  if (installed()) return;
  var deferred = null, done = false, ver = '', btn, ov;
  var css = '.rgi-b{position:fixed;left:50%;bottom:calc(' + BOTTOM + ' + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483000;display:none;align-items:center;gap:8px;width:max-content;max-width:calc(100vw - 24px);padding:12px 20px;border:0;border-radius:999px;font:800 clamp(12px,3.7vw,15px)/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0b0f1e;background:linear-gradient(90deg,#22d3ee,#a78bfa,#f472b6);box-shadow:0 6px 24px rgba(0,0,0,.45),0 0 18px rgba(167,139,250,.6);cursor:pointer;text-align:left;-webkit-tap-highlight-color:transparent}' +
    '.rgi-b svg{width:18px;height:18px;flex:none}.rgi-b.on{display:flex}.rgi-b.want{animation:rgiP 1s ease-in-out infinite}@keyframes rgiP{50%{transform:translateX(-50%) scale(1.07)}}' +
    '.rgi-o{position:fixed;inset:0;z-index:2147483001;background:rgba(5,6,16,.82);display:none;align-items:flex-end;justify-content:center;padding:16px;font:16px/1.35 system-ui,-apple-system,sans-serif;color:#fff}.rgi-o.on{display:flex}' +
    '.rgi-c{width:100%;max-width:380px;background:#141a33;border:1px solid #ffffff2a;border-radius:22px;padding:18px 18px 14px;box-shadow:0 20px 60px #000}.rgi-c h3{margin:0 0 12px;font-size:18px}' +
    '.rgi-s{display:flex;align-items:center;gap:14px;margin:10px 0;padding:12px;border-radius:14px;background:#ffffff10}.rgi-n{flex:none;width:28px;height:28px;border-radius:50%;background:#a78bfa;color:#0b0f1e;font-weight:900;display:flex;align-items:center;justify-content:center}' +
    '.rgi-i{flex:none;width:44px;height:44px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center}.rgi-i svg{width:28px;height:28px}' +
    '.rgi-x{display:block;width:100%;margin-top:8px;padding:12px;border:0;border-radius:14px;background:#ffffff1c;color:#fff;font:700 15px system-ui,sans-serif;cursor:pointer}.rgi-a{text-align:center;font-size:30px;line-height:1;margin-top:6px;animation:rgiD 1s ease-in-out infinite}@keyframes rgiD{50%{transform:translateY(6px)}}';
  var DL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 20h14"/></svg>';
  var SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="#0a84ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5v10h14V11h-1"/></svg>';
  var ADD = '<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  function label() { return 'Install ' + NAME + (ver ? ' v' + ver : '') + ' for ' + PLAT; }
  function screenOn() {
    if (GATE) { var o = window[GATE[1]]; return !!o && GATE[3].split('|').indexOf(String(o[GATE[2]])) >= 0; }
    if (!SCREENS.length) return true;
    return SCREENS.some(function (s) { var e = document.querySelector(s); return e && !e.classList.contains('hide') && !e.hidden && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden'; });
  }
  function available() { return !done && (IOS || deferred); }
  function sync() {
    if (!btn) return;
    if (installed()) done = true;
    btn.classList.toggle('on', available() && screenOn() && !(ov && ov.classList.contains('on')));
    btn.lastChild.textContent = label();
  }
  function openIOS() { ov.classList.add('on'); sync(); }
  function go() {
    if (IOS) return openIOS();
    if (!deferred) return;
    var d = deferred; deferred = null; sync();
    d.prompt();
    (d.userChoice || Promise.resolve({})).then(function (c) { if (c && c.outcome === 'accepted') { done = true; } sync(); });
  }
  function build() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'rgi-b' + (WANT ? ' want' : ''); btn.id = 'rgInstall';
    btn.innerHTML = DL + '<span></span>';
    ['pointerdown', 'touchstart', 'mousedown'].forEach(function (t) { btn.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true }); });
    btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); btn.classList.remove('want'); go(); });
    document.body.appendChild(btn);
    ov = document.createElement('div'); ov.className = 'rgi-o'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Install for iPhone');
    ov.innerHTML = '<div class="rgi-c"><h3>Install ' + NAME.replace(/</g, '&lt;') + ' on your iPhone</h3>' +
      '<div class="rgi-s"><span class="rgi-n">1</span><span class="rgi-i">' + SHARE + '</span><span>Tap <b>Share</b> in the Safari toolbar</span></div>' +
      '<div class="rgi-s"><span class="rgi-n">2</span><span class="rgi-i">' + ADD + '</span><span>Tap <b>Add to Home Screen</b></span></div>' +
      '<div class="rgi-a">⬇</div><button type="button" class="rgi-x">Got it</button></div>';
    ['pointerdown', 'touchstart', 'mousedown', 'click'].forEach(function (t) { ov.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: t !== 'click' }); });
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.className === 'rgi-x') { ov.classList.remove('on'); sync(); } });
    document.body.appendChild(ov);
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { ver = String(j.v || ''); sync(); }).catch(function () {});
    sync(); setInterval(sync, 400);
    if (WANT && IOS) setTimeout(function () { openIOS(); }, 600);
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; done = false; sync(); });
  window.addEventListener('appinstalled', function () { done = true; deferred = null; if (ov) ov.classList.remove('on'); sync(); });
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
  window.RGInstall = { go: go, platform: PLAT, state: function () { return { platform: PLAT, prompt: !!deferred, installed: installed() || done, visible: !!(btn && btn.classList.contains('on')) }; } };
})();
