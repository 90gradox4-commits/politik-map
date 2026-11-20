/* POLITIK MAP — demostración funcional con almacenamiento local.
   Para uso real multiusuario: conectar una API y base de datos segura. */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const CHIRI = {lat:9.362, lng:-73.603};
const DEMO = {
 leaders:[
  {id:'l1',name:'María Fernanda Ríos',role:'Líder comunitaria',municipality:'Chiriguaná',department:'Cesar',neighborhood:'Centro',sector:'Zona urbana',status:'Activo',lat:9.362,lng:-73.603,phone:'',notes:'Registro ficticio de demostración.'},
  {id:'l2',name:'Carlos Andrés Pacheco',role:'Coordinador comunitario',municipality:'Chiriguaná',department:'Cesar',neighborhood:'La Unión',sector:'Zona urbana',status:'Activo',lat:9.368,lng:-73.610,phone:'',notes:'Registro ficticio de demostración.'},
  {id:'l3',name:'Luz Marina Torres',role:'Líder comunitaria',municipality:'Chiriguaná',department:'Cesar',neighborhood:'El Carmen',sector:'Zona urbana',status:'Pendiente',lat:9.355,lng:-73.596,phone:'',notes:'Registro ficticio de demostración.'}
 ],
 officials:[
  {id:'o1',name:'Ejemplo Candidato A',role:'Concejal',municipality:'Chiriguaná',department:'Cesar',period:'2024–2027',party:'Movimiento de ejemplo',status:'Activo',lat:9.362,lng:-73.603,notes:'Dato ficticio. No representa a una persona real.'},
  {id:'o2',name:'Ejemplo Candidata B',role:'Alcalde',municipality:'Chiriguaná',department:'Cesar',period:'2024–2027',party:'Movimiento de ejemplo',status:'Activo',lat:9.362,lng:-73.603,notes:'Dato ficticio. No representa a una persona real.'}
 ],
 places:[
  {id:'p1',name:'Centro',type:'Barrio',municipality:'Chiriguaná',department:'Cesar',description:'Sector de referencia de demostración.',lat:9.362,lng:-73.603},
  {id:'p2',name:'La Unión',type:'Barrio',municipality:'Chiriguaná',department:'Cesar',description:'Sector de referencia de demostración.',lat:9.368,lng:-73.610},
  {id:'p3',name:'Chiriguaná',type:'Municipio',municipality:'Chiriguaná',department:'Cesar',description:'Municipio de inicio de la demostración.',lat:9.362,lng:-73.603}
 ],
 events:[
  {id:'e1',name:'Encuentro comunitario de ejemplo',date:futureDate(3),time:'17:00',municipality:'Chiriguaná',neighborhood:'Centro',place:'Salón comunitario (referencia)',organizer:'Equipo organizador',status:'Programada',lat:9.365,lng:-73.600,description:'Actividad ficticia de demostración.'},
  {id:'e2',name:'Jornada informativa de ejemplo',date:futureDate(8),time:'09:00',municipality:'Chiriguaná',neighborhood:'La Unión',place:'Punto comunitario (referencia)',organizer:'Equipo organizador',status:'Programada',lat:9.369,lng:-73.608,description:'Actividad ficticia de demostración.'}
 ],
 results:[
  {id:'r1',candidate:'Candidatura de ejemplo A',role:'Concejal',municipality:'Chiriguaná',period:'2023',votes:450,source:'Dato ficticio para probar la interfaz'}
 ]
};
function futureDate(days){const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}
function loadData(){try{const x=JSON.parse(localStorage.getItem('politikMapData'));return x||structuredClone(DEMO)}catch{return structuredClone(DEMO)}}
let db=loadData(), maps={}, markers={}, baseLayers={}, activeMapStyle='streets';
let currentType=null,currentId=null;

// Supabase: la clave publicable es apta para el navegador; RLS limita cada cuenta a sus propios datos.
const SUPABASE_URL = window.POLITIK_SUPABASE_CONFIG?.url || '';
const SUPABASE_KEY = window.POLITIK_SUPABASE_CONFIG?.publishableKey || '';
const cloud = (window.supabase && SUPABASE_URL && SUPABASE_KEY)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;
let currentUser = null;
let realtimeChannel = null;
let cloudReady = false;
const CLOUD_TABLE = 'politik_map_records';
const COLLECTION_TYPES = {leaders:'leader',officials:'official',places:'place',events:'event',results:'result'};
const TYPE_COLLECTIONS = {leader:'leaders',official:'officials',place:'places',event:'events',result:'results'};
function setAuthMessage(message,isError=false){const el=document.getElementById('authMessage');if(el){el.textContent=message;el.style.color=isError?'#c24141':'#3267e9'}}
function setAuthBusy(busy){const b=document.getElementById('authLoginBtn');if(b){b.disabled=busy;b.textContent=busy?'Conectando…':'Iniciar sesión'}}
function emptyDatabase(){return {leaders:[],officials:[],places:[],events:[],results:[]}}
function localCustomRows(){
 const local=loadData(), demoIds=new Set(Object.values(DEMO).flat().map(x=>String(x.id)));
 const rows=[];
 for(const [collection,type] of Object.entries(COLLECTION_TYPES)){
  for(const item of (local[collection]||[])) if(!demoIds.has(String(item.id))) rows.push({record_type:type,record_id:String(item.id),payload:item});
 }
 return rows;
}
async function loadCloudData(showMessage=true){
 if(!cloud||!currentUser)return;
 const {data,error}=await cloud.from(CLOUD_TABLE).select('record_type,record_id,payload').eq('user_id',currentUser.id);
 if(error){if(showMessage)toast('No se pudieron cargar los registros: '+error.message);return}
 const next=emptyDatabase();
 for(const row of (data||[])){
  const collection=TYPE_COLLECTIONS[row.record_type];
  if(collection&&row.payload)next[collection].push({...row.payload,id:row.record_id});
 }
 // Importa registros locales creados por el usuario, excluyendo los ejemplos ficticios.
 if((data||[]).length===0){
  const legacy=localCustomRows();
  if(legacy.length){
   const payload=legacy.map(r=>({...r,user_id:currentUser.id}));
   const {error:importError}=await cloud.from(CLOUD_TABLE).upsert(payload,{onConflict:'user_id,record_type,record_id'});
   if(importError){toast('No se pudieron importar los registros locales: '+importError.message);}
   else for(const r of legacy){const col=TYPE_COLLECTIONS[r.record_type];next[col].push(r.payload)}
  }
 }
 db=next;localStorage.setItem('politikMapData',JSON.stringify(db));cloudReady=true;renderAll();
 if(showMessage)toast('Datos sincronizados con Supabase');
}
async function cloudUpsert(type,item){
 if(!cloud||!currentUser||!cloudReady)return {error:new Error('Inicia sesión para guardar en la nube')};
 const row={user_id:currentUser.id,record_type:type,record_id:String(item.id),payload:item,updated_at:new Date().toISOString()};
 return await cloud.from(CLOUD_TABLE).upsert(row,{onConflict:'user_id,record_type,record_id'});
}
async function cloudDelete(type,id){
 if(!cloud||!currentUser||!cloudReady)return {error:new Error('No hay una sesión activa')};
 return await cloud.from(CLOUD_TABLE).delete().eq('user_id',currentUser.id).eq('record_type',type).eq('record_id',String(id));
}
async function startRealtime(){
 if(!cloud||!currentUser)return;
 if(realtimeChannel)await cloud.removeChannel(realtimeChannel);
 realtimeChannel=cloud.channel('politik-map-sync-'+currentUser.id)
  .on('postgres_changes',{event:'*',schema:'public',table:CLOUD_TABLE,filter:'user_id=eq.'+currentUser.id},()=>loadCloudData(false))
  .subscribe();
}
async function activateSession(session){
 if(!session?.user||!cloud)return;
 if(currentUser?.id===session.user.id&&cloudReady)return;
 currentUser=session.user;cloudReady=false;
 document.getElementById('authGate')?.classList.add('hidden');
 const profile=document.querySelector('.profile small');if(profile)profile.textContent=session.user.email||'Cuenta autenticada';
 await loadCloudData(true);await startRealtime();
}
async function handleAuthSubmit(e){
 e.preventDefault();if(!cloud){setAuthMessage('Falta configurar Supabase en supabase-config.js.',true);return}
 const email=document.getElementById('authEmail').value.trim();const password=document.getElementById('authPassword').value;
 setAuthBusy(true);setAuthMessage('Verificando credenciales…');
 const {data,error}=await cloud.auth.signInWithPassword({email,password});
 setAuthBusy(false);
 if(error){setAuthMessage(error.message,true);return}
 if(data.session)await activateSession(data.session);
}
async function handleSignup(){
 if(!cloud){setAuthMessage('Falta configurar Supabase en supabase-config.js.',true);return}
 const email=document.getElementById('authEmail').value.trim();const password=document.getElementById('authPassword').value;
 if(!email||password.length<8){setAuthMessage('Escribe un correo válido y una contraseña de al menos 8 caracteres.',true);return}
 setAuthBusy(true);setAuthMessage('Creando cuenta…');
 const {data,error}=await cloud.auth.signUp({email,password});setAuthBusy(false);
 if(error){setAuthMessage(error.message,true);return}
 if(data.session)await activateSession(data.session);
 else setAuthMessage('Cuenta creada. Revisa tu correo para confirmar el registro y luego inicia sesión.');
}
async function initCloudAuth(){
 const gate=document.getElementById('authGate');
 document.getElementById('authForm')?.addEventListener('submit',handleAuthSubmit);
 document.getElementById('authSignupBtn')?.addEventListener('click',handleSignup);
 const logout=document.getElementById('logoutBtn');logout?.addEventListener('click',async()=>{if(cloud)await cloud.auth.signOut()});
 if(!cloud){gate?.classList.remove('hidden');setAuthMessage('No se encontró la configuración de Supabase. Revisa supabase-config.js.',true);return}
 const {data,error}=await cloud.auth.getSession();
 if(error){setAuthMessage(error.message,true);return}
 if(data.session)await activateSession(data.session);else gate?.classList.remove('hidden');
 cloud.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session)setTimeout(()=>activateSession(session),0);if(event==='SIGNED_OUT'){currentUser=null;cloudReady=false;db=emptyDatabase();renderAll();gate?.classList.remove('hidden')}});
}

const typeNames={leader:'Líder comunitario',official:'Representante',place:'Lugar',event:'Actividad',result:'Resultado agregado'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate=d=>d?new Date(d+'T12:00:00').toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}):'—';
const save=()=>{localStorage.setItem('politikMapData',JSON.stringify(db));renderAll()};
function toast(msg){const t=$('#toast');t.querySelector('span').textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function iconRefresh(){if(window.lucide)lucide.createIcons()}
function setView(v){$$('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+v));$$('.nav-item[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===v));$('#pageTitle').textContent=({dashboard:'Dashboard',map:'Mapa territorial',leaders:'Líderes comunitarios',officials:'Concejales y alcaldes',places:'Municipios y barrios',events:'Reuniones y eventos',results:'Resultados agregados',reports:'Informes',settings:'Configuración'})[v]||v;$('#sidebar').classList.remove('open');if(v==='map')setTimeout(()=>maps.main?.invalidateSize(),120);if(v==='dashboard')setTimeout(()=>maps.dashboard?.invalidateSize(),120)}
function statCard(label,value,ico,color,foot){return `<div class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon ${color}"><i data-lucide="${ico}"></i></span></div><div class="stat-value">${value}</div><div class="stat-foot">${foot}</div></div>`}
function renderDashboard(){
 $('#statsGrid').innerHTML=[
 statCard('Líderes registrados',db.leaders.length,'users','blue-bg','Registros en el directorio'),
 statCard('Concejales y alcaldes',db.officials.length,'landmark','purple-bg','Representantes registrados'),
 statCard('Lugares registrados',db.places.length,'map-pin','orange-bg','Municipios y sectores'),
 statCard('Actividades programadas',db.events.filter(e=>e.status==='Programada').length,'calendar-days','green-bg','Reuniones próximas')
 ].join('');
 const events=db.events.filter(e=>e.status==='Programada').sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);
 $('#upcomingList').innerHTML=events.length?events.map(e=>`<div class="activity-item"><div class="activity-date"><b>${new Date(e.date+'T12:00:00').getDate()}</b><small>${new Date(e.date+'T12:00:00').toLocaleDateString('es-CO',{month:'short'})}</small></div><div class="activity-info"><strong>${esc(e.name)}</strong><small>${esc(e.time)} · ${esc(e.neighborhood||e.municipality)}</small></div></div>`).join(''):'<div class="empty-state">No hay actividades programadas.</div>';
 const recent=[...db.leaders.map(x=>({...x,kind:'Líder'})),...db.officials.map(x=>({...x,kind:x.role})),...db.events.map(x=>({...x,kind:'Actividad'}))].slice(-5).reverse();
 $('#recentList').innerHTML=recent.length?recent.map(x=>`<div class="recent-row"><span>${esc(x.name)}</span><small>${esc(x.kind)}</small></div>`).join(''):'<div class="empty-state">Aún no hay registros.</div>';
 const cats=[['Líderes',db.leaders.length],['Representantes',db.officials.length],['Lugares',db.places.length],['Actividades',db.events.length]];
 const max=Math.max(1,...cats.map(x=>x[1]));
 $('#categoryChart').innerHTML=cats.map(([n,v])=>`<div><div class="bar-label"><span>${n}</span><b>${v}</b></div><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div></div>`).join('');
}
function personCell(name,sub){return `<div class="person-cell"><div class="mini-avatar">${esc((name||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase())}</div><div><strong>${esc(name)}</strong><small>${esc(sub||'')}</small></div></div>`}
function statusTag(s){let c=s==='Activo'||s==='Programada'?'':s==='Pendiente'?'pending':s==='Inactivo'||s==='Cancelada'?'inactive':'';return `<span class="status ${c}">${esc(s||'—')}</span>`}
function actions(type,id){return `<div class="row-actions"><button class="tiny-btn" title="Ver" onclick="showDetail('${type}','${id}')"><i data-lucide="eye"></i></button><button class="tiny-btn" title="Editar" onclick="openForm('${type}','${id}')"><i data-lucide="pencil"></i></button><button class="tiny-btn" title="Eliminar" onclick="deleteRecord('${type}','${id}')"><i data-lucide="trash-2"></i></button></div>`}
function renderTables(){
 $('#leadersTable tbody').innerHTML=db.leaders.map(x=>`<tr data-status="${esc(x.status)}"><td>${personCell(x.name,x.role)}</td><td>${esc(x.role)}</td><td>${esc(x.municipality)} · ${esc(x.neighborhood)}</td><td>${statusTag(x.status)}</td><td>${x.lat!=null&&x.lng!=null?'<span class="muted">Punto marcado</span>':'—'}</td><td>${actions('leader',x.id)}</td></tr>`).join('')||emptyRow(6);
 $('#officialsTable tbody').innerHTML=db.officials.map(x=>`<tr data-role="${esc(x.role)}"><td>${personCell(x.name,x.party)}</td><td>${esc(x.role)}</td><td>${esc(x.municipality)}</td><td>${esc(x.period||'—')}</td><td>${statusTag(x.status)}</td><td>${actions('official',x.id)}</td></tr>`).join('')||emptyRow(6);
 $('#resultsTable tbody').innerHTML=db.results.map(x=>`<tr><td><strong>${esc(x.candidate)}</strong></td><td>${esc(x.role)}</td><td>${esc(x.municipality)}</td><td>${esc(x.period)}</td><td><strong>${Number(x.votes||0).toLocaleString('es-CO')}</strong></td><td>${esc(x.source)}</td><td>${actions('result',x.id)}</td></tr>`).join('')||emptyRow(7);
}
function emptyRow(n){return `<tr><td colspan="${n}"><div class="empty-state">No hay registros para mostrar.</div></td></tr>`}
function renderPlaces(){$('#placesGrid').innerHTML=db.places.map(p=>`<article class="panel place-card"><div class="place-top"><div class="place-icon"><i data-lucide="${p.type==='Municipio'?'landmark':'map-pin'}"></i></div><div>${actions('place',p.id)}</div></div><h3>${esc(p.name)}</h3><p>${esc(p.description||'Sin descripción')}</p><div class="place-meta"><span>${esc(p.type)}</span><span>${esc(p.municipality)}, ${esc(p.department)}</span></div></article>`).join('')||'<div class="panel empty-state">Agrega el primer municipio o barrio.</div>'}
function renderEvents(){$('#eventsGrid').innerHTML=db.events.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`<article class="panel event-card"><div class="place-top"><span class="eyebrow">${fmtDate(e.date)}</span>${statusTag(e.status)}</div><h3>${esc(e.name)}</h3><p>${esc(e.description||'Sin descripción')}</p><div class="event-meta"><span><i data-lucide="clock"></i>${esc(e.time)}</span><span><i data-lucide="map-pin"></i>${esc(e.neighborhood||e.municipality)}</span></div><div class="place-top"><small class="muted">Responsable: ${esc(e.organizer)}</small>${actions('event',e.id)}</div></article>`).join('')||'<div class="panel empty-state">No hay actividades registradas.</div>'}
function renderAll(){renderDashboard();renderTables();renderPlaces();renderEvents();$('#storageCount').textContent=Object.values(db).reduce((a,x)=>a+x.length,0)+' registros';refreshMaps();iconRefresh();applyTableFilters()}
function getMapTilerKey(){return window.POLITIK_MAP_CONFIG?.maptilerKey||''}
function mapTileLayer(style){
 const key=getMapTilerKey();
 if(!key||key==='PEGA_AQUI_TU_NUEVA_CLAVE_MAPTILER') return null;
 // Calles: Maps API. Satélite: Tiles API (satellite-v4 pertenece a /tiles/, no a /maps/).
 const url = style==='satellite'
   ? `https://api.maptiler.com/tiles/satellite-v4/{z}/{x}/{y}.jpg?key=${encodeURIComponent(key)}`
   : `https://api.maptiler.com/maps/streets-v4/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`;
 return L.tileLayer(url,{
   minZoom:1,maxZoom:20,crossOrigin:true,
   attribution:'<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
 });
}
function setMapStatus(msg){const el=document.getElementById('mapStatus');if(el)el.textContent=msg}
function addBaseLayer(map,style){
 const layer=mapTileLayer(style);
 if(!layer){setMapStatus('Falta configurar la clave de MapTiler en config.js.');return}
 const key=map._politikMapId||'dashboard';
 if(baseLayers[key])map.removeLayer(baseLayers[key]);
 layer.addTo(map);baseLayers[key]=layer;
 layer.on('tileerror',()=>setMapStatus('No se pudieron cargar los mapas. Revisa la clave API, sus permisos y la cuota de MapTiler.'));
}
function initMap(id,center,zoom){if(!window.L)return null;const map=L.map(id,{scrollWheelZoom:false}).setView([center.lat,center.lng],zoom);map._politikMapId=id==='mainMap'?'main':'dashboard';addBaseLayer(map,id==='mainMap'?activeMapStyle:'streets');return map}
function markerIcon(color){return L.divIcon({className:'custom-pin',html:`<div style="width:15px;height:15px;border:3px solid white;border-radius:50%;background:${color};box-shadow:0 1px 7px #17233b88"></div>`,iconSize:[15,15],iconAnchor:[7,7]})}
function refreshMaps(){if(!window.L)return;for(const [key,map] of Object.entries(maps)){if(!map)continue;if(markers[key])markers[key].clearLayers();else markers[key]=L.layerGroup().addTo(map);
 const add=(x,type,color,title,sub)=>{if(x.lat==null||x.lng==null||x.lat===''||x.lng===''||!Number.isFinite(Number(x.lat))||!Number.isFinite(Number(x.lng)))return;const m=L.marker([+x.lat,+x.lng],{icon:markerIcon(color)});m.bindPopup(`<strong>${esc(title)}</strong><br><small>${esc(sub)}</small>`);m.addTo(markers[key])};
 const filters=key==='main'?$$('.map-filter:checked').map(x=>x.value):['leader','event','official'];
 if(filters.includes('leader'))db.leaders.forEach(x=>{
  if(x.lat==null||x.lng==null||x.lat===''||x.lng===''||!Number.isFinite(Number(x.lat))||!Number.isFinite(Number(x.lng)))return;
  const m=L.marker([+x.lat,+x.lng],{icon:markerIcon('#3974ef')});
  const place=[x.meeting_point,x.neighborhood,x.municipality,x.department].filter(Boolean).join(' · ');
  const aggregate=`<div class="map-popup-metrics"><span><b>${Number(x.estimated_votes||0).toLocaleString('es-CO')}</b> votos estimados</span><span><b>${Number(x.representatives_count||0)}</b> representantes</span></div>`;
  m.bindPopup(`<div class="map-popup"><strong>${esc(x.name)}</strong><small>${esc(x.role||'Líder comunitario')}</small><p>${esc(place)}</p>${aggregate}<button type="button" class="map-popup-action" onclick="showDetail('leader','${esc(x.id)}')">Ver ficha completa</button></div>`);
  m.addTo(markers[key]);
 });
 if(filters.includes('event'))db.events.forEach(x=>add(x,'event','#1aa879',x.name,`${fmtDate(x.date)} · ${x.place}`));
 if(filters.includes('official'))db.officials.forEach(x=>add(x,'official','#9065db',x.name,`${x.role} · ${x.municipality}`));
 }}
function initMaps(){maps.dashboard=initMap('dashboardMap',CHIRI,13);maps.main=initMap('mainMap',CHIRI,13);refreshMaps();setTimeout(()=>Object.values(maps).forEach(m=>m?.invalidateSize()),250)}
const CO_DEPARTMENTS=['Amazonas','Antioquia','Arauca','Atlántico','Bogotá D.C.','Bolívar','Boyacá','Caldas','Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca','Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño','Norte de Santander','Putumayo','Quindío','Risaralda','San Andrés y Providencia','Santander','Sucre','Tolima','Valle del Cauca','Vaupés','Vichada'];
function setupTerritorySelector(){
 const sel=$('#departmentSelect');if(!sel)return;
 sel.innerHTML=CO_DEPARTMENTS.map(d=>`<option value="${esc(d)}" ${d==='Cesar'?'selected':''}>${esc(d)}</option>`).join('');
 const input=$('#mapSearch'),list=$('#placeSuggestions');let debounce;
 async function searchPlaces(){
  const q=input.value.trim();if(q.length<3){list.classList.remove('open');return}
  const key=getMapTilerKey();
  if(!key||key==='PEGA_AQUI_TU_NUEVA_CLAVE_MAPTILER'){setMapStatus('Configura tu clave de MapTiler en config.js para activar la búsqueda de municipios.');return}
  const dept=sel.value;
  setMapStatus('Buscando lugares…');
  try{
   const query=encodeURIComponent(`${q}, ${dept}, Colombia`);
   const url=`https://api.maptiler.com/geocoding/${query}.json?key=${encodeURIComponent(key)}&country=co&language=es&limit=6`;
   const res=await fetch(url);if(!res.ok)throw new Error('Geocodificación no disponible');
   const data=await res.json();const features=data.features||[];
   list.innerHTML=features.map((f,i)=>`<button type="button" class="suggestion-item" data-result="${i}">${esc(f.place_name||f.text||q)}<small>Seleccionar ubicación</small></button>`).join('');
   if(!features.length)list.innerHTML='<div class="suggestion-item">No se encontraron resultados. Prueba con municipio y departamento.</div>';
   list.classList.add('open');setMapStatus(features.length?'Selecciona un resultado para centrar el mapa.':'No se encontraron coincidencias.');
   list.querySelectorAll('[data-result]').forEach(btn=>btn.addEventListener('click',()=>{const f=features[Number(btn.dataset.result)];const [lng,lat]=f.center||f.geometry?.coordinates||[];if(Number.isFinite(lat)&&Number.isFinite(lng)){maps.main.setView([lat,lng],13);input.value=f.place_name||f.text;list.classList.remove('open');setMapStatus(`Mapa centrado en ${input.value}.`);}}));
  }catch(err){setMapStatus('No fue posible buscar el municipio. Verifica la clave y la conexión.');list.classList.remove('open')}
 }
 input.addEventListener('input',()=>{clearTimeout(debounce);debounce=setTimeout(searchPlaces,450)});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchPlaces()}});
 $('#locatePlace').addEventListener('click',searchPlaces);
 document.addEventListener('click',e=>{if(!e.target.closest('.municipality-field'))list.classList.remove('open')});
}
function setMapStyle(style){
 activeMapStyle=style;if(maps.main)addBaseLayer(maps.main,style);
 $$('.map-style-btn').forEach(b=>b.classList.toggle('active',b.dataset.mapStyle===style));
 setMapStatus(style==='satellite'?'Vista satelital seleccionada.':'Mapa de calles seleccionado.');
 setTimeout(()=>maps.main?.invalidateSize(),100);
}

const field=(name,label,type='text',opts={})=>({name,label,type,...opts});
function schema(type){const commonLoc=[field('municipality','Municipio'),field('department','Departamento',{type:'text',default:'Cesar'})];
 if(type==='leader')return [
  field('name','Nombre completo','text',{required:true}),
  field('role','Función comunitaria','select',{options:['Líder comunitario','Coordinador comunitario','Representante barrial','Junta de Acción Comunal','Otro']}),
  field('department','Departamento','select',{options:CO_DEPARTMENTS,default:'Cesar',required:true}),
  field('municipality','Municipio','text',{placeholder:'Ej. Chiriguaná',required:true}),
  field('neighborhood','Barrio o sector','text',{placeholder:'Ej. Los Laureles o Iglesia Divino Niño',required:true}),
  field('meeting_point','Punto de encuentro / referencia','text',{placeholder:'Ej. Iglesia Divino Niño, parque o salón comunal'}),
  field('status','Estado','select',{options:['Activo','Pendiente','Inactivo'],default:'Activo'}),
  field('phone','Teléfono de contacto','tel',{placeholder:'Número autorizado'}),
  field('whatsapp','WhatsApp','tel',{placeholder:'Número con indicativo, si aplica'}),
  field('estimated_votes','Votos estimados que reporta el líder','number',{default:0,min:0,help:'Cifra global aproximada; no registrar nombres ni preferencias de votantes.'}),
  field('representatives_count','Cantidad de representantes asociados','number',{default:0,min:0}),
  field('lat','Latitud aproximada','number',{placeholder:'Se completa al buscar o marcar el punto'}),
  field('lng','Longitud aproximada','number',{placeholder:'Se completa al buscar o marcar el punto'}),
  field('notes','Observaciones','textarea',{full:true,placeholder:'Notas relevantes y autorizadas'})
 ];
 if(type==='official')return [field('name','Nombre completo'),field('role','Cargo','select',{options:['Concejal','Alcalde','Otro']}),...commonLoc,field('period','Periodo electoral'),field('party','Partido o movimiento (opcional)'),field('status','Estado','select',{options:['Activo','Inactivo','Histórico']}),field('lat','Latitud de referencia','number',{default:CHIRI.lat}),field('lng','Longitud de referencia','number',{default:CHIRI.lng}),field('notes','Notas','textarea',{full:true})];
 if(type==='place')return [field('name','Nombre del lugar'),field('type','Tipo','select',{options:['Municipio','Barrio','Corregimiento','Vereda','Sector']}),...commonLoc,field('description','Descripción','textarea',{full:true}),field('lat','Latitud aproximada','number',{default:CHIRI.lat}),field('lng','Longitud aproximada','number',{default:CHIRI.lng})];
 if(type==='event')return [field('name','Nombre de la actividad'),field('date','Fecha','date'),field('time','Hora','time'),...commonLoc,field('neighborhood','Barrio o sector'),field('place','Lugar de encuentro'),field('organizer','Responsable'),field('status','Estado','select',{options:['Programada','Realizada','Cancelada']}),field('lat','Latitud del lugar público','number',{default:CHIRI.lat}),field('lng','Longitud del lugar público','number',{default:CHIRI.lng}),field('description','Descripción','textarea',{full:true})];
 if(type==='result')return [field('candidate','Nombre de candidatura'),field('role','Cargo','select',{options:['Concejal','Alcalde','Otro']}),...commonLoc,field('period','Periodo electoral'),field('votes','Votos oficiales agregados','number'),field('source','Fuente verificable (URL o referencia)','text',{full:true})];
}
let leaderPickerMap=null,leaderPickerMarker=null;
function renderField(f,item){
 let value=item?.[f.name]??f.default??'';
 let control='';
 if(f.type==='select'){
  control=`<select name="${f.name}" ${f.required?'required':''}>${(f.options||[]).map(o=>`<option value="${esc(o)}" ${String(o)===String(value)?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
 }else if(f.type==='textarea'){
  control=`<textarea name="${f.name}" placeholder="${esc(f.placeholder||'')}">${esc(value)}</textarea>`;
 }else{
  const min=f.min!==undefined?`min="${f.min}"`:'';
  control=`<input name="${f.name}" type="${f.type||'text'}" value="${esc(value)}" ${f.required?'required':''} ${f.type==='number'?'step="any"':''} ${min} placeholder="${esc(f.placeholder||'')}">`;
 }
 return `<div class="field ${f.full?'full':''}"><label>${esc(f.label)}</label>${control}${f.help?`<small class="field-help">${esc(f.help)}</small>`:''}</div>`;
}
function closeLeaderPicker(){
 if(leaderPickerMap){leaderPickerMap.off();leaderPickerMap.remove();leaderPickerMap=null;leaderPickerMarker=null}
}
function setLeaderCoordinates(lat,lng,zoom=true){
 const latInput=$('#formFields [name="lat"]'),lngInput=$('#formFields [name="lng"]');
 if(!latInput||!lngInput)return;
 latInput.value=Number(lat).toFixed(6);lngInput.value=Number(lng).toFixed(6);
 if(leaderPickerMap){
  const point=[Number(lat),Number(lng)];
  if(leaderPickerMarker)leaderPickerMarker.setLatLng(point);
  else leaderPickerMarker=L.marker(point,{draggable:true}).addTo(leaderPickerMap);
  if(zoom)leaderPickerMap.setView(point,17);
 }
}
function initLeaderPicker(item){
 const el=$('#leaderLocationMap');if(!el||!window.L)return;
 const lat=Number(item?.lat),lng=Number(item?.lng);
 const hasCoords=item?.lat!=null&&item?.lng!=null&&item.lat!==''&&item.lng!==''&&Number.isFinite(lat)&&Number.isFinite(lng);
 const center=hasCoords?{lat,lng}:CHIRI;
 leaderPickerMap=L.map(el,{scrollWheelZoom:false}).setView([center.lat,center.lng],hasCoords?16:14);
 const layer=mapTileLayer(activeMapStyle)||L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'});
 layer.addTo(leaderPickerMap);
 if(hasCoords){leaderPickerMarker=L.marker([lat,lng],{draggable:true}).addTo(leaderPickerMap);}
 const sync=()=>{if(leaderPickerMarker){const p=leaderPickerMarker.getLatLng();setLeaderCoordinates(p.lat,p.lng,false)}};
 leaderPickerMap.on('click',e=>{if(leaderPickerMarker)leaderPickerMarker.setLatLng(e.latlng);else leaderPickerMarker=L.marker(e.latlng,{draggable:true}).addTo(leaderPickerMap);setLeaderCoordinates(e.latlng.lat,e.latlng.lng,false)});
 if(leaderPickerMarker)leaderPickerMarker.on('dragend',sync);
 setTimeout(()=>leaderPickerMap?.invalidateSize(),100);
}
async function searchLeaderLocation(){
 const neighborhood=$('#formFields [name="neighborhood"]')?.value.trim();
 const meeting=$('#formFields [name="meeting_point"]')?.value.trim();
 const municipality=$('#formFields [name="municipality"]')?.value.trim();
 const department=$('#formFields [name="department"]')?.value.trim();
 const query=[meeting,neighborhood,municipality,department,'Colombia'].filter(Boolean).join(', ');
 const status=$('#leaderGeoStatus');const key=getMapTilerKey();
 if(!neighborhood||!municipality){if(status)status.textContent='Escribe primero el municipio y el barrio o sector.';return}
 if(!key||key==='PEGA_AQUI_TU_NUEVA_CLAVE_MAPTILER'){if(status)status.textContent='No se encontró la clave de MapTiler. Puedes marcar el punto directamente en el mapa.';return}
 const btn=$('#leaderGeocodeBtn');if(btn){btn.disabled=true;btn.textContent='Buscando…'}
 if(status)status.textContent='Buscando la referencia en el mapa…';
 try{
  const url=`https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${encodeURIComponent(key)}&country=co&language=es&limit=5`;
  const response=await fetch(url);if(!response.ok)throw new Error(`MapTiler respondió ${response.status}`);
  const data=await response.json();const results=data.features||[];const select=$('#leaderGeoResults');
  if(!results.length){if(status)status.textContent='No se encontró esa referencia exacta. Acércate al mapa y haz clic en el punto correcto.';return}
  select.innerHTML='<option value="">Selecciona el lugar encontrado…</option>'+results.map((f,i)=>`<option value="${i}">${esc(f.place_name||f.text||query)}</option>`).join('');
  select.classList.remove('hidden');select._features=results;
  if(results.length===1){select.value='0';applyLeaderGeoResult(select)}
  if(status)status.textContent='Selecciona el resultado correcto. La ubicación es aproximada; verifica el punto en el mapa.';
 }catch(error){if(status)status.textContent='No fue posible buscar automáticamente. Marca el punto manualmente en el mapa.'}
 finally{if(btn){btn.disabled=false;btn.textContent='Buscar referencia'}}
}
function applyLeaderGeoResult(select){
 const feature=select?._features?.[Number(select.value)];if(!feature)return;
 const coords=feature.center||feature.geometry?.coordinates||[];const [lng,lat]=coords;
 if(Number.isFinite(lat)&&Number.isFinite(lng)){setLeaderCoordinates(lat,lng,true);const status=$('#leaderGeoStatus');if(status)status.textContent=`Punto seleccionado: ${feature.place_name||feature.text||'ubicación'}. Puedes ajustar el marcador arrastrándolo o haciendo clic en el mapa.`}
}
function openForm(type,id=null){
 closeLeaderPicker();currentType=type;currentId=id;
 const item=id?getCollection(type).find(x=>x.id===id):{};
 $('#modalTitle').textContent=(id?'Editar ':'Registrar ')+typeNames[type];
 $('#modalEyebrow').textContent=id?'ACTUALIZAR INFORMACIÓN':'NUEVO REGISTRO';
 $('#formFields').innerHTML=schema(type).map(f=>renderField(f,item)).join('');
 if(type==='leader'){
  $('#formFields').insertAdjacentHTML('beforeend',`<div class="field full leader-location-tools"><label>Ubicación en el mapa</label><div class="leader-geo-row"><button type="button" class="secondary-btn" id="leaderGeocodeBtn"><i data-lucide="search"></i> Buscar referencia</button><select id="leaderGeoResults" class="hidden"><option value="">Selecciona el lugar encontrado…</option></select></div><small id="leaderGeoStatus" class="field-help">Escribe municipio y barrio/sector, busca la referencia y selecciona el resultado. También puedes hacer clic en el mapa para fijar el punto manualmente.</small><div id="leaderLocationMap" class="leader-location-map"></div></div>`);
 }
 $('#modalBackdrop').classList.add('open');iconRefresh();
 if(type==='leader'){
  setTimeout(()=>initLeaderPicker(item),80);
  $('#leaderGeocodeBtn').addEventListener('click',searchLeaderLocation);
  $('#leaderGeoResults').addEventListener('change',e=>applyLeaderGeoResult(e.target));
  ['lat','lng'].forEach(name=>$('#formFields [name="'+name+'"]').addEventListener('change',()=>{const lat=Number($('#formFields [name="lat"]').value),lng=Number($('#formFields [name="lng"]').value);if(Number.isFinite(lat)&&Number.isFinite(lng))setLeaderCoordinates(lat,lng,true)}));
 }
}
function getCollection(type){return ({leader:db.leaders,official:db.officials,place:db.places,event:db.events,result:db.results})[type]}
$('#recordForm').addEventListener('submit',async e=>{
 e.preventDefault();const data=Object.fromEntries(new FormData(e.target).entries());
 schema(currentType).forEach(f=>{if(f.type==='number')data[f.name]=data[f.name]===''?null:Number(data[f.name])});
 if(currentType==='leader'){
  if((data.lat==null)!==(data.lng==null)){toast('Completa ambas coordenadas o deja las dos vacías.');return}
  if(data.lat!=null&&(data.lat < -90||data.lat > 90||data.lng < -180||data.lng > 180)){toast('Las coordenadas no son válidas.');return}
 }
 const col=getCollection(currentType);const previous=currentId?{...col.find(x=>x.id===currentId)}:null;let item;
 if(currentId){const i=col.findIndex(x=>x.id===currentId);col[i]={...col[i],...data};item=col[i]}else{item={id:crypto.randomUUID(),...data};col.push(item)}
 const cloudType=COLLECTION_TYPES[({leader:'leaders',official:'officials',place:'places',event:'events',result:'results'})[currentType]];
 const result=await cloudUpsert(cloudType,item);
 if(result.error){if(currentId){const i=col.findIndex(x=>x.id===currentId);if(i>=0)col[i]=previous}else{const i=col.findIndex(x=>x.id===item.id);if(i>=0)col.splice(i,1)}renderAll();toast('No se pudo guardar en Supabase: '+result.error.message);return}
 $('#modalBackdrop').classList.remove('open');closeLeaderPicker();save();toast('Registro guardado y sincronizado');
});
function closeModal(){$('#modalBackdrop').classList.remove('open');closeLeaderPicker()}
async function deleteRecord(type,id){if(!confirm('¿Seguro que deseas eliminar este registro?'))return;const c=getCollection(type);const i=c.findIndex(x=>x.id===id);if(i>=0)c.splice(i,1);save();const cloudType=COLLECTION_TYPES[({leader:'leaders',official:'officials',place:'places',event:'events',result:'results'})[type]];const result=await cloudDelete(cloudType,id);if(result.error)toast('Eliminado localmente, pero falló la nube: '+result.error.message);else toast('Registro eliminado y sincronizado')}
window.openForm=openForm;window.deleteRecord=deleteRecord;
function showDetail(type,id){const x=getCollection(type).find(a=>a.id===id);if(!x)return;$('#detailTitle').textContent=x.name||x.candidate||'Detalle';$('#detailContent').innerHTML=Object.entries(x).filter(([k,v])=>k!=='id'&&v!==''&&v!==null&&v!==undefined).map(([k,v])=>`<div class="detail-line"><small>${esc(({name:'Nombre',role:'Cargo o función',municipality:'Municipio',department:'Departamento',neighborhood:'Barrio',status:'Estado',phone:'Teléfono',date:'Fecha',time:'Hora',place:'Lugar',organizer:'Responsable',votes:'Votos agregados',source:'Fuente',period:'Periodo',candidate:'Candidatura',lat:'Latitud aproximada',lng:'Longitud aproximada',notes:'Observaciones',meeting_point:'Punto de encuentro',whatsapp:'WhatsApp',estimated_votes:'Estimación agregada reportada',representatives_count:'Cantidad de representantes asociados',description:'Descripción',party:'Organización',type:'Tipo',sector:'Sector'}[k]||k))}</small><strong>${esc(v)}</strong></div>`).join('')+`<div class="drawer-actions"><button class="secondary-btn" onclick="openForm('${type}','${id}')">Editar</button></div>`;$('#detailDrawer').classList.add('open');$('#drawerScrim').classList.add('open')}
window.showDetail=showDetail;
function applyTableFilters(){const l=$('#leaderStatusFilter')?.value||'';$$('#leadersTable tbody tr').forEach(r=>r.style.display=(!l||r.dataset.status===l)?'':'none');const o=$('#officialTypeFilter')?.value||'';$$('#officialsTable tbody tr').forEach(r=>r.style.display=(!o||r.dataset.role===o)?'':'none')}
$$('.table-search').forEach(inp=>inp.addEventListener('input',()=>{const q=inp.value.toLowerCase();const table=$('#'+inp.dataset.table);table.querySelectorAll('tbody tr').forEach(r=>r.style.display=r.innerText.toLowerCase().includes(q)?'':'none')}));
$('#leaderStatusFilter').addEventListener('change',applyTableFilters);$('#officialTypeFilter').addEventListener('change',applyTableFilters);
function globalSearch(q){if(!q.trim())return;const all=[...db.leaders.map(x=>({...x,_type:'leader'})),...db.officials.map(x=>({...x,_type:'official'})),...db.places.map(x=>({...x,_type:'place'})),...db.events.map(x=>({...x,_type:'event'})),...db.results.map(x=>({...x,_type:'result'}))];const hit=all.find(x=>Object.values(x).some(v=>String(v).toLowerCase().includes(q.toLowerCase())));if(hit){setView(({leader:'leaders',official:'officials',place:'places',event:'events',result:'results'})[hit._type]);if(hit.lat&&maps.main){setView('map');maps.main.setView([hit.lat,hit.lng],15)}else showDetail(hit._type,hit.id)}else toast('No se encontraron coincidencias')}
$('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){globalSearch(e.target.value);e.target.blur()}});

$$('.map-filter').forEach(x=>x.addEventListener('change',refreshMaps));
$$('.map-style-btn').forEach(b=>b.addEventListener('click',()=>setMapStyle(b.dataset.mapStyle)));
$('#centerMap').addEventListener('click',()=>maps.main?.setView([CHIRI.lat,CHIRI.lng],13));
function csvDownload(name,rows){const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)}
$('#exportAll').addEventListener('click',()=>{const rows=[['Categoría','Nombre','Cargo/función','Municipio','Barrio','Fecha/periodo','Estado','Dato agregado/fuente'],...db.leaders.map(x=>['Líder',x.name,x.role,x.municipality,x.neighborhood,x.meeting_point||'',x.status,`${x.estimated_votes||0} estimación agregada; ${x.representatives_count||0} representantes; Tel. ${x.phone||''}; WhatsApp ${x.whatsapp||''}; Coordenadas ${x.lat??''}, ${x.lng??''}; ${x.notes||''}`]),...db.officials.map(x=>['Representante',x.name,x.role,x.municipality,'',x.period,x.status,x.party]),...db.events.map(x=>['Actividad',x.name,'',x.municipality,x.neighborhood,x.date,x.status,x.place]),...db.results.map(x=>['Resultado',x.candidate,x.role,x.municipality,'',x.period,'',`${x.votes} votos | ${x.source}`])];csvDownload('politik-map-registros.csv',rows);toast('Exportación CSV preparada')});
$('#backupData').addEventListener('click',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));a.download='politik-map-respaldo.json';a.click();URL.revokeObjectURL(a.href);toast('Respaldo descargado')});
$('#printReport').addEventListener('click',()=>{setView('dashboard');window.print()});
$('#resetDemo').addEventListener('click',()=>{if(confirm('Esto reemplazará los registros actuales por los datos ficticios de demostración. ¿Continuar?')){db=structuredClone(DEMO);save();toast('Datos de demostración restaurados')}});
$('#quickAdd').addEventListener('click',()=>openForm('leader'));
$$('[data-add]').forEach(b=>b.addEventListener('click',()=>openForm(b.dataset.add)));
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$$('[data-goto]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.goto)));
$('#closeModal').addEventListener('click',closeModal);$('#cancelModal').addEventListener('click',closeModal);$('#modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal()});
$('#closeDrawer').addEventListener('click',()=>{$('#detailDrawer').classList.remove('open');$('#drawerScrim').classList.remove('open')});$('#drawerScrim').addEventListener('click',()=>{$('#detailDrawer').classList.remove('open');$('#drawerScrim').classList.remove('open')});
$('#themeToggle').addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('politikMapDark',document.body.classList.contains('dark'))});
if(localStorage.getItem('politikMapDark')==='true')document.body.classList.add('dark');
$('#menuToggle').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$('#todayLabel').textContent=new Date().toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus()}if(e.key==='Escape'){closeModal();$('#detailDrawer').classList.remove('open');$('#drawerScrim').classList.remove('open')}});
initMaps();setupTerritorySelector();renderAll();iconRefresh();initCloudAuth();
