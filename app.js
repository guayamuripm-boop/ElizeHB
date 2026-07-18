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
    { label:"Foto 1", caption:"Nuestro primer recuerdo", why:"Escribe aquí por qué esta foto es importante para ustedes.", x:-5,  z:-8, image:"" },
    { label:"Foto 2", caption:"Ese día tan especial",     why:"Escribe aquí por qué esta foto es importante para ustedes.", x:6,  z:-15, image:"" },
    { label:"Foto 3", caption:"Mi lugar favorito: contigo", why:"Escribe aquí por qué esta foto es importante para ustedes.", x:-8, z:-23, image:"" },
    { label:"Foto 4", caption:"Nuestra aventura favorita", why:"Escribe aquí por qué esta foto es importante para ustedes.", x:4,   z:-31, image:"" },
    { label:"Foto 5", caption:"Aquella tarde de risas", why:"Escribe aquí por qué esta foto es importante para ustedes.", x:-3,  z:-39, image:"" },
    { label:"Foto 6", caption:"Tu sonrisa al despertar", why:"Escribe aquí por qué esta foto es importante para ustedes.", x:7,  z:-47, image:"" },
    { label:"Foto 7", caption:"El atardecer que compartimos", why:"Escribe aquí por qué esta foto es importante para ustedes.", x:-6,  z:-55, image:"" },
    { label:"Foto 8", caption:"Nuestro último viaje juntos", why:"Escribe aquí por qué esta foto es importante para ustedes.", x:1,   z:-63, image:"" }
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
const LETTER_POS = { x: 0, z: -70 }; // Carta muy cerca
const BOUNDS = 55; // Jardín más compacto
const HER_NAME = CONTENT.herName;
const MY_NAME = CONTENT.myName;
const LETTER_CONTENT = CONTENT.letter;
const SPOTIFY_LINKS = CONTENT.music?.links || DEFAULTS.music.links;

// =====================================================================
// PALETA
// =====================================================================
const COLORS = {
  // Cielo y entorno
  skyDark:0x2a6ba8, skyMid:0x4a90d9, skyLight:0x7ec0f0, skyHorizon:0xc8e8ff,
  fogColor:0x7ec0f0,
  ground:0x3a5a2a, path:0x8d7a5a,
  // Tulipanes
  tulipRed:0xc41e3a, tulipPink:0xe8a8c8, tulipYellow:0xf0d840, tulipWhite:0xf5f0e8, tulipOrange:0xe87a2a,
  // Rosas
  roseRed:0xb82030, rosePink:0xf0a8c8, roseWhite:0xfaf0f0, rosePeach:0xf5c8a8,
  // Gerberas
  gerberaRed:0xd01c1c, gerberaOrange:0xe87a2a, gerberaPink:0xf08ac8, gerberaYellow:0xf5d83a,
  // Tallos y hojas
  stem:0x3a5a2a, leaf:0x4a7a3a,
  // Centro flores
  center:0x2d2d1a,
  // Polvo ambiental
  dustColors:[0xe8a8c8, 0xf0d840, 0xc8e8c8, 0xf5f0e8],
  // Pétalos/estrellas
  petalFall:0xe8a8c8,
  // Luces
  photoGlow:0xe8a8c8, altarGlow:0xf0d840
};

// =====================================================================
// ESCENA THREE.JS
// =====================================================================
let scene, camera, renderer, clock;
let flowerMesh = null; // InstancedMesh para flores
let dustPoints, petalPoints;
let yaw = 0, pitch = 0;
let moveVec = { x:0, y:0 };
let walking = false, walkTime = 0;
let nearestPOI = null;
let visited = new Set();

// Instanced flower data
const MAX_FLOWERS = 180; // Más flores, pero instanciadas (rápido)
const flowerMatrices = [];
const flowerTypes = []; // 0 = tulip, 1 = gerbera
const flowerColors = [];
const flowerScales = [];
const flowerSeeds = [];

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

  // ---- campo de flores (InstancedMesh para rendimiento) ----
  initFlowers();

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
// GEOMETRÍA: InstancedMesh flores, polvo, pétalos, marcos de foto, altar
// =====================================================================

// Pre-built geometries for instanced flowers
let tulipGeometry = null;
let gerberaGeometry = null;
let stemGeometry = null;
let leafGeometry = null;
let centerGeometry = null;

function buildFlowerGeometries(){
  // Geometrías base compartidas
  stemGeometry = new THREE.CylinderGeometry(0.025, 0.04, 0.9, 5);
  leafGeometry = new THREE.SphereGeometry(0.18, 5, 5);
  leafGeometry.scale(1, 0.18, 0.6);
  centerGeometry = new THREE.SphereGeometry(0.1, 6, 6);

  // Tulipán: tallo + 6 pétalos + centro + 2 hojas = 10 instancias base
  const tulipParts = [];
  
  // Tallo
  tulipParts.push({ geo: stemGeometry, pos: new THREE.Vector3(0, 0.45, 0), rot: new THREE.Euler() });
  
  // Pétalos externos (3)
  const petalGeo = new THREE.SphereGeometry(0.14, 6, 6);
  petalGeo.scale(1, 0.35, 0.7);
  for(let i=0;i<3;i++){
    const ang = (i/3) * Math.PI*2;
    tulipParts.push({ 
      geo: petalGeo, 
      pos: new THREE.Vector3(Math.cos(ang)*0.1, 0.92, Math.sin(ang)*0.1),
      rot: new THREE.Euler(-0.3, ang, 0)
    });
  }
  // Pétalos internos (3)
  const innerGeo = new THREE.SphereGeometry(0.1, 6, 6);
  innerGeo.scale(1, 0.3, 0.6);
  for(let i=0;i<3;i++){
    const ang = (i/3) * Math.PI*2 + Math.PI/3;
    tulipParts.push({ 
      geo: innerGeo, 
      pos: new THREE.Vector3(Math.cos(ang)*0.07, 0.95, Math.sin(ang)*0.07),
      rot: new THREE.Euler(-0.4, ang, 0),
      scale: 0.7
    });
  }
  // Centro
  tulipParts.push({ geo: centerGeometry, pos: new THREE.Vector3(0, 0.95, 0), rot: new THREE.Euler() });
  // Hojas (2)
  for(let i=0;i<2;i++){
    const lang = (i/2) * Math.PI*2;
    tulipParts.push({ 
      geo: leafGeometry, 
      pos: new THREE.Vector3(Math.cos(lang)*0.15, 0.25, Math.sin(lang)*0.15),
      rot: new THREE.Euler(0, lang, 0.6 + Math.random()*0.3)
    });
  }
  
  // Gerbera: tallo + 24 pétalos + centro + 3 hojas = 29 instancias base
  const gerberaParts = [];
  gerberaParts.push({ geo: stemGeometry, pos: new THREE.Vector3(0, 0.45, 0), rot: new THREE.Euler() });
  
  const gerbPetalGeo = new THREE.SphereGeometry(0.1, 5, 5);
  gerbPetalGeo.scale(1, 0.15, 0.8);
  // Capa externa (14)
  for(let i=0;i<14;i++){
    const ang = (i/14) * Math.PI*2;
    const radius = 0.22 + Math.sin(i*0.5)*0.03;
    gerberaParts.push({ 
      geo: gerbPetalGeo, 
      pos: new THREE.Vector3(Math.cos(ang)*radius, 0.9, Math.sin(ang)*radius),
      rot: new THREE.Euler(-0.1, ang, 0)
    });
  }
  // Capa interna (10)
  for(let i=0;i<10;i++){
    const ang = (i/10) * Math.PI*2 + Math.PI/10;
    gerberaParts.push({ 
      geo: gerbPetalGeo, 
      pos: new THREE.Vector3(Math.cos(ang)*0.14, 0.92, Math.sin(ang)*0.14),
      rot: new THREE.Euler(-0.05, ang, 0),
      scale: 0.85
    });
  }
  // Centro
  gerberaParts.push({ geo: centerGeometry, pos: new THREE.Vector3(0, 0.92, 0), rot: new THREE.Euler(), scale: 1.2 });
  // Hojas (3)
  for(let i=0;i<3;i++){
    const lang = (i/3) * Math.PI*2;
    gerberaParts.push({ 
      geo: leafGeometry, 
      pos: new THREE.Vector3(Math.cos(lang)*0.15, 0.25, Math.sin(lang)*0.15),
      rot: new THREE.Euler(0, lang, 0.6 + Math.random()*0.3)
    });
  }

  // Crear geometrías combinadas para InstancedMesh
  tulipGeometry = new THREE.InstancedBufferGeometry();
  gerberaGeometry = new THREE.InstancedBufferGeometry();
  
  // Para simplicidad, usamos un enfoque diferente: una geometría base simple y matrices de transformación
  // Creamos una geometría base simple (un triángulo/plano) y usamos matrices para posicionar cada parte
  const baseGeo = new THREE.BufferGeometry();
  baseGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5,0,0, 0.5,0,0, 0,1,0], 3));
  baseGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0,1, 1,1, 0.5,0], 2));
  
  tulipGeometry = baseGeo;
  gerberaGeometry = baseGeo.clone();
}

function initFlowers(){
  // Flores: tulipanes, rosas, gerberas - MUY densas y cerca del inicio
  const tulipColors = [COLORS.tulipRed, COLORS.tulipPink, COLORS.tulipYellow, COLORS.tulipWhite, COLORS.tulipOrange];
  const roseColors = [COLORS.roseRed, COLORS.rosePink, COLORS.roseWhite, COLORS.rosePeach];
  const gerberaColors = [COLORS.gerberaRed, COLORS.gerberaOrange, COLORS.gerberaPink, COLORS.gerberaYellow];
  
  // Área: empieza YA desde el inicio, muy densa
  const areaWidth = 50;  // más ancho para sentir inmersión
  const areaDepth = 100; // menos profundo, todo concentrado
  const spacing = 1.3;   // MUY denso (era 2.2)
  
  for(let z = 0; z > -areaDepth; z -= spacing){
    for(let x = -areaWidth/2; x < areaWidth/2; x += spacing){
      const jitterX = (Math.random()-0.5) * 0.9;
      const jitterZ = (Math.random()-0.5) * 0.9;
      const fx = x + jitterX;
      const fz = z + jitterZ;
      
      // Camino más estrecho para más flores al lado
      if(Math.abs(fx) < 1.5) continue;
      
      // 3 tipos: 35% tulipanes, 30% rosas, 35% gerberas
      const r = Math.random();
      let isTulip, isRose, colors;
      if(r < 0.35){
        isTulip = true; isRose = false;
        colors = tulipColors;
      }else if(r < 0.65){
        isTulip = false; isRose = true;
        colors = roseColors;
      }else{
        isTulip = false; isRose = false;
        colors = gerberaColors;
      }
      const color = colors[Math.floor(Math.random()*colors.length)];
      const scale = 0.7 + Math.random()*0.6;
      
      const f = createSimpleFlower(fx, fz, color, scale, isTulip, isRose);
      scene.add(f);
      flowerObjs.push(f);
    }
  }
}

function createFlowerSprite(){
  // Sprite simple de flor para Points
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32,32,0, 32,32,32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(canvas);
}

function createSimpleFlower(x, z, colorHex, scale, isTulip, isRose){
  const group = new THREE.Group();
  
  // Tallo simple
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.035, 0.8, 4),
    new THREE.MeshStandardMaterial({ color:COLORS.stem, roughness:0.9 })
  );
  stem.position.y = 0.4;
  group.add(stem);
  
  if(isTulip){
    // Tulipán: 3 pétalos curvados (copa)
    const petalGeo = new THREE.SphereGeometry(0.13, 5, 5);
    petalGeo.scale(1, 0.3, 0.65);
    const petalMat = new THREE.MeshStandardMaterial({ color:colorHex, emissive:colorHex, emissiveIntensity:0.08, roughness:0.4 });
    for(let i=0;i<3;i++){
      const ang = (i/3)*Math.PI*2;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(ang)*0.1, 0.88, Math.sin(ang)*0.1);
      petal.rotation.y = ang;
      petal.rotation.x = -0.35;
      group.add(petal);
    }
    // Centro
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), new THREE.MeshStandardMaterial({ color:COLORS.center }));
    center.position.y = 0.9;
    group.add(center);
  }else if(isRose){
    // Rosa: pétalos en espiral (capullo abierto)
    const petalGeo = new THREE.SphereGeometry(0.1, 5, 5);
    petalGeo.scale(1, 0.18, 0.7);
    const petalMat = new THREE.MeshStandardMaterial({ color:colorHex, emissive:colorHex, emissiveIntensity:0.12, roughness:0.35, metalness:0.05 });
    
    // Capa exterior (5 pétalos)
    for(let i=0;i<5;i++){
      const ang = (i/5)*Math.PI*2;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(ang)*0.16, 0.85, Math.sin(ang)*0.16);
      petal.rotation.y = ang;
      petal.rotation.x = -0.15;
      petal.rotation.z = 0.1;
      group.add(petal);
    }
    // Capa media (4 pétalos)
    for(let i=0;i<4;i++){
      const ang = (i/4)*Math.PI*2 + Math.PI/4;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(ang)*0.11, 0.9, Math.sin(ang)*0.11);
      petal.rotation.y = ang;
      petal.rotation.x = -0.25;
      petal.rotation.z = 0.08;
      petal.scale.setScalar(0.85);
      group.add(petal);
    }
    // Capa interior (3 pétalos - capullo)
    for(let i=0;i<3;i++){
      const ang = (i/3)*Math.PI*2;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(ang)*0.06, 0.95, Math.sin(ang)*0.06);
      petal.rotation.y = ang;
      petal.rotation.x = -0.4;
      petal.scale.setScalar(0.65);
      group.add(petal);
    }
    // Centro
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), new THREE.MeshStandardMaterial({ color:COLORS.center }));
    center.position.y = 0.96;
    group.add(center);
  }else{
    // Gerbera: 12 pétalos planos en 2 capas
    const petalGeo = new THREE.SphereGeometry(0.09, 4, 4);
    petalGeo.scale(1, 0.12, 0.75);
    const petalMat = new THREE.MeshStandardMaterial({ color:colorHex, emissive:colorHex, emissiveIntensity:0.1, roughness:0.5 });
    // Capa exterior
    for(let i=0;i<12;i++){
      const ang = (i/12)*Math.PI*2;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(ang)*0.18, 0.86, Math.sin(ang)*0.18);
      petal.rotation.y = ang;
      petal.rotation.x = -0.08;
      group.add(petal);
    }
    // Capa interior
    for(let i=0;i<8;i++){
      const ang = (i/8)*Math.PI*2 + Math.PI/8;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(ang)*0.12, 0.89, Math.sin(ang)*0.12);
      petal.rotation.y = ang;
      petal.rotation.x = -0.04;
      petal.scale.setScalar(0.8);
      group.add(petal);
    }
    // Centro
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 5), new THREE.MeshStandardMaterial({ color:COLORS.center }));
    center.position.y = 0.88;
    group.add(center);
  }
  
  // 2-3 hojas
  const leafCount = isRose ? 3 : 2;
  for(let i=0;i<leafCount;i++){
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 4, 4),
      new THREE.MeshStandardMaterial({ color:COLORS.leaf, roughness:0.9 })
    );
    leaf.scale.set(1, 0.15, 0.5);
    const lang = (i/leafCount)*Math.PI*2;
    leaf.position.set(Math.cos(lang)*0.12, 0.2, Math.sin(lang)*0.12);
    leaf.rotation.z = 0.5;
    leaf.rotation.y = lang;
    group.add(leaf);
  }
  
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.userData.seed = Math.random()*10;
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
  const count = 60; // Estrellas
  const positions = new Float32Array(count*3);
  for(let i=0;i<count;i++){
    positions[i*3+0] = (Math.random()-0.5) * 80;
    positions[i*3+1] = 8 + Math.random()*15;
    positions[i*3+2] = (Math.random()-0.5) * 80;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  const mat = new THREE.PointsMaterial({
    size: 0.5, color: 0xfff8e8, map: starTexture(), transparent: true,
    depthWrite: false, opacity: 0.9, sizeAttenuation: true
  });
  const pts = new THREE.Points(geo, mat);
  pts.userData.speeds = new Float32Array(count).map(() => 0.02 + Math.random()*0.03);
  pts.userData.phases = new Float32Array(count).map(() => Math.random()*Math.PI*2);
  return pts;
}

function starTexture(){
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  // Dibuja estrella de 5 puntas
  ctx.fillStyle = 'white';
  ctx.translate(64, 64);
  for(let i=0;i<5;i++){
    ctx.rotate(Math.PI*2/5);
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.lineTo(9, -12);
    ctx.lineTo(38, -12);
    ctx.lineTo(14, 6);
    ctx.lineTo(22, 38);
    ctx.lineTo(0, 18);
    ctx.lineTo(-22, 38);
    ctx.lineTo(-14, 6);
    ctx.lineTo(-38, -12);
    ctx.lineTo(-9, -12);
    ctx.closePath();
    ctx.fill();
  }
  // Brillo central
  const grad = ctx.createRadialGradient(0,0,0, 0,0,50);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0,0,50,0,Math.PI*2); ctx.fill();
  return new THREE.CanvasTexture(c);
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
    camera.position.z = clamp(camera.position.z + mz, -BOUNDS-5, BOUNDS-100);
    camera.position.y = 1.6 + Math.sin(walkTime*7.5) * 0.035;
  } else {
    walking = false;
    camera.position.y += (1.6 - camera.position.y) * 0.15;
  }
}

function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }

// Simplified flower update - subtle sway for flower groups
function updateFlowers(){
  const t = walkTime;
  flowerObjs.forEach(f => {
    f.rotation.z = Math.sin(t*0.6 + f.userData.seed) * 0.025;
  });
}

function updatePetals(dt){
  // Twinkle stars - no falling, just opacity pulse
  const material = petalPoints.material;
  if(material && material.opacity !== undefined){
    material.opacity = 0.6 + Math.sin(walkTime * 0.8) * 0.3;
  }
  // Slow rotation of whole starfield
  petalPoints.rotation.y += dt * 0.005;
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
  
  const img = document.getElementById('photoImg');
  if(p.image && p.image.trim()){
    img.src = p.image.trim();
    img.style.display = 'block';
  }else{
    img.style.display = 'none';
  }
  
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
