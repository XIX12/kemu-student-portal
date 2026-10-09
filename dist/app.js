const logoPath = '/manus-storage/KeMU-Corporate-Logo-Full-1_f6fcbf97.png';

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
  ['overview', 'Overview', 'grid'], ['registration', 'Course Registration', 'book'], ['timetable', 'Timetable', 'calendar'],
  ['results', 'Results', 'chart'], ['fees', 'Fees', 'wallet'], ['library', 'Library', 'library'], ['support', 'Support', 'headset']
];
const adminNav = [
  ['admin', 'Admin Overview', 'grid'], ['students', 'Students', 'user'], ['courses', 'Courses', 'book'], ['registrations', 'Registrations', 'calendar'], ['results', 'Results & Slips', 'chart']
];

const state = { auth: null, data: null, activeSection: 'overview', mobileMenu: false, expandedCourses: new Set(), loading: true };
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
    state.activeSection = state.auth.role === 'admin' ? 'admin' : 'overview';
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

function loginView(message = '') {
  const loginUrl = `/api/auth/login?redirect=${encodeURIComponent(window.location.origin)}`;
  return `<div class="login-page"><div class="login-card"><div class="login-brand"><img src="${logoPath}" alt="Kenya Methodist University" /><span>STUDENT PORTAL</span></div><div class="login-mark">${icon('book')}</div><span class="eyebrow">Kenya Methodist University</span><h1>Keep your academic life moving.</h1><p>Sign in with your Manus account to access course registration, your timetable, results, and student support.</p>${message ? `<div class="login-message">${icon('info')}<span>${message}</span></div>` : ''}<a class="primary-button login-button" href="${loginUrl}">Sign in to KeMU Portal ${icon('arrow')}</a><div class="login-note">Your access is linked to your KeMU student or administrator record. Ask the portal administrator if your account is not yet registered.</div></div><div class="login-side"><span class="eyebrow">A focused academic command centre</span><h2>Make space for the work that matters.</h2><p>Register units, see what is next, and keep every part of your semester in one calm place.</p><div class="login-side-stat"><strong>01</strong><span>Secure account access</span></div><div class="login-side-stat"><strong>02</strong><span>Live registration status</span></div><div class="login-side-stat"><strong>03</strong><span>Admin-managed records</span></div></div></div>`;
}

function navItems() { return state.auth?.role === 'admin' ? adminNav : studentNav; }
function currentTitle() { return (navItems().find(item => item[0] === state.activeSection) || navItems()[0])[1]; }

function sidebar() {
  return `<aside class="sidebar ${state.mobileMenu ? 'open' : ''}"><div class="brand-lockup"><img src="${logoPath}" alt="Kenya Methodist University" /><div class="brand-label">${state.auth?.role === 'admin' ? 'Administrator Console' : 'Student Portal'} · 2026/27</div></div><span class="nav-label">${state.auth?.role === 'admin' ? 'Management' : 'Workspace'}</span><nav class="nav-list" aria-label="Primary navigation">${navItems().map(([id, label, glyph]) => `<button class="nav-item ${state.activeSection === id ? 'active' : ''}" data-nav="${id}" aria-current="${state.activeSection === id ? 'page' : 'false'}"><span class="nav-icon">${icon(glyph)}</span><span>${label}</span></button>`).join('')}</nav><div class="sidebar-bottom"><div class="help-card"><span class="nav-icon" style="color:var(--teal-deep)">${icon(state.auth?.role === 'admin' ? 'info' : 'headset')}</span><strong>${state.auth?.role === 'admin' ? 'Admin guidance' : 'Need a hand?'}</strong><p>${state.auth?.role === 'admin' ? 'Add students and courses here, then manage their registrations.' : 'Find quick answers or reach the Student Help Desk.'}</p><button data-nav="${state.auth?.role === 'admin' ? 'admin' : 'support'}">Open ${state.auth?.role === 'admin' ? 'admin' : 'support'} ${icon('arrow')}</button></div></div></aside>`;
}

function topbar() {
  const roleLabel = state.auth?.role === 'admin' ? 'Portal administrator' : state.data?.student?.programme || 'KeMU student';
  return `<header class="topbar"><div class="topbar-left"><button class="mobile-toggle" data-action="toggle-menu" aria-label="Open navigation">${icon(state.mobileMenu ? 'close' : 'menu')}</button><div class="breadcrumb">KeMU Student Portal <span>/ ${currentTitle()}</span></div></div><div class="topbar-right"><span class="topbar-term">Semester 1, 2026/2027</span><button class="icon-button" data-action="notifications" aria-label="View notifications">${icon('bell')}<span class="notification-dot"></span></button><div class="profile-trigger"><span class="avatar">${initials(state.auth?.name || 'KeMU')}</span><span class="profile-copy"><strong>${escapeHtml(state.auth?.name || 'KeMU user')}</strong><span>${escapeHtml(roleLabel)}</span></span></div><button class="signout-button" data-action="logout" aria-label="Sign out">${icon('logout')}<span>Sign out</span></button></div></header>`;
}

function initials(name) { return safeText(name).split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'KM'; }
function safeText(value) { return String(value || '').trim(); }
function escapeHtml(value) { return safeText(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function number(value) { return Number(value || 0); }
function formatDate(value) { return value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }

function pageHeading(title, copy, badge = '') { return `<div class="page-heading"><div><span class="eyebrow">${state.auth?.role === 'admin' ? 'Management workspace' : 'Semester 1, 2026/2027'}</span><h1>${title}</h1><p>${copy}</p></div>${badge ? `<span class="status-pill">${badge}</span>` : ''}</div>`; }
function kpi(iconName, label, value, meta, tone = '') { return `<article class="kpi-card"><div class="kpi-top"><span class="eyebrow">${label}</span><span class="kpi-icon ${tone}">${icon(iconName)}</span></div><div class="kpi-value">${value}</div><div class="kpi-meta">${meta}</div></article>`; }

function studentOverview() {
  const student = state.data.student;
  const registrations = state.data.registrations || [];
  const credits = registrations.reduce((sum, course) => sum + number(course.credits), 0);
  const available = (state.data.courses || []).filter(course => !course.registered).length;
  return `${pageHeading('Overview', 'Your academic pulse, at a glance.', '● Account connected')}<div class="welcome-panel"><div><span class="eyebrow">Tuesday, 08 October 2026</span><h2>Keep your semester moving.</h2><p>Good morning, ${escapeHtml(student.full_name.split(' ')[0])}. Your registration record is connected and ready to manage.</p><div class="hero-profile"><span class="avatar">${initials(student.full_name)}</span><div><strong>${escapeHtml(student.full_name)}</strong><span>Year ${number(student.year_level)} · ${escapeHtml(student.programme)} · ${escapeHtml(student.campus)}</span></div></div></div><span class="term-pill">Semester 1, 2026/2027</span></div><div class="kpi-row">${kpi('book', 'Registered units', `${registrations.length}`, `${credits} credit hours`, 'burgundy')}${kpi('calendar', 'Available courses', `${available}`, 'Open for registration', '')}${kpi('chart', 'Academic status', 'Good', 'In active standing', 'green')}${kpi('wallet', 'Fee balance', 'KES 18,400', 'Illustrative · due 31 Oct', 'amber')}</div><div class="dashboard-grid"><div class="stack">${courseMomentum()}${scheduleCard()}</div><div class="stack">${noticeCard()}${quickActions()}<div class="balance-card"><div class="balance-label"><span class="eyebrow">Student account</span>${icon('wallet')}</div><div class="balance-amount">KES 18,400</div><p>Illustrative balance only. No live payment is connected.</p><button data-nav="fees">View fee summary ${icon('arrow')}</button></div></div></div>`;
}

function courseMomentum() {
  const courses = state.data.registrations || [];
  return `<div class="card"><div class="card-header"><div><h3>Registered courses</h3><p>Manage your current semester units.</p></div><button class="section-link" data-nav="registration">Registration ${icon('arrow')}</button></div><div class="course-list">${courses.length ? courses.map((course, index) => `<article class="course-item ${state.expandedCourses.has(index) ? 'expanded' : ''}"><div class="course-main"><div class="course-name"><span class="course-code">${escapeHtml(course.code.split(' ')[1] || course.code.slice(0, 3))}</span><div class="course-copy"><strong>${escapeHtml(course.title)}</strong><span>${escapeHtml(course.code)} · ${escapeHtml(course.lecturer)}</span></div></div><div class="course-status">${number(course.credits)} credits</div><button class="course-toggle" data-course-toggle="${index}" aria-label="Expand course">${icon('chevron')}</button></div><div class="course-detail"><strong>Registered ${formatDate(course.registered_at)}</strong><br />Use Course Registration to add or withdraw units before the registration deadline.</div></article>`).join('') : `<div class="empty-inline">You have no registered courses yet. Open Course Registration to get started.</div>`}</div></div>`;
}

function scheduleCard() {
  const upcoming = [
    ['08:00', 'Database Systems', 'Science Block 104 · Mr. Brian Mwangi', 'MON'],
    ['10:00', 'Systems Analysis & Design', 'Main Campus 203 · Dr. Faith Muthoni', 'TUE'],
    ['14:00', 'Management Information Systems', 'ICT Lab 2 · Dr. Wanjiku Njoroge', 'WED']
  ];
  return `<div class="card"><div class="card-header"><div><h3>Upcoming classes</h3><p>Your next sessions, in campus time.</p></div><button class="section-link" data-nav="timetable">Full timetable ${icon('arrow')}</button></div><div class="schedule-list">${upcoming.map(item => `<div class="schedule-item"><div class="schedule-time">${item[0]}<br />${item[0] === '14:00' ? 'PM' : 'AM'}</div><div class="schedule-copy"><strong>${item[1]}</strong><span>${item[2]}</span></div><span class="schedule-day">${item[3]}</span></div>`).join('')}</div></div>`;
}

function noticeCard() { return `<div class="card"><div class="card-header"><div><h3>Recent notices</h3><p>Small updates worth keeping close.</p></div><button class="section-link" data-action="notifications">View all ${icon('arrow')}</button></div><div class="notice-list"><div class="notice"><span class="notice-marker"></span><div><strong>Mid-semester assessment window</strong><p>Continuous assessment submissions close Friday, 18 October at 5:00 PM.</p><time>Today · Academic Registry</time></div></div><div class="notice"><span class="notice-marker"></span><div><strong>Library weekend hours extended</strong><p>The main library remains open until 8:00 PM during assessment period.</p><time>Yesterday · University Library</time></div></div><div class="notice"><span class="notice-marker"></span><div><strong>Student wellness drop-in clinic</strong><p>Book a confidential session through Student Affairs.</p><time>03 Oct · Student Affairs</time></div></div></div></div>`; }
function quickActions() { return `<div class="card"><div class="card-header"><div><h3>Quick actions</h3><p>Useful shortcuts for today.</p></div></div><div class="action-grid"><button class="action-button" data-nav="registration">${icon('book')}<strong>Register a course</strong><span>Manage your units</span></button><button class="action-button" data-nav="timetable">${icon('calendar')}<strong>View timetable</strong><span>Plan your week</span></button><button class="action-button" data-action="statement">${icon('file')}<strong>Download statement</strong><span>Keep a copy</span></button><button class="action-button" data-nav="support">${icon('headset')}<strong>Ask for support</strong><span>Get unstuck</span></button></div></div>`; }

function registrationView() {
  const courses = state.data.courses || [];
  const registered = courses.filter(course => course.registered);
  return `${pageHeading('Course Registration', 'Register or withdraw from available units for this semester.', `${registered.length} registered`)}<div class="registration-banner"><div class="registration-banner-icon">${icon('info')}</div><div><strong>Registration is live for Semester 1, 2026/2027.</strong><p>Choose a course below. Your record updates immediately after a successful registration.</p></div></div><div class="page-card"><div class="filter-row"><div><h2>Available courses</h2><p class="card-header" style="padding:6px 0 0;color:var(--muted);font-size:11px">${courses.length} course options from the current catalogue.</p></div><button class="section-link" data-action="refresh">Refresh list ${icon('refresh')}</button></div><div class="registration-grid">${courses.map(course => `<article class="registration-card ${course.registered ? 'registered' : ''}"><div class="registration-card-top"><span class="course-code">${escapeHtml(course.code.split(' ')[1] || course.code.slice(0, 3))}</span><span class="tag ${course.registered ? 'green-tag' : ''}">${course.registered ? 'Registered' : `${course.seats_remaining} seats left`}</span></div><strong>${escapeHtml(course.title)}</strong><p>${escapeHtml(course.code)} · ${escapeHtml(course.lecturer)}</p><div class="registration-meta"><span>${number(course.credits)} credits</span><span>${number(course.enrolled_count)} / ${number(course.capacity)} enrolled</span></div>${course.registered ? `<button class="danger-button" data-withdraw="${course.id}">Withdraw ${icon('arrow')}</button>` : `<button class="primary-small" data-register="${course.id}" ${course.seats_remaining <= 0 ? 'disabled' : ''}>Register course ${icon('arrow')}</button>`}</article>`).join('')}</div></div><div class="page-card"><div class="filter-row"><div><h2>Your current registration</h2><p class="card-header" style="padding:6px 0 0;color:var(--muted);font-size:11px">This is the record attached to your account.</p></div></div>${registered.length ? `<div class="table-wrap"><table><thead><tr><th>Course</th><th>Lecturer</th><th>Credits</th><th>Registered</th></tr></thead><tbody>${registered.map(course => `<tr><td>${escapeHtml(course.code)} · ${escapeHtml(course.title)}</td><td>${escapeHtml(course.lecturer)}</td><td>${number(course.credits)}</td><td><span class="status-pill">Active</span></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-state"><div class="empty-icon">${icon('book')}</div><h2>No courses registered</h2><p>Choose from the available course cards above to build your semester schedule.</p></div>`}</div>`;
}

function adminOverview() {
  const summary = state.data.summary || {};
  return `${pageHeading('Admin Overview', 'Manage the people, courses, and registrations behind the portal.', '● Admin access')}<div class="admin-hero"><div><span class="eyebrow">KeMU portal operations</span><h2>Keep the student record moving.</h2><p>You are signed in as the configured administrator. Add a student first, then add or assign their courses from the management workspace.</p></div><div class="admin-hero-mark">${icon('grid')}</div></div><div class="kpi-row">${kpi('user', 'Students', summary.students || 0, 'Student records', 'burgundy')}${kpi('book', 'Courses', summary.courses || 0, 'Catalogue entries', '')}${kpi('calendar', 'Registrations', summary.registrations || 0, 'Active assignments', 'green')}${kpi('info', 'Access', 'Admin', 'Role protected', 'amber')}</div><div class="admin-grid"><div class="page-card"><div class="card-header" style="padding:0 0 18px"><div><h3>How to use admin mode</h3><p>Three steps to get a student ready.</p></div></div><div class="admin-steps"><div><span>01</span><strong>Add a student</strong><p>Enter the student’s name, Manus email, programme, year, and campus.</p></div><div><span>02</span><strong>Add a course</strong><p>Set the code, title, lecturer, credits, semester, and capacity.</p></div><div><span>03</span><strong>Assign a course</strong><p>Use Registrations to register a course on behalf of a student.</p></div></div></div><div class="page-card admin-note"><div class="resource-icon">${icon('warning')}</div><strong>Keep emails accurate</strong><p>A student’s Manus account email is how the portal links their login to their student record.</p><button data-nav="students">Manage students ${icon('arrow')}</button></div></div>`;
}

function studentsView() {
  return `${pageHeading('Students', 'Add and review the student records that can access the portal.', `${state.data.students.length} records`)}<div class="admin-grid"><form class="page-card form-card" id="student-form"><div class="form-heading"><div><h2>Add a student</h2><p>Use the student’s Manus account email for login matching.</p></div><span class="form-icon">${icon('user')}</span></div><div class="form-grid"><label>Full name<input name="full_name" required placeholder="e.g. Amara Njeri" /></label><label>Manus account email<input name="email" type="email" required placeholder="student@example.com" /></label><label>Student number<input name="student_number" placeholder="e.g. KEMU/IS/2026/0102" /></label><label>Programme<input name="programme" required placeholder="e.g. BSc. Information Science" /></label><label>Year<select name="year_level"><option>1</option><option>2</option><option selected>3</option><option>4</option><option>5</option></select></label><label>Campus<input name="campus" value="Main Campus" required /></label></div><button class="primary-button form-submit" type="submit">Add student ${icon('plus')}</button></form><div class="page-card"><div class="filter-row"><div><h2>Student directory</h2><p class="card-header" style="padding:6px 0 0;color:var(--muted);font-size:11px">These are the records currently available for account matching.</p></div></div><div class="table-wrap"><table><thead><tr><th>Student</th><th>Number</th><th>Programme</th><th>Year</th></tr></thead><tbody>${state.data.students.map(student => `<tr><td><strong>${escapeHtml(student.full_name)}</strong><small>${escapeHtml(student.email)}</small></td><td>${escapeHtml(student.student_number)}</td><td>${escapeHtml(student.programme)}</td><td>Year ${number(student.year_level)}</td></tr>`).join('')}</tbody></table></div></div></div>`;
}

function coursesView() {
  return `${pageHeading('Courses', 'Build the catalogue students can register from.', `${state.data.courses.length} catalogue entries`)}<div class="admin-grid"><form class="page-card form-card" id="course-form"><div class="form-heading"><div><h2>Add a course</h2><p>Create a catalogue entry and set its registration capacity.</p></div><span class="form-icon">${icon('book')}</span></div><div class="form-grid"><label>Course code<input name="code" required placeholder="e.g. BIS 410" /></label><label>Course title<input name="title" required placeholder="e.g. Information Security" /></label><label>Lecturer<input name="lecturer" required placeholder="e.g. Dr. Jane Wambui" /></label><label>Credits<input name="credits" type="number" min="1" max="8" value="3" required /></label><label>Capacity<input name="capacity" type="number" min="1" value="60" required /></label><label>Semester<input name="semester" value="Semester 1, 2026/2027" required /></label></div><button class="primary-button form-submit" type="submit">Add course ${icon('plus')}</button></form><div class="page-card"><div class="filter-row"><div><h2>Course catalogue</h2><p class="card-header" style="padding:6px 0 0;color:var(--muted);font-size:11px">Course availability updates as students register.</p></div></div><div class="table-wrap"><table><thead><tr><th>Course</th><th>Lecturer</th><th>Credits</th><th>Capacity</th></tr></thead><tbody>${state.data.courses.map(course => `<tr><td><strong>${escapeHtml(course.code)}</strong><small>${escapeHtml(course.title)}</small></td><td>${escapeHtml(course.lecturer)}</td><td>${number(course.credits)}</td><td>${number(course.enrolled_count)} / ${number(course.capacity)}</td></tr>`).join('')}</tbody></table></div></div></div>`;
}

function registrationsView() {
  return `${pageHeading('Registrations', 'Assign courses on behalf of students and review active records.', `${state.data.registrations.length} active`)}<div class="page-card form-card"><div class="form-heading"><div><h2>Register a student</h2><p>Use this when a student needs an administrator-assisted registration.</p></div><span class="form-icon">${icon('calendar')}</span></div><form id="assignment-form"><div class="form-grid"><label>Student<select name="student_id" required><option value="">Choose a student</option>${state.data.students.map(student => `<option value="${student.id}">${escapeHtml(student.full_name)} · ${escapeHtml(student.student_number)}</option>`).join('')}</select></label><label>Course<select name="course_id" required><option value="">Choose a course</option>${state.data.courses.filter(course => course.seats_remaining > 0).map(course => `<option value="${course.id}">${escapeHtml(course.code)} · ${escapeHtml(course.title)}</option>`).join('')}</select></label></div><button class="primary-button form-submit" type="submit">Register course for student ${icon('arrow')}</button></form></div><div class="page-card"><div class="filter-row"><div><h2>Active registration records</h2><p class="card-header" style="padding:6px 0 0;color:var(--muted);font-size:11px">Withdrawals here remove the active registration but preserve history.</p></div></div>${state.data.registrations.length ? `<div class="table-wrap"><table><thead><tr><th>Student</th><th>Course</th><th>Registered</th><th>Action</th></tr></thead><tbody>${state.data.registrations.map(registration => `<tr><td><strong>${escapeHtml(registration.student_name)}</strong><small>${escapeHtml(registration.student_number)}</small></td><td><strong>${escapeHtml(registration.code)}</strong><small>${escapeHtml(registration.title)}</small></td><td>${formatDate(registration.registered_at)}</td><td><button class="table-action danger-text" data-admin-withdraw="${registration.id}">Withdraw</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-state"><div class="empty-icon">${icon('calendar')}</div><h2>No active registrations</h2><p>Use the assignment form above after you have added students and courses.</p></div>`}</div>`;
}

function resultSlipHtml(student, results, title = 'Academic Result Slip') {
  const rows = results.length ? results.map(result => `<tr><td>${escapeHtml(result.code)}</td><td>${escapeHtml(result.title)}</td><td>${number(result.credits)}</td><td>${result.marks === null ? 'Pending' : result.marks}</td><td>${escapeHtml(result.grade || 'Pending')}</td><td>${result.grade_point === null ? '—' : result.grade_point}</td></tr>`).join('') : `<tr><td colspan=6>No result entries recorded yet.</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{size:A4;margin:16mm}body{font-family:Arial,sans-serif;color:#241b21}header{text-align:center;border-bottom:2px solid #87124d;padding-bottom:14px;margin-bottom:20px}header img{width:520px;max-width:90%;height:auto}header p{margin:3px 0;font-size:10px}h1{font-size:18px;color:#87124d;text-align:center}table{width:100%;border-collapse:collapse;margin-top:18px;font-size:11px}th,td{border:1px solid #cfc4cb;padding:8px;text-align:left}th{background:#f3e7ed;color:#6d1040}.info{display:grid;grid-template-columns:1fr 1fr;gap:5px;font-size:11px}.footer{margin-top:36px;display:flex;justify-content:space-between;font-size:10px}</style></head><body><header><img src="${logoPath}" alt="Kenya Methodist University"><p>P. O. BOX 267 - 60200 Meru - Kenya</p><p>Tel: 254-061-313097, 254-064-3131279, 0724256162</p><p>Email: info@kemu.ac.ke, Website: www.kemu.ac.ke</p></header><h1>${escapeHtml(title)}</h1><div class="info"><div><b>Name:</b> ${escapeHtml(student.full_name)}</div><div><b>Registration No:</b> ${escapeHtml(student.student_number)}</div><div><b>Programme:</b> ${escapeHtml(student.programme)}</div><div><b>Semester:</b> ${escapeHtml(results[0]?.semester || 'Not entered')}</div></div><table><thead><tr><th>Code</th><th>Course</th><th>Credits</th><th>Marks</th><th>Grade</th><th>Points</th></tr></thead><tbody>${rows}</tbody></table><div class="footer"><span>Generated from KeMU Student Portal</span><span>Official results must be verified by Academic Registry</span></div><script>window.onload=()=>window.print()</script></body></html>`;
}
function openResultSlip(student, results) { const popup = window.open('', '_blank'); if (!popup) { showToast('Allow pop-ups to download the result slip.', 'error'); return; } popup.document.write(resultSlipHtml(student, results)); popup.document.close(); }
function resultEntryView() {
  const students = state.data.students || [], courses = state.data.courses || [];
  return `${pageHeading('Results & Slips', 'Enter official marks when available and print a student result slip.', `${state.data.results.length} entries`)}<div class="registration-banner"><div class="registration-banner-icon">${icon('info')}</div><div><strong>Results are never generated automatically.</strong><p>Leave marks and grade blank to save a Pending entry. Enter only approved results supplied by Academic Registry.</p></div></div><div class="admin-grid"><form class="page-card form-card" id="result-form"><div class="form-heading"><div><h2>Enter a result</h2><p>Choose the student and course, then enter official values.</p></div><span class="form-icon">${icon('chart')}</span></div><div class="form-grid"><label>Student<select name="student_id" required><option value="">Choose a student</option>${students.map(s => `<option value="${s.id}">${escapeHtml(s.full_name)} · ${escapeHtml(s.student_number)}</option>`).join('')}</select></label><label>Course<select name="course_id" required><option value="">Choose a course</option>${courses.map(c => `<option value="${c.id}">${escapeHtml(c.code)} · ${escapeHtml(c.title)}</option>`).join('')}</select></label><label>Semester<input name="semester" value="Semester 3, 2026" required /></label><label>Marks <span class="field-note">0–100, optional</span><input name="marks" type="number" min="0" max="100" step="0.01" placeholder="Leave blank for pending" /></label><label>Grade <span class="field-note">Optional</span><input name="grade" maxlength="8" placeholder="e.g. A" /></label><label>Grade point <span class="field-note">0–4, optional</span><input name="grade_point" type="number" min="0" max="4" step="0.01" placeholder="e.g. 4.0" /></label></div><button class="primary-button form-submit" type="submit">Save result ${icon('check')}</button></form><div class="page-card admin-note"><div class="resource-icon">${icon('file')}</div><strong>Print a result slip</strong><p>After entering a student’s results, use the Print slip action. The browser print dialog lets you choose “Save as PDF”.</p><p>The slip includes the logo and the official KeMU contact header supplied for this portal.</p></div></div><div class="page-card"><div class="filter-row"><div><h2>Result entries</h2><p class="card-header" style="padding:6px 0 0;color:var(--muted);font-size:11px">Pending values remain visibly marked until entered and published.</p></div></div><div class="table-wrap"><table><thead><tr><th>Student</th><th>Course</th><th>Semester</th><th>Result</th><th>Action</th></tr></thead><tbody>${state.data.results.length ? state.data.results.map(r => `<tr><td><strong>${escapeHtml(r.student_name)}</strong><small>${escapeHtml(r.student_number)}</small></td><td><strong>${escapeHtml(r.code)}</strong><small>${escapeHtml(r.title)}</small></td><td>${escapeHtml(r.semester)}</td><td><span class="status-pill ${r.status === 'pending' ? 'pending-pill' : ''}">${r.status === 'pending' ? 'Pending' : `${r.marks ?? '—'} · ${escapeHtml(r.grade || '—')}`}</span></td><td><button class="table-action" data-slip-result="${r.student_id}">Print slip</button></td></tr>`).join('') : `<tr><td colspan="5"><div class="empty-state"><h2>No results entered</h2><p>Add the first result above.</p></div></td></tr>`}</tbody></table></div></div>`;
}
function studentResultsView() { const results = state.data.results || []; return `${pageHeading('Results', 'Review your published results and download a printable result slip.', `${results.filter(r => r.status === 'published').length} published`)}<div class="page-card"><div class="filter-row"><div><h2>Academic results</h2><p class="card-header" style="padding:6px 0 0;color:var(--muted);font-size:11px">Pending entries are not official results.</p></div><button class="primary-small" data-student-slip>Download result slip ${icon('file')}</button></div><div class="table-wrap"><table><thead><tr><th>Course</th><th>Semester</th><th>Credits</th><th>Marks</th><th>Grade</th></tr></thead><tbody>${results.length ? results.map(r => `<tr><td><strong>${escapeHtml(r.code)}</strong><small>${escapeHtml(r.title)}</small></td><td>${escapeHtml(r.semester)}</td><td>${number(r.credits)}</td><td>${r.marks === null ? 'Pending' : r.marks}</td><td>${escapeHtml(r.grade || 'Pending')}</td></tr>`).join('') : `<tr><td colspan="5"><div class="empty-state"><h2>No results available</h2><p>Academic Registry has not published results for your account.</p></div></td></tr>`}</tbody></table></div></div>`; }

function genericPage(section) {
  const content = {
    timetable: ['Timetable', 'A clear view of the week ahead.', 'Your timetable will reflect the courses on your active registration record.'],
    results: ['Results', 'Track your progress across completed semesters.', 'Results are available once the Academic Registry publishes them for your account.'],
    fees: ['Fees', 'A simple summary of your current student account.', 'This demo displays an illustrative balance only. Use approved university finance channels for official statements and payments.'],
    library: ['Library', 'Find the resources that keep your learning moving.', 'Browse e-journals, past papers, and reading lists through the main KeMU library service.'],
    support: ['Support', 'The right place to ask, find, or get unstuck.', 'Contact your school office, Academic Registry, Student Affairs, or the Student Help Desk for help with your record.']
  }[section];
  return `${pageHeading(content[0], content[1])}<div class="page-card empty-state"><div class="empty-icon">${icon(section === 'fees' ? 'wallet' : section === 'library' ? 'library' : section === 'support' ? 'headset' : section === 'results' ? 'chart' : 'calendar')}</div><h2>${content[0]} workspace ready</h2><p>${content[2]}</p><button class="primary-button" data-action="notifications">Show latest portal guidance ${icon('arrow')}</button></div>`;
}

function renderView() {
  if (state.auth?.role === 'admin') return ({ admin: adminOverview, students: studentsView, courses: coursesView, registrations: registrationsView, results: resultEntryView }[state.activeSection] || adminOverview)();
  return ({ overview: studentOverview, registration: registrationView, timetable: () => genericPage('timetable'), results: studentResultsView, fees: () => genericPage('fees'), library: () => genericPage('library'), support: () => genericPage('support') }[state.activeSection] || studentOverview)();
}

function render() {
  const app = document.querySelector('#app');
  if (state.loading) { document.body.classList.remove('menu-open'); app.innerHTML = `<div class="loading-page"><img src="${logoPath}" alt="KeMU" /><div class="loading-spinner"></div><p>Connecting to your portal…</p>`; return; }
  if (!state.auth) { document.body.classList.remove('menu-open'); app.innerHTML = loginView(); return; }
  app.innerHTML = `<div class="portal-shell">${sidebar()}<div class="mobile-overlay ${state.mobileMenu ? 'visible' : ''}" data-action="toggle-menu"></div><main class="portal-main"><div class="page-content">${topbar()}${renderView()}</div></main></div>`;
  document.body.classList.toggle('menu-open', state.mobileMenu);
  bindInteractions();
}

async function refreshData() {
  const data = await apiRequest('/api/bootstrap');
  state.data = { ...state.data, ...data };
  render();
}

async function submitForm(form, path) {
  const payload = Object.fromEntries(new FormData(form).entries());
  const submit = form.querySelector('button[type="submit"]');
  if (submit) { submit.disabled = true; submit.classList.add('is-loading'); }
  try {
    const result = await apiRequest(path, { method: 'POST', body: JSON.stringify(payload) });
    state.data = state.auth.role === 'admin' ? { ...state.data, ...result } : result;
    form.reset();
    render();
    showToast('Saved successfully.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
    if (submit) { submit.disabled = false; submit.classList.remove('is-loading'); }
  }
}

function bindInteractions() {
  document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => { state.activeSection = button.dataset.nav; state.mobileMenu = false; render(); }));
  document.querySelector('[data-action="toggle-menu"]')?.addEventListener('click', () => { state.mobileMenu = !state.mobileMenu; render(); });
  document.querySelector('[data-action="notifications"]')?.addEventListener('click', () => showToast('You’re all caught up with the latest portal guidance.'));
  document.querySelector('[data-action="statement"]')?.addEventListener('click', () => showToast('Sample statement prepared — no official finance record was generated.'));
  document.querySelector('[data-action="refresh"]')?.addEventListener('click', async () => { try { await refreshData(); showToast('Course list refreshed.'); } catch (error) { showToast(error.message, 'error'); } });
  document.querySelector('[data-action="logout"]')?.addEventListener('click', async () => { const button = document.querySelector('[data-action="logout"]'); if (button) button.disabled = true; await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {}); state.auth = null; state.data = null; state.loading = false; render(); showToast('You have been signed out.'); });
  document.querySelectorAll('[data-course-toggle]').forEach(button => button.addEventListener('click', () => { const index = Number(button.dataset.courseToggle); state.expandedCourses.has(index) ? state.expandedCourses.delete(index) : state.expandedCourses.add(index); render(); }));
  document.querySelectorAll('[data-register]').forEach(button => button.addEventListener('click', async () => { button.disabled = true; try { state.data = await apiRequest('/api/registrations', { method: 'POST', body: JSON.stringify({ course_id: button.dataset.register }) }); render(); showToast('Course registered successfully.', 'success'); } catch (error) { button.disabled = false; showToast(error.message, 'error'); } }));
  document.querySelectorAll('[data-withdraw]').forEach(button => button.addEventListener('click', async () => { if (!confirm('Withdraw from this course? Your registration history will be preserved.')) return; try { state.data = await apiRequest(`/api/registrations/${button.dataset.withdraw}`, { method: 'DELETE' }); render(); showToast('Course withdrawn from your active registration.', 'success'); } catch (error) { showToast(error.message, 'error'); } }));
  document.querySelectorAll('[data-admin-withdraw]').forEach(button => button.addEventListener('click', async () => { if (!confirm('Withdraw this student registration?')) return; try { state.data = { ...state.data, ...(await apiRequest(`/api/admin/registrations/${button.dataset.adminWithdraw}`, { method: 'DELETE' })) }; render(); showToast('Registration withdrawn.', 'success'); } catch (error) { showToast(error.message, 'error'); } }));
  document.querySelector('#student-form')?.addEventListener('submit', event => { event.preventDefault(); submitForm(event.currentTarget, '/api/admin/students'); });
  document.querySelector('#course-form')?.addEventListener('submit', event => { event.preventDefault(); submitForm(event.currentTarget, '/api/admin/courses'); });
  document.querySelector('#assignment-form')?.addEventListener('submit', event => { event.preventDefault(); submitForm(event.currentTarget, '/api/admin/registrations'); });
  document.querySelector('#result-form')?.addEventListener('submit', event => { event.preventDefault(); submitForm(event.currentTarget, '/api/admin/results'); });
  document.querySelector('[data-student-slip]')?.addEventListener('click', () => openResultSlip(state.data.student, state.data.results || []));
  document.querySelectorAll('[data-slip-result]').forEach(button => button.addEventListener('click', () => { const results = (state.data.results || []).filter(result => result.student_id === button.dataset.slipResult); const student = (state.data.students || []).find(item => item.id === button.dataset.slipResult); if (student) openResultSlip(student, results); }));
}

render();
bootstrap();
