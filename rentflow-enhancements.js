/* RentFlow UX + rental pricing rules + dashboard/company/item improvements. */
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

  window.rentAmount = function (rentPer100PerDay, quantity, days) {
    return (Number(rentPer100PerDay) || 0) * (Number(quantity) || 0) * (Number(days) || 0) / 100;
  };

  /* ---------- Better Add/Edit Item ---------- */
  window.openItem = function (iid) {
    iid = iid || '';
    var x = data.items.find(function (a) { return a.id === iid; }) || {
      id: '', name: '', code: '', category: 'General', unit: 'Pcs', qty: 0,
      rent: 15, deposit: 0, description: ''
    };
    document.getElementById('app').innerHTML = head(
      iid ? 'Edit Item' : 'Add Item',
      '<button class="btn ghost" onclick="go(\'inventory\')">← Inventory</button>'
    ) + '<div class="card item-editor">' +
      '<div class="item-editor-head"><div><div class="eyebrow">INVENTORY MASTER</div><h2>' + (iid ? 'Update rental item' : 'Create rental item') + '</h2><p>Keep the item master complete so issuing and returns stay accurate.</p></div><div class="item-badge">▦</div></div>' +
      '<div class="form">' +
      '<div class="field"><label>Item Name *</label><input id="in" value="' + esc(x.name) + '" placeholder="e.g. Centering Plate"></div>' +
      '<div class="field"><label>Item Code</label><input id="ic" value="' + esc(x.code) + '" placeholder="e.g. CP-001"></div>' +
      '<div class="field"><label>Category</label><input id="icat" value="' + esc(x.category || 'General') + '" placeholder="Shuttering, Tools, Equipment..."></div>' +
      '<div class="field"><label>Unit</label><select id="iunit"><option ' + (x.unit === 'Pcs' ? 'selected' : '') + '>Pcs</option><option ' + (x.unit === 'Set' ? 'selected' : '') + '>Set</option><option ' + (x.unit === 'Bundle' ? 'selected' : '') + '>Bundle</option><option ' + (x.unit === 'Kg' ? 'selected' : '') + '>Kg</option><option ' + (x.unit === 'Meter' ? 'selected' : '') + '>Meter</option><option ' + (x.unit === 'Pair' ? 'selected' : '') + '>Pair</option></select></div>' +
      '<div class="field"><label>Total / Current Stock *</label><input id="iq" type="number" min="0" step="1" value="' + Number(x.qty || 0) + '"></div>' +
      '<div class="field"><label>Rent Price / 100 Qty / Day *</label><input id="ir" type="number" min="0" step="0.01" value="' + Number(x.rent || 0) + '"></div>' +
      '<div class="field"><label>Security Deposit / 100 Qty</label><input id="ideposit" type="number" min="0" step="0.01" value="' + Number(x.deposit || 0) + '"></div>' +
      '<div class="field full"><label>Description / Notes</label><textarea id="idesc" rows="3" placeholder="Optional item details, size, condition or notes">' + esc(x.description || '') + '</textarea></div>' +
      '</div>' +
      '<div class="rate-note"><b>Rental pricing rule</b><span>₹15 for 100 units/day means 500 units for 1 day = ₹75.</span></div>' +
      '<div class="editor-actions"><button class="btn ghost" onclick="go(\'inventory\')">Cancel</button><button class="btn primary" onclick="saveItem(\'' + iid + '\')">Save Item</button></div>' +
      '</div>';
  };

  window.saveItem = function (iid) {
    var name = document.getElementById('in').value.trim();
    if (!name) return alert('Item name is required.');
    var x = data.items.find(function (a) { return a.id === iid; });
    if (!x) { x = { id: id() }; data.items.push(x); }
    x.name = name;
    x.code = document.getElementById('ic').value.trim();
    x.category = document.getElementById('icat').value.trim() || 'General';
    x.unit = document.getElementById('iunit').value || 'Pcs';
    x.qty = Number(document.getElementById('iq').value) || 0;
    x.rent = Number(document.getElementById('ir').value) || 0;
    x.deposit = Number(document.getElementById('ideposit').value) || 0;
    x.description = document.getElementById('idesc').value.trim();
    save();
    go('inventory');
  };

  /* ---------- Correct rental calculation ---------- */
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
      if (!x || q < 1 || days < 1 || q > Number(x.qty || 0)) return alert('Check item, rent quantity and available stock.');
      items.push({ itemId: iid, name: x.name, unit: x.unit || 'Pcs', qty: q, rent: Number(x.rent) || 0, days: days, amount: window.rentAmount(x.rent, q, days) });
      x.qty -= q;
    }
    var amount = items.reduce(function (n, x) { return n + x.amount; }, 0);
    data.issues.push({ id: id(), invoice: (data.shop.invoicePrefix || 'INV') + '-' + String(data.issues.length + 1).padStart(4, '0'), customerId: customer, date: document.getElementById('idate').value, note: document.getElementById('inote').value, items: items, amount: amount });
    save();
    alert('Invoice saved successfully.');
    go('issued');
  };

  /* ---------- Less boring dashboard: 3 useful KPI cards and Issued quick action ---------- */
  function betterDashboard() {
    var billed = data.issues.reduce(function (n, x) { return n + Number(x.amount || 0); }, 0);
    return head('Dashboard', '<button class="btn primary" data-go="issued">＋ New Invoice</button>') +
      '<div class="dashboard-welcome"><div class="welcome-glow"></div><div class="logo">' + (data.shop.logo ? '<img src="' + data.shop.logo + '">' : '🏪') + '</div><div class="welcome-copy"><div class="eyebrow">ACTIVE COMPANY</div><h2>' + esc(data.shop.name || 'Your Shop') + '</h2><div>' + esc(data.shop.owner || 'Shop Owner') + (data.shop.mobile ? ' <span class="muted">• ' + esc(data.shop.mobile) + '</span>' : '') + '</div><small>' + esc(data.shop.address || 'Complete company profile in Shop / Company') + '</small></div><button class="btn secondary right" data-go="shop">Company</button></div>' +
      '<div class="stats dashboard-stats"><div class="stat"><div class="label">Inventory Items</div><div class="num">' + data.items.length + '</div><span class="stat-hint">Items in master</span></div><div class="stat"><div class="label">Parties</div><div class="num">' + data.customers.length + '</div><span class="stat-hint">Registered customers</span></div><div class="stat"><div class="label">Invoices</div><div class="num">' + data.issues.length + '</div><span class="stat-hint">Issued rentals</span></div></div>' +
      '<div class="card quick-card"><div class="quick-head"><div><div class="eyebrow">SHORTCUTS</div><h2>Quick Actions</h2></div><span class="quick-dot">●</span></div><div class="grid4"><div class="quick quick-feature" data-go="issued"><div class="ico">↗</div><b>Issued</b><div class="muted small">Create rental issue</div></div><div class="quick" data-go="returns"><div class="ico">↩</div><b>Receive Return</b><div class="muted small">Receive issued stock</div></div><div class="quick" data-go="inventory"><div class="ico">＋</div><b>Add Item</b><div class="muted small">Add inventory master</div></div><div class="quick" data-go="customers"><div class="ico">♙</div><b>Add Party</b><div class="muted small">Add customer / party</div></div></div></div>' +
      '<div class="split"><div class="card"><div class="section-row"><h3>Recent Invoices</h3><button class="btn ghost" data-go="reports">View All</button></div>' + (data.issues.slice().reverse().slice(0, 5).map(function (x) { return '<div class="recent-row"><span class="recent-icon">🧾</span><div><b>' + esc(x.invoice) + '</b><small>' + esc((data.customers.find(function (c) { return c.id === x.customerId; }) || {}).name || '') + '</small></div><strong>' + money(x.amount) + '</strong></div>'; }).join('') || '<div class="empty">No invoices yet.</div>') + '</div>' +
      '<div class="card"><div class="section-row"><h3>Rental Summary</h3><span class="pill">LIVE</span></div><div class="summary-box"><span>Total billing</span><b>' + money(billed) + '</b></div><div class="summary-box"><span>Items in master</span><b>' + data.items.length + '</b></div><div class="summary-box"><span>Registered parties</span><b>' + data.customers.length + '</b></div></div></div>';
  }
  pages.dashboard = betterDashboard;

  /* ---------- Better company selection/create screen ---------- */
  function companyGateBetter() {
    var saved = data.shop && data.shop.name;
    if (saved) {
      document.getElementById('app').innerHTML = '<div class="company-gate"><div class="company-gate-card"><div class="gate-icon">🏪</div><div class="eyebrow">RENTFLOW WORKSPACE</div><h1>Select Company</h1><p class="gate-sub">Choose the company you want to open in RentFlow.</p><div class="company-option"><div class="company-logo-big">' + (data.shop.logo ? '<img src="' + data.shop.logo + '">' : '🏪') + '</div><div class="company-info"><span class="pill">ACTIVE PROFILE</span><h2>' + esc(data.shop.name) + '</h2><p>' + esc(data.shop.owner || 'Owner not set') + '</p><small>' + esc(data.shop.mobile || data.shop.address || 'Company details saved') + '</small></div><button class="btn primary company-open" onclick="selectSavedCompany()">Open Company →</button></div><div class="gate-divider"><span>or</span></div><button class="create-company-btn" onclick="newCompany()"><span>＋</span><div><b>Create New Company</b><small>Set up another shop profile</small></div><strong>→</strong></button><div class="gate-footer">By PaliaAPK HUB · Developer by shanpalia</div></div></div>';
    } else {
      openCompanyBetter();
    }
  }

  window.openCompanyBetter = function () {
    document.getElementById('app').innerHTML = '<div class="company-create"><div class="create-head"><div class="gate-icon">🏪</div><div><div class="eyebrow">NEW COMPANY</div><h1>Create Company</h1><p>Enter your shop details once. RentFlow will use them across invoices and reports.</p></div></div><div class="card create-card"><div class="section">Company Details</div><div class="form"><div class="field"><label>Shop / Company Name *</label><input id="gname" placeholder="e.g. Hafsa Traders"></div><div class="field"><label>Owner / Contact Person</label><input id="gowner" placeholder="Owner name"></div><div class="field"><label>Mobile</label><input id="gmob" inputmode="tel" placeholder="Mobile number"></div><div class="field"><label>Alternate Mobile</label><input id="galt" inputmode="tel" placeholder="Optional"></div><div class="field"><label>Email</label><input id="gmail" type="email" placeholder="shop@example.com"></div><div class="field"><label>Business Type</label><input id="gbiz" placeholder="Rental / Shuttering / Tools"></div><div class="field full"><label>Address</label><textarea id="gaddr" rows="3" placeholder="Shop address"></textarea></div><div class="field"><label>City</label><input id="gcity" placeholder="City"></div><div class="field"><label>State</label><input id="gstate" placeholder="State"></div><div class="field"><label>PIN</label><input id="gpin" inputmode="numeric" placeholder="PIN code"></div><div class="field"><label>GSTIN</label><input id="ggst" placeholder="Optional"></div><div class="field"><label>PAN</label><input id="gpan" placeholder="Optional"></div><div class="field"><label>Invoice Prefix</label><input id="gprefix" value="INV" placeholder="INV"></div><div class="field full"><label>Company Logo</label><input id="glogo" type="file" accept="image/png,image/jpeg,image/webp"><small class="muted">PNG, JPG or WEBP</small></div></div><div class="editor-actions"><button class="btn ghost" onclick="companyGateBetter()">Cancel</button><button class="btn primary" onclick="createCompany()">Save Company & Open →</button></div></div><div class="gate-footer">By PaliaAPK HUB · Developer by shanpalia</div></div>';
  };

  window.newCompany = function () {
    data.shop = { name: '', owner: '', mobile: '', alternateMobile: '', email: '', address: '', city: '', state: '', pin: '', gstin: '', pan: '', businessType: '', invoicePrefix: 'INV', logo: '' };
    save();
    openCompanyBetter();
  };

  window.createCompany = function () {
    var name = document.getElementById('gname').value.trim();
    if (!name) return alert('Company name is required.');
    var s = data.shop;
    s.name = name;
    s.owner = document.getElementById('gowner').value.trim();
    s.mobile = document.getElementById('gmob').value.trim();
    s.alternateMobile = document.getElementById('galt').value.trim();
    s.email = document.getElementById('gmail').value.trim();
    s.businessType = document.getElementById('gbiz').value.trim();
    s.address = document.getElementById('gaddr').value.trim();
    s.city = document.getElementById('gcity').value.trim();
    s.state = document.getElementById('gstate').value.trim();
    s.pin = document.getElementById('gpin').value.trim();
    s.gstin = document.getElementById('ggst').value.trim();
    s.pan = document.getElementById('gpan').value.trim();
    s.invoicePrefix = document.getElementById('gprefix').value.trim() || 'INV';
    var f = document.getElementById('glogo').files[0];
    if (f) {
      var r = new FileReader();
      r.onload = function () { s.logo = r.result; save(); current = 'dashboard'; render(); };
      r.readAsDataURL(f);
    } else {
      save();
      current = 'dashboard';
      render();
    }
  };

  /* Styles are injected here so the base index remains untouched. */
  var style = document.createElement('style');
  style.textContent = `
    .eyebrow{font-size:10px;letter-spacing:.12em;font-weight:950;color:var(--ed);margin-bottom:5px}
    .dashboard-welcome{position:relative;overflow:hidden;display:flex;align-items:center;gap:18px;background:linear-gradient(135deg,#fff 0%,#effaf7 100%);border:1px solid var(--line);border-radius:18px;padding:22px;margin-bottom:16px;box-shadow:0 8px 28px rgba(0,80,60,.08)}
    .welcome-glow{position:absolute;width:220px;height:220px;border-radius:50%;right:-100px;top:-130px;background:var(--es);opacity:.8}
    .dashboard-welcome .logo{position:relative;z-index:1;width:82px;height:82px;border-radius:18px;flex:0 0 82px}
    .welcome-copy{position:relative;z-index:1;flex:1}.welcome-copy h2{margin:0 0 4px}.welcome-copy small{display:block;color:var(--muted);margin-top:5px}
    .dashboard-stats{grid-template-columns:repeat(3,1fr);margin-bottom:16px}.dashboard-stats .stat{box-shadow:0 5px 18px rgba(0,70,55,.05);position:relative;overflow:hidden}.dashboard-stats .stat:after{content:"";position:absolute;right:-18px;bottom:-25px;width:75px;height:75px;border-radius:50%;background:var(--es)}.stat-hint{display:block;margin-top:5px;color:var(--muted);font-size:11px}
    .quick-card{padding:20px}.quick-head,.section-row{display:flex;align-items:center;justify-content:space-between;gap:10px}.quick-head h2{margin:0}.quick-dot{color:var(--e);font-size:11px}.quick-feature{border-color:#b8e4da;background:linear-gradient(145deg,#fff,#effaf7)}.quick .ico{font-weight:950}.recent-row{display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid var(--line)}.recent-row>div{display:grid;gap:2px}.recent-row small{color:var(--muted)}.recent-row strong{margin-left:auto}.recent-icon{width:34px;height:34px;border-radius:10px;background:var(--es);display:grid;place-items:center}.summary-box{display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1px solid var(--line)}
    .company-gate,.company-create{min-height:calc(100vh - 112px);display:grid;place-items:center;padding:20px}.company-gate-card{width:min(820px,100%);background:#fff;border:1px solid var(--line);border-radius:24px;padding:34px;box-shadow:0 14px 45px rgba(0,70,55,.10);text-align:center}.gate-icon{width:70px;height:70px;border-radius:20px;background:var(--es);display:grid;place-items:center;font-size:34px;margin:0 auto 14px}.company-gate-card h1{margin:0;font-size:30px}.gate-sub{color:var(--muted);margin:8px 0 26px}.company-option{display:flex;align-items:center;text-align:left;gap:16px;padding:18px;border:1px solid var(--line);border-radius:18px;background:#fbfdfc}.company-logo-big{width:78px;height:78px;border-radius:18px;background:var(--es);display:grid;place-items:center;font-size:32px;overflow:hidden;flex:0 0 78px}.company-logo-big img{width:100%;height:100%;object-fit:cover}.company-info{flex:1}.company-info h2{margin:7px 0 3px}.company-info p{margin:0 0 3px}.company-open{white-space:nowrap}.gate-divider{height:40px;display:flex;align-items:center;gap:12px;color:var(--muted)}.gate-divider:before,.gate-divider:after{content:"";height:1px;background:var(--line);flex:1}.create-company-btn{width:100%;display:flex;align-items:center;text-align:left;gap:12px;border:1px dashed #9bcfc4;background:#f5fcfa;color:var(--ed);border-radius:16px;padding:15px;cursor:pointer}.create-company-btn>span{font-size:25px}.create-company-btn div{display:grid;gap:3px;flex:1}.create-company-btn small{color:var(--muted)}.create-company-btn strong{font-size:20px}.gate-footer{margin-top:24px;color:var(--muted);font-size:12px}
    .company-create{place-items:start center}.company-create{width:100%}.company-create>.create-head{width:min(900px,100%);display:flex;align-items:center;gap:18px;margin-bottom:16px}.create-head .gate-icon{margin:0;width:58px;height:58px;flex:0 0 58px;font-size:28px}.create-head h1{margin:0}.create-head p{margin:4px 0 0;color:var(--muted)}.create-card{width:min(900px,100%);box-shadow:0 10px 32px rgba(0,70,55,.07)}
    .item-editor{width:100%;box-shadow:0 10px 30px rgba(0,70,55,.06)}.item-editor-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.item-editor-head h2{margin:0 0 3px}.item-editor-head p{margin:0;color:var(--muted)}.item-badge{width:52px;height:52px;border-radius:15px;background:var(--es);display:grid;place-items:center;font-size:24px}.rate-note{display:flex;align-items:center;gap:10px;margin-top:18px;padding:12px 14px;border-radius:12px;background:#f5faf9;border:1px solid var(--line);color:var(--muted)}.rate-note b{color:var(--ink)}.editor-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
    @media(max-width:700px){.dashboard-welcome{align-items:flex-start;flex-wrap:wrap}.dashboard-welcome .right{margin-left:auto}.dashboard-stats{grid-template-columns:1fr}.company-option{flex-wrap:wrap}.company-open{width:100%}.company-gate-card{padding:24px}.company-create>.create-head{align-items:flex-start}.rate-note{align-items:flex-start;flex-direction:column}}
  `;
  document.head.appendChild(style);

  /* The original companyGate runs before this external file. Replace its screen once. */
  setTimeout(function () {
    if (typeof companyGateBetter === 'function') companyGateBetter();
  }, 0);
})();
