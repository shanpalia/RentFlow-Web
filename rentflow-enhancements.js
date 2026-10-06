/* RentFlow form UX: Enter moves to the next editable field on every page. */
(function () {
  'use strict';

  function editableFields(root) {
    return Array.from((root || document).querySelectorAll('input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])'))
      .filter(function (el) { return el.offsetParent !== null; });
  }

  function focusNext(current) {
    var fields = editableFields(document);
    var i = fields.indexOf(current);
    if (i < 0) return;
    if (i + 1 < fields.length) {
      fields[i + 1].focus();
      if (fields[i + 1].select && fields[i + 1].tagName === 'INPUT') fields[i + 1].select();
    } else {
      var formButton = document.querySelector('.page button.primary[type="submit"], .page button.primary');
      if (formButton) formButton.focus();
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    var el = e.target;
    if (!el || !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
    if (el.tagName === 'TEXTAREA') return;
    e.preventDefault();
    focusNext(el);
  }, true);

  function cleanInventoryForm() {
    var page = document.querySelector('.page');
    if (!page) return;
    var title = (page.querySelector('.page-title h1') || {}).textContent || '';
    if (!/add item|edit item|inventory/i.test(title)) return;

    page.querySelectorAll('label').forEach(function (label) {
      var t = label.textContent.trim().toLowerCase();
      if (t === 'opening quantity' || t.includes('opening qty')) {
        var field = label.closest('.field');
        if (field) field.remove();
      }
      if (t === 'rent price' || t === 'rent price / day' || t === 'rent/day') {
        label.textContent = 'Rent Price / Day *';
      }
      if (t === 'quantity' || t === 'current quantity' || t.includes('current qty')) {
        label.textContent = 'Current Quantity *';
      }
    });
  }

  var observer = new MutationObserver(function () { cleanInventoryForm(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  cleanInventoryForm();
})();
