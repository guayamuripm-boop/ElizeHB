// =====================================================================
// JARDÍN 3D — configuración de contenido (se carga desde Supabase)
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

async function loadFromSupabase() {
  try {
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', ROW_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    if (data && data.content) {
      return { ...DEFAULTS, ...data.content,
        photos: data.content.photos?.map((p, i) => ({ ...DEFAULTS.photos[i], ...p })) || DEFAULTS.photos,
        letter: { ...DEFAULTS.letter, ...(data.content.letter || {}) },
        music: { ...DEFAULTS.music, ...(data.content.music || {}) }
      };
    }
  } catch (e) {
    console.warn('Error cargando de Supabase, usando localStorage/DEFAULTS:', e);
    // Fallback a localStorage
    try {
      const stored = localStorage.getItem('jardin_content');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULTS, ...parsed, 
          photos: parsed.photos?.map((p, i) => ({ ...DEFAULTS.photos[i], ...p })) || DEFAULTS.photos,
          letter: { ...DEFAULTS.letter, ...(parsed.letter || {}) },
          music: { ...DEFAULTS.music, ...(parsed.music || {}) }
        };
      }
    } catch (e2) {
      console.warn('Error en fallback localStorage:', e2);
    }
  }
  return DEFAULTS;
}

// Load content async
let CONTENT = DEFAULTS;

async function initContent() {
  CONTENT = await loadFromSupabase();
  initApp();
}

function initApp() {
  // Make available globally for other parts of the app
  window.MENSAJE = CONTENT.mensaje;
  window.PHOTOS = CONTENT.photos;
  window.LETTER_POS = { x: 0, z: -70 };
  window.BOUNDS = 55;
  window.HER_NAME = CONTENT.herName;
  window.MY_NAME = CONTENT.myName;
  window.LETTER_CONTENT = CONTENT.letter;
  window.SPOTIFY_LINKS = CONTENT.music?.links || DEFAULTS.music.links;
  
  // Start the app
  init3D();
  animate();
}

initContent();

// =====================================================================
// PALETA
// =====================================================================
const COLORS = {
  skyDark:0x2a6ba8, skyMid:0x4a90d9, skyLight:0x7ec0f0, skyHorizon:0xc8e8ff,
  fogColor:0x7ec0f0,
  ground:0x3a5a2a, path:0x8d7a5a,
  tulipRed:0xc41e3a, tulipPink:0xe8a8c8, tulipYellow:0xf0d840, tulipWhite:0xf5f0e8, tulipOrange:0xe87a2a,
  roseRed:0xb82030, rosePink:0xf0a8c8, roseWhite:0xfaf0f0, rosePeach:0xf5c8a8,
  gerberaRed:0xd01c1c, gerberaOrange:0xe87a2a, gerberaPink:0xf08ac8, gerberaYellow:0xf5d83a,
  stem:0x3a5a2a, leaf:0x4a7a3a,
  center:0x2d2d1a,
  dustColors:[0xe8a8c8, 0xf0d840, 0xc8e8c8, 0xf5f0e8],
  petalFall:0xe8a8c8,
  photoGlow:0xe8a8c8, altarGlow:0xf0d840
};

// =====================================================================
// ESCENA THREE.JS
// =====================================================================
let scene, camera, renderer, clock;
let flowerObjs = [], dustPoints, starPoints;
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
  const introTitle = document.getElementById('introTitle');
  if (introTitle) introTitle.textContent = `Feliz Cumpleaños, ${HER_NAME}`;

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

  // ---- cielo con nubes (canvas -> textura) ----
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 512; skyCanvas.height = 256;
  const sctx = skyCanvas.getContext('2d');
  
  // Degradado cielo
  const grad = sctx.createLinearGradient(0,0,0,256);
  grad.addColorStop(0, '#1a4a8a');
  grad.addColorStop(0.2, '#2a6ba8');
  grad.addColorStop(0.5, '#4a90d9');
  grad.addColorStop(0.8, '#7ec0f0');
  grad.addColorStop(1, '#c8e8ff');
  sctx.fillStyle = grad; sctx.fillRect(0,0,512,256);
  
  // Nubes procedurales
  sctx.fillStyle = 'rgba(255,255,255,0.8)';
  for(let i=0;i<12;i++){
    const cx = Math.random()*512;
    const cy = Math.random()*120 + 20;
    const w = 60 + Math.random()*80;
    const h = 25 + Math.random()*20;
    drawCloud(sctx, cx, cy, w, h);
  }
  
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  scene.background = skyTex;

  // niebla con color del horizonte -> mezcla el suelo con el cielo sin cortes
  scene.fog = new THREE.FogExp2(0x7ec0f0, 0.018);

  // ---- cámara ----
  camera = new THREE.PerspectiveCamera(62, window.innerWidth/window.innerHeight, 0.1, 400);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 1.6, 6);

  // ---- render ----
  try{
    renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference: "high-performance" });
  }catch(e){
    document.getElementById('loadingNote').textContent = 'Tu navegador no soporta gráficos 3D. Prueba con Chrome actualizado.';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('gameContainer').appendChild(renderer.domElement);

  // ---- luces ----
  scene.add(new THREE.AmbientLight(0xffffee, 0.7));
  const dir = new THREE.DirectionalLight(0xfff8e8, 1.0);
  dir.position.set(-25, 40, 15);
  scene.add(dir);

  // ---- suelo ----
  const groundGeo = new THREE.PlaneGeometry(400, 400, 1, 1);
  const groundMat = new THREE.MeshStandardMaterial({ color:0x3a5a2a, roughness:1 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI/2;
  scene.add(ground);

  // ---- camino sutil ----
  const pathGeo = new THREE.PlaneGeometry(3.5, 80);
  const pathMat = new THREE.MeshStandardMaterial({ color:0x8d7a5a, roughness:1, transparent:true, opacity:0.3 });
  const path = new THREE.Mesh(pathGeo, pathMat);
  path.rotation.x = -Math.PI/2;
  path.position.set(0, 0.01, -30);
  scene.add(path);

  // ---- flores densas y realistas ----
  initFlowers();

  // ---- polvo atmosférico ----
  dustPoints = createDust();
  scene.add(dustPoints);

  // ---- estrellas en el cielo ----
  starPoints = createStars();
  scene.add(starPoints);

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

function drawCloud(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.ellipse(x, y, w*0.5, h*0.5, 0, 0, Math.PI*2);
  ctx.ellipse(x + w*0.3, y - h*0.15, w*0.35, h*0.35, 0, 0, Math.PI*2);
  ctx.ellipse(x - w*0.3, y - h*0.1, w*0.35, h*0.3, 0, 0, Math.PI*2);
  ctx.ellipse(x + w*0.15, y + h*0.2, w*0.3, h*0.25, 0, 0, Math.PI*2);
  ctx.fill();
}

function onResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// =====================================================================
// FLORES REALISTAS: Tulipanes, Rosas, Gerberas
// =====================================================================
function initFlowers(){
  const tulipColors = [COLORS.tulipRed, COLORS.tulipPink, COLORS.tulipYellow, COLORS.tulipWhite, COLORS.tulipOrange];
  const roseColors = [COLORS.roseRed, COLORS.rosePink, COLORS.roseWhite, COLORS.rosePeach];
  const gerberaColors = [COLORS.gerberaRed, COLORS.gerberaOrange, COLORS.gerberaPink, COLORS.gerberaYellow];
  
  // Área: empieza YA desde el inicio, muy densa
  const areaWidth = 55;
  const areaDepth = 80;
  const spacing = 1.15; // Muy denso
  
  for(let z = 0; z > -areaDepth; z -= spacing){
    for(let x = -areaWidth/2; x < areaWidth/2; x += spacing){
      const jitterX = (Math.random()-0.5) * 0.8;
      const jitterZ = (Math.random()-0.5) * 0.8;
      const fx = x + jitterX;
      const fz = z + jitterZ;
      
      // Camino estrecho
      if(Math.abs(fx) < 1.4) continue;
      
      const r = Math.random();
      let isTulip = false, isRose = false, colors;
      if(r < 0.34){
        isTulip = true; colors = tulipColors;
      }else if(r < 0.66){
        isRose = true; colors = roseColors;
      }else{
        colors = gerberaColors;
      }
      const color = colors[Math.floor(Math.random()*colors.length)];
      const scale = 0.75 + Math.random()*0.5;
      
      const f = createRealFlower(fx, fz, color, scale, isTulip, isRose);
      scene.add(f);
      flowerObjs.push(f);
    }
  }
}

function createRealFlower(x, z, colorHex, scale, isTulip, isRose){
  const group = new THREE.Group();
  
  // Tallo con ligera curva
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3((Math.random()-0.5)*0.05, 0.35, 0),
    new THREE.Vector3((Math.random()-0.5)*0.08, 0.7, 0),
    new THREE.Vector3(0, 0.9, 0)
  ]);
  const stemGeo = new THREE.TubeGeometry(stemCurve, 8, 0.022, 4, false);
  const stemMat = new THREE.MeshStandardMaterial({ color:COLORS.stem, roughness:0.9 });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  group.add(stem);

  const petalMat = new THREE.MeshStandardMaterial({ 
    color:colorHex, emissive:colorHex, emissiveIntensity:0.1, 
    roughness:0.35, metalness:0.05, side:THREE.DoubleSide 
  });
  const petalMatInner = new THREE.MeshStandardMaterial({ 
    color:colorHex, emissive:colorHex, emissiveIntensity:0.12, 
    roughness:0.3, metalness:0.05, side:THREE.DoubleSide 
  });

  if(isTulip){
    // TULIPÁN: 6 pétalos en forma de copa (3 externos + 3 internos)
    // Pétalos externos - más grandes, curvados hacia arriba
    for(let i=0;i<3;i++){
      const ang = (i/3)*Math.PI*2;
      const petal = createTulipPetal(petalMat, true);
      petal.position.set(Math.cos(ang)*0.12, 0.88, Math.sin(ang)*0.12);
      petal.rotation.y = ang;
      petal.rotation.x = -0.45;
      petal.rotation.z = 0.15;
      group.add(petal);
    }
    // Pétalos internos - más pequeños, más cerrados
    for(let i=0;i<3;i++){
      const ang = (i/3)*Math.PI*2 + Math.PI/3;
      const petal = createTulipPetal(petalMatInner, false);
      petal.position.set(Math.cos(ang)*0.07, 0.94, Math.sin(ang)*0.07);
      petal.rotation.y = ang;
      petal.rotation.x = -0.55;
      petal.rotation.z = 0.1;
      petal.scale.setScalar(0.75);
      group.add(petal);
    }
    // Centro
    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshStandardMaterial({ color:COLORS.center, roughness:0.3, metalness:0.2 })
    );
    center.position.y = 0.96;
    group.add(center);
    
  }else if(isRose){
    // ROSA: Pétalos en espiral (capas)
    const petalGeo = createRosePetalGeometry();
    
    // Capa exterior (7 pétalos)
    for(let i=0;i<7;i++){
      const ang = (i/7)*Math.PI*2;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(ang)*0.18, 0.82, Math.sin(ang)*0.18);
      petal.rotation.y = ang;
      petal.rotation.x = -0.15;
      petal.rotation.z = 0.12;
      group.add(petal);
    }
    // Capa media (5 pétalos)
    for(let i=0;i<5;i++){
      const ang = (i/5)*Math.PI*2 + Math.PI/5;
      const petal = new THREE.Mesh(petalGeo, petalMatInner);
      petal.position.set(Math.cos(ang)*0.12, 0.88, Math.sin(ang)*0.12);
      petal.rotation.y = ang;
      petal.rotation.x = -0.25;
      petal.rotation.z = 0.08;
      petal.scale.setScalar(0.85);
      group.add(petal);
    }
    // Capa interior - capullo (4 pétalos)
    for(let i=0;i<4;i++){
      const ang = (i/4)*Math.PI*2;
      const petal = new THREE.Mesh(petalGeo, petalMatInner);
      petal.position.set(Math.cos(ang)*0.06, 0.94, Math.sin(ang)*0.06);
      petal.rotation.y = ang;
      petal.rotation.x = -0.45;
      petal.scale.setScalar(0.65);
      group.add(petal);
    }
    // Centro
    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshStandardMaterial({ color:COLORS.center, roughness:0.3, metalness:0.2 })
    );
    center.position.y = 0.96;
    group.add(center);
    
  }else{
    // GERBERA: 2 capas de pétalos planos
    const petalGeo = createGerberaPetalGeometry();
    
    // Capa exterior (14 pétalos)
    for(let i=0;i<14;i++){
      const ang = (i/14)*Math.PI*2;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      const radius = 0.2 + Math.sin(i*0.7)*0.02;
      petal.position.set(Math.cos(ang)*radius, 0.85, Math.sin(ang)*radius);
      petal.rotation.y = ang;
      petal.rotation.x = -0.08;
      group.add(petal);
    }
    // Capa interior (10 pétalos)
    for(let i=0;i<10;i++){
      const ang = (i/10)*Math.PI*2 + Math.PI/10;
      const petal = new THREE.Mesh(petalGeo, petalMatInner);
      petal.position.set(Math.cos(ang)*0.13, 0.89, Math.sin(ang)*0.13);
      petal.rotation.y = ang;
      petal.rotation.x = -0.03;
      petal.scale.setScalar(0.8);
      group.add(petal);
    }
    // Centro prominente
    const center = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.05, 16),
      new THREE.MeshStandardMaterial({ color:COLORS.center, roughness:0.3, metalness:0.15 })
    );
    center.position.y = 0.88;
    group.add(center);
  }

  // Hojas (2-3)
  const leafCount = isRose ? 3 : 2;
  for(let i=0;i<leafCount;i++){
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 6, 6),
      new THREE.MeshStandardMaterial({ color:COLORS.leaf, roughness:0.9 })
    );
    leaf.scale.set(1, 0.16, 0.55);
    const lang = (i/leafCount)*Math.PI*2;
    leaf.position.set(Math.cos(lang)*0.14, 0.22, Math.sin(lang)*0.14);
    leaf.rotation.z = 0.55 + Math.random()*0.2;
    leaf.rotation.y = lang;
    group.add(leaf);
  }

  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.userData.seed = Math.random()*100;
  return group;
}

function createTulipPetal(mat, isOuter){
  const geo = new THREE.SphereGeometry(isOuter ? 0.14 : 0.1, 8, 8);
  geo.scale(1, isOuter ? 0.3 : 0.25, isOuter ? 0.7 : 0.6);
  return new THREE.Mesh(geo, mat);
}

function createRosePetalGeometry(){
  const geo = new THREE.SphereGeometry(0.11, 6, 6);
  geo.scale(1, 0.18, 0.75);
  return geo;
}

function createGerberaPetalGeometry(){
  const geo = new THREE.SphereGeometry(0.09, 5, 5);
  geo.scale(1, 0.12, 0.8);
  return geo;
}

function createDust(){
  const count = 150;
  const positions = new Float32Array(count*3);
  const colors = new Float32Array(count*3);
  const palette = [COLORS.tulipPink, COLORS.tulipYellow, COLORS.gerberaOrange, COLORS.cream];
  const c = new THREE.Color();
  for(let i=0;i<count;i++){
    positions[i*3] = (Math.random()-0.5) * 100;
    positions[i*3+1] = 0.5 + Math.random()*2.5;
    positions[i*3+2] = -Math.random()*80 - 5;
    c.set(palette[Math.floor(Math.random()*palette.length)]);
    colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors,3));
  const mat = new THREE.PointsMaterial({
    size:1.0, map:createParticleTexture(), vertexColors:true, transparent:true,
    depthWrite:false, sizeAttenuation:true, opacity:0.8
  });
  return new THREE.Points(geo, mat);
}

function createStars(){
  const count = 80;
  const positions = new Float32Array(count*3);
  for(let i=0;i<count;i++){
    positions[i*3] = (Math.random()-0.5) * 120;
    positions[i*3+1] = 10 + Math.random()*20;
    positions[i*3+2] = (Math.random()-0.5) * 120;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  const mat = new THREE.PointsMaterial({
    size: 0.6, color: 0xfff8e8, map:createStarTexture(), transparent: true,
    depthWrite: false, opacity: 0.9, sizeAttenuation: true
  });
  const pts = new THREE.Points(geo, mat);
  return pts;
}

function createParticleTexture(){
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(c);
}

function createStarTexture(){
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.translate(64, 64);
  for(let i=0;i<5;i++){
    ctx.rotate(Math.PI*2/5);
    ctx.beginPath();
    ctx.moveTo(0, -45);
    ctx.lineTo(10, -14);
    ctx.lineTo(42, -14);
    ctx.lineTo(16, 6);
    ctx.lineTo(24, 38);
    ctx.lineTo(0, 20);
    ctx.lineTo(-24, 38);
    ctx.lineTo(-16, 6);
    ctx.lineTo(-42, -14);
    ctx.lineTo(-10, -14);
    ctx.closePath();
    ctx.fill();
  }
  const g = ctx.createRadialGradient(0,0,0, 0,0,55);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0,0,55,0,Math.PI*2); ctx.fill();
  return new THREE.CanvasTexture(c);
}

// =====================================================================
// MARCO DE FOTO Y ALTAR
// =====================================================================
function createPhotoFrame(p, idx){
  const group = new THREE.Group();

  // Marco dorado
  const frame = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 2.35),
    new THREE.MeshStandardMaterial({ color:COLORS.gold, roughness:0.4, metalness:0.15 })
  );
  frame.position.z = -0.02;
  group.add(frame);

  // Foto - carga imagen real o placeholder
  const loader = new THREE.TextureLoader();
  const photoGeo = new THREE.PlaneGeometry(1.6, 2.0);
  
  function makePlaceholder(){
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
  if (p.image && p.image.trim()){
    const tex = loader.load(p.image.trim(),
      (texture) => { texture.colorSpace = THREE.SRGBColorSpace; 
        if(photoMesh && photoMesh.material){
          photoMesh.material.map = texture;
          photoMesh.material.emissiveMap = texture;
          photoMesh.material.needsUpdate = true;
        }
      },
      undefined,
      (err) => { if(photoMesh && photoMesh.material){
          photoMesh.material.map = makePlaceholder();
          photoMesh.material.emissiveMap = photoMesh.material.map;
          photoMesh.material.needsUpdate = true;
        }
      }
    );
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map:tex, emissive:0xffffff, emissiveMap:tex, emissiveIntensity:0.12 });
    photoMesh = new THREE.Mesh(photoGeo, mat);
  }else{
    const mat = new THREE.MeshStandardMaterial({ map:makePlaceholder(), emissive:0xffffff, emissiveMap:makePlaceholder(), emissiveIntensity:0.12 });
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

  // Sobre flotante
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

  const glow = new THREE.PointLight(COLORS.altarGlow, 1.1, 9);
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
  updateStars(dt);
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
    camera.position.z = clamp(camera.position.z + mz, -BOUNDS-5, BOUNDS-80);
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
    f.rotation.z = Math.sin(t*0.5 + f.userData.seed) * 0.02;
  });
}

function updateStars(dt){
  if(starPoints && starPoints.material){
    starPoints.material.opacity = 0.5 + Math.sin(walkTime * 0.7) * 0.4;
    starPoints.rotation.y += dt * 0.003;
    starPoints.position.x = camera.position.x;
    starPoints.position.z = camera.position.z;
  }
}

function updatePOIs(dt){
  let closest = null, closestDist = Infinity;

  PHOTOS.forEach(p => {
    const mesh = p.obj.userData.mesh;
    const seed = p.obj.userData.seed;
    mesh.position.y = p.obj.userData.baseY + Math.sin(walkTime*1.1 + seed)*0.08;
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

  const INTERACT_R = 3.2;
  if(closestDist < INTERACT_R){
    nearestPOI = closest;
    showPrompt(closest);
  } else {
    nearestPOI = null;
    hidePrompt();
  }
}

// =====================================================================
// HUD / INTERACCIÓN
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

// Menú (teletransporte)
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

// Mirar: arrastre en el resto de la pantalla
let lookPointerId = null, lastX=0, lastY=0, downX=0, downY=0, moved=0;
const gameContainer = document.getElementById('gameContainer');

gameContainer.addEventListener('pointerdown', (e)=>{
  if(lookPointerId !== null) return;
  // Ignorar si está sobre joystick o botones UI
  const target = e.target.closest('#joyBase, #menuBtn, #musicBtn, #prompt');
  if(target) return;
  
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
  if(moved < 12){ interactNearest(); }
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

document.getElementById('enterBtn').addEventListener('click', ()=>{
  document.getElementById('intro').classList.add('hide');
  document.getElementById('hud').classList.add('show');
});

// =====================================================================
// MÚSICA AMBIENTAL + SPOTIFY
// =====================================================================
let audioCtx = null;
let ambientAudio = null;
let isPlaying = false;

function createAmbientAudio(){
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.12;
  gainNode.connect(audioCtx.destination);

  const osc1 = audioCtx.createOscillator();
  osc1.type = 'sine'; osc1.frequency.value = 220; osc1.connect(gainNode);

  const osc2 = audioCtx.createOscillator();
  osc2.type = 'sine'; osc2.frequency.value = 330; osc2.connect(gainNode);

  const lfo = audioCtx.createOscillator();
  lfo.type = 'sine'; lfo.frequency.value = 0.12;
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 12;
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

function startAmbient(){
  if(!ambientAudio) createAmbientAudio();
  if(ambientAudio.started) return;
  
  if(audioCtx.state === 'suspended') audioCtx.resume();
  
  ambientAudio.osc1.start();
  ambientAudio.osc2.start();
  ambientAudio.lfo.start();
  ambientAudio.envGain.gain.setValueAtTime(0, audioCtx.currentTime);
  ambientAudio.envGain.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 10);
  ambientAudio.started = true;
}

function stopAmbient(){
  if(!ambientAudio || !ambientAudio.started) return;
  ambientAudio.envGain.gain.cancelScheduledValues(audioCtx.currentTime);
  ambientAudio.envGain.gain.setValueAtTime(ambientAudio.envGain.gain.value, audioCtx.currentTime);
  ambientAudio.envGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2);
  setTimeout(() => {
    ambientAudio.osc1.stop();
    ambientAudio.osc2.stop();
    ambientAudio.lfo.stop();
    ambientAudio.started = false;
  }, 2500);
}

// Music button handler
const musicBtn = document.getElementById('musicBtn');
if(musicBtn){
  musicBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if(!isPlaying){
      startAmbient();
      musicBtn.classList.add('playing');
      musicBtn.textContent = '🔊';
      isPlaying = true;
      showToast('🎵 Música ambiental activada');
    }else{
      stopAmbient();
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
      if(isPlaying) showSpotifyMenu(e.clientX, e.clientY);
    }, 600);
  });
  musicBtn.addEventListener('pointerup', () => clearTimeout(pressTimer));
  musicBtn.addEventListener('pointerleave', () => clearTimeout(pressTimer));
}

// Auto-resume audio context on first user interaction
document.body.addEventListener('click', () => {
  if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });

function showSpotifyMenu(x, y){
  const menu = document.createElement('div');
  menu.style.cssText = `
    position:fixed; left:${Math.min(x, window.innerWidth-220)}px; bottom:${Math.max(y, 140)}px; z-index:30;
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
  setTimeout(() => { if(menu.parentElement) menu.remove(); }, 15000);
}