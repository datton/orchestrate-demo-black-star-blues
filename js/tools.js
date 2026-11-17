/* tools: fullstack. Sample fixtures, countdown, day planner and fan cards.
   Everything runs in the browser; nothing is sent anywhere. */
(function () {
  'use strict';

  var STORE = 'black-star-blues-cards';
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clock(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dayText(d) { return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  /* Sample fixtures, placed relative to today (never out of date). */
  var PLAN = [
    { days: 3,  h: 17, m: 30, home: true,  opp: 'Sample Rovers' },
    { days: 10, h: 15, m: 0,  home: false, opp: 'Sample United' },
    { days: 17, h: 20, m: 0,  home: true,  opp: 'Sample Athletic' },
    { days: 24, h: 12, m: 30, home: false, opp: 'Sample Town' },
    { days: 31, h: 15, m: 0,  home: true,  opp: 'Sample City' }
  ];
  var fixtures = PLAN.map(function (p, i) {
    var d = new Date();
    d.setDate(d.getDate() + p.days);
    d.setHours(p.h, p.m, 0, 0);
    return {
      id: String(i), date: d, home: p.home,
      title: (p.home ? 'Blues v ' + p.opp : p.opp + ' v Blues') + ' (sample)',
      when: dayText(d) + ', ' + clock(d) + ' kick-off'
    };
  });
  function byId(id) { return fixtures[+id] || fixtures[0]; }

  function untilText(date) {
    var ms = date.getTime() - Date.now();
    if (ms <= 0) { return 'Kick-off time has passed.'; }
    var mins = Math.floor(ms / 60000);
    var d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
    return plural(d, 'day') + ', ' + plural(h, 'hour') + ', ' + plural(m, 'minute') + ' to go';
  }

  function fillSelects() {
    var sels = document.querySelectorAll('[data-fixture-select]');
    Array.prototype.forEach.call(sels, function (s) {
      fixtures.forEach(function (f) {
        var o = document.createElement('option');
        o.value = f.id; o.textContent = f.title + ' – ' + f.when;
        s.appendChild(o);
      });
    });
  }

  /* 1. Home teaser: next sample fixture */
  function initNext() {
    var box = document.querySelector('[data-tool="next-match"]');
    if (!box) { return; }
    var t = box.querySelector('[data-next-title]'), c = box.querySelector('[data-next-countdown]');
    var f = fixtures[0];
    function tick() { t.textContent = f.title + ', ' + f.when; c.textContent = untilText(f.date); }
    tick(); setInterval(tick, 30000);
  }

  /* 2. Countdown with fixture picker */
  function initCountdown() {
    var box = document.querySelector('[data-tool="countdown"]');
    if (!box) { return; }
    var sel = box.querySelector('select'), t = box.querySelector('[data-fx-title]');
    var c = box.querySelector('[data-fx-countdown]'), st = box.querySelector('#fx-status');
    function show(announce) {
      var f = byId(sel.value);
      t.textContent = f.title + ', ' + f.when;
      c.textContent = untilText(f.date);
      if (announce) { st.textContent = 'Showing ' + f.title + ': ' + untilText(f.date) + '.'; }
    }
    sel.addEventListener('change', function () { show(true); });
    show(false); setInterval(function () { show(false); }, 30000);
  }

  /* 3. Day planner: leave-by time, with the sum shown */
  function initPlanner() {
    var form = document.querySelector('[data-tool="planner"]');
    if (!form) { return; }
    var fx = form.querySelector('#pl-fixture'), how = form.querySelector('#pl-how');
    var travel = form.querySelector('#pl-travel'), early = form.querySelector('#pl-early');
    var err = form.querySelector('#pl-error'), out = form.querySelector('#pl-result');
    var defaults = { stadium: 90, pub: 45, home: 20 };
    how.addEventListener('change', function () { early.value = defaults[how.value]; });
    early.value = defaults[how.value];

    function wholeNumber(el) {
      var v = el.value.trim();
      if (!/^\d+$/.test(v)) { return null; }
      var n = parseInt(v, 10);
      var max = parseInt(el.getAttribute('max'), 10);
      return n <= max ? n : null;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var tr = wholeNumber(travel), ea = wholeNumber(early);
      var bad = tr === null ? travel : (ea === null ? early : null);
      if (bad) {
        err.textContent = 'Please enter a whole number of minutes, from 0 to ' + bad.getAttribute('max') + '.';
        err.hidden = false; bad.setAttribute('aria-invalid', 'true'); bad.focus();
        return;
      }
      err.hidden = true; travel.removeAttribute('aria-invalid'); early.removeAttribute('aria-invalid');
      var f = byId(fx.value), total = tr + ea;
      var leave = new Date(f.date.getTime() - total * 60000);
      var where = { stadium: 'at the stadium', pub: 'at the pub', home: 'at the home of your friends' }[how.value];
      out.innerHTML = '';
      var h = document.createElement('p'); h.className = 'big';
      h.textContent = 'Leave by ' + clock(leave) + (leave.getDate() !== f.date.getDate() ? ' the day before' : '');
      var s = document.createElement('p');
      s.textContent = 'The sum: kick-off ' + clock(f.date) + ' − ' + plural(ea, 'minute') + ' early − ' +
        plural(tr, 'minute') + ' journey = ' + clock(leave) + '. You will be ' + where + ' by ' +
        clock(new Date(f.date.getTime() - ea * 60000)) + '.';
      var n = document.createElement('p'); n.className = 'note';
      n.textContent = 'Sample fixture. Add a few spare minutes for delays, and check your route on the day.';
      out.appendChild(h); out.appendChild(s); out.appendChild(n);
      out.focus();
    });
  }

  /* 4. Fan cards, kept in this browser only */
  function load() {
    try { var v = JSON.parse(localStorage.getItem(STORE) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  var memory = null;
  function save(list) {
    memory = list;
    try { localStorage.setItem(STORE, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function initSignup() {
    var form = document.querySelector('[data-tool="signup"]');
    if (!form) { return; }
    var listEl = document.getElementById('fn-list'), empty = document.getElementById('fn-empty');
    var status = document.getElementById('fn-status'), dl = document.getElementById('fn-download');
    var cards = load();

    function say(msg) { status.textContent = msg; }
    function render() {
      listEl.innerHTML = '';
      cards.forEach(function (c, i) {
        var li = document.createElement('li'); li.className = 'card';
        var h = document.createElement('h3'); h.textContent = '★ ' + c.name;
        var p = document.createElement('p');
        p.textContent = c.city + '. Watches ' + c.how + '. Favourite food: ' + c.food + '.';
        li.appendChild(h); li.appendChild(p);
        if (c.note) { var q = document.createElement('p'); q.textContent = '“' + c.note + '”'; li.appendChild(q); }
        var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost';
        b.textContent = 'Remove'; b.setAttribute('aria-label', 'Remove the card for ' + c.name);
        b.addEventListener('click', function () {
          cards.splice(i, 1); save(cards); render();
          say('Card for ' + c.name + ' removed.');
          var first = listEl.querySelector('button');
          (first || form.querySelector('input')).focus();
        });
        li.appendChild(b); listEl.appendChild(li);
      });
      empty.hidden = cards.length > 0; dl.hidden = cards.length === 0;
    }
    function field(id, msg) {
      var el = form.querySelector('#' + id), e = form.querySelector('#' + id + '-err');
      var ok = el.value.trim() !== '';
      e.hidden = ok; e.textContent = ok ? '' : msg;
      if (ok) { el.removeAttribute('aria-invalid'); } else { el.setAttribute('aria-invalid', 'true'); }
      return ok ? null : el;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = field('fn-name', 'Please add a name or nickname.') ;
      var bad2 = field('fn-city', 'Please add your town or city.');
      if (bad || bad2) { (bad || bad2).focus(); say('The card needs a name and a town or city.'); return; }
      function v(id) { return form.querySelector('#' + id).value.trim(); }
      var c = { name: v('fn-name'), city: v('fn-city'), how: v('fn-how'), food: v('fn-food'), note: v('fn-note') };
      cards.push(c);
      var ok = save(cards);
      render(); form.reset();
      say(ok ? 'Welcome, ' + c.name + '! Your card is saved in this browser only. Nothing was sent anywhere.'
             : 'Your card is shown here, but this browser would not save it, so it will be gone when you leave.');
      status.focus();
    });
    dl.addEventListener('click', function () {
      var lines = ['Black Star Blues: fan cards (made in this browser)', ''];
      cards.forEach(function (c) {
        lines.push('Name: ' + c.name, 'Town or city: ' + c.city, 'Watches: ' + c.how, 'Food: ' + c.food);
        if (c.note) { lines.push('Memory: ' + c.note); }
        lines.push('');
      });
      var blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'black-star-blues-fan-cards.txt';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      say('Downloaded as a text file.');
    });
    render();
  }

  fillSelects();
  initNext(); initCountdown(); initPlanner(); initSignup();
})();
