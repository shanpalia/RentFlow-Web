/* RentFlow final UI/data fixes. Loaded after rentflow-enhancements.js. */
(function () {
  'use strict';

  function field(id) { return document.getElementById(id); }
  function val(id) { return field(id) ? field(id).value.trim() : ''; }

  /* Add Item: remove stock/deposit from the master form and split the rental rate into separate fields. */
  window.openItem = function (iid) {
    iid = iid || '';
    var x = data.items.find(function (a) { return a.id === iid; }) || {
      id: '', name: '', code: '', category: 'General', unit: 'Pcs',
      rent: 15, rentBasis: 100, rentPeriod: 'Day', qty: 0, description: ''
    };

    document.getElementById('app').innerHTML = head(
      iid ? 'Edit Item' : 'Add Item',
      '<button class="btn ghost" onclick="go(\'inventory\')">← Inventory</button>'
    ) + '<div class="card item-editor">' +
      '<div class="item-editor-head"><div><div class="eyebrow">INVENTORY MASTER</div><h2>' +
      (iid ? 'Update rental item' : 'Create rental item') +
      '</h2><p>Set the item master and rental rate. Stock is managed separately.</p></div><div class="item-badge">▦</div></div>' +
      '<div class="form">' +
      '<div class="field"><label>Item Name *</label><input id="in" value="' + esc(x.name) + '" placeholder="e.g. Centering Plate"></div>' +
      '<div class="field"><label>Item Code</label><input id="ic" value="' + esc(x.code) + '" placeholder="e.g. CP-001"></div>' +
      '<div class="field"><label>Category</label><input id="icat" value="' + esc(x.category || 'General') + '" placeholder="Shuttering, Tools, Equipment..."></div>' +
      '<div class="field"><label>Unit</label><select id="iunit"><option ' + (x.unit === 'Pcs' || !x.unit ? 'selected' : '') + '>Pcs</option><option ' + (x.unit === 'Set' ? 'selected' : '') + '>Set</option><option ' + (x.unit === 'Bundle' ? 'selected' : '') + '>Bundle</option><option ' + (x.unit === 'Kg' ? 'selected' : '') + '>Kg</option><option ' + (x.unit === 'Meter' ? 'selected' : '') + '>Meter</option><option ' + (x.unit === 'Pair' ? 'selected' : '') + '>Pair</option></select></div>' +
      '<div class="field"><label>Rent Price *</label><input id="ir" type="number" min="0" step="0.01" value="' + Number(x.rent || 0) + '" placeholder="15"></div>' +
      '<div class="field"><label>Rate Basis (Qty) *</label><input id="ibasis" type="number" min="1" step="1" value="' + Number(x.rentBasis || 100) + '" placeholder="100"></div>' +
      '<div class="field"><label>Rate Period</label><select id="iperiod"><option ' + ((x.rentPeriod || 'Day') === 'Day' ? 'selected' : '') + '>Day</option><option ' + (x.rentPeriod === 'Week' ? 'selected' : '') + '>Week</option><option ' + (x.rentPeriod === 'Month' ? 'selected' : '') + '>Month</option></select></div>' +
      '<div class="field full"><label>Description / Notes</label><textarea id="idesc" rows="3" placeholder="Optional item details, size, condition or notes">' + esc(x.description || '') + '</textarea></div>' +
      '</div>' +
      '<div class="rate-note"><b>Rental pricing</b><span>Example: ₹15 for 100 units per day. Change the Qty Basis when the item uses a different rate basis.</span></div>' +
      '<div class="editor-actions"><button class="btn ghost" onclick="go(\'inventory\')">Cancel</button><button class="btn primary" onclick="saveItem(\'' + iid + '\')">Save Item</button></div>' +
      '</div>';
  };

  window.saveItem = function (iid) {
    var name = val('in');
    if (!name) return alert('Item name is required.');
    var basis = Number(val('ibasis') || 0);
    if (basis < 1) return alert('Rate Basis (Qty) must be at least 1.');

    var x = data.items.find(function (a) { return a.id === iid; });
    if (!x) {
      x = { id: id(), qty: 0 };
      data.items.push(x);
    }
    x.name = name;
    x.code = val('ic');
    x.category = val('icat') || 'General';
    x.unit = field('iunit').value || 'Pcs';
    x.rent = Number(val('ir') || 0);
    x.rentBasis = basis;
    x.rentPeriod = field('iperiod').value || 'Day';
    x.description = val('idesc');
    if (typeof x.qty !== 'number') x.qty = Number(x.qty || 0);
    delete x.deposit;
    save();
    go('inventory');
  };

  /* Use the item's saved rate basis everywhere the invoice total is calculated. */
  window.rentAmount = function (rentPrice, quantity, days, basis) {
    var b = Number(basis) || 100;
    return (Number(quantity) || 0) / b * (Number(rentPrice) || 0) * (Number(days) || 0);
  };

  window.calcIssue = function () {
    var total = 0;
    document.querySelectorAll('.issue-row').forEach(function (r) {
      var selected = r.querySelector('.ritem') && r.querySelector('.ritem').value;
      var x = data.items.find(function (a) { return a.id === selected; });
      total += window.rentAmount(
        r.querySelector('.rrent') && r.querySelector('.rrent').value,
        r.querySelector('.rqty') && r.querySelector('.rqty').value,
        r.querySelector('.rdays') && r.querySelector('.rdays').value,
        x && x.rentBasis
      );
    });
    var t = field('itotal');
    if (t) t.textContent = 'Total ' + money(total);
  };

  window.saveIssue = function () {
    var customer = field('icustomer') && field('icustomer').value;
    var rows = Array.from(document.querySelectorAll('.issue-row'));
    if (!customer || !rows.length) return alert('Select customer and add inventory items.');
    var items = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var iid = r.querySelector('.ritem').value;
      var q = Number(r.querySelector('.rqty').value);
      var days = Number(r.querySelector('.rdays').value);
      var x = data.items.find(function (a) { return a.id === iid; });
      if (!x || q < 1 || days < 1 || q > Number(x.qty || 0)) return alert('Check item, rent quantity and available stock.');
      items.push({ itemId: iid, name: x.name, unit: x.unit || 'Pcs', qty: q, rent: Number(x.rent) || 0, rentBasis: Number(x.rentBasis) || 100, days: days, amount: window.rentAmount(x.rent, q, days, x.rentBasis) });
    }
    items.forEach(function (q) { data.items.find(function (a) { return a.id === q.itemId; }).qty -= q.qty; });
    var amount = items.reduce(function (n, x) { return n + x.amount; }, 0);
    data.issues.push({ id: id(), invoice: (data.shop.invoicePrefix || 'INV') + '-' + String(data.issues.length + 1).padStart(4, '0'), customerId: customer, date: field('idate').value, note: field('inote').value, items: items, amount: amount });
    save();
    alert('Invoice saved successfully.');
    go('issued');
  };

  /* Returns: security deposit is a return-side column, not an item-master field. */
  pages.returns = function () {
    return head('Returns / Receive', '<button class="btn primary" data-go="issued">＋ New Issue</button>') +
      '<div class="card"><div class="section">Issued inventory available for return</div>' +
      (data.issues.length ? '<div class="tablewrap"><table><thead><tr><th>Invoice No.</th><th>Customer</th><th>Issue Date</th><th>Items</th><th>Security Deposit</th><th>Action</th></tr></thead><tbody>' +
      data.issues.map(function (x) {
        var customer = (data.customers.find(function (c) { return c.id === x.customerId; }) || {}).name || '';
        return '<tr><td><b>' + esc(x.invoice) + '</b></td><td>' + esc(customer) + '</td><td>' + esc(x.date) + '</td><td>' + x.items.reduce(function (n, q) { return n + Number(q.qty || 0); }, 0) + '</td><td><input class="return-deposit" data-issue="' + x.id + '" type="number" min="0" step="0.01" value="0" style="width:130px;padding:9px;border:1px solid var(--line);border-radius:9px"></td><td><button class="btn secondary" onclick="receiveWithDeposit(\'' + x.id + '\')">Receive</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty">No issued invoices.</div>') +
      '</div>' +
      '<div class="card"><div class="section">Return history</div><div class="tablewrap"><table><thead><tr><th>Return Date</th><th>Invoice</th><th>Security Deposit</th></tr></thead><tbody>' +
      (data.returns.length ? data.returns.slice().reverse().map(function (r) { return '<tr><td>' + esc(r.date || '') + '</td><td>' + esc(r.invoice || '') + '</td><td>' + money(r.securityDeposit || 0) + '</td></tr>'; }).join('') : '<tr><td colspan="3" class="empty">No returns recorded.</td></tr>') +
      '</tbody></table></div></div>';
  };

  window.receiveWithDeposit = function (iid) {
    var issue = data.issues.find(function (x) { return x.id === iid; });
    if (!issue) return;
    var input = document.querySelector('.return-deposit[data-issue="' + iid + '"]');
    var deposit = Number(input && input.value || 0);
    issue.items.forEach(function (it) {
      var inv = data.items.find(function (a) { return a.id === it.itemId; });
      if (inv) inv.qty += Number(it.qty || 0);
    });
    data.returns.push({ id: id(), issueId: iid, invoice: issue.invoice, customerId: issue.customerId, date: new Date().toISOString().slice(0, 10), securityDeposit: deposit, items: issue.items.map(function (it) { return { itemId: it.itemId, qty: it.qty }; }) });
    data.issues = data.issues.filter(function (a) { return a.id !== iid; });
    save();
    render();
    alert('Items received back into inventory.');
  };

  /* Enter moves to the next editable field, including selects and numeric fields. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    var el = e.target;
    if (!el || !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) || el.tagName === 'TEXTAREA') return;
    e.preventDefault();
    var fields = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])')).filter(function (f) { return f.offsetParent !== null; });
    var i = fields.indexOf(el);
    if (i >= 0 && i + 1 < fields.length) {
      fields[i + 1].focus();
      if (fields[i + 1].tagName === 'INPUT' && fields[i + 1].type !== 'number') fields[i + 1].select();
    }
  }, true);
})();
