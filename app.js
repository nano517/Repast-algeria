import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';
import { ARTIFACTS } from './data/sites.js';

const $=s=>document.querySelector(s);
const canvas=$('#scene');
let renderer,scene,camera,controls,clock,loader,siteGroup;
let eraGroups={present:null,reconstruction:null,past:null};
let currentEra='present',transition=0,started=false,selectedArtifact=null;
let raycaster,pointer;
const discovered=new Set(JSON.parse(localStorage.getItem('repast-discovered')||'[]'));
const state={move:{x:0,y:0},keys:{forward:false,back:false,left:false,right:false}};

function createAlgeriaMap(){
  $('#algeriaMap').innerHTML=`<svg viewBox="0 0 700 800" aria-hidden="true"><defs><linearGradient id="land" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#29312e"/><stop offset="1" stop-color="#171d1c"/></linearGradient></defs><path d="M230 38 L330 30 L397 61 L472 72 L523 121 L578 146 L592 205 L558 250 L568 305 L531 355 L548 421 L510 474 L478 530 L445 591 L424 670 L374 748 L305 771 L271 733 L226 720 L205 676 L166 647 L171 594 L145 551 L160 501 L131 462 L152 416 L143 373 L176 337 L158 291 L190 252 L171 206 L194 169 L182 128 L215 99 Z" fill="url(#land)" stroke="#56615a" stroke-width="3"/><path d="M190 252 Q340 215 560 250 M160 416 Q335 385 548 421 M166 647 Q300 620 445 591" fill="none" stroke="#69736b" stroke-width="1" opacity=".35"/><g fill="#8f968e" opacity=".55" font-family="DM Mono" font-size="12"><text x="205" y="180">ALGIERS</text><text x="470" y="225">CONSTANTINE</text><text x="470" y="415">BATNA</text><text x="245" y="535">LAGHOUAT</text><text x="325" y="690">TAMANRASSET</text></g></svg>`;
}

function init(){
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
 scene=new THREE.Scene(); scene.background=new THREE.Color(0x121716); scene.fog=new THREE.FogExp2(0x121716,.016);
 camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,700); camera.position.set(9,5.6,18);
 controls=new OrbitControls(camera,canvas); controls.enableDamping=true; controls.dampingFactor=.06; controls.enablePan=false; controls.minDistance=3; controls.maxDistance=80; controls.maxPolarAngle=Math.PI*.49;
 clock=new THREE.Clock(); loader=new GLTFLoader(); raycaster=new THREE.Raycaster(); pointer=new THREE.Vector2();
 const hemi=new THREE.HemisphereLight(0xc8d0c2,0x2b2016,1.45); scene.add(hemi);
 const sun=new THREE.DirectionalLight(0xffdfad,2.25); sun.position.set(-30,45,22); sun.castShadow=true; sun.shadow.mapSize.set(1536,1536); scene.add(sun);
 const fill=new THREE.PointLight(0xc49b61,16,75,2); fill.position.set(0,8,0); scene.add(fill);
 loadModels();
 addEvents(); animate();
}

function loadOne(url){return new Promise((resolve,reject)=>loader.load(url,g=>resolve(g.scene),undefined,reject));}
async function loadModels(){
 siteGroup=new THREE.Group(); scene.add(siteGroup);
 try{
  const [present,recon,past]=await Promise.all([
   loadOne('./assets/models/timgad_present.glb'),loadOne('./assets/models/timgad_reconstruction.glb'),loadOne('./assets/models/timgad_past.glb')
  ]);
  eraGroups.present=present; eraGroups.reconstruction=recon; eraGroups.past=past;
  for(const [name,g] of Object.entries(eraGroups)){
   g.visible=false; g.name=name; normalizeModel(g); siteGroup.add(g);
  }
  for(const a of ARTIFACTS){
   const marker=new THREE.Mesh(new THREE.SphereGeometry(.32,16,12),new THREE.MeshStandardMaterial({color:0xc7a66a,emissive:0x5d411c,emissiveIntensity:1.8}));
   marker.position.set(...a.position); marker.name='artifact'; marker.userData.artifact=a; siteGroup.add(marker);
  }
  setEra('present',true); $('#loading').classList.add('done');
 }catch(err){
  console.error(err); $('#loading').classList.add('done'); toast('MODEL LOAD FAILED · CHECK GITHUB PAGES PATHS');
 }
}
function normalizeModel(group){
 group.traverse(o=>{
  if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.transparent=true;o.material.opacity=1;o.material.depthWrite=true;}}
 });
 const box=new THREE.Box3().setFromObject(group); const center=box.getCenter(new THREE.Vector3()); group.position.sub(new THREE.Vector3(center.x,box.min.y,center.z));
}
function setOpacity(group,opacity){group.visible=opacity>0.01;group.traverse(o=>{if(o.isMesh&&o.material){o.material.opacity=opacity;o.material.transparent=true;o.material.depthWrite=opacity>.7;}})}
function applyEra(){
 const p=Math.max(0,1-transition*3.1), r=Math.min(1,Math.max(0,(transition-.08)/.5)), past=Math.min(1,Math.max(0,(transition-.55)/.45));
 if(eraGroups.present)setOpacity(eraGroups.present,p); if(eraGroups.reconstruction)setOpacity(eraGroups.reconstruction,r); if(eraGroups.past)setOpacity(eraGroups.past,past);
}
function setEra(era,immediate=false){
 currentEra=era; document.querySelector('.era.active')?.classList.remove('active'); document.querySelector(`.era[data-era="${era}"]`)?.classList.add('active'); transition={present:0,reconstruction:.52,past:1}[era]; if(immediate)applyEra(); $('#eraLabel').textContent=era.toUpperCase(); $('#eraYear').textContent=era==='present'?'TODAY':era==='reconstruction'?'LAYER BY LAYER':'100 AD'; $('#timeSlider').value=Math.round(transition*100);
}
function openSiteIntro(){$('#landing').classList.remove('active');$('#siteIntro').classList.add('active')}
function startSite(){ $('#siteIntro').classList.remove('active');$('#hud').classList.remove('hidden');started=true;camera.position.set(9,5.6,18);controls.target.set(0,2,0);setEra('present',true);toast('SITE ENTERED · WALK THROUGH TIMGAD') }
function exitSite(){started=false;$('#hud').classList.add('hidden');$('#siteIntro').classList.remove('active');$('#landing').classList.add('active')}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2400)}
function onPointerDown(e){if(!started)return;const rect=canvas.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(siteGroup.children,true).filter(h=>h.object.userData.artifact);if(hits.length)openArtifact(hits[0].object.userData.artifact)}
function openArtifact(a){selectedArtifact=a;$('#infoType').textContent='DISCOVERY · '+a.category.toUpperCase();$('#infoTitle').textContent=a.title;$('#infoText').textContent=a.text;$('#infoPanel').classList.remove('hidden');$('#discoverBtn').textContent=discovered.has(a.id)?'DISCOVERED':'ADD TO JOURNAL'}
function discoverSelected(){if(!selectedArtifact)return;if(!discovered.has(selectedArtifact.id)){discovered.add(selectedArtifact.id);localStorage.setItem('repast-discovered',JSON.stringify([...discovered]));toast('DISCOVERY SAVED · '+selectedArtifact.title.toUpperCase());updateJournal()}else toast('ALREADY IN YOUR JOURNAL');$('#discoverBtn').textContent='DISCOVERED'}
function updateJournal(){$('#discoverCount').textContent=discovered.size;$('#discoverTotal').textContent=ARTIFACTS.length;$('#journalList').innerHTML=ARTIFACTS.map(a=>{const ok=discovered.has(a.id);return `<article class="journal-item ${ok?'':'locked'}"><h4>${ok?a.title:'Undiscovered site detail'}</h4><p>${ok?a.text:'Explore the site and interact with the glowing marker to recover this entry.'}</p></article>`}).join('')}
function setupJoystick(){const joy=$('#joystick'),stick=joy.querySelector('.stick');let active=false,rect;const move=e=>{if(!active)return;const p=e.touches?e.touches[0]:e,dx=p.clientX-(rect.left+rect.width/2),dy=p.clientY-(rect.top+rect.height/2),max=38,len=Math.min(max,Math.hypot(dx,dy)),ang=Math.atan2(dy,dx),x=Math.cos(ang)*len,y=Math.sin(ang)*len;stick.style.transform=`translate(${x}px,${y}px)`;state.move.x=x/max;state.move.y=y/max};const end=()=>{active=false;state.move.x=0;state.move.y=0;stick.style.transform='translate(0,0)'};joy.addEventListener('touchstart',e=>{active=true;rect=joy.getBoundingClientRect();move(e)},{passive:false});joy.addEventListener('touchmove',e=>{e.preventDefault();move(e)},{passive:false});joy.addEventListener('touchend',end)}
function addEvents(){
 createAlgeriaMap(); setupJoystick(); updateJournal();
 $('#timgadPin').onclick=openSiteIntro;$('#timgadPin').onkeydown=e=>{if(e.key==='Enter')openSiteIntro};$('#enterTimgad').onclick=startSite;$('#backMap').onclick=()=>{$('#siteIntro').classList.remove('active');$('#landing').classList.add('active')};$('#exitSite').onclick=exitSite;$('#journalBtn').onclick=()=>$('#journal').classList.add('open');$('#journalHudBtn').onclick=()=>$('#journal').classList.add('open');$('#closeJournal').onclick=()=>$('#journal').classList.remove('open');$('#closeInfo').onclick=()=>$('#infoPanel').classList.add('hidden');$('#discoverBtn').onclick=discoverSelected;
 document.querySelectorAll('.era').forEach(b=>b.onclick=()=>setEra(b.dataset.era)); $('#timeSlider').addEventListener('input',e=>{transition=+e.target.value/100;applyEra();if(transition<.3){$('#eraLabel').textContent='PRESENT';$('#eraYear').textContent='TODAY'}else if(transition<.72){$('#eraLabel').textContent='RECONSTRUCTION';$('#eraYear').textContent='LAYER BY LAYER'}else{$('#eraLabel').textContent='PAST';$('#eraYear').textContent='100 AD'}});
 canvas.addEventListener('pointerdown',onPointerDown);window.addEventListener('resize',resize);window.addEventListener('keydown',e=>{if(e.key==='Escape')$('#journal').classList.remove('open');state.keys.forward=['w','ArrowUp'].includes(e.key);state.keys.back=['s','ArrowDown'].includes(e.key);state.keys.left=['a','ArrowLeft'].includes(e.key);state.keys.right=['d','ArrowRight'].includes(e.key)});window.addEventListener('keyup',e=>{if(['w','ArrowUp'].includes(e.key))state.keys.forward=false;if(['s','ArrowDown'].includes(e.key))state.keys.back=false;if(['a','ArrowLeft'].includes(e.key))state.keys.left=false;if(['d','ArrowRight'].includes(e.key))state.keys.right=false});
}
function walk(){if(!started)return;const f=(state.move.y<-.15||state.keys.forward?1:0)-(state.move.y>.15||state.keys.back?1:0),s=(state.move.x>.15||state.keys.right?1:0)-(state.move.x<-.15||state.keys.left?1:0);if(!f&&!s)return;const speed=.055,dir=new THREE.Vector3();camera.getWorldDirection(dir);dir.y=0;dir.normalize();const side=new THREE.Vector3().crossVectors(dir,new THREE.Vector3(0,1,0)).normalize();camera.position.addScaledVector(dir,f*speed);camera.position.addScaledVector(side,s*speed);camera.position.x=THREE.MathUtils.clamp(camera.position.x,-43,43);camera.position.z=THREE.MathUtils.clamp(camera.position.z,-43,43);controls.target.copy(camera.position).addScaledVector(dir,5);controls.update()}
function animate(){requestAnimationFrame(animate);clock.getDelta();if(started)walk();applyEra();controls.update();if(siteGroup)siteGroup.children.filter(o=>o.name==='artifact').forEach(o=>{o.rotation.y+=.012;o.position.y=1.1+Math.sin(clock.elapsedTime*2+o.position.x)*.12});renderer.render(scene,camera)}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}

init();
