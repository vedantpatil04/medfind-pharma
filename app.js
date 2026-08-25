const pharmacies=[
{name:'CityCare Pharmacy',distance:'0.8 km',open:'Open until 10:30 PM',stock:8,fresh:'5 min ago',price:'₹32',state:'good'},
{name:'HealthPlus Medicals',distance:'1.4 km',open:'Open until 9:45 PM',stock:3,fresh:'18 min ago',price:'₹30',state:'good'},
{name:'GreenCross Pharmacy',distance:'1.8 km',open:'Open until 10:00 PM',stock:1,fresh:'1 hr ago',price:'₹31',state:'warn'},
{name:'MediPoint',distance:'2.2 km',open:'Closed',stock:0,fresh:'2 hrs ago',price:'—',state:'out'}
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
let medicine='Paracetamol 500 mg',selected=null,activeReservation=null;

const $=id=>document.getElementById(id);
function statusFor(p){return p.state==='good'?['good',`${p.stock} available`]:p.state==='warn'?['warn',`${p.stock} left`]:['out','Out of stock'];}
function render(q=medicine){
  medicine=q;
  $('resultsTitle').textContent=`Pharmacies with ${medicine}`;
  $('context').textContent=`${pharmacies.length} nearby pharmacies · Availability reported by participating stores`;
  $('results').innerHTML=pharmacies.map((p,i)=>{
    const [cls,label]=statusFor(p);
    const disabled=!p.stock||p.open==='Closed';
    return `<article class="resultCard">
      <div class="resultTop">
        <div><div class="medicineName">${medicine}</div><div class="pharmacyName">${p.name}</div><div class="sub">${p.distance} · ${p.open}</div></div>
        <span class="pill ${cls}">${label}</span>
      </div>
      <div class="details">
        <div><span>Stock</span><b>${p.stock?p.stock+' units':'Unavailable'}</b></div>
        <div><span>Last confirmed</span><b>${p.fresh}</b></div>
        <div><span>Price</span><b>${p.price}</b></div>
      </div>
      <div class="cardActions">
        <button class="secondaryBtn" onclick="showToast('Directions preview opened')">Directions</button>
        <button class="primaryBtn" ${disabled?'disabled style="opacity:.45;cursor:not-allowed"':`onclick="openReserve(${i})"`}>Reserve</button>
      </div>
    </article>`;
  }).join('');
}
function openReserve(i){
  selected=pharmacies[i];
  $('mTitle').textContent=medicine;
  $('mPharmacy').textContent=`${selected.name} · ${selected.distance} · ${selected.stock} available`;
  $('qty').value=1;
  $('modal').classList.remove('hidden');
}
function showToast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__to);window.__to=setTimeout(()=>t.classList.remove('show'),2200)}
window.openReserve=openReserve;window.showToast=showToast;

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
$('plus').onclick=()=>{$('qty').value=Math.min(5,+$('qty').value+1)};
$('confirm').onclick=()=>{
  const qty=+$('qty').value;
  const id='MF'+Math.floor(1000+Math.random()*9000);
  activeReservation={id,medicine,qty,pharmacy:selected.name};
  $('reserveId').textContent=id;
  $('reserveStatus').textContent='Confirmed • Ready for pickup';
  $('reservationDetail').className='reservationDetail';
  $('reservationDetail').innerHTML=`<div class="detailRow"><b>${medicine}</b><span>Quantity ${qty}</span></div><div class="detailRow"><b>${selected.name}</b><span>${selected.distance} · Hold for 30 minutes</span></div><div class="detailRow"><b>Show at pickup</b><span>Reservation ${id}</span></div>`;
  $('modal').classList.add('hidden');
  showToast(`Reservation ${id} confirmed`);
  document.querySelector('[data-screen="savedView"]').click();
};
$('multiBtn').onclick=()=>showToast('Combined search preview: one pharmacy with multiple medicines');
function renderInventory(){
  $('inventory').innerHTML=inventory.map((x,i)=>`<div class="inventoryRow"><div><b>${x[0]}</b><div class="sub">Updated ${x[3]}</div></div><div><b>${x[1]}</b><div class="sub">${x[2]}</div></div><div><span class="tag ${x[4]==='warn'?'warn':''}">${x[4]==='warn'?'Low stock':'Available'}</span></div><button class="secondaryBtn" onclick="updateStock(${i})">Update</button></div>`).join('');
}
window.updateStock=i=>{inventory[i][1]++;inventory[i][3]='just now';inventory[i][4]=inventory[i][1]<=2?'warn':'good';renderInventory();updateMetrics();showToast(`${inventory[i][0]} stock updated`)};
function renderRequests(){
  $('requests').innerHTML=requests.map((r,i)=>`<div class="requestRow"><div><b>${r[0]}</b><div class="sub">${r[1]}</div></div><div><span class="tag ${r[2]==='Pending'?'warn':''}">${r[2]}</span></div><button class="${r[2]==='Pending'?'primaryBtn':'secondaryBtn'}" onclick="confirmReq(${i})">${r[2]==='Pending'?'Confirm':'Open'}</button></div>`).join('');
}
window.confirmReq=i=>{requests[i][2]='Confirmed';renderRequests();updateMetrics();showToast(requests[i][0]+' confirmed')};
function updateMetrics(){$('listed').textContent=inventory.length;$('low').textContent=inventory.filter(x=>x[1]<=2).length;$('pending').textContent=requests.filter(x=>x[2]==='Pending').length};
$('refresh').onclick=()=>{renderInventory();showToast('Inventory refreshed')};
render();renderInventory();renderRequests();updateMetrics();