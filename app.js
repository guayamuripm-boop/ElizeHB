// =====================================================================
// JARDÍN 3D — configuración de contenido (se carga desde localStorage / admin.html)
// =====================================================================
const DEFAULTS = {
  herName: "Elize",
  myName: "",
  mensaje: [
    "Hoy quiero detener el tiempo un momento…",
    "solo para recordarte cuánto significas para mí.",
    "Este jardín guarda algunos de nuestros recuerdos.",
    "Camina, explóralos… y al final, encontrarás algo más. 💕"
  ],
  photos: [
    { label:"Foto 1", caption:"Nuestro primer recuerdo", why:"Escribe aquí por qué esta foto es importante para ustedes.", x:-9,  z:-12, image:"" },
    { label:"Foto 2", caption:"Ese día tan especial",     why:"Escribe aquí por qué esta foto es importante para ustedes.", x:11,  z:-24, image:"" },
    { label:"Foto 3", caption:"Mi lugar favorito: contigo", why:"Escribe aquí por qué esta foto es importante para ustedes.", x:-13, z:-38, image:"" },
    { label:"Foto 4", caption:"Nuestra aventura favorita", why:"Escribe aquí por qué esta foto es importante para ustedes.", x:7,   z:-50, image:"" },
    { label:"Foto 5", caption:"Aquella tarde de risas", why:"Escribe aquí por qué esta foto es importante para ustedes.", x:-5,  z:-62, image:"" },
    { label:"Foto 6", caption:"Tu sonrisa al despertar", why:"Escribe aquí por qué esta foto es importante para ustedes.", x:14,  z:-74, image:"" },
    { label:"Foto 7", caption:"El atardecer que compartimos", why:"Escribe aquí por qué esta foto es importante para ustedes.", x:-11, z:-86, image:"" },
    { label:"Foto 8", caption:"Nuestro último viaje juntos", why:"Escribe aquí por qué esta foto es importante para ustedes.", x:3,   z:-98, image:"" }
  ],
  letter: {
    greeting: "Querida Elize,",
    paragraphs: [
      "Escribe aquí tu carta completa: lo que sientes, lo que ha significado este tiempo juntos, y lo que deseas para ella en este nuevo año de vida.",
      "Gracias por cada risa, cada abrazo y cada momento compartido. Hoy y siempre, celebro quién eres."
    ],
    signature: "Con todo mi amor"
  },
  music: {
    links: [
      { name: "Nuestra canción", url: "https://open.spotify.com/track/TU_TRACK_ID_1" },
      { name: "Esa que nos gusta", url: "https://open.spotify.com/track/TU_TRACK_ID_2" },
      { name: "El atardecer", url: "https://open.spotify.com/track/TU_TRACK_ID_3" },
      { name: "Nuestra playlist", url: "https://open.spotify.com/playlist/TU_PLAYLIST_ID" }
    ]
  }
};

function loadContent() {
  try {
    const stored = localStorage.getItem('jardin_content');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge con defaults para asegurar que no falten campos
      return { ...DEFAULTS, ...parsed, 
        photos: parsed.photos?.map((p, i) => ({ ...DEFAULTS.photos[i], ...p })) || DEFAULTS.photos,
        letter: { ...DEFAULTS.letter, ...(parsed.letter || {}) },
        music: { ...DEFAULTS.music, ...(parsed.music || {}) }
      };
    }
  } catch (e) {
    console.warn('Error cargando contenido:', e);
  }
  return DEFAULTS;
}

const CONTENT = loadContent();

const MENSAJE = CONTENT.mensaje;
const PHOTOS = CONTENT.photos;
const LETTER_POS = { x: 0, z: -110 - (PHOTOS.length - 4) * 12 }; // ajusta posición de la carta según nº de fotos
const BOUNDS = 70 + (PHOTOS.length - 4) * 10;
const HER_NAME = CONTENT.herName;
const MY_NAME = CONTENT.myName;
const LETTER_CONTENT = CONTENT.letter;
const SPOTIFY_LINKS = CONTENT.music?.links || DEFAULTS.music.links;

// =====================================================================
// PALETA
// =====================================================================
const COLORS = {
  // Cielo y entorno
  skyDark:0x1a3a2e, skyMid:0x2d5a3f, skyLight:0x7ab87a, skyHorizon:0xc8e8c8,
  fogColor:0x7ab87a,
  ground:0x3a5a2a, path:0x8d7a5a,
  // Tulipanes
  tulipRed:0xc41e3a, tulipPink:0xe8a8c8, tulipYellow:0xf0d840, tulipWhite:0xf5f0e8,
  // Gerberas
  gerberaRed:0xd01c1c, gerberaOrange:0xe87a2a, gerberaPink:0xf08ac8, gerberaYellow:0xf5d83a,
  // Tallos y hojas
  stem:0x3a5a2a, leaf:0x4a7a3a,
  // Centro flores
  center:0x2d2d1a,
  // Polvo ambiental
  dustColors:[0xe8a8c8, 0xf0d840, 0xc8e8c8, 0xf5f0e8],
  // Pétalos cayendo
  petalFall:0xe8a8c8,
  // Luces
  photoGlow:0xe8a8c8, altarGlow:0xf0d840
};

// =====================================================================
// ESCENA THREE.JS
// =====================================================================
let scene, camera, renderer, clock;
let flowerObjs = [], dustPoints, petalPoints;
let yaw = 0, pitch = 0;
let moveVec = { x:0, y:0 };
let walking = false, walkTime = 0;
let nearestPOI = null;
let visited = new Set();

// DOM elements (needed before animate starts)
const promptEl = document.getElementById('prompt');
const promptTextEl = document.getElementById('promptText');

// Apply dynamic content to DOM
function applyDynamicContent() {
  // Intro title
  const introTitle = document.getElementById('introTitle');
  if (introTitle) introTitle.textContent = `Feliz Cumpleaños, ${HER_NAME}`;

  // Letter content
  const letterGreeting = document.getElementById('letterGreeting');
  if (letterGreeting) letterGreeting.textContent = LETTER_CONTENT.greeting || `Querida ${HER_NAME},`;

  const letterBody = document.getElementById('letterBody');
  if (letterBody && LETTER_CONTENT.paragraphs) {
    letterBody.innerHTML = LETTER_CONTENT.paragraphs.map(p => `<p>${p}</p>`).join('');
  }

  const letterSignature = document.getElementById('letterSignature');
  if (letterSignature) letterSignature.textContent = LETTER_CONTENT.signature || `Con todo mi amor, ${MY_NAME}`;
}

applyDynamicContent();

init3D();
animate();

function init3D(){
  scene = new THREE.Scene();

  // ---- cielo degradado (canvas -> textura de fondo) ----
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 8; skyCanvas.height = 256;
  const sctx = skyCanvas.getContext('2d');
  const grad = sctx.createLinearGradient(0,0,0,256);
  grad.addColorStop(0, '#2a6ba8');
  grad.addColorStop(0.25, '#4a90d9');
  grad.addColorStop(0.55, '#7ec0f0');
  grad.addColorStop(1, '#c8e8ff');
  sctx.fillStyle = grad; sctx.fillRect(0,0,8,256);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  scene.background = skyTex;

  // niebla con color del horizonte -> mezcla el suelo con el cielo sin cortes
  scene.fog = new THREE.FogExp2(0x7ec0f0, 0.02);

  // ---- cámara ----
  camera = new THREE.PerspectiveCamera(62, window.innerWidth/window.innerHeight, 0.1, 400);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 1.6, 6);

  // ---- render ----
  try{
    renderer = new THREE.WebGLRenderer({ antialias:true });
  }catch(e){
    document.getElementById('loadingNote').textContent = 'Tu navegador no soporta gráficos 3D. Prueba con Chrome actualizado.';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('gameContainer').appendChild(renderer.domElement);

  // ---- luces ----
  scene.add(new THREE.AmbientLight(0xffffee, 0.6));
  const dir = new THREE.DirectionalLight(0xfff8e8, 0.9);
  dir.position.set(-20, 35, 10);
  scene.add(dir);

  // ---- suelo ----
  const groundGeo = new THREE.PlaneGeometry(400, 400, 1, 1);
  const groundMat = new THREE.MeshStandardMaterial({ color:0x3a5a2a, roughness:1 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI/2;
  scene.add(ground);

  // ---- camino sutil ----
  const pathGeo = new THREE.PlaneGeometry(4, 90);
  const pathMat = new THREE.MeshStandardMaterial({ color:0x8d7a5a, roughness:1, transparent:true, opacity:0.3 });
  const path = new THREE.Mesh(pathGeo, pathMat);
  path.rotation.x = -Math.PI/2;
  path.position.set(0, 0.01, -35);
  scene.add(path);

  // ---- campo de flores (objetos reales cerca del camino) ----
  // Tulipanes y Gerberas principalmente
  const tulipColors = [COLORS.tulipRed, COLORS.tulipPink, COLORS.tulipYellow, COLORS.tulipWhite];
  const gerberaColors = [COLORS.gerberaRed, COLORS.gerberaOrange, COLORS.gerberaPink, COLORS.gerberaYellow];
  
  // Menos flores para mejor rendimiento (35 en vez de 70)
  for(let i=0;i<35;i++){
    const x = (Math.random()-0.5) * 46;
    const z = -Math.random() * 72 + 4;
    if(Math.abs(x) < 1.4) continue;
    const isTulip = Math.random() < 0.6; // 60% tulipanes, 40% gerberas
    const c = isTulip 
      ? tulipColors[Math.floor(Math.random()*tulipColors.length)]
      : gerberaColors[Math.floor(Math.random()*gerberaColors.length)];
    const scale = 0.8 + Math.random()*0.7;
    const f = createFlower(x, z, c, scale, isTulip);
    scene.add(f);
    flowerObjs.push(f);
  }

  // ---- polvo de flores de fondo (volumen/profundidad) ----
  dustPoints = createDust();
  scene.add(dustPoints);

  // ---- pétalos cayendo ambientales ----
  petalPoints = createPetals();
  scene.add(petalPoints);

  // ---- puntos de interés: fotos ----
  PHOTOS.forEach((p, idx) => {
    const group = createPhotoFrame(p, idx);
    scene.add(group);
    p.obj = group;
  });

  // ---- altar de la carta final ----
  const altar = createAltar();
  altar.position.set(LETTER_POS.x, 0, LETTER_POS.z);
  scene.add(altar);
  LETTER_POS.obj = altar;

  window.addEventListener('resize', onResize);
  clock = new THREE.Clock();
}

function onResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// =====================================================================
// GEOMETRÍA: flores, polvo, pétalos, marcos de foto, altar
// =====================================================================
function createFlower(x, z, colorHex, scale, isTulip){
  const group = new THREE.Group();
  
  // Tallo
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.04, 0.9, 5),
    new THREE.MeshStandardMaterial({ color:COLORS.stem, roughness:0.9 })
  );
  stem.position.y = 0.45;
  group.add(stem);

  if(isTulip){
    // TULIPÁN - 3 pétalos curvados hacia arriba (forma de copa)
    const petalGeo = new THREE.SphereGeometry(0.14, 6, 6);
    petalGeo.scale(1, 0.35, 0.7);
    const petalMat = new THREE.MeshStandardMaterial({ 
      color:colorHex, 
      emissive:colorHex, 
      emissiveIntensity:0.08, 
      roughness:0.4,
      metalness:0.1
    });
    
    for(let i=0;i<3;i++){
      const petal = new THREE.Mesh(petalGeo, petalMat);
      const ang = (i/3) * Math.PI*2;
      petal.position.set(Math.cos(ang)*0.1, 0.92, Math.sin(ang)*0.1);
      petal.rotation.y = ang;
      petal.rotation.x = -0.3; // Curvados hacia arriba
      group.add(petal);
    }
    
    // 3 pétalos internos más pequeños
    const innerGeo = new THREE.SphereGeometry(0.1, 6, 6);
    innerGeo.scale(1, 0.3, 0.6);
    for(let i=0;i<3;i++){
      const petal = new THREE.Mesh(innerGeo, petalMat);
      const ang = (i/3) * Math.PI*2 + Math.PI/3;
      petal.position.set(Math.cos(ang)*0.07, 0.95, Math.sin(ang)*0.07);
      petal.rotation.y = ang;
      petal.rotation.x = -0.4;
      petal.scale.setScalar(0.7);
      group.add(petal);
    }
  }else{
    // GERBERA - muchos pétalos planos en espiral
    const petalGeo = new THREE.SphereGeometry(0.1, 5, 5);
    petalGeo.scale(1, 0.15, 0.8);
    const petalMat = new THREE.MeshStandardMaterial({ 
      color:colorHex, 
      emissive:colorHex, 
      emissiveIntensity:0.1, 
      roughness:0.5
    });
    
    const petalCount = 14;
    for(let i=0;i<petalCount;i++){
      const petal = new THREE.Mesh(petalGeo, petalMat);
      const ang = (i/petalCount) * Math.PI*2;
      const radius = 0.22 + Math.sin(i*0.5)*0.03;
      petal.position.set(Math.cos(ang)*radius, 0.9, Math.sin(ang)*radius);
      petal.rotation.y = ang;
      petal.rotation.x = -0.1;
      group.add(petal);
    }
    
    // Segunda capa de pétalos
    for(let i=0;i<10;i++){
      const petal = new THREE.Mesh(petalGeo, petalMat);
      const ang = (i/10) * Math.PI*2 + Math.PI/10;
      petal.position.set(Math.cos(ang)*0.14, 0.92, Math.sin(ang)*0.14);
      petal.rotation.y = ang;
      petal.rotation.x = -0.05;
      petal.scale.setScalar(0.85);
      group.add(petal);
    }
  }

  // Centro de la flor
  const center = new THREE.Mesh(
    new THREE.SphereGeometry(isTulip ? 0.06 : 0.12, 6, 6),
    new THREE.MeshStandardMaterial({ color:COLORS.center, roughness:0.3, metalness:0.2 })
  );
  center.position.y = isTulip ? 0.95 : 0.92;
  group.add(center);

  // Hojas en la base (2-3)
  const leafCount = isTulip ? 2 : 3;
  for(let i=0;i<leafCount;i++){
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 5, 5),
      new THREE.MeshStandardMaterial({ color:COLORS.leaf, roughness:0.9 })
    );
    leaf.scale.set(1, 0.18, 0.6);
    const lang = (i/leafCount) * Math.PI*2;
    leaf.position.set(Math.cos(lang)*0.15, 0.25, Math.sin(lang)*0.15);
    leaf.rotation.z = 0.6 + Math.random()*0.3;
    leaf.rotation.y = lang;
    group.add(leaf);
  }

  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.userData.seed = Math.random()*10;
  group.userData.isTulip = isTulip;
  return group;
}

function createDust(){
  const count = 200; // Reducido de 500 para mejor rendimiento
  const positions = new Float32Array(count*3);
  const colors = new Float32Array(count*3);
  const palette = [COLORS.tulipPink, COLORS.tulipYellow, COLORS.gerberaOrange, COLORS.cream];
  const c = new THREE.Color();
  for(let i=0;i<count;i++){
    positions[i*3+0] = (Math.random()-0.5) * 120;
    positions[i*3+1] = 0.3 + Math.random()*2.0;
    positions[i*3+2] = -Math.random()*100 + 10;
    c.set(palette[Math.floor(Math.random()*palette.length)]);
    colors[i*3+0] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors,3));
  const mat = new THREE.PointsMaterial({
    size:1.1, map:dotTexture(), vertexColors:true, transparent:true,
    depthWrite:false, sizeAttenuation:true, opacity:0.85
  });
  return new THREE.Points(geo, mat);
}

function createPetals(){
  const count = 40; // Reducido de 90 para mejor rendimiento
  const positions = new Float32Array(count*3);
  for(let i=0;i<count;i++){
    positions[i*3+0] = (Math.random()-0.5) * 35;
    positions[i*3+1] = Math.random()*6;
    positions[i*3+2] = (Math.random()-0.5) * 35;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  const mat = new THREE.PointsMaterial({
    size:0.2, color:COLORS.tulipPink, map:dotTexture(), transparent:true,
    depthWrite:false, opacity:0.7
  });
  const pts = new THREE.Points(geo, mat);
  pts.userData.speeds = new Float32Array(count).map(()=> 0.2 + Math.random()*0.3);
  return pts;
}

function dotTexture(){
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(c);
}

function createPhotoFrame(p, idx){
  const group = new THREE.Group();

  // marco dorado
  const frame = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 2.35),
    new THREE.MeshStandardMaterial({ color:COLORS.gold, roughness:0.4, metalness:0.15 })
  );
  frame.position.z = -0.02;
  group.add(frame);

  // Cargar imagen real si existe, sino placeholder
  const loader = new THREE.TextureLoader();
  const photoGeo = new THREE.PlaneGeometry(1.6, 2.0);
  
  function createPlaceholder() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 640;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#F7F0E6'; ctx.fillRect(0,0,512,640);
    ctx.fillStyle = '#DCC9B6'; ctx.fillRect(28,28,456,470);
    ctx.strokeStyle = 'rgba(210,189,166,0.6)'; ctx.lineWidth = 14;
    for(let i=-500;i<512;i+=40){ ctx.beginPath(); ctx.moveTo(i,28); ctx.lineTo(i+470,498); ctx.stroke(); }
    ctx.fillStyle = '#5C1A2B'; ctx.font = 'italic 30px Georgia'; ctx.textAlign = 'center';
    ctx.fillText(p.label, 256, 270);
    ctx.fillStyle = '#3A1220'; ctx.font = '32px Georgia';
    ctx.fillText(p.caption, 256, 580);
    return new THREE.CanvasTexture(canvas);
  }

  let photoMesh;
  if (p.image && p.image.trim()) {
    const tex = loader.load(p.image.trim(),
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        if (photoMesh && photoMesh.material) {
          photoMesh.material.map = texture;
          photoMesh.material.emissiveMap = texture;
          photoMesh.material.needsUpdate = true;
        }
      },
      undefined,
      (err) => {
        console.warn('Error cargando imagen:', p.image, err);
        if (photoMesh && photoMesh.material) {
          photoMesh.material.map = createPlaceholder();
          photoMesh.material.emissiveMap = photoMesh.material.map;
          photoMesh.material.needsUpdate = true;
        }
      }
    );
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ 
      map: tex, 
      emissive: 0xffffff, 
      emissiveMap: tex, 
      emissiveIntensity: 0.12 
    });
    photoMesh = new THREE.Mesh(photoGeo, mat);
  } else {
    const mat = new THREE.MeshStandardMaterial({ 
      map: createPlaceholder(), 
      emissive: 0xffffff, 
      emissiveMap: createPlaceholder(), 
      emissiveIntensity: 0.12 
    });
    photoMesh = new THREE.Mesh(photoGeo, mat);
  }
  
  photoMesh.position.z = 0.01;
  group.add(photoMesh);

  group.position.set(p.x, 1.75, p.z);
  group.userData = { type:'photo', idx, baseY:1.75, seed: idx*3.1 };

  const glow = new THREE.PointLight(COLORS.photoGlow, 0.5, 6);
  glow.position.set(p.x, 1.9, p.z);

  const wrapper = new THREE.Group();
  wrapper.add(group);
  wrapper.add(glow);
  wrapper.userData = group.userData;
  wrapper.userData.mesh = group;
  return wrapper;
}

function createAltar(){
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.1, 0.5, 8),
    new THREE.MeshStandardMaterial({ color:COLORS.gold, roughness:0.45, metalness:0.2 })
  );
  base.position.y = 0.25;
  group.add(base);

  // "carta" flotante (canvas con sobre)
  const canvas = document.createElement('canvas');
  canvas.width = 400; canvas.height = 300;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#F7F0E6'; ctx.fillRect(0,0,400,300);
  ctx.strokeStyle = '#B08D57'; ctx.lineWidth = 6; ctx.strokeRect(10,10,380,280);
  ctx.beginPath(); ctx.moveTo(10,10); ctx.lineTo(200,150); ctx.lineTo(390,10); ctx.stroke();
  ctx.fillStyle = '#5C1A2B';
  ctx.beginPath(); ctx.arc(200,150,26,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#EDE3D3'; ctx.font = 'italic 22px Georgia'; ctx.textAlign='center';
  ctx.fillText('✦', 200, 158);
  const tex = new THREE.CanvasTexture(canvas);
  const env = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.1),
    new THREE.MeshStandardMaterial({ map:tex, side:THREE.DoubleSide, emissive:0xffffff, emissiveMap:tex, emissiveIntensity:0.25 })
  );
  env.position.y = 1.55;
  group.add(env);
  group.userData = { type:'letter', envelope:env, baseY:1.55 };

  const glow = new THREE.PointLight(COLORS.gold, 1.1, 9);
  glow.position.y = 1.7;
  group.add(glow);
  group.userData.glowLight = glow;

  return group;
}

// =====================================================================
// LOOP DE ANIMACIÓN
// =====================================================================
function animate(){
  requestAnimationFrame(animate);
  if(!renderer) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  walkTime += dt;

  updateMovement(dt);
  updateFlowers();
  updatePetals(dt);
  updatePOIs(dt);

  renderer.render(scene, camera);
}

function updateMovement(dt){
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  const len = Math.hypot(moveVec.x, moveVec.y);
  if(len > 0.06){
    walking = true;
    const speed = 3.0;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const mx = (fx * -moveVec.y + rx * moveVec.x) * speed * dt;
    const mz = (fz * -moveVec.y + rz * moveVec.x) * speed * dt;
    camera.position.x = clamp(camera.position.x + mx, -BOUNDS, BOUNDS);
    camera.position.z = clamp(camera.position.z + mz, -BOUNDS-10, BOUNDS-40);
    camera.position.y = 1.6 + Math.sin(walkTime*7.5) * 0.035;
  } else {
    walking = false;
    camera.position.y += (1.6 - camera.position.y) * 0.15;
  }
}

function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }

function updateFlowers(){
  const t = walkTime;
  flowerObjs.forEach(f => {
    f.rotation.z = Math.sin(t*0.8 + f.userData.seed) * 0.04;
  });
}

function updatePetals(dt){
  const pos = petalPoints.geometry.attributes.position;
  const speeds = petalPoints.userData.speeds;
  for(let i=0;i<pos.count;i++){
    let y = pos.getY(i) - speeds[i]*dt;
    if(y < 0) y = 6.5 + Math.random()*1;
    pos.setY(i, y);
  }
  pos.needsUpdate = true;
  petalPoints.position.x = camera.position.x;
  petalPoints.position.z = camera.position.z;
}

function updatePOIs(dt){
  let closest = null, closestDist = Infinity;

  PHOTOS.forEach(p => {
    const mesh = p.obj.userData.mesh;
    const seed = p.obj.userData.seed;
    mesh.position.y = p.obj.userData.baseY + Math.sin(walkTime*1.1 + seed)*0.08;
    mesh.rotation.y += 0;
    // billboard: siempre mirando a la cámara (solo eje Y)
    const dx = camera.position.x - mesh.position.x;
    const dz = camera.position.z - mesh.position.z;
    mesh.rotation.y = Math.atan2(dx, dz);

    const d = Math.hypot(camera.position.x - p.x, camera.position.z - p.z);
    if(d < closestDist){ closestDist = d; closest = { type:'photo', idx:p.idx, data:p }; }
  });

  const altar = LETTER_POS.obj;
  altar.userData.envelope.position.y = altar.userData.baseY + Math.sin(walkTime*0.9)*0.09;
  altar.userData.envelope.rotation.y = walkTime * 0.5;
  altar.userData.glowLight.intensity = 0.9 + Math.sin(walkTime*2)*0.2 + (visited.size===PHOTOS.length ? 0.6 : 0);
  const dAltar = Math.hypot(camera.position.x - LETTER_POS.x, camera.position.z - LETTER_POS.z);
  if(dAltar < closestDist){ closestDist = dAltar; closest = { type:'letter' }; }

  const INTERACT_R = 3.4;
  if(closestDist < INTERACT_R){
    nearestPOI = closest;
    showPrompt(closest);
  } else {
    nearestPOI = null;
    hidePrompt();
  }
}

// =====================================================================
// HUD / interacción
// =====================================================================
function showPrompt(poi){
  promptEl.classList.add('show');
  if(poi.type === 'photo'){
    promptTextEl.textContent = visited.has(poi.idx) ? 'Toca para volver a ver' : 'Toca para ver este recuerdo';
  } else {
    promptTextEl.textContent = visited.size === PHOTOS.length ? 'Toca para abrir la carta' : `Aún faltan recuerdos por descubrir · ${visited.size}/${PHOTOS.length}`;
  }
}
function hidePrompt(){ promptEl.classList.remove('show'); }

function interactNearest(){
  if(!nearestPOI) return;
  if(nearestPOI.type === 'photo'){
    openPhoto(nearestPOI.data, nearestPOI.idx);
  } else if(nearestPOI.type === 'letter'){
    if(visited.size === PHOTOS.length){
      openLetter();
    } else {
      showToast(`Aún faltan recuerdos por descubrir ✦ ${visited.size}/${PHOTOS.length}`);
    }
  }
}

function openPhoto(p, idx){
  visited.add(idx);
  document.getElementById('countNum').textContent = visited.size;
  document.getElementById('photoPh').textContent = p.label;
  document.getElementById('photoCaption').textContent = p.caption;
  document.getElementById('photoWhy').textContent = p.why;
  document.getElementById('photoOverlay').classList.add('show');
}
function openLetter(){
  document.getElementById('letterOverlay').classList.add('show');
}

let toastTimer = null;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.remove('show'), 2600);
}

document.getElementById('closePhoto').addEventListener('click', ()=>{
  document.getElementById('photoOverlay').classList.remove('show');
});
document.getElementById('closeLetter').addEventListener('click', ()=>{
  document.getElementById('letterOverlay').classList.remove('show');
});

// menú (teletransporte)
const menuList = document.getElementById('menuList');
const menuItems = [
  { label:'Mensaje inicial', go:()=>{ camera.position.set(0,1.6,6); yaw=0; pitch=0; } },
  ...PHOTOS.map((p,i)=>({ label:p.label, go:()=>{ camera.position.set(p.x, 1.6, p.z+3); yaw=0; pitch=0; } })),
  { label:'Carta final', go:()=>{ camera.position.set(LETTER_POS.x, 1.6, LETTER_POS.z+4); yaw=0; pitch=0; } },
];
menuItems.forEach(item => {
  const row = document.createElement('div');
  row.className = 'menuItem';
  row.innerHTML = `<span>${item.label}</span>`;
  const btn = document.createElement('button');
  btn.textContent = 'Ir';
  btn.addEventListener('click', ()=>{ item.go(); closeMenu(); });
  row.appendChild(btn);
  menuList.appendChild(row);
});
const menuPanel = document.getElementById('menuPanel');
document.getElementById('menuBtn').addEventListener('click', ()=> menuPanel.classList.add('open'));
document.getElementById('closeMenu').addEventListener('click', closeMenu);
function closeMenu(){ menuPanel.classList.remove('open'); }

// =====================================================================
// CONTROLES TÁCTILES: joystick (mover) + arrastre (mirar)
// =====================================================================
const joyBase = document.getElementById('joyBase');
const joyStick = document.getElementById('joyStick');
let joyPointerId = null, joyCenter = {x:0,y:0};

joyBase.addEventListener('pointerdown', (e)=>{
  joyPointerId = e.pointerId;
  const r = joyBase.getBoundingClientRect();
  joyCenter = { x:r.left + r.width/2, y:r.top + r.height/2 };
  joyBase.setPointerCapture(e.pointerId);
  updateJoy(e);
});
joyBase.addEventListener('pointermove', (e)=>{
  if(e.pointerId !== joyPointerId) return;
  updateJoy(e);
});
function resetJoy(e){
  if(e.pointerId !== joyPointerId) return;
  joyPointerId = null;
  moveVec = { x:0, y:0 };
  joyStick.style.transform = 'translate(-50%,-50%)';
}
joyBase.addEventListener('pointerup', resetJoy);
joyBase.addEventListener('pointercancel', resetJoy);

function updateJoy(e){
  const maxR = 36;
  let dx = e.clientX - joyCenter.x;
  let dy = e.clientY - joyCenter.y;
  const dist = Math.hypot(dx,dy);
  if(dist > maxR){ dx = dx/dist*maxR; dy = dy/dist*maxR; }
  joyStick.style.transform = `translate(${dx-23}px, ${dy-23}px)`;
  moveVec = { x: dx/maxR, y: dy/maxR };
}

// mirar: arrastre en el resto de la pantalla
let lookPointerId = null, lastX=0, lastY=0, downX=0, downY=0, moved=0;
const gameContainer = document.getElementById('gameContainer');

gameContainer.addEventListener('pointerdown', (e)=>{
  if(lookPointerId !== null) return;
  lookPointerId = e.pointerId;
  lastX = downX = e.clientX; lastY = downY = e.clientY; moved = 0;
});
window.addEventListener('pointermove', (e)=>{
  if(e.pointerId !== lookPointerId) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  moved += Math.abs(dx) + Math.abs(dy);
  yaw -= dx * 0.0028;
  pitch -= dy * 0.0022;
  pitch = clamp(pitch, -0.85, 0.85);
  lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener('pointerup', (e)=>{
  if(e.pointerId !== lookPointerId) return;
  lookPointerId = null;
  if(moved < 10){ interactNearest(); }
});

// =====================================================================
// INTRO: escritura del mensaje + entrada al jardín
// =====================================================================
function typeMessage(){
  const box = document.getElementById('typedMsg');
  let li = 0;
  function typeLine(){
    if(li >= MENSAJE.length){
      document.getElementById('loadingNote').style.display = 'none';
      document.getElementById('enterBtn').classList.add('show');
      return;
    }
    const lineEl = document.createElement('span'); lineEl.className = 'line';
    box.appendChild(lineEl);
    const cursor = document.createElement('span'); cursor.className = 'cursor';
    box.appendChild(cursor);
    let ci = 0; const text = MENSAJE[li];
    const interval = setInterval(()=>{
      lineEl.textContent += text[ci]; ci++;
      if(ci >= text.length){
        clearInterval(interval); cursor.remove(); li++;
        setTimeout(typeLine, 420);
      }
    }, 38);
  }
  typeLine();
}
typeMessage();

// =====================================================================
// MUSIC PLAYER (ambient + Spotify link)
// =====================================================================
let audioCtx = null;
let ambientAudio = null;
let isPlaying = false;
const musicBtn = document.getElementById('musicBtn');

function createAmbientAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.15;
  gainNode.connect(audioCtx.destination);

  const osc1 = audioCtx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = 220;
  osc1.connect(gainNode);

  const osc2 = audioCtx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 330;
  osc2.connect(gainNode);

  const lfo = audioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.15;
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 15;
  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);
  lfoGain.connect(osc2.frequency);

  const envGain = audioCtx.createGain();
  envGain.gain.value = 0;
  envGain.connect(gainNode);
  osc1.connect(envGain);
  osc2.connect(envGain);

  ambientAudio = { osc1, osc2, lfo, envGain, gainNode, started: false };
  return ambientAudio;
}

function startAmbient() {
  if (!ambientAudio) createAmbientAudio();
  if (ambientAudio.started) return;
  
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  ambientAudio.osc1.start();
  ambientAudio.osc2.start();
  ambientAudio.lfo.start();
  ambientAudio.envGain.gain.setValueAtTime(0, audioCtx.currentTime);
  ambientAudio.envGain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 8);
  ambientAudio.started = true;
}

function stopAmbient() {
  if (!ambientAudio || !ambientAudio.started) return;
  ambientAudio.envGain.gain.cancelScheduledValues(audioCtx.currentTime);
  ambientAudio.envGain.gain.setValueAtTime(ambientAudio.envGain.gain.value, audioCtx.currentTime);
  ambientAudio.envGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3);
  setTimeout(() => {
    ambientAudio.osc1.stop();
    ambientAudio.osc2.stop();
    ambientAudio.lfo.stop();
    ambientAudio.started = false;
  }, 3500);
}

function toggleMusic() {
  isPlaying = !isPlaying;
  musicBtn.classList.toggle('playing', isPlaying);
  musicBtn.textContent = isPlaying ? '🎶' : '🎵';
  musicBtn.title = isPlaying ? 'Pausar música ambiental' : 'Reproducir música ambiental';
  
  if (isPlaying) startAmbient();
  else stopAmbient();
}

// Long press on music button -> opens Spotify menu
let musicPressTimer = null;
musicBtn.addEventListener('pointerdown', () => {
  musicPressTimer = setTimeout(() => {
    showSpotifyMenu();
  }, 600);
});
musicBtn.addEventListener('pointerup', () => clearTimeout(musicPressTimer));
musicBtn.addEventListener('pointerleave', () => clearTimeout(musicPressTimer));
musicBtn.addEventListener('click', (e) => {
  if (!musicPressTimer) return;
  clearTimeout(musicPressTimer);
  musicPressTimer = null;
  toggleMusic();
});

function showSpotifyMenu() {
  const menu = document.createElement('div');
  menu.style.cssText = `
    position:fixed; bottom:calc(5.5vh + 140px); right:14px; z-index:30;
    background:rgba(58,18,32,0.95); border:1px solid var(--gold); border-radius:8px;
    padding:12px; min-width:200px; box-shadow:0 8px 30px rgba(0,0,0,0.4);
    font-family:'Cormorant Garamond',serif; color:var(--cream);
  `;
  menu.innerHTML = `
    <div style="font-family:'Parisienne',cursive; font-size:1.3rem; color:var(--gold); margin-bottom:8px; text-align:center;">🎵 Nuestra música</div>
    ${SPOTIFY_LINKS.map(s => `
      <a href="${s.url}" target="_blank" style="display:block; padding:8px 12px; color:var(--cream); text-decoration:none; border-bottom:1px solid rgba(237,227,211,0.2); transition:background .2s;"
         onmouseover="this.style.background='rgba(176,141,87,0.2)'" onmouseout="this.style.background='transparent'">
        ${s.name}
      </a>
    `).join('')}
    <button onclick="this.parentElement.remove()" style="width:100%; padding:8px; background:none; border:none; color:var(--rosa-vieja); font-family:'Jost',sans-serif; font-size:0.8rem; text-transform:uppercase; letter-spacing:.1em; cursor:pointer;">Cerrar</button>
  `;
  document.body.appendChild(menu);
  setTimeout(() => { if (menu.parentElement) menu.remove(); }, 15000);
}

// Auto-resume audio context on first user interaction
document.body.addEventListener('click', () => {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });

// Music button
if (musicBtn) {
  musicBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isPlaying) {
      startAmbient();
      musicBtn.classList.add('playing');
      musicBtn.textContent = '🔊';
      isPlaying = true;
      showToast('🎵 Música ambiental activada');
    } else {
      if (ambientAudio) {
        ambientAudio.envGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        setTimeout(() => {
          ambientAudio.osc1.stop();
          ambientAudio.osc2.stop();
          ambientAudio.lfo.stop();
          ambientAudio.started = false;
        }, 500);
      }
      musicBtn.classList.remove('playing');
      musicBtn.textContent = '🎵';
      isPlaying = false;
      showToast('🔇 Música pausada');
    }
  });
  
  // Long press for Spotify menu
  let pressTimer = null;
  musicBtn.addEventListener('pointerdown', (e) => {
    pressTimer = setTimeout(() => {
      if (isPlaying) showSpotifyMenu(e.clientX, e.clientY);
    }, 600);
  });
  musicBtn.addEventListener('pointerup', () => clearTimeout(pressTimer));
  musicBtn.addEventListener('pointerleave', () => clearTimeout(pressTimer));
}

document.getElementById('enterBtn').addEventListener('click', ()=>{
  document.getElementById('intro').classList.add('hide');
  document.getElementById('hud').classList.add('show');
});
