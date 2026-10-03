const logoPath = '/manus-storage/KeMU-Corporate-Logo-Full-1_f6fcbf97.png';
const logoIconPath = '/manus-storage/kemu-icon.png';
const brandMark = (size = 40) => `<span class="brand-mark" style="width:${size}px;height:${size}px" aria-hidden="true"><img src="${logoIconPath}" alt="KeMU" width="${size}" height="${size}" style="width:100%;height:100%;object-fit:contain;border-radius:inherit;display:block" /></span>`;

const iconPaths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16A2.5 2.5 0 0 1 6.5 19H20"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 9h18M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"/>',
  chart: '<path d="M4 19V5M4 19h17"/><path d="m7 15 4-5 3 2 5-7"/>',
  wallet: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19a2 2 0 0 1 2 2v13H6.5A2.5 2.5 0 0 0 4 16.5z"/><path d="M4 7h15M16 13h4"/><circle cx="16.5" cy="13" r=".8" fill="currentColor" stroke="none"/>',
  library: '<path d="M5 4h4v16H5zM11 4h4v16h-4zM17 4h2v16h-2z"/><path d="M3 20h18"/>',
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v5H5a1 1 0 0 1-1-1zM20 14h-3v5h2a1 1 0 0 0 1-1z"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  pin: '<path d="M12 21s7-6.3 7-12A7 7 0 0 0 5 9c0 5.7 7 12 7 12Z"/><circle cx="12" cy="9" r="2.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  warning: '<path d="m12 3 10 18H2L12 3z"/><path d="M12 9v4M12 17h.01"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4"/>'
};

const icon = (name, className = '') => `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.info}</svg>`;

const studentNav = [
  ['overview', 'Overview', 'grid'], ['profile', 'My Profile', 'user'], ['registration', 'Course Registration', 'book'], ['timetable', 'Timetable', 'calendar'],
  ['results', 'Results', 'chart'], ['fees', 'Fees', 'wallet'], ['library', 'Library', 'library'], ['support', 'Support', 'headset']
];
const adminNav = [
  ['admin', 'Admin Overview', 'grid'], ['students', 'Students', 'user'], ['courses', 'Unit Management', 'book'], ['registrations', 'Registrations', 'calendar']
];

const state = { auth: null, data: null, activeSection: 'overview', mobileMenu: false, expandedCourses: new Set(), selectedUnits: new Set(), unitFilter: '', loading: true, loginError: '', editingStudentId: null, editingCourseId: null, unitAdminFilter: '', selectedProgramme: '', adminSelectedStudent: '', adminSelectedUnits: new Set(), adminUnitFilter: '' };
let toastTimer;

async function apiRequest(path, options = {}) {
  const response = await fetch(path, { credentials: 'include', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
  const body = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) { state.auth = null; state.data = null; render(); }
    const error = new Error(body.message || body.error || 'Something went wrong.');
    error.status = response.status;
    throw error;
  }
  return body;
}

async function bootstrap() {
  state.loading = true;
  render();
  try {
    const auth = await apiRequest('/api/auth/me');
    if (!auth.authenticated) { state.auth = null; state.data = null; state.loading = false; render(); return; }
    state.auth = auth.identity;
    state.data = await apiRequest('/api/bootstrap');
    state.activeSection = state.auth.role === 'admin' ? 'admin' : 'profile';
  } catch (error) {
    state.auth = null;
    state.data = null;
    showToast(error.message);
  }
  state.loading = false;
  render();
}

function showToast(message, type = '') {
  const region = document.querySelector('#toast-region');
  if (!region) return;
  region.innerHTML = `<div class="toast ${type}">${message}</div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { region.innerHTML = ''; }, 3600);
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-KE');
}

function loginView(message = '') {
  const msg = message || state.loginError;
  return `<div class="login-page">
  <div class="login-shell login-shell-simple">
    <div class="login-card">
      <div class="login-brand">
        ${brandMark(52)}
        <div class="login-brand-text">
          <strong>Kenya Methodist University</strong>
          <span>Student Portal</span>
        </div>
      </div>
      ${msg ? `<div class="login-message" role="alert">${icon('warning')}<span>${escapeHtml(msg)}</span></div>` : ''}
      <form id="local-login-form" class="login-form" autocomplete="on">
        <label class="field">
          <span>Registration number</span>
          <input name="student_number" type="text" required autocomplete="username" placeholder="Reg" />
        </label>
        <label class="field">
          <span>Password</span>
          <input name="password" type="password" required autocomplete="current-password" placeholder="Enter password" />
        </label>
        <button type="submit" class="primary-button login-button">Sign in ${icon('arrow')}</button>
      </form>
    </div>
  </div>
</div>`;
}


function navItems() { return state.auth?.role === 'admin' ? adminNav : studentNav; }
function currentTitle() { return (navItems().find(item => item[0] === state.activeSection) || navItems()[0])[1]; }

function sidebar() {
  return `<aside class="sidebar ${state.mobileMenu ? 'open' : ''}"><div class="brand-lockup">${brandMark(36)}<div class="brand-label">${state.auth?.role === 'admin' ? 'Administrator Console' : 'Student Portal'} · T3 2026</div></div><span class="nav-label">${state.auth?.role === 'admin' ? 'Management' : 'Workspace'}</span><nav class="nav-list" aria-label="Primary navigation">${navItems().map(([id, label, glyph]) => `<button class="nav-item ${state.activeSection === id ? 'active' : ''}" data-nav="${id}" aria-current="${state.activeSection === id ? 'page' : 'false'}"><span class="nav-icon">${icon(glyph)}</span><span>${label}</span></button>`).join('')}</nav><div class="sidebar-bottom"><div class="help-card"><span class="nav-icon" style="color:var(--teal-deep)">${icon(state.auth?.role === 'admin' ? 'info' : 'headset')}</span><strong>${state.auth?.role === 'admin' ? 'Admin guidance' : 'Need a hand?'}</strong><p>${state.auth?.role === 'admin' ? 'Add students and courses here, then manage their registrations.' : 'Find quick answers or reach the Student Help Desk.'}</p><button data-nav="${state.auth?.role === 'admin' ? 'admin' : 'support'}">Open ${state.auth?.role === 'admin' ? 'admin' : 'support'} ${icon('arrow')}</button></div></div></aside>`;
}

function topbar() {
  const roleLabel = state.auth?.role === 'admin' ? 'Portal administrator' : state.data?.student?.programme || 'KeMU student';
  return `<header class="topbar"><div class="topbar-left"><button class="mobile-toggle" data-action="toggle-menu" aria-label="Open navigation">${icon(state.mobileMenu ? 'close' : 'menu')}</button><div class="breadcrumb">KeMU Student Portal <span>/ ${currentTitle()}</span></div></div><div class="topbar-right"><span class="topbar-term">Trimester 3, 2026</span><button class="icon-button" data-action="notifications" aria-label="View notifications">${icon('bell')}<span class="notification-dot"></span></button><div class="profile-trigger"><span class="avatar">${initials(state.auth?.name || 'KeMU')}</span><span class="profile-copy"><strong>${escapeHtml(state.auth?.name || 'KeMU user')}</strong><span>${escapeHtml(roleLabel)}</span></span></div><button class="signout-button" data-action="logout" aria-label="Sign out">${icon('logout')}<span>Sign out</span></button></div></header>`;
}

function initials(name) { return safeText(name).split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'KM'; }
function safeText(value) { return String(value || '').trim(); }
function escapeHtml(value) { return safeText(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function number(value) { return Number(value || 0); }
function formatDate(value) { return value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }

function profileView() {
  const s = state.data?.student || {};
  const fees = state.data?.fees?.summary || {};
  const results = state.data?.results?.summary || {};
  const regs = state.data?.registrations || [];
  return `<section class="page-header"><div><span class="eyebrow">Student profile</span><h1>${escapeHtml(s.full_name || 'Student')}</h1><p>Your official portal record and academic identity.</p></div></section>
  <div class="profile-layout">
    <div class="panel profile-card">
      <div class="profile-hero">
        <span class="avatar profile-avatar">${initials(s.full_name || 'KM')}</span>
        <div>
          <h2>${escapeHtml(s.full_name || '—')}</h2>
          <p class="profile-reg">${escapeHtml(s.student_number || '—')}</p>
          <span class="badge success">Active student</span>
        </div>
      </div>
      <dl class="profile-dl">
        <div><dt>Programme</dt><dd>${escapeHtml(s.programme || '—')}</dd></div>
        <div><dt>Year of study</dt><dd>Year ${s.year_level || '—'}</dd></div>
        <div><dt>Date of birth</dt><dd>${formatDate(s.date_of_birth)}</dd></div>
        <div><dt>Age</dt><dd>${s.age != null ? s.age : '—'}</dd></div>
        <div><dt>Campus</dt><dd>${escapeHtml(s.campus || 'Main Campus')}</dd></div>
        <div><dt>Email</dt><dd>${escapeHtml(s.email || '—')}</dd></div>
        <div><dt>ID issue date</dt><dd>${formatDate(s.issue_date)}</dd></div>
        <div><dt>ID expiry date</dt><dd>${formatDate(s.expiry_date)}</dd></div>
      </dl>
    </div>
    <div class="profile-side">
      <div class="stat-grid profile-stats">
        <article class="stat-card"><span class="stat-label">Registered units</span><strong>${regs.length}</strong></article>
        <article class="stat-card"><span class="stat-label">Fee balance</span><strong>KES ${formatMoney(fees.balance)}</strong></article>
        <article class="stat-card"><span class="stat-label">CGPA</span><strong>${results.cgpa ?? '—'}</strong></article>
        <article class="stat-card"><span class="stat-label">Credits earned</span><strong>${results.totalCredits || 0}</strong></article>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>Quick links</h2></div>
        <div class="profile-links">
          <button type="button" class="secondary-button" data-nav="fees">View fee statement ${icon('arrow')}</button>
          <button type="button" class="secondary-button" data-nav="results">View results ${icon('arrow')}</button>
          <button type="button" class="secondary-button" data-nav="registration">Course registration ${icon('arrow')}</button>
        </div>
      </div>
    </div>
  </div>`;
}

function studentOverview() {
  const s = state.data?.student || {};
  const regs = state.data?.registrations || [];
  const fees = state.data?.fees?.summary || {};
  const results = state.data?.results?.summary || {};
  return `<section class="page-header"><div><span class="eyebrow">Student overview</span><h1>Welcome back, ${escapeHtml((s.full_name || '').split(' ')[0] || 'student')}</h1><p>${escapeHtml(s.programme || '')} · ${escapeHtml(s.student_number || '')} · Year ${s.year_level || '—'}</p></div><button type="button" class="secondary-button" data-nav="profile">View full profile ${icon('user')}</button></section>
  <div class="stat-grid">
    <article class="stat-card"><span class="stat-label">Active units</span><strong>${regs.length}</strong><span class="stat-meta">Registered this semester</span></article>
    <article class="stat-card"><span class="stat-label">Fee balance</span><strong>KES ${formatMoney(fees.balance)}</strong><span class="stat-meta">${fees.semesters || 0} semester(s) on statement</span></article>
    <article class="stat-card"><span class="stat-label">CGPA</span><strong>${results.cgpa ?? '—'}</strong><span class="stat-meta">${results.semestersCompleted || 0} semester(s) completed</span></article>
    <article class="stat-card"><span class="stat-label">ID validity</span><strong>${formatDate(s.expiry_date)}</strong><span class="stat-meta">Issued ${formatDate(s.issue_date)}</span></article>
  </div>
  <div class="panel"><div class="panel-header"><h2>Current registrations</h2><button class="text-button" data-nav="registration">Manage ${icon('arrow')}</button></div>
  ${regs.length ? `<div class="table-wrap"><table><thead><tr><th>Code</th><th>Title</th><th>Credits</th><th>Lecturer</th></tr></thead><tbody>${regs.map(r => `<tr><td>${escapeHtml(r.code)}</td><td>${escapeHtml(r.title)}</td><td>${r.credits}</td><td>${escapeHtml(r.lecturer)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty-copy">No active course registrations yet. Open Course Registration to enrol.</p>'}
  </div>`;
}

function registrationView() {
  const courses = state.data?.courses || [];
  const regs = state.data?.registrations || [];
  const results = state.data?.results || {};
  const completedCodes = new Set((results.completedCodes || []).map(c => String(c).toUpperCase()));
  const completedUnits = results.completedUnits || [];
  const mine = courses.filter(c => c.registered);
  // Only programme units; exclude already completed so they cannot be selected again
  const available = courses.filter(c =>
    c.for_programme !== false &&
    !c.registered &&
    !completedCodes.has(String(c.code || '').toUpperCase())
  );
  const filter = (state.unitFilter || '').trim().toLowerCase();
  const filtered = filter
    ? available.filter(c => `${c.code} ${c.title} ${c.lecturer} ${c.semester}`.toLowerCase().includes(filter))
    : available;
  const selectedCredits = [...state.selectedUnits].reduce((sum, id) => {
    const c = courses.find(x => x.id === id);
    return sum + Number(c?.credits || 0);
  }, 0);
  const myCredits = mine.reduce((s, c) => s + Number(c.credits || 0), 0);
  const completedCount = results.summary?.totalUnits || completedUnits.length || completedCodes.size;
  const unitsRequired = results.summary?.unitsRequired || (String(state.data?.student?.programme || '').toLowerCase().includes('diploma') ? 45 : 52);
  const unitsRemaining = results.summary?.unitsRemaining ?? Math.max(0, unitsRequired - completedCount);

  return `<section class="page-header"><div><span class="eyebrow">Registration</span><h1>Course & unit selection — Trimester 3, 2026</h1><p>Units you have already completed (${completedCount} of ${unitsRequired}) are excluded from the catalogue so they cannot be selected twice. ${unitsRemaining} units remaining to finish. Select new units, review your basket, then register.</p></div></section>

  <div class="stat-grid">
    <article class="stat-card"><span class="stat-label">Registered units</span><strong>${mine.length}</strong><span class="stat-meta">${myCredits} credits</span></article>
    <article class="stat-card"><span class="stat-label">In basket</span><strong>${state.selectedUnits.size}</strong><span class="stat-meta">${selectedCredits} credits pending</span></article>
    <article class="stat-card"><span class="stat-label">Available units</span><strong>${available.length}</strong></article>
    <article class="stat-card"><span class="stat-label">Completed units</span><strong>${completedCount}</strong><span class="stat-meta">of ${unitsRequired} · ${unitsRemaining} left</span></article>
  </div>

  <div class="selection-layout">
    <div class="panel">
      <div class="panel-header">
        <h2>Unit catalogue</h2>
        <input class="filter-input" type="search" placeholder="Search code, title, lecturer…" value="${escapeHtml(state.unitFilter || '')}" data-unit-filter />
      </div>
      <p class="panel-note">Tick units to add them to your selection basket, then click <strong>Register selected units</strong>. Completed units are hidden here.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th></th><th>Code</th><th>Unit / course title</th><th>Credits</th><th>Lecturer</th><th>Trimester</th><th>Seats</th></tr></thead>
          <tbody>
            ${filtered.length ? filtered.map(c => {
              const checked = state.selectedUnits.has(c.id);
              const full = c.seats_remaining <= 0;
              return `<tr class="${checked ? 'row-selected' : ''}">
                <td><input type="checkbox" data-toggle-unit="${c.id}" ${checked ? 'checked' : ''} ${full ? 'disabled' : ''} /></td>
                <td><strong>${escapeHtml(c.code)}</strong></td>
                <td>${escapeHtml(c.title)}</td>
                <td>${c.credits}</td>
                <td>${escapeHtml(c.lecturer)}</td>
                <td>${escapeHtml(c.semester)}</td>
                <td><span class="badge ${full ? 'warning' : 'success'}">${full ? 'Full' : c.seats_remaining}</span></td>
              </tr>`;
            }).join('') : '<tr><td colspan="7" class="empty-copy">No matching units available. Completed units are excluded; clear the search or ask admin to add new courses.</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="selection-actions">
        <button type="button" class="secondary-button" data-action="clear-basket" ${state.selectedUnits.size ? '' : 'disabled'}>Clear basket</button>
        <button type="button" class="primary-button" data-action="register-basket" ${state.selectedUnits.size ? '' : 'disabled'}>Register selected units (${state.selectedUnits.size})</button>
      </div>
    </div>

    <div class="selection-side">
      <div class="panel">
        <div class="panel-header"><h2>Selection basket</h2></div>
        ${state.selectedUnits.size ? `<ul class="basket-list">${[...state.selectedUnits].map(id => {
          const c = courses.find(x => x.id === id);
          if (!c) return '';
          return `<li><div><strong>${escapeHtml(c.code)}</strong><span>${escapeHtml(c.title)}</span></div><button type="button" class="text-button" data-toggle-unit="${c.id}">Remove</button></li>`;
        }).join('')}</ul>
        <p class="panel-note"><strong>${selectedCredits}</strong> credits selected</p>` : '<p class="empty-copy">No units in basket yet. Tick units from the catalogue.</p>'}
      </div>

      <div class="panel">
        <div class="panel-header"><h2>My registered units</h2></div>
        ${mine.length ? `<div class="table-wrap"><table><thead><tr><th>Code</th><th>Title</th><th>Cr</th><th></th></tr></thead>
        <tbody>${mine.map(c => `<tr>
          <td>${escapeHtml(c.code)}</td>
          <td>${escapeHtml(c.title)}</td>
          <td>${c.credits}</td>
          <td><button type="button" class="text-button danger-text" data-withdraw="${c.id}">Withdraw</button></td>
        </tr>`).join('')}</tbody></table></div>` : '<p class="empty-copy">You have not registered any units this trimester.</p>'}
      </div>

      <div class="panel">
        <div class="panel-header"><h2>Completed units (${completedCount} of ${unitsRequired})</h2></div>
        <p class="panel-note">These units appear on your provisional results and cannot be selected again. Programme requires ${unitsRequired} units to finish (${unitsRemaining} remaining).</p>
        ${completedUnits.length ? `<div class="table-wrap"><table><thead><tr><th>Code</th><th>Title</th><th>Cr</th></tr></thead>
        <tbody>${completedUnits.slice(0, 40).map(u => `<tr>
          <td><strong>${escapeHtml(u.code)}</strong></td>
          <td>${escapeHtml(u.title)}</td>
          <td>${u.credits || 3}</td>
        </tr>`).join('')}${completedUnits.length > 40 ? `<tr><td colspan="3" class="empty-copy">… and ${completedUnits.length - 40} more (see Results)</td></tr>` : ''}</tbody></table></div>` : '<p class="empty-copy">No completed units on record yet.</p>'}
      </div>
    </div>
  </div>`;
}


function feesView() {
  const fees = state.data?.fees;
  const student = state.data?.student || {};
  if (!fees) return genericPage('fees');
  const outstanding = (fees.items || []).filter(i => !i.paid && (i.balance || 0) > 0);
  const rate = fees.summary?.tuitionPerUnit || 0;
  const curUnits = fees.summary?.currentUnits || 0;
  return `<section class="page-header"><div><span class="eyebrow">Fee statement</span><h1>Fees charged by units selected</h1><p>${escapeHtml(student.full_name || '')} · ${escapeHtml(student.student_number || '')}</p></div></section>
  <div class="stat-grid">
    <article class="stat-card"><span class="stat-label">Total billed</span><strong>KES ${formatMoney(fees.summary?.totalBilled)}</strong></article>
    <article class="stat-card"><span class="stat-label">Total paid</span><strong>KES ${formatMoney(fees.summary?.totalPaid)}</strong></article>
    <article class="stat-card"><span class="stat-label">Outstanding</span><strong>KES ${formatMoney(fees.summary?.balance)}</strong></article>
    <article class="stat-card"><span class="stat-label">Current term units</span><strong>${curUnits}</strong><span class="stat-meta">@ KES ${formatMoney(rate)}/unit</span></article>
  </div>
  <p class="panel-note">${escapeHtml(fees.periodNote || '')} Register more units under Course Registration to update this term’s bill.</p>

  ${outstanding.length ? `<div class="panel"><div class="panel-header"><h2>Pay fees (full or partial)</h2></div>
  <p class="panel-note">Enter any amount up to the outstanding balance for the selected trimester. Leave amount blank to pay the full remaining balance. This is a demonstration payment record (no real gateway).</p>
  <form id="fee-pay-form" class="form-grid">
    <label class="field"><span>Trimester</span>
      <select name="term_key" required data-term-select>
        ${outstanding.map(i => `<option value="${escapeHtml(i.key)}" data-balance="${i.balance}" data-total="${i.total}">${escapeHtml(i.semester)} — Outstanding KES ${formatMoney(i.balance)} (of ${formatMoney(i.total)})</option>`).join('')}
      </select>
    </label>
    <label class="field"><span>Amount to pay (KES)</span>
      <input name="amount" type="number" min="1" step="1" placeholder="Full balance if left blank" data-amount-input />
    </label>
    <label class="field"><span>Payment method</span>
      <select name="method" required>
        <option value="M-Pesa">M-Pesa</option>
        <option value="Bank transfer">Bank transfer</option>
        <option value="Card">Card</option>
        <option value="Cash">Cash (registry)</option>
      </select>
    </label>
    <button type="submit" class="primary-button">Record payment</button>
  </form>
  <p class="panel-note" data-pay-hint>Tip: type a smaller amount for a partial payment (e.g. 10000). The remaining balance stays outstanding until fully cleared.</p>
  </div>` : `<div class="panel"><p class="empty-copy">No outstanding balance. All listed trimesters are cleared.</p></div>`}

  <div class="panel"><div class="panel-header"><h2>Trimester breakdown (units × rate + fixed charges)</h2></div>
  <div class="table-wrap"><table><thead><tr><th>Trimester</th><th>Units</th><th>Tuition</th><th>Fixed charges</th><th>Total billed</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
  <tbody>${(fees.items || []).map(item => {
    const bal = item.balance ?? (item.paid ? 0 : item.total);
    const paidAmt = item.amount_paid ?? (item.paid ? item.total : 0);
    const fixed = (item.registration || 0) + (item.library || 0) + (item.medical || 0) + (item.activity || 0) + (item.examination || 0);
    const badge = item.paid ? 'success' : (paidAmt > 0 ? 'warning' : 'warning');
    return `<tr class="${item.paid ? '' : 'row-outstanding'}">
      <td>${escapeHtml(item.semester)}</td>
      <td><strong>${item.units ?? '—'}</strong></td>
      <td>${formatMoney(item.tuition)} <span class="stat-meta">(${item.units || 0} × ${formatMoney(item.tuition_per_unit || 0)})</span></td>
      <td>${formatMoney(fixed)}</td>
      <td>${formatMoney(item.total)}</td>
      <td>${formatMoney(paidAmt)}</td>
      <td><strong>${formatMoney(bal)}</strong></td>
      <td><span class="badge ${badge}">${escapeHtml(item.status)}</span></td>
    </tr>`;
  }).join('')}</tbody></table></div>
  </div>`;
}

function resultsView() {
  const results = state.data?.results;
  const student = state.data?.student || {};
  if (!results) return genericPage('results');
  const req = results.summary?.unitsRequired || 52;
  const done = results.summary?.totalUnits || 0;
  const left = results.summary?.unitsRemaining ?? Math.max(0, req - done);
  const gradMin = results.summary?.minGraduationUnits || 32;
  const eligible = results.summary?.eligibleToGraduate || done >= req;
  return `<section class="page-header"><div><span class="eyebrow">Academic results</span><h1>Provisional results</h1><p>${escapeHtml(student.full_name || '')} · ${escapeHtml(student.student_number || '')} · CGPA ${results.summary?.cgpa ?? '—'}</p></div>
  <button type="button" class="primary-button" data-action="download-results">Download results ${icon('file')}</button></section>
  <div class="stat-grid">
    <article class="stat-card"><span class="stat-label">Cumulative GPA</span><strong>${results.summary?.cgpa ?? '—'}</strong></article>
    <article class="stat-card"><span class="stat-label">Credits earned</span><strong>${results.summary?.totalCredits || 0}</strong></article>
    <article class="stat-card"><span class="stat-label">Units completed</span><strong>${done}</strong><span class="stat-meta">of ${req} required</span></article>
    <article class="stat-card"><span class="stat-label">Units remaining</span><strong>${left}</strong><span class="stat-meta">${results.summary?.programmeType || 'programme'} target ${req}</span></article>
    <article class="stat-card"><span class="stat-label">Graduation</span><strong>${eligible ? 'Eligible' : 'In progress'}</strong><span class="stat-meta">min ${gradMin} · target ${req}</span></article>
  </div>
  <p class="panel-note">${escapeHtml(results.note || '')}</p>
  ${(results.semesters || []).map(sem => {
    const units = (sem.units || []).slice(0, 6); // hard cap 6 on slip
    return `<div class="panel"><div class="panel-header"><h2>${escapeHtml(sem.semester)}</h2><span class="badge">GPA ${sem.gpa} · ${units.length} units</span></div>
  <div class="table-wrap"><table><thead><tr><th>Code</th><th>Unit</th><th>Credits</th><th>Grade</th><th>Points</th></tr></thead>
  <tbody>${units.map(u => `<tr><td>${escapeHtml(u.code)}</td><td>${escapeHtml(u.title)}</td><td>${u.credits}</td><td><strong>${escapeHtml(u.grade)}</strong></td><td>${u.points}</td></tr>`).join('')}</tbody></table></div></div>`;
  }).join('') || '<p class="empty-copy">No completed trimesters yet for result display.</p>'}`;
}

function genericPage(section) {
  const copy = {
    timetable: ['Timetable', 'Your personalised class schedule for Trimester 3, 2026 will appear here once units are confirmed by the faculty office.'],
    library: ['Library', 'Search the KeMU digital catalogue, renew loans, and track reading list holds from this space.'],
    support: ['Student support', 'Contact the Student Help Desk for ID card issues, fee queries, or academic guidance. Email studentsupport@kemu.ac.ke or visit the Main Campus registry.']
  }[section] || ['Workspace', 'This section is ready for the next portal release.'];
  return `<section class="page-header"><div><span class="eyebrow">${escapeHtml(copy[0])}</span><h1>${escapeHtml(copy[0])}</h1><p>${escapeHtml(copy[1])}</p></div></section><div class="panel"><p class="empty-copy">${escapeHtml(copy[1])}</p></div>`;
}

function adminOverview() {
  const summary = state.data?.summary || {};
  return `<section class="page-header"><div><span class="eyebrow">Administrator</span><h1>Portal overview</h1><p>Manage student records, courses, and registrations.</p></div></section>
  <div class="stat-grid">
    <article class="stat-card"><span class="stat-label">Students</span><strong>${summary.students || 0}</strong></article>
    <article class="stat-card"><span class="stat-label">Courses</span><strong>${summary.courses || 0}</strong></article>
    <article class="stat-card"><span class="stat-label">Active registrations</span><strong>${summary.registrations || 0}</strong></article>
  </div>
  <div class="panel"><div class="panel-header"><h2>Change admin password</h2></div>
  <form id="admin-password-form" class="form-grid">
    <label class="field"><span>Current password</span><input name="current_password" type="password" required autocomplete="current-password" /></label>
    <label class="field"><span>New password</span><input name="new_password" type="password" required minlength="4" autocomplete="new-password" /></label>
    <button type="submit" class="primary-button">Update password</button>
  </form>
  <p class="panel-note">Default admin login is username <strong>admin</strong> / password <strong>123456</strong> until you change it.</p>
  </div>
  <div class="panel"><div class="panel-header"><h2>Fee balance clearance</h2></div>
  <p class="panel-note">Clear outstanding trimester fees for a student (admin override). Leaves a clearance record on their statement.</p>
  <form id="admin-fee-clear-form" class="form-grid">
    <label class="field"><span>Student</span>
      <select name="student_id" required>
        <option value="">Select student…</option>
        ${(state.data?.students || []).map(s => `<option value="${s.id}">${escapeHtml(s.student_number)} — ${escapeHtml(s.full_name)}</option>`).join('')}
      </select>
    </label>
    <label class="field"><span>Scope</span>
      <select name="scope">
        <option value="all">All outstanding trimesters</option>
        <option value="current">Current trimester only (T3-2026)</option>
      </select>
    </label>
    <label class="field"><span>Clearance method note</span>
      <select name="method">
        <option value="Admin clearance">Admin clearance</option>
        <option value="Bank transfer">Bank transfer verified</option>
        <option value="M-Pesa">M-Pesa verified</option>
        <option value="Scholarship">Scholarship / waiver</option>
      </select>
    </label>
    <button type="submit" class="primary-button">Clear fee balance</button>
  </form></div>`;
}

function studentsView() {
  const students = state.data?.students || [];
  const editing = state.editingStudentId;
  const editStudent = editing ? students.find(s => s.id === editing) : null;
  return `<section class="page-header"><div><span class="eyebrow">Students</span><h1>Student management</h1><p>Add, edit, reset passwords, or remove student accounts.</p></div></section>
  <div class="panel"><div class="panel-header"><h2>${editStudent ? 'Edit student' : 'Add student'}</h2>${editStudent ? `<button type="button" class="text-button" data-action="cancel-edit">Cancel edit</button>` : ''}</div>
  <form id="student-form" class="form-grid" data-mode="${editStudent ? 'edit' : 'create'}" data-student-id="${editStudent ? editStudent.id : ''}">
    <label class="field"><span>Full name</span><input name="full_name" required value="${editStudent ? escapeHtml(editStudent.full_name) : ''}" /></label>
    <label class="field"><span>Registration number</span><input name="student_number" required placeholder="CIS-1-3170-3/2024" value="${editStudent ? escapeHtml(editStudent.student_number) : ''}" /></label>
    <label class="field"><span>Email</span><input name="email" type="email" required value="${editStudent ? escapeHtml(editStudent.email) : ''}" /></label>
    <label class="field"><span>Programme</span><input name="programme" required value="${editStudent ? escapeHtml(editStudent.programme) : ''}" /></label>
    <label class="field"><span>Year level</span><input name="year_level" type="number" min="1" max="6" value="${editStudent ? editStudent.year_level : 1}" /></label>
    <label class="field"><span>Date of birth</span><input name="date_of_birth" type="date" value="${editStudent?.date_of_birth ? String(editStudent.date_of_birth).slice(0, 10) : ''}" /></label>
    <label class="field"><span>Age</span><input name="age" type="number" min="1" max="100" placeholder="e.g. 21" value="${editStudent && editStudent.age != null ? editStudent.age : ''}" /></label>
    <label class="field"><span>Campus</span><input name="campus" value="${editStudent ? escapeHtml(editStudent.campus || 'Main Campus') : 'Main Campus'}" /></label>
    ${editStudent ? '' : `<label class="field"><span>Password</span><input name="password" value="123456" /></label>`}
    <label class="field"><span>Issue date</span><input name="issue_date" type="date" value="${editStudent?.issue_date ? String(editStudent.issue_date).slice(0, 10) : ''}" /></label>
    <label class="field"><span>Expiry date</span><input name="expiry_date" type="date" value="${editStudent?.expiry_date ? String(editStudent.expiry_date).slice(0, 10) : ''}" /></label>
    <button type="submit" class="primary-button">${editStudent ? 'Save changes' : 'Add student'}</button>
  </form></div>
  <div class="panel"><div class="panel-header"><h2>All students (${students.length})</h2></div>
  <div class="table-wrap"><table><thead><tr><th>Reg. No</th><th>Name</th><th>Programme</th><th>Year</th><th>DOB</th><th>Age</th><th>Issue</th><th>Expiry</th><th>Actions</th></tr></thead>
  <tbody>${students.map(s => `<tr>
    <td>${escapeHtml(s.student_number)}</td>
    <td>${escapeHtml(s.full_name)}</td>
    <td>${escapeHtml(s.programme)}</td>
    <td>${s.year_level}</td>
    <td>${formatDate(s.date_of_birth)}</td>
    <td>${s.age != null ? s.age : '—'}</td>
    <td>${formatDate(s.issue_date)}</td>
    <td>${formatDate(s.expiry_date)}</td>
    <td class="action-cell">
      <button type="button" class="text-button" data-edit-student="${s.id}">Edit</button>
      <button type="button" class="text-button" data-reset-password="${s.id}" data-reg="${escapeHtml(s.student_number)}">Reset pwd</button>
      <button type="button" class="text-button danger-text" data-delete-student="${s.id}" data-name="${escapeHtml(s.full_name)}">Delete</button>
    </td>
  </tr>`).join('')}</tbody></table></div></div>`;
}

function coursesView() {
  const courses = state.data?.courses || [];
  const programmes = state.data?.programmes || [];
  const curriculum = state.data?.curriculum || {};
  const selected = state.selectedProgramme || programmes[0] || '';
  if (!state.selectedProgramme && programmes[0]) state.selectedProgramme = programmes[0];
  const prog = state.selectedProgramme || selected;
  const filter = (state.unitAdminFilter || '').trim().toLowerCase();

  // Build set of curriculum codes for selected programme (shared catalogue uses programme=null)
  const progCodeSet = new Set();
  const progRowsByTerm = { 1: [], 2: [], 3: [] };
  if (prog && curriculum[prog]) {
    for (const t of ['1', '2', '3']) {
      for (const row of (curriculum[prog][t] || [])) {
        const code = String(row[0] || '').trim();
        if (!code) continue;
        progCodeSet.add(code.toUpperCase());
        progRowsByTerm[Number(t)].push(row);
      }
    }
  }

  const byProg = courses.filter(c => {
    if (!prog) return true;
    if (!progCodeSet.size) return true;
    return progCodeSet.has(String(c.code || '').toUpperCase());
  });

  const trimesterGroups = [1, 2, 3].map(t => {
    const planned = progRowsByTerm[t] || [];
    const plannedCodes = planned.map(r => String(r[0] || '').toUpperCase());
    // Prefer DB course when code exists; otherwise show planned curriculum row
    let units = [];
    const used = new Set();
    for (const row of planned) {
      const key = String(row[0] || '').toUpperCase();
      if (!key || used.has(key)) continue;
      used.add(key);
      const dbc = courses.find(c => String(c.code || '').toUpperCase() === key);
      if (dbc) {
        units.push({ ...dbc, trimester: t, semester: `Trimester ${t}`, programme: prog });
      } else {
        units.push({ id: null, code: row[0], title: row[1], credits: row[2] || 3, lecturer: '—', capacity: 60, enrolled_count: 0, seats_remaining: 60, semester: `Trimester ${t}`, trimester: t, programme: prog, planned: true });
      }
    }
    // Also include any DB units tagged for this trimester that match programme codes
    for (const c of byProg) {
      const key = String(c.code || '').toUpperCase();
      if (used.has(key)) continue;
      if (Number(c.trimester) === t || String(c.semester || '').includes(`Trimester ${t}`)) {
        used.add(key);
        units.push({ ...c, trimester: t, semester: c.semester || `Trimester ${t}`, programme: prog });
      }
    }
    if (filter) units = units.filter(c => `${c.code} ${c.title} ${c.lecturer}`.toLowerCase().includes(filter));
    units.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    return { t, units };
  });

  const editing = state.editingCourseId;
  const editCourse = editing ? courses.find(c => c.id === editing) : null;
  const totalUnits = progCodeSet.size || byProg.length;

  return `<section class="page-header"><div><span class="eyebrow">Administration</span><h1>Unit management</h1><p>Select a programme (course), then manage its units by Trimester 1, 2 and 3.</p></div></section>

  <div class="panel"><div class="panel-header"><h2>Select programme / course</h2></div>
  <label class="field"><span>Programme</span>
    <select data-select-programme>
      ${programmes.map(p => `<option value="${escapeHtml(p)}" ${p === prog ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('')}
    </select>
  </label>
  <p class="panel-note">${programmes.length} programmes loaded · ${totalUnits} units stored for selected programme</p>
  </div>

  <div class="panel"><div class="panel-header"><h2>${editCourse ? 'Edit unit' : 'Add new unit to selected programme'}</h2>${editCourse ? `<button type="button" class="text-button" data-action="cancel-edit-course">Cancel edit</button>` : ''}</div>
  <form id="course-form" class="form-grid" data-mode="${editCourse ? 'edit' : 'create'}" data-course-id="${editCourse ? editCourse.id : ''}">
    <input type="hidden" name="programme" value="${escapeHtml(prog)}" />
    <label class="field"><span>Unit code</span><input name="code" required value="${editCourse ? escapeHtml(editCourse.code) : ''}" placeholder="e.g. CISY 221" /></label>
    <label class="field"><span>Unit title</span><input name="title" required value="${editCourse ? escapeHtml(editCourse.title) : ''}" /></label>
    <label class="field"><span>Lecturer</span>
      <input name="lecturer" list="lecturer-list" required value="${editCourse ? escapeHtml(editCourse.lecturer) : ''}" placeholder="Select or type lecturer name" />
      <datalist id="lecturer-list">${(state.data?.lecturers || []).map(n => `<option value="${escapeHtml(n)}"></option>`).join('')}</datalist>
    </label>
    <label class="field"><span>Credits</span><input name="credits" type="number" min="1" max="12" value="${editCourse ? editCourse.credits : 3}" /></label>
    <label class="field"><span>Capacity</span><input name="capacity" type="number" min="1" value="${editCourse ? editCourse.capacity : 60}" /></label>
    <label class="field"><span>Trimester</span>
      <select name="trimester" required>
        ${[1,2,3].map(t => `<option value="${t}" ${(editCourse ? Number(editCourse.trimester || 3) : 1) === t ? 'selected' : ''}>Trimester ${t}</option>`).join('')}
      </select>
    </label>
    <button type="submit" class="primary-button">${editCourse ? 'Save unit changes' : 'Add unit to programme'}</button>
  </form>
  <p class="panel-note">New units are saved under <strong>${escapeHtml(prog)}</strong> and appear in the Trimester 1 / 2 / 3 tables below. Students on this programme will see them in unit selection.</p>
  </div>

  <div class="panel"><div class="panel-header"><h2>Filter units</h2>
  <input class="filter-input" type="search" placeholder="Filter by code, title, lecturer…" value="${escapeHtml(state.unitAdminFilter || '')}" data-unit-admin-filter />
  </div></div>

  ${trimesterGroups.map(({ t, units }) => `
  <div class="panel"><div class="panel-header"><h2>Trimester ${t}</h2><span class="badge">${units.length} units</span></div>
  <div class="table-wrap"><table><thead><tr><th>Code</th><th>Title</th><th>Lecturer</th><th>Cr</th><th>Enrolled</th><th>Seats</th><th>Actions</th></tr></thead>
  <tbody>${units.length ? units.map(c => `<tr class="${c.planned ? 'row-planned' : ''}">
    <td><strong>${escapeHtml(c.code)}</strong></td>
    <td>${escapeHtml(c.title)}</td>
    <td>${escapeHtml(c.lecturer)}</td>
    <td>${c.credits}</td>
    <td>${c.enrolled_count || 0}</td>
    <td>${c.planned ? '—' : `<span class="badge ${(c.seats_remaining || 0) <= 0 ? 'warning' : 'success'}">${c.seats_remaining}</span>`}</td>
    <td class="action-cell">${c.id ? `
      <button type="button" class="text-button" data-edit-course="${c.id}">Edit</button>
      <button type="button" class="text-button danger-text" data-delete-course="${c.id}" data-code="${escapeHtml(c.code)}">Delete</button>
    ` : `<span class="badge">Curriculum</span>`}</td>
  </tr>`).join('') : '<tr><td colspan="7" class="empty-copy">No units in this trimester.</td></tr>'}</tbody></table></div></div>`).join('')}

  <div class="panel"><div class="panel-header"><h2>Faculty lecturers (${(state.data?.lecturers || []).length})</h2></div>
  <div class="table-wrap"><table><thead><tr><th>#</th><th>Name</th></tr></thead>
  <tbody>${(state.data?.lecturers || []).map((n, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(n)}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function registrationsView() {
  const registrations = state.data?.registrations || [];
  const students = state.data?.students || [];
  const courses = state.data?.courses || [];
  const selectedStudentId = state.adminSelectedStudent || '';
  const adminFilter = (state.adminUnitFilter || '').trim().toLowerCase();
  let selectable = courses.filter(c => c.id && (c.seats_remaining == null || c.seats_remaining > 0));
  if (adminFilter) {
    selectable = selectable.filter(c => `${c.code} ${c.title} ${c.lecturer || ''}`.toLowerCase().includes(adminFilter));
  }
  // Exclude units student already registered
  const already = new Set(
    registrations.filter(r => r.student_id === selectedStudentId).map(r => r.course_id)
  );
  selectable = selectable.filter(c => !already.has(c.id));
  const basket = state.adminSelectedUnits || new Set();

  return `<section class="page-header"><div><span class="eyebrow">Registrations</span><h1>Manage enrolments</h1><p>Select a student, tick units, then register them in bulk.</p></div></section>

  <div class="panel"><div class="panel-header"><h2>Register units for a student</h2></div>
  <div class="form-grid">
    <label class="field"><span>Student</span>
      <select data-admin-student>
        <option value="">Select student…</option>
        ${students.map(s => `<option value="${s.id}" ${s.id === selectedStudentId ? 'selected' : ''}>${escapeHtml(s.student_number)} — ${escapeHtml(s.full_name)} (${escapeHtml(s.programme || '')})</option>`).join('')}
      </select>
    </label>
    <label class="field"><span>Search units</span>
      <input type="search" data-admin-unit-filter placeholder="Code or title…" value="${escapeHtml(state.adminUnitFilter || '')}" ${selectedStudentId ? '' : 'disabled'} />
    </label>
  </div>
  ${selectedStudentId ? `
  <p class="panel-note">Tick units below, then click <strong>Register selected units</strong>. Already registered units are hidden.</p>
  <div class="table-wrap" style="max-height:320px;overflow:auto">
    <table>
      <thead><tr><th></th><th>Code</th><th>Unit title</th><th>Credits</th><th>Seats</th></tr></thead>
      <tbody>
        ${selectable.length ? selectable.slice(0, 200).map(c => {
          const checked = basket.has(c.id);
          return `<tr class="${checked ? 'row-selected' : ''}">
            <td><input type="checkbox" data-admin-toggle-unit="${c.id}" ${checked ? 'checked' : ''} /></td>
            <td><strong>${escapeHtml(c.code)}</strong></td>
            <td>${escapeHtml(c.title)}</td>
            <td>${c.credits || 3}</td>
            <td>${c.seats_remaining ?? '—'}</td>
          </tr>`;
        }).join('') : '<tr><td colspan="5" class="empty-copy">No selectable units (all registered or none match search).</td></tr>'}
      </tbody>
    </table>
  </div>
  <div class="selection-actions" style="margin-top:12px">
    <button type="button" class="secondary-button" data-action="admin-clear-basket" ${basket.size ? '' : 'disabled'}>Clear selection</button>
    <button type="button" class="primary-button" data-action="admin-register-basket" ${basket.size ? '' : 'disabled'}>Register selected units (${basket.size})</button>
  </div>` : '<p class="empty-copy">Select a student to choose units.</p>'}
  </div>

  <div class="panel"><div class="panel-header"><h2>Active registrations (${registrations.length})</h2></div>
  <div class="table-wrap"><table><thead><tr><th>Student</th><th>Reg. No</th><th>Course</th><th>Registered</th><th></th></tr></thead>
  <tbody>${registrations.length ? registrations.map(r => `<tr><td>${escapeHtml(r.student_name)}</td><td>${escapeHtml(r.student_number)}</td><td>${escapeHtml(r.code)} — ${escapeHtml(r.title)}</td><td>${formatDate(r.registered_at)}</td><td><button class="text-button" data-admin-withdraw="${r.id}">Withdraw</button></td></tr>`).join('') : '<tr><td colspan="5" class="empty-copy">No active registrations.</td></tr>'}</tbody></table></div></div>`;
}

function renderView() {
  if (state.auth?.role === 'admin') return ({ admin: adminOverview, students: studentsView, courses: coursesView, registrations: registrationsView }[state.activeSection] || adminOverview)();
  return ({ overview: studentOverview, profile: profileView, registration: registrationView, timetable: () => genericPage('timetable'), results: resultsView, fees: feesView, library: () => genericPage('library'), support: () => genericPage('support') }[state.activeSection] || studentOverview)();
}

function render() {
  const app = document.querySelector('#app');
  if (!app) return;
  if (state.loading) { app.innerHTML = `<div class="loading-page">${brandMark(56)}<div class="loading-spinner"></div><p>Connecting to your portal…</p></div>`; return; }
  if (!state.auth) { app.innerHTML = loginView(); bindInteractions(); return; }
  app.innerHTML = `<div class="portal-shell">${sidebar()}<div class="mobile-overlay ${state.mobileMenu ? 'visible' : ''}" data-action="toggle-menu"></div><main class="portal-main"><div class="page-content">${topbar()}${renderView()}</div></main></div>`;
  bindInteractions();
}

async function refreshData() {
  const data = await apiRequest('/api/bootstrap');
  state.data = { ...state.data, ...data };
  render();
}

async function submitForm(form, path) {
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const result = await apiRequest(path, { method: 'POST', body: JSON.stringify(payload) });
    state.data = state.auth.role === 'admin' ? { ...state.data, ...result } : result;
    form.reset();
    render();
    showToast('Saved successfully.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function bindInteractions() {
  document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => { state.activeSection = button.dataset.nav; state.mobileMenu = false; render(); }));
  document.querySelector('[data-action="toggle-menu"]')?.addEventListener('click', () => { state.mobileMenu = !state.mobileMenu; render(); });
  document.querySelector('[data-action="logout"]')?.addEventListener('click', async () => { const button = document.querySelector('[data-action="logout"]'); if (button) button.disabled = true; await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {}); state.auth = null; state.data = null; state.loading = false; render(); showToast('You have been signed out.'); });
  document.querySelectorAll('[data-course-toggle]').forEach(button => button.addEventListener('click', () => { const index = Number(button.dataset.courseToggle); state.expandedCourses.has(index) ? state.expandedCourses.delete(index) : state.expandedCourses.add(index); render(); }));
  document.querySelectorAll('[data-register]').forEach(button => button.addEventListener('click', async () => { button.disabled = true; try { state.data = await apiRequest('/api/registrations', { method: 'POST', body: JSON.stringify({ course_id: button.dataset.register }) }); render(); showToast('Course registered successfully.', 'success'); } catch (error) { button.disabled = false; showToast(error.message, 'error'); } }));
  document.querySelectorAll('[data-withdraw]').forEach(button => button.addEventListener('click', async () => { if (!confirm('Withdraw from this course? Your registration history will be preserved.')) return; try { state.data = await apiRequest(`/api/registrations/${button.dataset.withdraw}`, { method: 'DELETE' }); render(); showToast('Course withdrawn from your active registration.', 'success'); } catch (error) { showToast(error.message, 'error'); } }));

  document.querySelectorAll('[data-toggle-unit]').forEach(el => {
    const handler = event => {
      event.preventDefault();
      event.stopPropagation();
      const id = el.dataset.toggleUnit;
      if (!id) return;
      if (state.selectedUnits.has(id)) state.selectedUnits.delete(id);
      else state.selectedUnits.add(id);
      render();
    };
    el.addEventListener('change', handler);
    el.addEventListener('click', event => {
      // For buttons (Remove) use click; for checkboxes change already fires
      if (el.tagName === 'BUTTON') handler(event);
    });
  });
  document.querySelector('[data-unit-filter]')?.addEventListener('input', event => {
    state.unitFilter = event.target.value || '';
    // debounce-ish: re-render on change
    clearTimeout(window.__unitFilterTimer);
    window.__unitFilterTimer = setTimeout(() => render(), 200);
  });
  document.querySelector('[data-action="clear-basket"]')?.addEventListener('click', () => {
    state.selectedUnits.clear();
    render();
  });
  document.querySelector('[data-action="register-basket"]')?.addEventListener('click', async () => {
    const ids = [...state.selectedUnits];
    if (!ids.length) return;
    const button = document.querySelector('[data-action="register-basket"]');
    if (button) button.disabled = true;
    let ok = 0, fail = 0;
    for (const course_id of ids) {
      try {
        state.data = await apiRequest('/api/registrations', { method: 'POST', body: JSON.stringify({ course_id }) });
        state.selectedUnits.delete(course_id);
        ok += 1;
      } catch (error) {
        fail += 1;
      }
    }
    render();
    if (ok) showToast(`${ok} unit(s) registered successfully.`, 'success');
    if (fail) showToast(`${fail} unit(s) could not be registered.`, 'error');
  });

  document.querySelectorAll('[data-admin-withdraw]').forEach(button => button.addEventListener('click', async () => { if (!confirm('Withdraw this student registration?')) return; try { state.data = { ...state.data, ...(await apiRequest(`/api/admin/registrations/${button.dataset.adminWithdraw}`, { method: 'DELETE' })) }; render(); showToast('Registration withdrawn.', 'success'); } catch (error) { showToast(error.message, 'error'); } }));
  document.querySelector('#student-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const mode = form.dataset.mode;
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      if (mode === 'edit') {
        const id = form.dataset.studentId;
        state.data = { ...state.data, ...(await apiRequest(`/api/admin/students/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })) };
        state.editingStudentId = null;
        showToast('Student updated.', 'success');
      } else {
        state.data = { ...state.data, ...(await apiRequest('/api/admin/students', { method: 'POST', body: JSON.stringify(payload) })) };
        showToast('Student added.', 'success');
      }
      render();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  document.querySelector('#course-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const mode = form.dataset.mode;
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.trimester = Number(payload.trimester) || 3;
    if (!payload.programme && state.selectedProgramme) payload.programme = state.selectedProgramme;
    try {
      if (mode === 'edit') {
        const id = form.dataset.courseId;
        state.data = { ...state.data, ...(await apiRequest(`/api/admin/courses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })) };
        state.editingCourseId = null;
        if (payload.programme) state.selectedProgramme = payload.programme;
        showToast(`Unit ${payload.code} updated for ${payload.programme || 'programme'}.`, 'success');
      } else {
        state.data = { ...state.data, ...(await apiRequest('/api/admin/courses', { method: 'POST', body: JSON.stringify(payload) })) };
        if (payload.programme) state.selectedProgramme = payload.programme;
        showToast(`Unit ${payload.code} added to Trimester ${payload.trimester}.`, 'success');
      }
      render();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  document.querySelectorAll('[data-edit-course]').forEach(button => button.addEventListener('click', () => {
    state.editingCourseId = button.dataset.editCourse;
    state.activeSection = 'courses';
    render();
  }));
  document.querySelector('[data-action="cancel-edit-course"]')?.addEventListener('click', () => {
    state.editingCourseId = null;
    render();
  });
  document.querySelectorAll('[data-delete-course]').forEach(button => button.addEventListener('click', async () => {
    if (!confirm(`Delete course ${button.dataset.code}? Related registrations will be removed.`)) return;
    try {
      state.data = { ...state.data, ...(await apiRequest(`/api/admin/courses/${button.dataset.deleteCourse}`, { method: 'DELETE' })) };
      if (state.editingCourseId === button.dataset.deleteCourse) state.editingCourseId = null;
      render();
      showToast('Course deleted.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }));
  document.querySelector('#assignment-form')?.addEventListener('submit', event => { event.preventDefault(); submitForm(event.currentTarget, '/api/admin/registrations'); });

  // Admin: select student for bulk unit registration
  document.querySelector('[data-admin-student]')?.addEventListener('change', event => {
    state.adminSelectedStudent = event.target.value || '';
    state.adminSelectedUnits = new Set();
    render();
  });
  document.querySelector('[data-admin-unit-filter]')?.addEventListener('input', event => {
    state.adminUnitFilter = event.target.value || '';
    clearTimeout(window.__adminUnitFilterTimer);
    window.__adminUnitFilterTimer = setTimeout(() => render(), 200);
  });
  document.querySelectorAll('[data-admin-toggle-unit]').forEach(el => {
    el.addEventListener('change', () => {
      const id = el.dataset.adminToggleUnit;
      if (!id) return;
      if (!state.adminSelectedUnits) state.adminSelectedUnits = new Set();
      if (state.adminSelectedUnits.has(id)) state.adminSelectedUnits.delete(id);
      else state.adminSelectedUnits.add(id);
      render();
    });
  });
  document.querySelector('[data-action="admin-clear-basket"]')?.addEventListener('click', () => {
    state.adminSelectedUnits = new Set();
    render();
  });
  document.querySelector('[data-action="admin-register-basket"]')?.addEventListener('click', async () => {
    const student_id = state.adminSelectedStudent;
    const ids = [...(state.adminSelectedUnits || [])];
    if (!student_id || !ids.length) return;
    const button = document.querySelector('[data-action="admin-register-basket"]');
    if (button) button.disabled = true;
    let ok = 0, fail = 0;
    for (const course_id of ids) {
      try {
        state.data = { ...state.data, ...(await apiRequest('/api/admin/registrations', { method: 'POST', body: JSON.stringify({ student_id, course_id }) })) };
        state.adminSelectedUnits.delete(course_id);
        ok += 1;
      } catch (error) {
        fail += 1;
      }
    }
    render();
    if (ok) showToast(`${ok} unit(s) registered for student.`, 'success');
    if (fail) showToast(`${fail} unit(s) could not be registered.`, 'error');
  });

  document.querySelector('#admin-password-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      await apiRequest('/api/admin/password', { method: 'POST', body: JSON.stringify(payload) });
      form.reset();
      showToast('Admin password updated.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  document.querySelectorAll('[data-edit-student]').forEach(button => button.addEventListener('click', () => {
    state.editingStudentId = button.dataset.editStudent;
    state.activeSection = 'students';
    render();
  }));
  document.querySelector('[data-action="cancel-edit"]')?.addEventListener('click', () => {
    state.editingStudentId = null;
    render();
  });
  document.querySelectorAll('[data-delete-student]').forEach(button => button.addEventListener('click', async () => {
    if (!confirm(`Delete student ${button.dataset.name}? This also removes their registrations.`)) return;
    try {
      state.data = { ...state.data, ...(await apiRequest(`/api/admin/students/${button.dataset.deleteStudent}`, { method: 'DELETE' })) };
      if (state.editingStudentId === button.dataset.deleteStudent) state.editingStudentId = null;
      render();
      showToast('Student deleted.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }));
  document.querySelectorAll('[data-reset-password]').forEach(button => button.addEventListener('click', async () => {
    const pwd = prompt(`Reset password for ${button.dataset.reg}. Enter new password (default 123456):`, '123456');
    if (pwd === null) return;
    try {
      state.data = { ...state.data, ...(await apiRequest(`/api/admin/students/${button.dataset.resetPassword}/reset-password`, { method: 'POST', body: JSON.stringify({ password: pwd || '123456' }) })) };
      render();
      showToast('Password reset.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }));

  document.querySelector('#fee-pay-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    // empty amount → full remaining (server treats missing/0 as full)
    if (payload.amount === '' || payload.amount === undefined) delete payload.amount;
    else payload.amount = Number(payload.amount);
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    try {
      const res = await apiRequest('/api/fees/pay', { method: 'POST', body: JSON.stringify(payload) });
      state.data = res;
      render();
      showToast(res.message || 'Payment recorded successfully.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
      if (button) button.disabled = false;
    }
  });
  document.querySelector('#admin-fee-clear-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    if (payload.scope === 'current') payload.term_key = 'T3-2026';
    delete payload.scope;
    try {
      state.data = { ...state.data, ...(await apiRequest('/api/admin/fees/clear', { method: 'POST', body: JSON.stringify(payload) })) };
      render();
      showToast('Fee balance cleared.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  document.querySelector('[data-action="download-results"]')?.addEventListener('click', () => {
    const results = state.data?.results;
    const student = state.data?.student;
    if (!results || !student) return;
    let text = `KeMU Student Portal — Provisional Results\n`;
    text += `${student.full_name} | ${student.student_number}\n`;
    text += `Programme: ${student.programme}\n`;
    text += `CGPA: ${results.summary?.cgpa ?? '—'} | Credits: ${results.summary?.totalCredits || 0}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += `${results.note || ''}\n\n`;
    for (const sem of results.semesters || []) {
      const units = (sem.units || []).slice(0, 6);
      text += `=== ${sem.semester} (GPA ${sem.gpa}) — ${units.length} units ===\n`;
      for (const u of units) {
        text += `  ${u.code}  ${u.title}  ${u.credits}cr  Grade ${u.grade}  (${u.points})\n`;
      }
      text += `\n`;
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KeMU-Results-${(student.student_number || 'student').replace(/[\\/]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Results downloaded.', 'success');
  });

  document.querySelector('#local-login-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    state.loginError = '';
    try {
      await apiRequest('/api/auth/local-login', { method: 'POST', body: JSON.stringify(payload) });
      await bootstrap();
      showToast('Signed in successfully.', 'success');
    } catch (error) {
      state.loginError = error.message || 'Login failed.';
      if (button) button.disabled = false;
      render();
    }
  });
}

render();
bootstrap();
