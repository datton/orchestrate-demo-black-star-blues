// motion: ui/ux. Word reveals, masks, counters, marquee, statement fill, scrollytelling, progress bar, parallax.
// All text is in the HTML; this only adds classes and custom properties. Reduced motion shows everything at once.
(function () {
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };

  // Split an element's text into word spans, keeping child elements (links, em) intact.
  function splitWords(el, wrap) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.nodeValue.split(/(\s+)/), frag = doc.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(doc.createTextNode(' ')); return; }
            var w = doc.createElement('span'); w.className = 'w'; w.style.setProperty('--i', i++);
            if (wrap) { var m = doc.createElement('span'); m.className = 'm'; m.style.setProperty('--i', i - 1); var s = doc.createElement('span'); s.textContent = p; m.appendChild(s); frag.appendChild(m); }
            else { w.textContent = p; frag.appendChild(w); }
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !/^(script|style)$/i.test(n.nodeName)) walk(n);
      });
    })(el);
    return i;
  }

  // Reading progress bar
  var bar = doc.createElement('div'); bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true'); doc.body.appendChild(bar);

  // Prepare split headings, masks, statements
  // Page content may mark things up with classes or data attributes; both work. Hero h1 splits, every h2 gets a mask.
  $('.hero h1').forEach(function (el) { el.classList.add('split'); });
  $('main h2').forEach(function (el) { el.classList.add('mask'); });
  $('.split').forEach(function (el) { splitWords(el, false); });
  $('.mask').forEach(function (el) { splitWords(el, true); });
  var statements = $('.statement, [data-statement]');
  statements.forEach(function (el) { splitWords(el, false); el.classList.add('is-ready'); });

  // Marquee: duplicate the words for a seamless loop (copy is hidden from assistive tech)
  $('.marquee').forEach(function (m) {
    var track = m.querySelector('.marquee-track');
    if (!track) { track = doc.createElement('div'); track.className = 'marquee-track'; while (m.firstChild) track.appendChild(m.firstChild); m.appendChild(track); }
    m.setAttribute('aria-hidden', 'true');
    if (reduce) return;
    var kids = Array.prototype.slice.call(track.children);
    kids.forEach(function (k) { track.appendChild(k.cloneNode(true)); });
  });

  // Counters
  function fmt(n, el) { var d = +el.getAttribute('data-decimals') || 0; var g = el.hasAttribute('data-group') ? el.getAttribute('data-group') !== 'false' : /,/.test(el.getAttribute('data-text') || el.textContent); if (!el.hasAttribute('data-text')) el.setAttribute('data-text', el.textContent); return (el.getAttribute('data-prefix') || '') + n.toLocaleString('en-GB', { useGrouping: g, minimumFractionDigits: d, maximumFractionDigits: d }) + (el.getAttribute('data-suffix') || ''); }
  function count(el) {
    var to = parseFloat(el.getAttribute('data-count')); if (isNaN(to)) return;
    if (reduce) { el.textContent = fmt(to, el); return; }
    var t0 = null, dur = 1600;
    function step(t) { if (t0 === null) t0 = t; var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(to * e, el); if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(to, el); }
    requestAnimationFrame(step);
  }

  // Kinetic rotating word
  $('[data-rotate], [data-words]').forEach(function (el) {
    var words = (el.getAttribute('data-rotate') || el.getAttribute('data-words') || '').split('|').filter(Boolean);
    if (words.length < 2) return;
    if (!el.getAttribute('data-first')) el.setAttribute('data-first', el.textContent);
    if (reduce) return;
    var i = 0;
    setInterval(function () {
      el.classList.add('is-out');
      setTimeout(function () { i = (i + 1) % words.length; el.textContent = words[i]; el.classList.remove('is-out'); }, 450);
    }, 2600);
  });

  // Reveal on enter
  var revealEls = $('.split, .mask, [data-reveal]');
  function show(el) { el.classList.add('is-in'); if (el.hasAttribute('data-count')) count(el); $('[data-count]', el).forEach(count); }
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(show); $('[data-count]').forEach(count);
  } else {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }); }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
    $('[data-count]').forEach(function (el) { if (!el.closest('[data-reveal],.split,.mask')) io.observe(el); });
  }

  // Scrollytelling: sticky giant word follows the active step
  var scrolls = $('.scrolly').map(function (sec) {
    var word = sec.querySelector('.scrolly-word, [data-scrolly-word]'), steps = $('.scrolly-steps li, .steps li', sec);
    if (word) word.classList.add('scrolly-word');
    if (!word || !steps.length) return null;
    word.setAttribute('aria-hidden', 'true');
    word.textContent = steps[0].getAttribute('data-word') || '';
    if (reduce) { steps.forEach(function (s) { s.classList.add('is-active'); }); return null; }
    return { sec: sec, word: word, steps: steps, cur: -1 };
  }).filter(Boolean);
  function setActive(s, i) {
    if (i === s.cur) return; s.cur = i;
    s.steps.forEach(function (st, k) { st.classList.toggle('is-active', k === i); });
    var w = s.steps[i].getAttribute('data-word') || '';
    s.word.classList.add('is-swap');
    setTimeout(function () { s.word.textContent = w; s.word.classList.remove('is-swap'); }, 180);
  }

  // Scroll-driven bits in one rAF loop: progress, statement fill, parallax, scrolly
  var parallax = $('[data-parallax]'), ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight, h = root.scrollHeight - vh, y = window.pageYOffset;
    if (!reduce) bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';
    if (reduce) return;
    statements.forEach(function (el) {
      var r = el.getBoundingClientRect(), p = (vh * 0.85 - r.top) / (vh * 0.55 + r.height * 0.5);
      p = Math.max(0, Math.min(1, p));
      var ws = el.querySelectorAll('.w'), n = Math.round(p * ws.length);
      for (var k = 0; k < ws.length; k++) ws[k].classList.toggle('on', k < n);
    });
    parallax.forEach(function (el) {
      var r = el.getBoundingClientRect(), c = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.transform = 'translate3d(0,' + (c * -(+el.getAttribute('data-parallax') || 40)).toFixed(1) + 'px,0)';
    });
    scrolls.forEach(function (s) {
      var mid = vh / 2, best = 0, bd = 1e9;
      s.steps.forEach(function (st, k) { var r = st.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - mid); if (d < bd) { bd = d; best = k; } });
      setActive(s, best);
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
