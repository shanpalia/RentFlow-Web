/* RentFlow UX + rental pricing rules. */
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
      var formButton = document.querySelector('.page button.primary');
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

  /* Rental rule for the shuttering shop:
     rent is stored as rupees per 100 units per day.
     Example: 100 units x ₹15 x 31 days = ₹465.
     Example: 500 units x ₹15 x 31 days = ₹2,325.
  */
  window.rentAmount = function (rentPer100PerDay, quantity, days) {
    return (Number(rentPer100PerDay) || 0) * (Number(quantity) || 0) * (Number(days) || 0) / 100;
  };

  /* Replace Add/Edit Item form with the correct rental fields. */
  window.openItem = function (iid) {
    iid = iid || '';
    var x = data.items.find(function (a) { return a.id === iid; }) || {
      id: '', name: '', code: '', category: 'General', qty: 0, rent: 15
    };
    document.getElementById('app').innerHTML = head(
      iid ? 'Edit Item' : 'Add Item',
      '<button class="btn ghost" onclick="go(\'inventory\')">← Inventory</button>'
    ) + '<div class="card"><div class="form">' +
      '<div class="field"><label>Item Name *</label><input id="in" value="' + esc(x.name) + '"></div>' +
      '<div class="field"><label>Item Code</label><input id="ic" value="' + esc(x.code) + '"></div>' +
      '<div class="field"><label>Category</label><input id="icat" value="' + esc(x.category || 'General') + '"></div>' +
      '<div class="field"><label>Total Stock</label><input id="iq" type="number" min="0" step="1" value="' + Number(x.qty || 0) + '"></div>' +
      '<div class="field"><label>Rent Price / 100 Qty / Day *</label><input id="ir" type="number" min="0" step="0.01" value="' + Number(x.rent || 0) + '"></div>' +
      '</div><p style="color:var(--muted)">Rental rate is for 100 units per day. Example: ₹15 means 100 units = ₹15/day; 500 units = ₹75/day.</p>' +
      '<button class="btn primary" onclick="saveItem(\'' + iid + '\')">Save Item</button></div>';
  };

  /* Issue calculation must use quantity / 100, not quantity directly. */
  window.calcIssue = function () {
    var total = 0;
    document.querySelectorAll('.issue-row').forEach(function (r) {
      total += window.rentAmount(
        r.querySelector('.rrent') && r.querySelector('.rrent').value,
        r.querySelector('.rqty') && r.querySelector('.rqty').value,
        r.querySelector('.rdays') && r.querySelector('.rdays').value
      );
    });
    var t = document.getElementById('itotal');
    if (t) t.textContent = 'Total ' + money(total);
  };

  /* Save invoices using the same /100 rental formula. */
  window.saveIssue = function () {
    var customer = document.getElementById('icustomer').value;
    var rows = Array.from(document.querySelectorAll('.issue-row'));
    if (!customer || !rows.length) return alert('Select customer and add inventory items.');

    var items = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var iid = r.querySelector('.ritem').value;
      var q = Number(r.querySelector('.rqty').value);
      var days = Number(r.querySelector('.rdays').value);
      var x = data.items.find(function (a) { return a.id === iid; });
      if (!x || q < 1 || days < 1 || q > Number(x.qty || 0)) {
        return alert('Check item, rent quantity and available stock.');
      }
      items.push({
        itemId: iid,
        name: x.name,
        qty: q,
        rent: Number(x.rent) || 0,
        days: days,
        amount: window.rentAmount(x.rent, q, days)
      });
      x.qty -= q;
    }

    var amount = items.reduce(function (n, x) { return n + x.amount; }, 0);
    data.issues.push({
      id: id(),
      invoice: (data.shop.invoicePrefix || 'INV') + '-' + String(data.issues.length + 1).padStart(4, '0'),
      customerId: customer,
      date: document.getElementById('idate').value,
      note: document.getElementById('inote').value,
      items: items,
      amount: amount
    });
    save();
    alert('Invoice saved successfully.');
    go('issued');
  };

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
    });
  }

  var observer = new MutationObserver(function () { cleanInventoryForm(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  cleanInventoryForm();
})();
