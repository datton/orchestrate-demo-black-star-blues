/* app: fullstack. Match-day bag checklist: ticks are kept in this browser only. */
(function () {
  'use strict';
  var ul = document.querySelector('[data-bag]');
  if (!ul) { return; }
  var KEY = 'black-star-blues-bag', saved = [];
  try { saved = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { saved = []; }
  if (!Array.isArray(saved)) { saved = []; }
  Array.prototype.forEach.call(ul.querySelectorAll('li'), function (li, i) {
    var text = li.textContent, id = 'bag-' + i;
    li.textContent = '';
    var cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = id; cb.checked = saved.indexOf(i) !== -1;
    var lab = document.createElement('label'); lab.setAttribute('for', id); lab.textContent = text;
    li.appendChild(cb); li.appendChild(lab);
    cb.addEventListener('change', function () {
      var now = [];
      Array.prototype.forEach.call(ul.querySelectorAll('input'), function (x, j) { if (x.checked) { now.push(j); } });
      try { localStorage.setItem(KEY, JSON.stringify(now)); } catch (e) {}
    });
  });
})();
