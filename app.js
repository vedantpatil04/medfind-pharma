/* ---------- Data ---------- */
const pharmacies=[
{name:'CityCare Pharmacy',distance:'0.8 km',open:true,openText:'Open until 10:30 PM',stock:8,freshMins:5,price:'₹32',state:'good'},
{name:'HealthPlus Medicals',distance:'1.4 km',open:true,openText:'Open until 9:45 PM',stock:3,freshMins:18,price:'₹30',state:'good'},
{name:'GreenCross Pharmacy',distance:'1.8 km',open:true,openText:'Open until 10:00 PM',stock:1,freshMins:60,price:'₹31',state:'warn'},
{name:'MediPoint',distance:'2.2 km',open:false,openText:'Closed',stock:0,freshMins:120,price:'—',state:'out'}
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

let medicine='Paracetamol 500 mg',selected=null,activeReservation=null;
let selectedMeds=new Set(['Paracetamol 500 mg','Cetirizine 10 mg']);

const $=id=>document.getElementById(id);

/* ---------- Helpers ---------- */
function statusFor(p){
  if(!p.open)return['out','Closed'];
  return p.state==='good'?['good',`${p.stock} available`]:p.state==='warn'?['warn',`${p.stock} left`]:['out','Out of stock'];
}
function freshLabel(mins){
  if(mins<60)return `${mins} min ago`;
  const hrs=Math.round(mins/60);
  return `${hrs} hr${hrs>1?'s':''} ago`;
}
function freshClass(mins,open){
  if(!open)return'fresh-bad';
  if(mins<=15)return'fresh-good';
  if(mins<=60)return'fresh-warn';
  return'fresh-bad';
}
function showToast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__to);window.__to=setTimeout(()=>t.classList.remove('show'),2200)}

/* ---------- Search results ---------- */
function render(q=medicine){
  medicine=q;
  $('resultsTitle').textContent=`Pharmacies with ${medicine}`;
  $('context').textContent=`${pharmacies.length} nearby pharmacies · Availability reported by participating stores`;
  $('results').innerHTML=pharmacies.map((p,i)=>{
    const [cls,label]=statusFor(p);
    const fresh=freshLabel(p.freshMins);
    const fc=freshClass(p.freshMins,p.open);
    const disabled=!p.stock||!p.open;
    return `<article class="resultCard">
      <div class="resultTop">
        <div><div class="medicineName">${medicine}</div><div class="pharmacyName">${p.name}</div><div class="sub">${p.distance} · <span class="${p.open?'':'closedText'}">${p.openText}</span></div></div>
        <span class="pill ${cls}">${label}</span>
      </div>
      <div class="details">
        <div><span>Stock</span><b>${p.stock?p.stock+' units':'Unavailable'}</b></div>
        <div title="Pharmacy last confirmed this quantity ${fresh}."><span>Last confirmed</span><b><i class="freshDot ${fc}"></i>${fresh}</b></div>
        <div><span>Price</span><b>${p.price}</b></div>
      </div>
      <div class="cardActions">
        <button class="secondaryBtn" onclick="showToast('Directions preview opened')">Directions</button>
        <button class="primaryBtn" ${disabled?'disabled style="opacity:.45;cursor:not-allowed"':`onclick="openReserve(${i})"`}>Reserve</button>
      </div>
    </article>`;
  }).join('');
}

/* ---------- Reservation modal ---------- */
function openReserve(i){
  selected=pharmacies[i];
  $('mTitle').textContent=medicine;
  $('mPharmacyName').textContent=selected.name;
  $('mDistance').textContent=selected.distance;
  $('mAvailable').textContent=`${selected.stock} units`;
  $('qty').max=Math.max(1,Math.min(5,selected.stock));
  $('qty').value=1;
  $('modalForm').classList.remove('hidden');
  $('modalConfirm').classList.add('hidden');
  $('modal').classList.remove('hidden');
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
  if(activeReservation.stage>=STAGES.length-1){btn.textContent='Reservation collected';btn.disabled=true;}
  else{btn.disabled=false;btn.textContent=`Simulate: mark as ${STAGES[activeReservation.stage+1]} →`;}
}

/* ---------- Multi-medicine ---------- */
function renderMultiChips(){
  document.querySelectorAll('.medChip').forEach(b=>{
    b.classList.toggle('active',selectedMeds.has(b.dataset.med));
  });
}
function findMultiMatch(){
  if(selectedMeds.size<2){showToast('Select at least 2 medicines');return;}
  const meds=[...selectedMeds];
  let best=null,bestScore=-1;
  Object.entries(stockMap).forEach(([name,data])=>{
    const score=meds.filter(m=>data.meds[m]).length;
    if(score>bestScore){bestScore=score;best={name,data};}
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

/* ---------- Pharmacy dashboard ---------- */
function renderInventory(){
  $('inventory').innerHTML=inventory.map((x,i)=>`<div class="inventoryRow"><div><b>${x[0]}</b><div class="sub">Last confirmed ${x[3]}</div></div><div><b>${x[1]}</b><div class="sub">${x[2]}</div></div><div><span class="tag ${x[4]==='warn'?'warn':''}">${x[4]==='warn'?'Low stock':'Available'}</span></div><button class="secondaryBtn" onclick="updateStock(${i})">Update stock</button></div>`).join('');
}
function updateStock(i){inventory[i][1]++;inventory[i][3]='just now';inventory[i][4]=inventory[i][1]<=2?'warn':'good';renderInventory();updateMetrics();showToast(`${inventory[i][0]} stock updated · Last confirmed: just now`)}
function renderRequests(){
  $('requests').innerHTML=requests.map((r,i)=>`<div class="requestRow"><div><b>${r[0]}</b><div class="sub">${r[1]}</div></div><div><span class="tag ${r[2]==='Pending'?'warn':''}">${r[2]}</span></div><button class="${r[2]==='Pending'?'primaryBtn':'secondaryBtn'}" onclick="confirmReq(${i})">${r[2]==='Pending'?'Confirm':'Open'}</button></div>`).join('');
}
function confirmReq(i){requests[i][2]='Confirmed';renderRequests();updateMetrics();showToast(requests[i][0]+' confirmed')}
function updateMetrics(){$('listed').textContent=inventory.length;$('low').textContent=inventory.filter(x=>x[1]<=2).length;$('pending').textContent=requests.filter(x=>x[2]==='Pending').length}

window.openReserve=openReserve;window.showToast=showToast;window.updateStock=updateStock;window.confirmReq=confirmReq;

/* ---------- Event wiring ---------- */
$('findBtn').onclick=()=>render($('search').value.trim()||'Paracetamol 500 mg');
$('search').addEventListener('keydown',e=>{if(e.key==='Enter')$('findBtn').click()});
document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{$('search').value=b.dataset.q;render(b.dataset.q)});
document.querySelectorAll('.navBtn').forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll('.navBtn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(btn.dataset.screen).classList.add('active');
});
$('locationBtn').onclick=()=>showToast('Location selector preview');
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
  document.querySelector('[data-screen="savedView"]').click();
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

/* ---------- Init ---------- */
render();renderInventory();renderRequests();updateMetrics();renderReservation();renderMultiChips();