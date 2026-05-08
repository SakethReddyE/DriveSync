
// ------------------------------------------------------------------------------
//  DriveSync — Frontend API Integration Layer
//  All localStorage/sessionStorage auth logic has been replaced with real
//  backend API calls. The JWT token is stored in localStorage under 'ds_token'.
// ------------------------------------------------------------------------------

const API = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

// -- Token helpers -------------------------------------------------------------
const Auth = {
  getToken() { return localStorage.getItem('ds_token'); },
  setToken(t) { localStorage.setItem('ds_token', t); },
  clearToken() { localStorage.removeItem('ds_token'); localStorage.removeItem('ds_session'); },
  getSession() { try { return JSON.parse(localStorage.getItem('ds_session') || 'null'); } catch { return null; } },
  setSession(s) { localStorage.setItem('ds_session', JSON.stringify(s)); },
};

// -- Generic fetch wrapper -----------------------------------------------------
async function apiFetch(path, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// NOTE: Driver seeding is now handled by the backend seed script (backend/seed.js)

// ---------- STATE ----------
let afterAuth='book';
let selDriver=null;
let fareData=null;
let dStar=0,sStar=0;
let currentRideId=null; // tracks which ride is being rated

// ---------- NAV ----------
function updNav(){
  const s=Auth.getSession();
  const isDark=document.body.classList.contains('dark');
  const dmHtml=`<button class="dm-btn" onclick="toggleDark()" title="Toggle dark mode">${isDark?'☀️':'🌙'}</button>`;
  const n=document.getElementById('navR');
  if(!s){
    n.innerHTML=`${dmHtml}<button class="nbtn ghost" onclick="goAuth('book')">Book a Driver</button><button class="nbtn ghost" onclick="goAuth('become')">Become a Driver</button><button class="nbtn solid" onclick="goAuth('book')">Sign In</button>`;
  } else if(s.role==='admin'){
    n.innerHTML=`${dmHtml}<div class="nav-dropdown" id="adminDrop"><div class="user-chip" onclick="toggleNavDrop('adminDrop')"><div class="av" style="background:#0071e3">A</div>Admin <svg width="10" height="10" viewBox="0 0 10 10" style="opacity:.5"><path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg></div><div class="nav-dropdown-menu" id="adminDropMenu"><a onclick="closeNavDrop();goPage('admin')">📊 Dashboard</a><a onclick="closeNavDrop();goPage('admin');setTimeout(()=>aTab('requests',document.querySelector('.atab')),100)">? Driver Requests</a><a onclick="closeNavDrop();goPage('admin');setTimeout(()=>aTab('drivers',document.querySelectorAll('.atab')[1]),100)">🚗 Active Drivers</a><a onclick="closeNavDrop();goPage('admin');setTimeout(()=>aTab('users',document.querySelectorAll('.atab')[2]),100)">👥 Users</a><a onclick="closeNavDrop();goPage('admin');setTimeout(()=>aTab('rides',document.querySelectorAll('.atab')[3]),100)">🛣️ All Rides</a><div class="sep"></div><a onclick="closeNavDrop();doLogout()" style="color:var(--red)">Sign Out</a></div></div>`;
  } else if(s.role==='driver'){
    const ini=(s.name||'DR').split(' ').map(c=>c[0]).join('').slice(0,2);
    n.innerHTML=`${dmHtml}<div class="nav-dropdown" id="driverDrop"><div class="user-chip" onclick="toggleNavDrop('driverDrop')"><div class="av" style="background:#28cd41">${ini}</div>${(s.name||'Driver').split(' ')[0]} <svg width="10" height="10" viewBox="0 0 10 10" style="opacity:.5"><path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg></div><div class="nav-dropdown-menu" id="driverDropMenu"><a onclick="closeNavDrop();goPage('driver-dash')">🚗 My Dashboard</a><div class="sep"></div><a onclick="closeNavDrop();doLogout()" style="color:var(--red)">Sign Out</a></div></div>`;
  } else {
    const ini=(s.name||'U').split(' ').map(c=>c[0]).join('').slice(0,2);
    n.innerHTML=`${dmHtml}<div class="nav-dropdown" id="userDrop"><div class="user-chip" onclick="toggleNavDrop('userDrop')"><div class="av" style="background:#0071e3">${ini}</div>${(s.name||'You').split(' ')[0]} <svg width="10" height="10" viewBox="0 0 10 10" style="opacity:.5"><path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg></div><div class="nav-dropdown-menu" id="userDropMenu"><a onclick="closeNavDrop();goPage('user-dash')">🛣️ My Rides</a><a onclick="closeNavDrop();goPage('book')">+ Book a Driver</a><div class="sep"></div><a onclick="closeNavDrop();doLogout()" style="color:var(--red)">Sign Out</a></div></div>`;
  }
}
function toggleNavDrop(id){const menu=document.getElementById(id+'Menu');if(!menu)return;const isOpen=menu.classList.contains('open');closeNavDrop();if(!isOpen)menu.classList.add('open');}
function closeNavDrop(){document.querySelectorAll('.nav-dropdown-menu').forEach(m=>m.classList.remove('open'));}
document.addEventListener('click',e=>{if(!e.target.closest('.nav-dropdown'))closeNavDrop();});
function doLogout(){
  try { disconnectSocket(); } catch(e){}
  Auth.clearToken();
  updNav();
  // Force show home page directly without going through goPage guards
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const home = document.getElementById('pg-home');
  if(home) home.classList.add('active');
  window.scrollTo(0,0);
  toast('Signed out successfully');
}

// ---------- PAGE ROUTING ----------
function goPage(name){
  const s = Auth.getSession();

  // Stop any existing driver dashboard poll when leaving
  if(name !== 'driver-dash') stopDriverPoll();
  // Stop tracking animation when leaving
  if(name !== 'tracking') clearInterval(_trackInterval);

  // -- Fix 2: Nav guard — driver-pending can only see home, auth, driver-pending --
  const restrictedForPending = ['book','user-dash','admin','driver-dash','become'];
  if(s && s.role === 'driver-pending' && restrictedForPending.includes(name)){
    goPage('driver-pending'); return;
  }
  // Non-logged-in users can't access protected pages
  const protectedPages = ['book','user-dash','driver-dash','admin'];
  if(!s && protectedPages.includes(name)){
    goAuth(name); return;
  }

  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const pg=document.getElementById('pg-'+name);
  if(pg) pg.classList.add('active');
  window.scrollTo(0,0);
  updNav();
  if(name==='book') renderDrivers();
  if(name==='admin'){renderAdminStats();renderAdminTab('requests');renderCharts()}
  if(name==='user-dash') renderUserDash();
  if(name==='driver-dash'){ renderDriverDash(); startDriverPoll(); }
}
function goHome(){goPage('home')}
function goAuth(dest){
  afterAuth=dest;
  if(dest==='become') document.getElementById('loginSub').textContent='Sign in before registering as a driver.';
  else document.getElementById('loginSub').textContent='Sign in to your DriveSync account.';
  showLI();
  goPage('auth');
}
function showSU(){document.getElementById('loginBox').style.display='none';document.getElementById('signupBox').style.display='block'}
function showLI(){document.getElementById('loginBox').style.display='block';document.getElementById('signupBox').style.display='none'}

// ---------- AUTH ----------
async function doLogin(){
  const em=document.getElementById('liEmail').value.trim().toLowerCase();
  const pw=document.getElementById('liPass').value;
  const err=document.getElementById('liErr');
  err.style.display='none';
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: em, password: pw }),
    });
    Auth.setToken(data.token);
    Auth.setSession({ role: data.role, name: data.user.name, email: data.user.email, id: data.user.id });
    updNav();
    initSocket();
    if(data.role==='admin'){ goPage('admin'); toast('Welcome, Admin!'); }
    else if(data.role==='driver-pending'){ goPage('driver-pending'); }
    else if(data.role==='driver'){ goPage('driver-dash'); toast('Welcome back, '+data.user.name.split(' ')[0]+'!'); }
    else { goPage(afterAuth); toast('Welcome back, '+data.user.name.split(' ')[0]+'!'); }
  } catch(e) {
    err.textContent = e.message || 'Incorrect email or password.';
    err.style.display='block';
  }
}

async function doSignup(){
  const nm=document.getElementById('suNm').value.trim();
  const em=document.getElementById('suEm').value.trim().toLowerCase();
  const ph=document.getElementById('suPh').value.trim();
  const pw=document.getElementById('suPw').value;
  const err=document.getElementById('suErr');
  err.style.display='none';
  if(!nm||!em||!ph||!pw){err.textContent='All fields are required.';err.style.display='block';return}
  if(pw.length<6){err.textContent='Password must be at least 6 characters.';err.style.display='block';return}
  try {
    const data = await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name: nm, email: em, phone: ph, password: pw }),
    });
    Auth.setToken(data.token);
    Auth.setSession({ role: 'user', name: data.user.name, email: data.user.email, id: data.user.id });
    updNav();
    initSocket();
    goPage(afterAuth);
    toast('Account created! Welcome, '+nm.split(' ')[0]+'!');
  } catch(e) {
    err.textContent = e.message || 'Signup failed. Please try again.';
    err.style.display='block';
  }
}

// ---------- BOOKING ----------
async function renderDrivers(){
  const g=document.getElementById('drvGrid');
  g.innerHTML='<div style="color:var(--text2);font-size:14px;padding:20px 0">Loading drivers...</div>';
  try {
    const data = await apiFetch('/drivers/available');
    const drvs = data.drivers || [];
    document.getElementById('drvCount').textContent=`(${drvs.length} online)`;
    if(!drvs.length){g.innerHTML='<div style="color:var(--text2);font-size:14px;padding:20px 0">No drivers online right now.</div>';return}
    g.innerHTML=drvs.map(d=>`
      <div class="drv-card${selDriver&&selDriver._id===d._id?' sel':''}" id="dc-${d._id}" onclick="pickDriver('${d._id}','${d.name}','${d.location}','${d.experience}',${d.rating},${d.totalRides},'${d.color}')">
        <div class="sel-check"><svg viewBox="0 0 10 8"><polyline points="1,4 3.5,6.5 9,1"/></svg></div>
        <div class="drv-head">
          <div class="drv-av" style="background:${d.color}">${d.name.split(' ').map(c=>c[0]).join('').slice(0,2)}</div>
          <div>
            <div class="drv-nm">${d.name}</div>
            <div class="drv-loc">${d.location} — ${d.experience}</div>
            <div class="drv-badge" style="margin-top:5px"><span class="ondot"></span>Available</div>
          </div>
        </div>
        <div class="drv-stats">
          <div class="drv-s"><div class="drv-sv">${d.rating}★</div><div class="drv-sk">Rating</div></div>
          <div class="drv-s" style="border-left:0.5px solid var(--border2);border-right:0.5px solid var(--border2)"><div class="drv-sv">${d.totalRides}</div><div class="drv-sk">Rides</div></div>
          <div class="drv-s"><div class="drv-sv">${d.experience.split(' ')[0]}</div><div class="drv-sk">Exp</div></div>
        </div>
        <div style="margin-top:10px;padding-top:10px;border-top:0.5px solid var(--border2);text-align:right">
          <button onclick="event.stopPropagation();viewDriverProfile('${d._id}')" style="background:none;border:none;color:var(--accent);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">View Profile →</button>
        </div>
      </div>`).join('');
  } catch(e) {
    g.innerHTML='<div style="color:var(--red);font-size:14px;padding:20px 0">Could not load drivers. Is the backend running?</div>';
  }
}

function pickDriver(id,name,location,experience,rating,totalRides,color){
  selDriver={_id:id,name,location,experience,rating,totalRides,color};
  document.querySelectorAll('.drv-card').forEach(c=>{c.classList.toggle('sel',c.id==='dc-'+id)});
  updSummary();
  toast(name.split(' ')[0]+' selected');
}

async function calcFare(){
  const p=document.getElementById('pickup').value.trim();
  const d=document.getElementById('dropoff').value.trim();
  if(!p||!d){toast('Enter both pickup and drop locations');return}
  try {
    const data = await apiFetch('/rides/fare', {
      method: 'POST',
      body: JSON.stringify({ pickup: p, drop: d }),
    });
    fareData = { p: data.pickup, d: data.drop, km: data.distanceKm, ...data.fare };
    updSummary();
    toast(`Fare calculated for ~${data.distanceKm} km`);
  } catch(e) {
    toast('Could not calculate fare. Please try again.');
  }
}

function updSummary(){
  if(!fareData&&!selDriver)return;
  document.getElementById('sumEmpty').style.display='none';
  document.getElementById('sumFilled').style.display='block';
  if(fareData){
    document.getElementById('sumRoute').innerHTML=`
      <div class="sum-rrow"><div class="sum-dot" style="background:var(--accent)"></div><span>${fareData.p}</span></div>
      <div class="sum-vline"></div>
      <div class="sum-rrow"><div class="sum-dot" style="background:var(--red)"></div><span>${fareData.d}</span></div>
    `;
    document.getElementById('fareLines').innerHTML=`
      <div class="fare-line"><span>Base Fare</span><span>₹${fareData.base}</span></div>
      <div class="fare-line"><span>Distance (~${fareData.km} km)</span><span>₹${fareData.distance}</span></div>
      <div class="fare-line"><span>Service Fee</span><span>₹${fareData.serviceFee}</span></div>
      <div class="fare-line total"><span>Total Estimate</span><span>₹${fareData.total}</span></div>
    `;
  }
  if(selDriver){
    const d=selDriver;
    document.getElementById('sumDrvPill').innerHTML=`
      <div class="sum-drv-pill">
        <div class="drv-av" style="width:34px;height:34px;font-size:13px;background:${d.color}">${d.name.split(' ').map(c=>c[0]).join('').slice(0,2)}</div>
        <div style="flex:1"><div style="font-size:13px;font-weight:600">${d.name}</div><div style="font-size:11px;color:var(--text2)">${d.rating}? — ${d.totalRides} rides — ${d.location}</div></div>
      </div>`;
  }
}

async function confirmBook(){
  const s=Auth.getSession();
  if(!s||s.role!=='user'){goAuth('book');toast('Please sign in to book');return}
  if(!selDriver){toast('Please select a driver first');return}
  if(!fareData){toast('Please calculate fare first');return}
  try {
    const data = await apiFetch('/rides/book', {
      method: 'POST',
      body: JSON.stringify({
        driverId: selDriver._id,
        pickup: fareData.p,
        drop: fareData.d,
        distanceKm: fareData.km,
        fare: { base: fareData.base, distance: fareData.distance, serviceFee: fareData.serviceFee, total: fareData.total },
      }),
    });
    const ride = data.ride;
    // Store ride id so we can poll for acceptance
    currentRideId = ride._id;

    // Show "waiting for driver" confirmation screen
    document.getElementById('confMsg').textContent = data.message;
    document.getElementById('confDetail').innerHTML=`
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text3);margin-bottom:10px">Booking Details</div>
      <div class="conf-row"><span>From</span><span>${ride.pickup}</span></div>
      <div class="conf-row"><span>To</span><span>${ride.drop}</span></div>
      <div class="conf-row"><span>Driver</span><span>${ride.driver.name}</span></div>
      <div class="conf-row"><span>Status</span><span id="rideStatusBadge"><span class="tag orange">⏳ Awaiting Driver</span></span></div>
      <div class="conf-row"><span>Total Fare</span><span style="color:var(--accent)">₹${ride.fare.total}</span></div>`;

    // Update tick icon to hourglass while pending
    document.querySelector('.conf-tick').textContent = '✕';
    document.querySelector('.conf-box h2').textContent = 'Request Sent!';

    selDriver=null;fareData=null;
    goPage('confirmed');

    // Poll every 4 seconds to check if driver accepted/rejected
    startRideStatusPoll(ride._id);
  } catch(e) {
    toast(e.message || 'Booking failed. Please try again.');
  }
}

// Poll as fallback (socket handles this in real-time, poll is backup)
let _pollTimer = null;
function startRideStatusPoll(rideId){
  clearInterval(_pollTimer);
  _pollTimer = setInterval(async () => {
    try {
      const data = await apiFetch('/rides/my');
      const ride = (data.rides||[]).find(r=>r._id===rideId);
      if(!ride) return;
      if(ride.status === 'confirmed'){
        clearInterval(_pollTimer);
        document.querySelector('.conf-tick').textContent = '✕';
        document.querySelector('.conf-box h2').textContent = 'Booking Confirmed!';
        const badge = document.getElementById('rideStatusBadge');
        if(badge) badge.innerHTML = '<span class="tag green">✓ Confirmed</span>';
        const cancelBtn = document.getElementById('cancelRideBtn');
        if(cancelBtn) cancelBtn.style.display = 'none';
        toast('Driver accepted your booking!');
      } else if(ride.status === 'rejected'){
        clearInterval(_pollTimer);
        document.querySelector('.conf-tick').textContent = '✕';
        document.querySelector('.conf-tick').style.background = 'var(--red-light)';
        document.querySelector('.conf-box h2').textContent = 'Request Declined';
        const badge = document.getElementById('rideStatusBadge');
        if(badge) badge.innerHTML = '<span class="tag red">✕ Declined by Driver</span>';
        document.getElementById('confMsg').textContent = 'The driver could not accept your request. Please go back and choose another driver.';
        toast('Driver declined the request. Please try another driver.');
      } else if(ride.status === 'cancelled'){
        clearInterval(_pollTimer);
      }
    } catch(e){ /* ignore poll errors */ }
  }, 5000); // 5s fallback poll
}

// ---------- BECOME DRIVER ----------
async function submitDriver(){
  const s=Auth.getSession();
  if(!s){goAuth('become');toast('Please sign in first');return}
  const nm=document.getElementById('dvNm').value.trim();
  const ag=document.getElementById('dvAg').value;
  const ph=document.getElementById('dvPh').value.trim();
  const lc=document.getElementById('dvLc').value.trim();
  const ex=document.getElementById('dvEx').value;
  const lo=document.getElementById('dvLo').value.trim();
  const ps=document.getElementById('dvPs').value.trim();
  const err=document.getElementById('dvErr');
  err.style.display='none';
  if(!nm||!ag||!ph||!lc||!ex||!lo){err.textContent='Please fill all required fields.';err.style.display='block';return}
  if(+ag<18||+ag>70){err.textContent='Age must be between 18 and 70.';err.style.display='block';return}
  try {
    await apiFetch('/drivers/apply', {
      method: 'POST',
      body: JSON.stringify({ name:nm, age:ag, phone:ph, licence:lc, experience:ex, location:lo, pastExperience:ps }),
    });
    // Update session role to driver-pending
    const session = Auth.getSession();
    Auth.setSession({ ...session, role: 'driver-pending' });
    goPage('driver-pending');
  } catch(e) {
    err.textContent = e.message || 'Submission failed. Please try again.';
    err.style.display='block';
  }
}

// ---------- DRIVER DASH ----------
async function renderDriverDash(){
  const s=Auth.getSession();if(!s||s.role!=='driver')return;
  try {
    const [profileData, pendingData] = await Promise.all([
      apiFetch('/drivers/me'),
      apiFetch('/rides/pending-for-driver'),
    ]);
    const d = profileData.driver;
    const rides = profileData.rides || [];
    const pendingRides = pendingData.rides || [];

    document.getElementById('ddNm').textContent=d.name.split(' ')[0];

    // -- Fix 3: toggle — set state directly, don't rely on click bubbling --
    const isOn=d.online;
    const tog=document.getElementById('togEl');
    const wrap=document.getElementById('togWrap');
    tog.className = 'tog' + (isOn?' on':'');
    wrap.className = 'tog-wrap' + (isOn?' on':'');
    document.getElementById('togTxt').textContent = isOn?'You are Online':'You are Offline';
    document.getElementById('togSub').textContent = isOn?'You can receive ride requests':'Toggle to start accepting rides';
    const badge = document.getElementById('onBadge');
    badge.className = 'online-badge' + (isOn?' show':'');

    document.getElementById('ddRides').textContent=rides.length;
    document.getElementById('ddIncome').textContent='₹'+profileData.totalIncome.toLocaleString();
    document.getElementById('ddRating').textContent=d.rating?(d.rating+'★'):'—';

    // -- Fix 4: Pending ride requests panel --
    const notifs=document.getElementById('ddNotifs');
    let notifsHtml = '';
    if(pendingRides.length){
      notifsHtml += `<div style="font-size:14px;font-weight:700;margin-bottom:10px;color:var(--text)">🔔 Incoming Ride Requests (${pendingRides.length})</div>`;
      pendingRides.forEach(r=>{
        notifsHtml += `
          <div class="notif orange" style="margin-bottom:12px;border-radius:var(--radius2);padding:16px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
              <div>
                <div style="font-size:14px;font-weight:600;margin-bottom:4px">📍 `${r.pickup} → ${r.drop}</div>
                <div style="font-size:12px;color:var(--text2);margin-bottom:2px">Rider: <strong>${r.user?r.user.name:'—'}</strong>${r.user&&r.user.phone?' · '+r.user.phone:''}</div>
                <div style="font-size:12px;color:var(--text2)">~${r.distanceKm} km — <strong style="color:var(--accent)">₹${r.fare.total}</strong></div>
              </div>
              <div style="display:flex;gap:8px;flex-shrink:0">
                <button class="abtn ok" style="padding:8px 16px;font-size:13px" onclick="respondToRide('${r._id}','accept')">✓ Accept</button>
                <button class="abtn no" style="padding:8px 16px;font-size:13px" onclick="respondToRide('${r._id}','reject')">✕ Decline</button>
              </div>
            </div>
          </div>`;
      });
    } else if(isOn){
      notifsHtml = `<div class="notif green">You are online and ready to receive ride requests.</div>`;
    } else {
      notifsHtml = `<div class="notif">Go online to start receiving ride requests.</div>`;
    }
    notifs.innerHTML = notifsHtml;

    const list=document.getElementById('ddList');
    const confirmedRides = rides.filter(r=>r.status==='confirmed'||r.status==='completed');
    if(!confirmedRides.length){list.innerHTML='<div style="color:var(--text3);font-size:14px;padding:20px 0">No completed rides yet.</div>';return}
    list.innerHTML=confirmedRides.map(r=>`
      <div class="ride-row">
        <div class="ride-ico" style="background:rgba(0,113,227,.08)">🚗</div>
        <div class="ride-info"><div class="ride-rt">${r.pickup} → ${r.drop}</div><div class="ride-dt">${new Date(r.createdAt).toLocaleDateString('en-IN')} · ${r.user?r.user.name:'Rider'}</div></div>
        <div style="text-align:right">
          <div class="ride-amt">₹${r.fare.total}</div>
          ${!r.driverFeedback?`<button class="rate-btn" style="margin-top:4px" onclick="openDriverFeedback('${r._id}')">Leave Note</button>`:'<span style="font-size:11px;color:var(--green);margin-top:4px;display:block">✓ Noted</span>'}
        </div>
      </div>`).join('');
  } catch(e) {
    toast('Could not load driver dashboard.');
  }
}

// Accept or reject a ride request
async function respondToRide(rideId, action){
  try {
    const data = await apiFetch(`/rides/${rideId}/${action}`, { method: 'PATCH' });
    toast(data.message);
    renderDriverDash(); // refresh to remove the card
  } catch(e) {
    toast(e.message || 'Action failed');
  }
}

// Auto-refresh driver dashboard every 8 seconds to catch new ride requests
let _driverPollTimer = null;
function startDriverPoll(){
  clearInterval(_driverPollTimer);
  _driverPollTimer = setInterval(()=>{
    const s = Auth.getSession();
    if(s && s.role==='driver') renderDriverDash();
  }, 5000);
}
function stopDriverPoll(){ clearInterval(_driverPollTimer); }

// -- Fix 5: toggleOnline — instant UI update, API call in background --
async function toggleOnline(e){
  if(e) e.stopPropagation();
  // Instantly flip the toggle visually (optimistic update)
  const tog = document.getElementById('togEl');
  const wrap = document.getElementById('togWrap');
  const isCurrentlyOn = tog.classList.contains('on');
  const willBeOn = !isCurrentlyOn;
  tog.className = 'tog' + (willBeOn?' on':'');
  wrap.className = 'tog-wrap' + (willBeOn?' on':'');
  document.getElementById('togTxt').textContent = willBeOn?'You are Online':'You are Offline';
  document.getElementById('togSub').textContent = willBeOn?'You can receive ride requests':'Toggle to start accepting rides';
  document.getElementById('onBadge').className = 'online-badge' + (willBeOn?' show':'');
  try {
    const data = await apiFetch('/drivers/toggle-online', { method: 'PATCH' });
    toast(data.message);
    // Re-register socket with updated status
    if(_socket) _socket.emit('register', { role: 'driver', id: Auth.getSession()?.id });
    renderDriverDash(); // sync full state from server
  } catch(e) {
    // Revert on failure
    tog.className = 'tog' + (isCurrentlyOn?' on':'');
    wrap.className = 'tog-wrap' + (isCurrentlyOn?' on':'');
    toast(e.message || 'Could not update status.');
  }
}

// ---------- USER DASH ----------
async function renderUserDash(){
  const s=Auth.getSession();if(!s||s.role!=='user')return;
  document.getElementById('udNm').textContent=(s.name||'there').split(' ')[0];
  try {
    const data = await apiFetch('/rides/my');
    const rides = data.rides || [];
    document.getElementById('udRides').textContent=rides.length;
    document.getElementById('udSpent').textContent='₹'+(data.totalSpent||0).toLocaleString();
    document.getElementById('udRating').textContent=data.avgRating?(data.avgRating+'★'):'—';
    const list=document.getElementById('udList');
    if(!rides.length){list.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3);font-size:14px">No rides yet. <a style="color:var(--accent);cursor:pointer" onclick="goPage(\'book\')">Book your first driver →</a></div>';return}
    list.innerHTML=rides.map(r=>{
      const statusBadge = r.status==='pending'
        ? '<span class="tag orange">⏳ Pending</span>'
        : r.status==='rejected'
        ? '<span class="tag red">✕ Declined</span>'
        : r.status==='confirmed'
        ? '<span class="tag green">✓ Confirmed</span>'
        : '';
      const rateBtn = (r.status==='confirmed'||r.status==='completed') && !r.rated
        ? `<button class="rate-btn" onclick="rateRide('${r._id}')">Rate</button>`
        : r.rated ? '<span style="font-size:11px;color:var(--green)">Rated ★</span>'
        : statusBadge;
      return `
        <div class="ride-row">
          <div class="ride-ico" style="background:rgba(40,205,65,.08)">🛣️</div>
          <div class="ride-info"><div class="ride-rt">${r.pickup} → ${r.drop}</div><div class="ride-dt">${new Date(r.createdAt).toLocaleDateString('en-IN')} · Driver: ${r.driver?r.driver.name:'—'}</div></div>
          <div style="text-align:right"><div class="ride-amt">₹${r.fare.total}</div><div style="margin-top:4px">${rateBtn}</div></div>
        </div>`;
    }).join('');
  } catch(e) {
    toast('Could not load your rides.');
  }
}
function rateRide(rid){currentRideId=rid;dStar=0;sStar=0;document.querySelectorAll('.sbtn').forEach(b=>b.classList.remove('lit'));goPage('feedback')}

// ---------- ADMIN ----------
async function renderAdminStats(){
  try {
    const data = await apiFetch('/admin/stats');
    const s = data.stats;
    document.getElementById('admU').textContent=s.totalUsers;
    document.getElementById('admD').textContent=s.activeDrivers;
    document.getElementById('admP').textContent=s.pendingDrivers;
    document.getElementById('admR').textContent=s.totalRides;
  } catch(e) { /* silently fail */ }
}
function aTab(tab,btn){document.querySelectorAll('.atab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');renderAdminTab(tab)}
async function renderAdminTab(tab){
  const c=document.getElementById('admContent');
  c.innerHTML='<div style="padding:20px;color:var(--text2);font-size:14px">Loading...</div>';
  try {
    if(tab==='requests'){
      const data = await apiFetch('/admin/drivers/pending');
      const pend = data.drivers || [];
      if(!pend.length){c.innerHTML='<div style="text-align:center;padding:60px;color:var(--text2);font-size:14px">No pending requests.</div>';return}
      c.innerHTML=`<div class="t-wrap"><table class="dtbl"><thead><tr><th>Name</th><th>Age</th><th>Licence</th><th>Exp</th><th>Location</th><th>Applied</th><th>Actions</th></tr></thead><tbody>${pend.map(d=>`<tr><td><strong>${d.name}</strong></td><td>${d.age}</td><td style="font-size:12px;opacity:.7">${d.licence}</td><td>${d.experience}</td><td>${d.location}</td><td>${new Date(d.createdAt).toLocaleDateString('en-IN')}</td><td><button class="abtn ok" onclick="admAct('approve','${d._id}')">Approve</button><button class="abtn no" onclick="admAct('reject','${d._id}')">Reject</button></td></tr>`).join('')}</tbody></table></div>`;
    } else if(tab==='drivers'){
      const data = await apiFetch('/admin/drivers/active');
      const appr = data.drivers || [];
      if(!appr.length){c.innerHTML='<div style="text-align:center;padding:60px;color:var(--text2);font-size:14px">No active drivers.</div>';return}
      c.innerHTML=`<div class="t-wrap"><table class="dtbl"><thead><tr><th>Name</th><th>Status</th><th>Rating</th><th>Rides</th><th>Location</th><th>Actions</th></tr></thead><tbody>${appr.map(d=>`<tr><td><strong>${d.name}</strong></td><td><span class="tag ${d.online?'green':'orange'}">${d.online?'Online':'Offline'}</span></td><td>${d.rating}★</td><td>${d.totalRides}</td><td>${d.location}</td><td><button class="abtn no" onclick="admAct('remove','${d._id}')">Remove</button></td></tr>`).join('')}</tbody></table></div>`;
    } else if(tab==='users'){
      const data = await apiFetch('/admin/users');
      const users = data.users || [];
      if(!users.length){c.innerHTML='<div style="text-align:center;padding:60px;color:var(--text2);font-size:14px">No users yet.</div>';return}
      c.innerHTML=`<div class="t-wrap"><table class="dtbl"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th></tr></thead><tbody>${users.map(u=>`<tr><td><strong>${u.name}</strong></td><td>${u.email}</td><td>${u.phone}</td><td>${new Date(u.createdAt).toLocaleDateString('en-IN')}</td></tr>`).join('')}</tbody></table></div>`;
    } else if(tab==='rides'){
      const data = await apiFetch('/admin/rides');
      const rides = data.rides || [];
      if(!rides.length){c.innerHTML='<div style="text-align:center;padding:60px;color:var(--text2);font-size:14px">No rides yet.</div>';return}
      c.innerHTML=`<div class="t-wrap"><table class="dtbl"><thead><tr><th>From</th><th>To</th><th>Driver</th><th>User</th><th>Fare</th><th>Date</th></tr></thead><tbody>${rides.map(r=>`<tr><td>${r.pickup}</td><td>${r.drop}</td><td>${r.driver?r.driver.name:'—'}</td><td>${r.user?r.user.email:'—'}</td><td><strong>₹${r.fare.total}</strong></td><td>${new Date(r.createdAt).toLocaleDateString('en-IN')}</td></tr>`).join('')}</tbody></table></div>`;
    }
  } catch(e) {
    c.innerHTML='<div style="padding:20px;color:var(--red);font-size:14px">Could not load data. Is the backend running?</div>';
  }
}
async function admAct(act,id){
  try {
    if(act==='approve') await apiFetch(`/admin/drivers/${id}/approve`, { method: 'PATCH' });
    else if(act==='reject') await apiFetch(`/admin/drivers/${id}/reject`, { method: 'PATCH' });
    else if(act==='remove') await apiFetch(`/admin/drivers/${id}`, { method: 'DELETE' });
    toast(act==='approve'?'Driver approved':act==='reject'?'Application rejected':'Driver removed');
    renderAdminStats();
    renderAdminTab(act==='remove'?'drivers':'requests');
  } catch(e) {
    toast(e.message || 'Action failed');
  }
}

// ---------- FEEDBACK ----------
function setStar(type,val){
  if(type==='d'){dStar=val;document.querySelectorAll('#dStars .sbtn').forEach((b,i)=>b.classList.toggle('lit',i<val))}
  else{sStar=val;document.querySelectorAll('#sStars .sbtn').forEach((b,i)=>b.classList.toggle('lit',i<val))}
}
async function submitFB(){
  if(!dStar||!sStar){toast('Please rate both driver and service');return}
  if(!currentRideId){toast('No ride selected for rating');return}
  try {
    await apiFetch(`/rides/${currentRideId}/rate`, {
      method: 'POST',
      body: JSON.stringify({
        driverRating: dStar,
        serviceRating: sStar,
        comment: document.getElementById('fbTxt').value.trim(),
      }),
    });
    toast('Thank you for your feedback! ⭐');
    dStar=0;sStar=0;currentRideId=null;
    goPage('user-dash');
  } catch(e) {
    toast(e.message || 'Could not submit feedback.');
  }
}

// ---------- DRIVER PROFILE PAGE ----------
// ---------- LOCATION SUGGESTIONS ----------
const HYD_LOCATIONS = [
  {name:'Hitech City',area:'Madhapur'},
  {name:'Gachibowli',area:'Financial District'},
  {name:'Banjara Hills',area:'Road No. 12'},
  {name:'Jubilee Hills',area:'Road No. 36'},
  {name:'Kukatpally',area:'Metro Station'},
  {name:'Madhapur',area:'Cyber Towers'},
  {name:'Kondapur',area:'Botanical Garden Road'},
  {name:'Miyapur',area:'Metro Station'},
  {name:'KPHB Colony',area:'Phase 1'},
  {name:'Ameerpet',area:'Metro Station'},
  {name:'Begumpet',area:'Airport Road'},
  {name:'Secunderabad',area:'Railway Station'},
  {name:'Uppal',area:'Metro Station'},
  {name:'LB Nagar',area:'Metro Station'},
  {name:'Dilsukhnagar',area:'Bus Stand'},
  {name:'Mehdipatnam',area:'Bus Stand'},
  {name:'Tolichowki',area:'Main Road'},
  {name:'Manikonda',area:'Puppalaguda'},
  {name:'Narsingi',area:'Outer Ring Road'},
  {name:'Shamshabad',area:'RGI Airport'},
  {name:'Charminar',area:'Old City'},
  {name:'Abids',area:'General Bazaar'},
  {name:'Nampally',area:'Railway Station'},
  {name:'Lakdikapul',area:'Bus Stand'},
  {name:'Khairatabad',area:'Metro Station'},
  {name:'Somajiguda',area:'Raj Bhavan Road'},
  {name:'Panjagutta',area:'Metro Station'},
  {name:'SR Nagar',area:'Main Road'},
  {name:'Nizampet',area:'X Roads'},
  {name:'Bachupally',area:'Main Road'},
];

function showLoc(fieldId){
  const val = document.getElementById(fieldId).value.trim();
  renderLocSuggestions(fieldId, val||'');
  document.getElementById(fieldId+'-suggestions').classList.add('open');
}
function hideLoc(fieldId){
  document.getElementById(fieldId+'-suggestions').classList.remove('open');
}
function filterLoc(fieldId){
  const val = document.getElementById(fieldId).value.trim().toLowerCase();
  renderLocSuggestions(fieldId, val);
  document.getElementById(fieldId+'-suggestions').classList.add('open');
}
function renderLocSuggestions(fieldId, query){
  const box = document.getElementById(fieldId+'-suggestions');
  if(!box) return;
  const filtered = query
    ? HYD_LOCATIONS.filter(l=>l.name.toLowerCase().includes(query)||l.area.toLowerCase().includes(query))
    : HYD_LOCATIONS;
  if(!filtered.length){box.innerHTML='<div class="loc-item" style="color:var(--text3)">No matches</div>';return;}
  box.innerHTML = filtered.map(l=>`
    <div class="loc-item" onclick="selectLoc('${fieldId}','${l.name}, ${l.area}')">
      <span style="font-size:14px">📍</span>
      <div><div style="font-weight:500">${l.name}</div><span>${l.area}</span></div>
    </div>`).join('');
}
function selectLoc(fieldId, value){
  document.getElementById(fieldId).value = value;
  hideLoc(fieldId);
  // Auto-trigger fare calc if both fields filled
  const p = document.getElementById('pickup').value.trim();
  const d = document.getElementById('dropoff').value.trim();
  if(p && d) calcFare();
}

// ---------- DRIVER FEEDBACK MODAL ----------
let _drvFbRideId = null, _drvFbStar = 0;
function openDriverFeedback(rideId){
  _drvFbRideId = rideId;
  _drvFbStar = 0;
  document.querySelectorAll('#drvFbStars button').forEach(b=>b.classList.remove('lit'));
  document.getElementById('drvFbNote').value = '';
  document.getElementById('drvFbModal').style.display = 'flex';
}
function closeDrvFbModal(){
  document.getElementById('drvFbModal').style.display = 'none';
  _drvFbRideId = null; _drvFbStar = 0;
}
function setDrvStar(val){
  _drvFbStar = val;
  document.querySelectorAll('#drvFbStars button').forEach((b,i)=>b.classList.toggle('lit',i<val));
}
async function submitDriverFeedback(){
  if(!_drvFbRideId){closeDrvFbModal();return;}
  try {
    await apiFetch(`/rides/${_drvFbRideId}/driver-feedback`,{
      method:'PATCH',
      body:JSON.stringify({rating:_drvFbStar||null, note:document.getElementById('drvFbNote').value.trim()})
    });
    toast('Note saved!');
    closeDrvFbModal();
    renderDriverDash();
  } catch(e){ toast(e.message||'Could not save note.'); }
}
async function viewDriverProfile(driverId){
  goPage('driver-profile');
  const c = document.getElementById('drvProfileContent');
  c.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text3)">Loading...</div>';
  try {
    // Fetch available drivers list and find this one
    const data = await apiFetch('/drivers/available');
    const allData = await apiFetch('/admin/drivers/active').catch(()=>({drivers:[]}));
    // Try active drivers first (admin), fallback to available list
    let d = (allData.drivers||[]).find(x=>x._id===driverId) || (data.drivers||[]).find(x=>x._id===driverId);
    if(!d){ c.innerHTML='<div style="text-align:center;padding:60px;color:var(--text3)">Driver not found.</div>'; return; }

    const ini = d.name.split(' ').map(x=>x[0]).join('').slice(0,2);
    const stars = '★'.repeat(Math.round(d.rating||0)) + '☆'.repeat(5-Math.round(d.rating||0));

    c.innerHTML = `
      <div style="text-align:center;margin-bottom:28px">
        <div style="width:88px;height:88px;border-radius:50%;background:${d.color};display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:700;color:#fff;margin:0 auto 14px;box-shadow:0 4px 20px ${d.color}55">${ini}</div>
        <div style="font-size:22px;font-weight:700;letter-spacing:-0.6px;margin-bottom:4px">${d.name}</div>
        <div style="font-size:14px;color:var(--text2);margin-bottom:10px">${d.location} — ${d.experience}</div>
        <div style="display:inline-flex;align-items:center;gap:6px;background:var(--green-light);color:#1a6b2a;padding:5px 14px;border-radius:20px;font-size:13px;font-weight:600">
          <span class="ondot"></span>${d.online?'Available Now':'Currently Offline'}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:22px">
        <div class="sc" style="text-align:center">
          <div class="sc-lbl">Rating</div>
          <div class="sc-val" style="color:var(--orange);font-size:20px">${d.rating||'—'}★</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">${stars}</div>
        </div>
        <div class="sc" style="text-align:center">
          <div class="sc-lbl">Total Rides</div>
          <div class="sc-val blue">${d.totalRides||0}</div>
        </div>
        <div class="sc" style="text-align:center">
          <div class="sc-lbl">Experience</div>
          <div style="font-size:16px;font-weight:700;letter-spacing:-0.5px">${d.experience.split(' ')[0]}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">yrs</div>
        </div>
      </div>

      <div style="background:var(--bg2);border-radius:var(--radius2);padding:18px;border:0.5px solid var(--border2);margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text3);margin-bottom:12px">About</div>
        <div style="display:flex;flex-direction:column;gap:10px;font-size:13px">
          <div style="display:flex;gap:10px"><span style="color:var(--text3);min-width:90px">📍 Area</span><span style="font-weight:500">${d.location}</span></div>
          <div style="display:flex;gap:10px"><span style="color:var(--text3);min-width:90px">🕐 Experience</span><span style="font-weight:500">${d.experience}</span></div>
          <div style="display:flex;gap:10px"><span style="color:var(--text3);min-width:90px">🚗 Rides Done</span><span style="font-weight:500">${d.totalRides||0} rides</span></div>
        </div>
      </div>

      <div style="background:var(--accent-light);border-radius:var(--radius2);padding:16px;margin-bottom:20px;font-size:13px;color:var(--text2);line-height:1.7">
        🛡️ <strong style="color:var(--text)">Verified Driver</strong> — Background-checked and manually approved by the DriveSync admin team before being listed on the platform.
      </div>

      <button class="btn-w blue" onclick="goPage('book')">Book ${d.name.split(' ')[0]}</button>
    `;
  } catch(e){
    c.innerHTML = '<div style="text-align:center;padding:60px;color:var(--red);font-size:14px">Could not load driver profile.</div>';
  }
}

// ---------- RIDE TRACKING ----------
let _trackInterval = null;
function startTracking(ride){
  goPage('tracking');
  clearInterval(_trackInterval);

  // Populate driver card
  const drvCard = document.getElementById('trackDriverCard');
  const drv = ride.driver || {};
  const ini = (drv.name||'DR').split(' ').map(x=>x[0]).join('').slice(0,2);
  drvCard.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px">
      <div style="width:52px;height:52px;border-radius:50%;background:${drv.color||'#0071e3'};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;flex-shrink:0">${ini}</div>
      <div style="flex:1">
        <div style="font-size:16px;font-weight:700">${drv.name||'Your Driver'}</div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px">${drv.rating||'—'}★ · ${drv.location||''}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:700;color:var(--accent)">₹${ride.fare?.total||0}</div>
        <div style="font-size:11px;color:var(--text3)">Total Fare</div>
      </div>
    </div>`;

  // Populate ride details
  document.getElementById('trackDetails').innerHTML = `
    <div class="conf-row"><span>From</span><span>${ride.pickup}</span></div>
    <div class="conf-row"><span>To</span><span>${ride.drop}</span></div>
    <div class="conf-row"><span>Distance</span><span>~${ride.distanceKm} km</span></div>
    <div class="conf-row" style="border-bottom:none"><span>Status</span><span id="trackStatus"><span class="tag green">✓ Confirmed</span></span></div>`;

  // Animate the car across the map
  let progress = 5; // start at 5% left
  const car = document.getElementById('driverCar');
  const etaEl = document.getElementById('trackETA');
  let etaMins = ride.distanceKm ? Math.ceil(ride.distanceKm * 1.5) : 12;

  etaEl.textContent = `ETA: ~${etaMins} min`;

  _trackInterval = setInterval(()=>{
    progress += 1.2;
    if(car) car.style.left = Math.min(progress, 85) + '%';
    etaMins = Math.max(0, etaMins - 0.3);
    if(etaEl) etaEl.textContent = etaMins < 1 ? '🎉 Driver Arrived!' : `ETA: ~${Math.ceil(etaMins)} min`;
    if(progress >= 85){
      clearInterval(_trackInterval);
      const statusEl = document.getElementById('trackStatus');
      if(statusEl) statusEl.innerHTML = '<span class="tag green">'🎉 Driver Arrived</span>';
    }
  }, 800);
}

// ---------- DARK MODE ----------
function toggleDark(){
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('ds_dark', isDark ? '1' : '0');
  document.getElementById('dmBtn').textContent = isDark ? '☀️' : '🌙';
  // Re-render charts with new theme if on admin page
  if(document.getElementById('pg-admin').classList.contains('active')) renderCharts();
}
(function initDark(){
  if(localStorage.getItem('ds_dark')==='1'){
    document.body.classList.add('dark');
    const btn = document.getElementById('dmBtn');
    if(btn) btn.textContent='☀️';
  }
})();

// ---------- SOCKET.IO ----------
let _socket = null;
function initSocket(){
  if(_socket) return;
  const s = Auth.getSession();
  if(!s) return;
  _socket = io(SOCKET_URL, { transports: ['websocket','polling'] });
  _socket.on('connect', () => {
    // Register this client with the server so it can receive targeted events
    _socket.emit('register', { role: s.role, id: s.id });
  });

  // -- User receives real-time ride status updates --
  _socket.on('ride_accepted', ({ rideId }) => {
    clearInterval(_pollTimer);
    const tick = document.querySelector('.conf-tick');
    const h2 = document.querySelector('.conf-box h2');
    const badge = document.getElementById('rideStatusBadge');
    const cancelBtn = document.getElementById('cancelRideBtn');
    if(tick) tick.textContent = '✓';
    if(h2) h2.textContent = 'Booking Confirmed!';
    if(badge) badge.innerHTML = '<span class="tag green">✓ Confirmed</span>';
    if(cancelBtn) cancelBtn.style.display = 'none';
    toast('🎉 Driver accepted your booking!');
  });

  _socket.on('ride_rejected', ({ rideId }) => {
    clearInterval(_pollTimer);
    const tick = document.querySelector('.conf-tick');
    const h2 = document.querySelector('.conf-box h2');
    const badge = document.getElementById('rideStatusBadge');
    if(tick){ tick.textContent='✕'✓'; tick.style.background='var(--red-light)'; }
    if(h2) h2.textContent = 'Request Declined';
    if(badge) badge.innerHTML = '<span class="tag red">✕ Declined by Driver</span>';
    const msg = document.getElementById('confMsg');
    if(msg) msg.textContent = 'The driver could not accept your request. Please go back and choose another driver.';
    toast('Driver declined. Please try another driver.');
  });

  // -- Driver receives real-time new ride requests --
  _socket.on('new_ride_request', (data) => {
    // Play a subtle notification and refresh the dashboard
    toast('🔔 New ride request from ' + data.user.name + '!');
    if(document.getElementById('pg-driver-dash').classList.contains('active')){
      renderDriverDash();
    }
  });

  // -- Driver notified when user cancels --
  _socket.on('ride_cancelled', ({ rideId }) => {
    toast('⚠️ A user cancelled their ride request.');
    if(document.getElementById('pg-driver-dash').classList.contains('active')){
      renderDriverDash();
    }
  });
}

function disconnectSocket(){
  if(_socket){ _socket.disconnect(); _socket = null; }
}

// ---------- RIDE CANCELLATION ----------
async function doCancelRide(){
  if(!currentRideId){ toast('No active ride to cancel'); return; }
  if(!confirm('Are you sure you want to cancel this ride?')) return;
  try {
    await apiFetch(`/rides/${currentRideId}/cancel`, { method: 'PATCH' });
    clearInterval(_pollTimer);
    const tick = document.querySelector('.conf-tick');
    const h2 = document.querySelector('.conf-box h2');
    const badge = document.getElementById('rideStatusBadge');
    const cancelBtn = document.getElementById('cancelRideBtn');
    if(tick){ tick.textContent='✕'✓'; tick.style.background='var(--red-light)'; }
    if(h2) h2.textContent = 'Ride Cancelled';
    if(badge) badge.innerHTML = '<span class="tag red">✕ Cancelled</span>';
    if(cancelBtn) cancelBtn.style.display = 'none';
    const msg = document.getElementById('confMsg');
    if(msg) msg.textContent = 'Your ride has been cancelled successfully.';
    currentRideId = null;
    toast('Ride cancelled.');
  } catch(e){
    toast(e.message || 'Could not cancel ride.');
  }
}

// ---------- ADMIN CHARTS ----------
let _chartRides = null, _chartRevenue = null;
async function renderCharts(){
  try {
    const data = await apiFetch('/rides/chart-data');
    const isDark = document.body.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#aeaeb2' : '#6e6e73';

    const baseOpts = {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } }, beginAtZero: true },
      },
    };

    // Destroy old charts before re-creating (needed for dark mode re-render)
    if(_chartRides){ _chartRides.destroy(); _chartRides = null; }
    if(_chartRevenue){ _chartRevenue.destroy(); _chartRevenue = null; }

    const ctxR = document.getElementById('chartRides');
    const ctxV = document.getElementById('chartRevenue');
    if(!ctxR || !ctxV) return;

    _chartRides = new Chart(ctxR, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{ data: data.ridesPerDay, backgroundColor: 'rgba(0,113,227,0.7)', borderRadius: 6, borderSkipped: false }],
      },
      options: baseOpts,
    });

    _chartRevenue = new Chart(ctxV, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.revenuePerDay,
          borderColor: '#28cd41',
          backgroundColor: 'rgba(40,205,65,0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#28cd41',
          pointRadius: 4,
          fill: true,
          tension: 0.4,
        }],
      },
      options: baseOpts,
    });
  } catch(e){ /* charts fail silently if no data */ }
}
function toast(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2800);
}

// ---------- INIT ----------
updNav();
const _s=Auth.getSession();
if(_s){
  initSocket(); // reconnect socket for already-logged-in users
  if(_s.role==='admin')goPage('admin');
  else if(_s.role==='driver')goPage('driver-dash');
  else if(_s.role==='driver-pending')goPage('driver-pending');
}
