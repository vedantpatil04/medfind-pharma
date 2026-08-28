/* ================= Data (simulated / demo only) ================= */
const pharmacies=[
{id:'citycare',name:'CityCare Pharmacy',address:'12 MG Road, Shivajinagar',distance:'0.8 km',distanceKm:0.8,hours:'8:00 AM – 10:30 PM',phone:'+91 80 4567 1122',verified:true,open:true,openText:'Open until 10:30 PM',stock:8,freshMins:5,price:32,state:'good'},
{id:'healthplus',name:'HealthPlus Medicals',address:'44 Residency Road',distance:'1.4 km',distanceKm:1.4,hours:'9:00 AM – 9:45 PM',phone:'+91 80 4567 3344',verified:true,open:true,openText:'Open until 9:45 PM',stock:3,freshMins:18,price:30,state:'good'},
{id:'greencross',name:'GreenCross Pharmacy',address:'7 Church Street',distance:'1.8 km',distanceKm:1.8,hours:'9:30 AM – 10:00 PM',phone:'+91 80 4567 5566',verified:true,open:true,openText:'Open until 10:00 PM',stock:1,freshMins:60,price:31,state:'warn'},
{id:'medipoint',name:'MediPoint',address:'19 Brigade Road',distance:'2.2 km',distanceKm:2.2,hours:'8:30 AM – 9:00 PM',phone:'+91 80 4567 7788',verified:false,open:false,openText:'Closed',stock:0,freshMins:120,price:null,state:'out'}
];
const inventory=[
['Paracetamol 500 mg',8,'units','5 min ago','good'],
['Azithromycin 500 mg',3,'strips','18 min ago','good'],
['Cetirizine 10 mg',1,'strips','1 hr ago','warn'],
['Pantoprazole 40 mg',12,'strips','9 min ago','good'],
['ORS Sachets',5,'packs','12 min ago','good'],
['Amoxicillin 500 mg',2,'strips','45 min ago','warn']
];
const requests=[['MF1024','Paracetamol 500 mg × 2','Pending'],['MF1020','Azithromycin 500 mg × 1','Confirmed'],['MF1017','ORS Sachets × 1','Ready']];
const stockMap={
  'CityCare Pharmacy':{distance:'0.8 km',meds:{'Paracetamol 500 mg':true,'Azithromycin 500 mg':true,'Cetirizine 10 mg':true}},
  'HealthPlus Medicals':{distance:'1.4 km',meds:{'Paracetamol 500 mg':true,'Azithromycin 500 mg':true,'Cetirizine 10 mg':false}},
  'GreenCross Pharmacy':{distance:'1.8 km',meds:{'Paracetamol 500 mg':true,'Azithromycin 500 mg':false,'Cetirizine 10 mg':true}},
  'MediPoint':{distance:'2.2 km',meds:{'Paracetamol 500 mg':false,'Azithromycin 500 mg':false,'Cetirizine 10 mg':false}}
};
const STAGES=['Requested','Confirmed','Ready','Collected'];

let medicine='Paracetamol 500 mg',selected=null,activeReservation=null,sortMode='closest',loginRole='user';
let selectedMeds=new Set(['Paracetamol 500 mg','Cetirizine 10 mg']);

const $=id=>document.getElementById(id);

/* ================= Helpers ================= */
function cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):s}
function freshLabel(mins){
  if(mins<60)return `${mins} min ago`;
  const hrs=Math.round(mins/60);
  return `${hrs} hr${hrs>1?'s':''} ago`;
}
function freshnessInfo(mins,open,stock){
  if(!open||!stock)return{tier:'bad',label:'Unavailable'};
  if(mins<=15)return{tier:'good',label:'Fresh'};
  if(mins<=30)return{tier:'good',label:'Recent'};
  if(mins<=90)return{tier:'warn',label:'Needs confirmation'};
  return{tier:'bad',label:'Unavailable'};
}
/* .pill (good/warn/out) and .freshDot (fresh-good/fresh-warn/fresh-bad) use two different
   existing class vocabularies for the same 3 states, so map explicitly for .pill. */
function pillTier(tier){return tier==='bad'?'out':tier}
function showToast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__to);window.__to=setTimeout(()=>t.classList.remove('show'),2200)}

/* ================= Auth (simulated — prototype only, no real backend) ================= */
const SESSION_KEY='medfind_session';
function getSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY))}catch{return null}}
function setSession(s){localStorage.setItem(SESSION_KEY,JSON.stringify(s))}
function clearSession(){localStorage.removeItem(SESSION_KEY)}
function homeFor(role){return role==='pharmacy'?'/pharmacy':'/user'}
function doLogin(role,email){
  const cleanEmail=email||(role==='pharmacy'?'owner@citycare.example':'demo@medfind.example');
  const name=role==='pharmacy'?'CityCare Pharmacy':cap((cleanEmail.split('@')[0]||'demo').replace(/[._]/g,' '));
  setSession({role,email:cleanEmail,name,since:Date.now()});
  navigate(homeFor(role),true);
  showToast(role==='pharmacy'?'Logged in to pharmacy portal':`Welcome, ${name}`);
}
function doLogout(){
  clearSession();
  navigate('/login',true);
  showToast('Logged out');
}

/* ================= Router ================= */
const routes=[
  {path:'/login',view:renderLoginView},
  {path:'/user',view:renderUserDashboardView,role:'user'},
  {path:'/user/search',view:renderUserDashboardView,role:'user'},
  {path:'/user/pharmacies/:id',view:renderPharmacyDetailView,role:'user'},
  {path:'/user/reservations',view:renderReservationsView,role:'user'},
  {path:'/user/profile',view:renderProfileView,role:'user'},
  {path:'/user/settings',view:renderSettingsView,role:'user'},
  {path:'/pharmacy',view:renderPharmacyPortalView,role:'pharmacy'}
];
function matchRoute(path){
  const segs=path.split('/').filter(Boolean);
  for(const r of routes){
    const parts=r.path.split('/').filter(Boolean);
    if(parts.length!==segs.length)continue;
    const params={};let ok=true;
    for(let i=0;i<parts.length;i++){
      if(parts[i][0]===':')params[parts[i].slice(1)]=decodeURIComponent(segs[i]);
      else if(parts[i]!==segs[i]){ok=false;break}
    }
    if(ok)return{route:r,params};
  }
  return null;
}
function navigate(path,replace){
  if(replace)history.replaceState({},'',path);else history.pushState({},'',path);
  renderRoute();
}
function renderRoute(){
  const session=getSession();
  let path=location.pathname;
  if(path===''||path==='/')path=session?homeFor(session.role):'/login';
  const match=matchRoute(path);
  if(!match){navigate(session?homeFor(session.role):'/login',true);return}
  const{route,params}=match;
  if(route.role){
    if(!session){navigate('/login',true);return}
    if(session.role!==route.role){navigate(homeFor(session.role),true);return}
  }else if(session){
    navigate(homeFor(session.role),true);return;
  }
  renderNav(session);
  route.view(params);
}
window.addEventListener('popstate',renderRoute);
document.addEventListener('click',e=>{
  const a=e.target.closest('a[data-link]');
  if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  e.preventDefault();
  navigate(a.getAttribute('href'));
});
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(id).classList.add('active');
  if(window.scrollTo)window.scrollTo(0,0);
}

/* ================= Nav (role-aware) ================= */
function renderNav(session){
  const navEl=$('primaryNav'),topRight=$('topRight');
  if(!session){
    navEl.innerHTML='';
    topRight.innerHTML='<span class="demo">Prototype</span>';
    return;
  }
  navEl.innerHTML=session.role==='user'
    ?'<a href="/user" data-link class="navBtn">Find medicine</a><a href="/user/reservations" data-link class="navBtn">Reservations</a><a href="/user/profile" data-link class="navBtn">Profile</a>'
    :'<a href="/pharmacy" data-link class="navBtn">Dashboard</a>';
  markActiveNav();
  topRight.innerHTML='<span class="demo">Prototype</span><button class="location" id="locationBtn">📍 Bengaluru</button><button class="secondaryBtn" id="logoutBtn">Log out</button>';
  $('locationBtn').onclick=()=>showToast('Location selector preview');
  $('logoutBtn').onclick=doLogout;
}
function markActiveNav(){
  document.querySelectorAll('.navBtn').forEach(b=>{
    const href=b.getAttribute('href');
    let active=location.pathname===href;
    if(href==='/user'&&(location.pathname==='/user/search'||location.pathname.startsWith('/user/pharmacies/')))active=true;
    if(href==='/user/profile'&&location.pathname==='/user/settings')active=true;
    b.classList.toggle('active',active);
  });
}

/* ================= View dispatchers (called by the router) ================= */
function renderLoginView(){
  showScreen('loginView');
}
function renderUserDashboardView(){
  showScreen('userView');
  render();
  renderMultiChips();
}
function renderPharmacyDetailView(params){
  showScreen('pharmacyDetailView');
  renderPharmacyDetail(params.id);
}
function renderReservationsView(){
  showScreen('savedView');
  renderReservation();
}
function renderProfileView(){
  showScreen('profileView');
  renderProfile();
}
function renderSettingsView(){
  showScreen('settingsView');
}
function renderPharmacyPortalView(){
  showScreen('pharmacyView');
  renderInventory();
  renderRequests();
  updateMetrics();
  const s=getSession();
  if(s&&s.name)$('pharmacyNameHeader').textContent=s.name;
}

/* ================= Search results ================= */
function sortedPharmacies(){
  const arr=[...pharmacies];
  if(sortMode==='freshest')arr.sort((a,b)=>a.freshMins-b.freshMins);
  else if(sortMode==='price')arr.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));
  else arr.sort((a,b)=>a.distanceKm-b.distanceKm);
  return arr;
}
function render(q=medicine){
  medicine=q;
  $('resultsTitle').textContent=`Pharmacies with ${medicine}`;
  $('context').textContent=`${pharmacies.length} nearby pharmacies · Availability reported by participating stores`;
  $('results').innerHTML=sortedPharmacies().map(p=>{
    const f=freshnessInfo(p.freshMins,p.open,p.stock);
    const fresh=freshLabel(p.freshMins);
    const disabled=!p.stock||!p.open;
    return `<article class="resultCard">
      <div class="resultTop">
        <div><div class="medicineName">${medicine}</div><a href="/user/pharmacies/${p.id}" data-link class="pharmacyName">${p.name}</a><div class="sub">${p.distance} · <span class="${p.open?'':'closedText'}">${p.openText}</span></div></div>
        <span class="pill ${pillTier(f.tier)}">${f.label}</span>
      </div>
      <div class="details">
        <div><span>Stock</span><b>${p.stock?p.stock+' units':'Unavailable'}</b></div>
        <div title="Pharmacy last confirmed this quantity ${fresh}."><span>Last confirmed</span><b><i class="freshDot fresh-${f.tier}"></i>${fresh}</b></div>
        <div><span>Price</span><b>${p.price?'₹'+p.price:'—'}</b></div>
      </div>
      <div class="cardActions">
        <button class="secondaryBtn" onclick="showToast('Directions preview opened')">Directions</button>
        <button class="primaryBtn" ${disabled?'disabled style="opacity:.45;cursor:not-allowed"':`onclick="openReserveById('${p.id}')"`}>Reserve</button>
      </div>
    </article>`;
  }).join('');
}

/* ================= Reservation modal ================= */
function openReserve(p){
  selected=p;
  $('mTitle').textContent=medicine;
  $('mPharmacyName').textContent=p.name;
  $('mDistance').textContent=p.distance;
  $('mAvailable').textContent=`${p.stock} units`;
  $('qty').max=Math.max(1,Math.min(5,p.stock));
  $('qty').value=1;
  $('modalForm').classList.remove('hidden');
  $('modalConfirm').classList.add('hidden');
  $('modal').classList.remove('hidden');
}
function openReserveById(id){
  const p=pharmacies.find(x=>x.id===id);
  if(p)openReserve(p);
}
function renderReservation(){
  if(!activeReservation){
    $('reservationEmpty').classList.remove('hidden');
    $('reservationCard').classList.add('hidden');
    $('reserveIdBig').textContent='No active reservation';
    $('reserveStatus').textContent='—';
    return;
  }
  $('reservationEmpty').classList.add('hidden');
  $('reservationCard').classList.remove('hidden');
  $('reserveIdBig').textContent=activeReservation.id;
  $('reserveStatus').textContent=STAGES[activeReservation.stage];
  $('rMedicine').textContent=activeReservation.medicine;
  $('rQty').textContent=`Quantity ${activeReservation.qty}`;
  $('rPharmacy').textContent=activeReservation.pharmacy;
  $('rDistance').textContent=activeReservation.distance;
  $('rHeld').textContent=activeReservation.heldText;
  $('rIdRow').textContent=`Reservation ${activeReservation.id}`;
  $('statusStepper').innerHTML=STAGES.map((s,i)=>`<div class="stepItem ${i<activeReservation.stage?'done':''} ${i===activeReservation.stage?'current':''}"><span class="dot"></span><label>${s}</label></div>`).join('');
  const btn=$('simulateBtn');
  if(activeReservation.stage>=STAGES.length-1){btn.textContent='Reservation collected';btn.disabled=true}
  else{btn.disabled=false;btn.textContent=`Simulate: mark as ${STAGES[activeReservation.stage+1]} →`}
}

/* ================= Multi-medicine search ================= */
function renderMultiChips(){
  document.querySelectorAll('.medChip').forEach(b=>{b.classList.toggle('active',selectedMeds.has(b.dataset.med))});
}
function findMultiMatch(){
  if(selectedMeds.size<2){showToast('Select at least 2 medicines');return}
  const meds=[...selectedMeds];
  let best=null,bestScore=-1;
  Object.entries(stockMap).forEach(([name,data])=>{
    const score=meds.filter(m=>data.meds[m]).length;
    if(score>bestScore){bestScore=score;best={name,data}}
  });
  const all=bestScore===meds.length;
  $('multiResult').innerHTML=`
    <div class="matchHead"><span class="eyebrow">${all?'BEST SINGLE-STOP OPTION':'CLOSEST PARTIAL MATCH'}</span></div>
    <div class="matchCard">
      <div><b>${best.name}</b><span class="sub">${best.data.distance}</span></div>
      <ul class="matchList">${meds.map(m=>`<li class="${best.data.meds[m]?'yes':'no'}">${best.data.meds[m]?'✅':'—'} ${m}</li>`).join('')}</ul>
    </div>
    <p class="matchNote">Convenience suggestion only — confirm items with the pharmacy before you travel.</p>`;
}

/* ================= Pharmacy detail page ================= */
function renderPharmacyDetail(id){
  const p=pharmacies.find(x=>x.id===id)||pharmacies[0];
  const f=freshnessInfo(p.freshMins,p.open,p.stock);
  $('detailHead').innerHTML=`
    <div class="pageTitleRow">
      <div class="pageTitle">
        <span class="eyebrow">PHARMACY</span>
        <h1>${p.name}${p.verified?'<span class="verifiedBadge">✓ Verified</span>':''}</h1>
        <p>${p.address}</p>
      </div>
      <span class="openPill ${p.open?'':'closedPill'}">${p.open?'●':'○'} ${p.openText}</span>
    </div>`;
  $('detailBody').innerHTML=`
    <div class="lowerGrid">
      <div class="panel">
        <div class="panelHead"><div><span class="eyebrow">DETAILS</span><h2>Contact &amp; hours</h2></div></div>
        <div class="detailRow"><span>Distance</span><b>${p.distance}</b></div>
        <div class="detailRow"><span>Hours</span><b>${p.hours}</b></div>
        <div class="detailRow"><span>Phone</span><b>${p.phone}</b></div>
      </div>
      <div class="panel">
        <div class="panelHead"><div><span class="eyebrow">${medicine}</span><h2>Availability</h2></div><span class="pill ${pillTier(f.tier)}">${f.label}</span></div>
        <div class="details">
          <div><span>Stock</span><b>${p.stock?p.stock+' units':'Unavailable'}</b></div>
          <div><span>Last confirmed</span><b><i class="freshDot fresh-${f.tier}"></i>${freshLabel(p.freshMins)}</b></div>
          <div><span>Price</span><b>${p.price?'₹'+p.price:'—'}</b></div>
        </div>
        <div class="cardActions">
          <button class="secondaryBtn" onclick="showToast('Directions preview opened')">Directions</button>
          <button class="primaryBtn" ${(!p.stock||!p.open)?'disabled style="opacity:.45;cursor:not-allowed"':`onclick="openReserveById('${p.id}')"`}>Reserve</button>
        </div>
      </div>
    </div>`;
}

/* ================= Profile ================= */
const PROFILE_KEY='medfind_profile';
function getProfile(){
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem(PROFILE_KEY))}catch{saved=null}
  if(saved)return saved;
  const s=getSession();
  return{name:(s&&s.name)||'Demo user',email:(s&&s.email)||'demo@medfind.example',mobile:'+91 98765 43210',location:'Indiranagar, Bengaluru'};
}
function renderProfile(){
  const p=getProfile();
  $('pName').value=p.name;$('pEmail').value=p.email;$('pMobile').value=p.mobile;$('pLocation').value=p.location;
  $('profileNameDisplay').textContent=p.name;$('profileEmailDisplay').textContent=p.email;
  $('avatarInitials').textContent=(p.name||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
}

/* ================= Pharmacy dashboard ================= */
function renderInventory(){
  $('inventory').innerHTML=inventory.map((x,i)=>`<div class="inventoryRow"><div><b>${x[0]}</b><div class="sub">Last confirmed ${x[3]}</div></div><div><b>${x[1]}</b><div class="sub">${x[2]}</div></div><div><span class="tag ${x[4]==='warn'?'warn':''}">${x[4]==='warn'?'Low stock':'Available'}</span></div><button class="secondaryBtn" onclick="updateStock(${i})">Update stock</button></div>`).join('');
}
function updateStock(i){inventory[i][1]++;inventory[i][3]='just now';inventory[i][4]=inventory[i][1]<=2?'warn':'good';renderInventory();updateMetrics();showToast(`${inventory[i][0]} stock updated · Last confirmed: just now`)}
function renderRequests(){
  $('requests').innerHTML=requests.map((r,i)=>`<div class="requestRow"><div><b>${r[0]}</b><div class="sub">${r[1]}</div></div><div><span class="tag ${r[2]==='Pending'?'warn':''}">${r[2]}</span></div><button class="${r[2]==='Pending'?'primaryBtn':'secondaryBtn'}" onclick="confirmReq(${i})">${r[2]==='Pending'?'Confirm':'Open'}</button></div>`).join('');
}
function confirmReq(i){requests[i][2]='Confirmed';renderRequests();updateMetrics();showToast(requests[i][0]+' confirmed')}
function updateMetrics(){$('listed').textContent=inventory.length;$('low').textContent=inventory.filter(x=>x[1]<=2).length;$('pending').textContent=requests.filter(x=>x[2]==='Pending').length}

window.openReserveById=openReserveById;window.showToast=showToast;window.updateStock=updateStock;window.confirmReq=confirmReq;

/* ================= Event wiring (elements exist statically in the DOM from load) ================= */
$('findBtn').onclick=()=>render($('search').value.trim()||'Paracetamol 500 mg');
$('search').addEventListener('keydown',e=>{if(e.key==='Enter')$('findBtn').click()});
document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{$('search').value=b.dataset.q;render(b.dataset.q)});
document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  sortMode=b.dataset.sort;
  render();
});
$('close').onclick=()=>$('modal').classList.add('hidden');
$('minus').onclick=()=>{$('qty').value=Math.max(1,+$('qty').value-1)};
$('plus').onclick=()=>{const max=+$('qty').max||5;$('qty').value=Math.min(max,+$('qty').value+1)};
$('confirm').onclick=()=>{
  const qty=+$('qty').value;
  const id='MF'+Math.floor(1000+Math.random()*9000);
  const heldDate=new Date(Date.now()+30*60000);
  const heldText=`Held until ${heldDate.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`;
  activeReservation={id,medicine,qty,pharmacy:selected.name,distance:selected.distance,heldText,stage:1};
  $('confirmIdBig').textContent=id;
  $('confirmMed').textContent=`${medicine} × ${qty}`;
  $('confirmPharmacy').textContent=selected.name;
  $('confirmHeld').textContent=heldText;
  $('modalForm').classList.add('hidden');
  $('modalConfirm').classList.remove('hidden');
  renderReservation();
};
$('viewReservation').onclick=()=>{
  $('modal').classList.add('hidden');
  navigate('/user/reservations');
  showToast(`Reservation ${activeReservation.id} confirmed`);
};
$('multiBtn').onclick=findMultiMatch;
document.querySelectorAll('.medChip').forEach(b=>b.onclick=()=>{
  const m=b.dataset.med;
  selectedMeds.has(m)?selectedMeds.delete(m):selectedMeds.add(m);
  renderMultiChips();
  $('multiResult').innerHTML='';
});
$('simulateBtn').onclick=()=>{
  if(!activeReservation||activeReservation.stage>=STAGES.length-1)return;
  activeReservation.stage++;
  renderReservation();
  showToast(`Reservation ${activeReservation.id} marked ${STAGES[activeReservation.stage]}`);
};
$('refresh').onclick=()=>{renderInventory();showToast('Inventory refreshed')};

/* Login */
document.querySelectorAll('.roleTab').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.roleTab').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  loginRole=b.dataset.role;
});
$('loginBtn').onclick=()=>doLogin(loginRole,$('loginEmail').value.trim());
$('loginPassword').addEventListener('keydown',e=>{if(e.key==='Enter')$('loginBtn').click()});

/* Profile */
$('saveProfile').onclick=()=>{
  const p={name:$('pName').value.trim()||'Demo user',email:$('pEmail').value.trim(),mobile:$('pMobile').value.trim(),location:$('pLocation').value.trim()};
  localStorage.setItem(PROFILE_KEY,JSON.stringify(p));
  renderProfile();
  showToast('Profile updated');
};

/* Settings */
$('toggleNotif').onchange=()=>showToast($('toggleNotif').checked?'Notifications on':'Notifications off');
$('toggleReserveNotif').onchange=()=>showToast($('toggleReserveNotif').checked?'Reservation alerts on':'Reservation alerts off');
$('toggleLocation').onchange=()=>showToast($('toggleLocation').checked?'Location sharing on':'Location sharing off');
$('privacyBtn').onclick=()=>showToast('Privacy preview opened');
$('updatePassBtn').onclick=()=>{
  if(!$('curPass').value||!$('newPass').value){showToast('Enter both fields');return}
  $('curPass').value='';$('newPass').value='';
  showToast('Password updated');
};
$('settingsLogoutBtn').onclick=doLogout;

/* ================= Init ================= */
renderRoute();
