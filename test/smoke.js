const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

let failures = 0;
function check(label, cond) {
  if (cond) {
    console.log(`  OK  ${label}`);
  } else {
    console.log(`FAIL  ${label}`);
    failures++;
  }
}

function boot(startPath) {
  const dom = new JSDOM(html, {
    url: `http://localhost${startPath}`,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.eval(appJs);
  return window;
}

console.log('\n== 1. Fresh load, no session -> should land on login ==');
let w = boot('/');
check('loginView is active', w.document.getElementById('loginView').classList.contains('active'));
check('userView is NOT active', !w.document.getElementById('userView').classList.contains('active'));
check('nav is empty when logged out', w.document.getElementById('primaryNav').innerHTML.trim() === '');

console.log('\n== 2. Direct hit on a protected user route while logged out -> bounced to /login ==');
w = boot('/user/profile');
check('redirected to /login', w.location.pathname === '/login');
check('loginView active', w.document.getElementById('loginView').classList.contains('active'));

console.log('\n== 3. Log in as User -> redirected to /user with default search preloaded ==');
w = boot('/login');
w.document.getElementById('loginEmail').value = 'veda@example.com';
w.document.getElementById('loginBtn').click();
check('session stored with role user', JSON.parse(w.localStorage.getItem('medfind_session')).role === 'user');
check('redirected to /user', w.location.pathname === '/user');
check('userView active', w.document.getElementById('userView').classList.contains('active'));
check('default medicine preloaded', w.document.getElementById('resultsTitle').textContent.includes('Paracetamol 500 mg'));
const cardsAfterLogin = w.document.querySelectorAll('#results .resultCard').length;
check('4 pharmacy result cards rendered', cardsAfterLogin === 4);

console.log('\n== 4. Sorting: Lowest price should reorder results (MediPoint has null price, sorts last) ==');
const priceBtn = [...w.document.querySelectorAll('.filter')].find(b => b.dataset.sort === 'price');
priceBtn.click();
const namesByPrice = [...w.document.querySelectorAll('#results .pharmacyName')].map(a => a.textContent);
check('price sort active applied', priceBtn.classList.contains('active'));
check('cheapest (HealthPlus, 30) sorts first', namesByPrice[0] === 'HealthPlus Medicals');
check('null-price pharmacy (MediPoint) sorts last', namesByPrice[namesByPrice.length - 1] === 'MediPoint');

console.log('\n== 5. Pharmacy name link navigates to detail page ==');
const firstLink = w.document.querySelector('#results .pharmacyName');
const targetHref = firstLink.getAttribute('href');
firstLink.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
check('navigated to pharmacy detail route', w.location.pathname === targetHref);
check('detail view active', w.document.getElementById('pharmacyDetailView').classList.contains('active'));
check('detail page shows a name in the heading', w.document.getElementById('detailHead').textContent.trim().length > 0);

console.log('\n== 6. Reserve flow end-to-end from the detail page ==');
const reserveBtn = w.document.querySelector('#detailBody .primaryBtn');
reserveBtn.click();
check('modal opens', !w.document.getElementById('modal').classList.contains('hidden'));
w.document.getElementById('qty').value = 2;
w.document.getElementById('confirm').click();
const resId = w.document.getElementById('confirmIdBig').textContent;
check('reservation id looks like MFxxxx', /^MF\d{4}$/.test(resId));
check('confirm panel visible', !w.document.getElementById('modalConfirm').classList.contains('hidden'));
w.document.getElementById('viewReservation').click();
check('navigated to /user/reservations after confirm', w.location.pathname === '/user/reservations');
check('reservation id shown on reservations screen', w.document.getElementById('reserveIdBig').textContent === resId);

console.log('\n== 7. Reservation stage simulation ==');
w.document.getElementById('simulateBtn').click();
check('stage advanced to Ready', w.document.getElementById('reserveStatus').textContent === 'Ready');

console.log('\n== 8. Profile page reflects logged-in user, editable and persists ==');
const navProfile = [...w.document.querySelectorAll('.navBtn')].find(a => a.getAttribute('href') === '/user/profile');
navProfile.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
check('on profile route', w.location.pathname === '/user/profile');
check('profile email prefilled from session', w.document.getElementById('pEmail').value === 'veda@example.com');
w.document.getElementById('pName').value = 'Veda P';
w.document.getElementById('saveProfile').click();
check('profile persisted to localStorage', JSON.parse(w.localStorage.getItem('medfind_profile')).name === 'Veda P');

console.log('\n== 9. Settings reachable from profile, back link returns ==');
w.document.querySelector('a[href="/user/settings"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
check('on settings route', w.location.pathname === '/user/settings');
check('settings view active', w.document.getElementById('settingsView').classList.contains('active'));
w.document.getElementById('settingsLogoutBtn').click();
check('logout clears session', w.localStorage.getItem('medfind_session') === null);
check('logout returns to /login', w.location.pathname === '/login');

console.log('\n== 10. Cross-role access is blocked (user cannot land on /pharmacy, vice versa) ==');
w = boot('/login');
[...w.document.querySelectorAll('.roleTab')].find(b => b.dataset.role === 'pharmacy').click();
w.document.getElementById('loginBtn').click();
check('pharmacy session created', JSON.parse(w.localStorage.getItem('medfind_session')).role === 'pharmacy');
check('redirected to /pharmacy', w.location.pathname === '/pharmacy');
check('pharmacy portal shows session name in header', w.document.getElementById('pharmacyNameHeader').textContent === 'CityCare Pharmacy');
w.history.pushState({}, '', '/user');
w.dispatchEvent(new w.Event('popstate'));
check('pharmacy session bounced away from /user back to /pharmacy', w.location.pathname === '/pharmacy');

console.log('\n== 11. Pharmacy dashboard interactions still work (existing functionality preserved) ==');
const beforePending = w.document.getElementById('pending').textContent;
const confirmBtn = w.document.querySelector('#requests .primaryBtn');
confirmBtn.click();
check('pending count decreased after confirming a request', w.document.getElementById('pending').textContent !== beforePending);
const stockBtn = w.document.querySelector('#inventory .secondaryBtn');
stockBtn.click();
check('inventory row updated (no crash)', w.document.getElementById('inventory').textContent.includes('just now'));

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
process.exit(failures === 0 ? 0 : 1);
