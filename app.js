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
    const supabase = window.supabaseClient;
    
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
  // Canción real subida/enlazada en el admin (prioridad: archivo subido > URL directa).
  // Se asigna aquí (no al cargar el script) porque CONTENT llega async desde Supabase;
  // hacerlo antes siempre daba MUSIC_AUDIO_SRC vacío.
  window.MUSIC_AUDIO_SRC = CONTENT.music?.audioData || CONTENT.music?.audioUrl || '';
  if(MUSIC_AUDIO_SRC){
    const bgAudioEl = document.getElementById('bgAudio');
    bgAudioEl.src = MUSIC_AUDIO_SRC;
    bgAudioEl.volume = 0.55;
  }

  // Apply text/content to DOM now that data has loaded
  applyDynamicContent();

  // Build UI that depends on loaded content (menu + intro typewriter)
  buildTeleportMenu();
  typeMessage();

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
  gold:0xb08d57,
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
let frameCount = 0, lastFpsCheck = 0, avgFps = 60, performanceOptimized = false;

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

  // Counter total = número real de fotos (dinámico, nunca desincronizado)
  const countTotal = document.getElementById('countTotal');
  if (countTotal) countTotal.textContent = PHOTOS.length;
}

function init3D(){
  scene = new THREE.Scene();

  // ---- cielo con nubes (canvas -> textura) ----
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 512; skyCanvas.height = 256;
  const sctx = skyCanvas.getContext('2d');
  
  // Degradado cielo — DÍA AZUL ALEGRE (luminoso, feliz, sin nada raro/triste)
  const grad = sctx.createLinearGradient(0,0,0,256);
  grad.addColorStop(0,    '#3a8fe0');  // cenit: azul vivo
  grad.addColorStop(0.45, '#69b3ec');  // azul medio
  grad.addColorStop(0.75, '#a9d8f5');  // azul claro
  grad.addColorStop(1,    '#e8f6ff');  // horizonte casi blanco, luminoso
  sctx.fillStyle = grad; sctx.fillRect(0,0,512,256);

  // Resplandor suave del sol, arriba (día alto, no un atardecer)
  const sunGlow = sctx.createRadialGradient(390, 55, 4, 390, 55, 130);
  sunGlow.addColorStop(0, 'rgba(255,255,240,0.95)');
  sunGlow.addColorStop(0.5, 'rgba(255,250,220,0.35)');
  sunGlow.addColorStop(1, 'rgba(255,250,220,0)');
  sctx.fillStyle = sunGlow; sctx.fillRect(0,0,512,180);

  // Nubes blancas esponjosas (más en la parte baja, cerca del horizonte)
  for(let i=0;i<11;i++){
    const cx = Math.random()*512;
    const cy = Math.random()*110 + 100;
    const w = 65 + Math.random()*95;
    const h = 22 + Math.random()*18;
    sctx.fillStyle = 'rgba(255,255,255,0.92)';
    drawCloud(sctx, cx, cy, w, h);
  }

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;

  // niebla azul clara del horizonte -> el suelo se funde con el cielo sin líneas duras
  scene.fog = new THREE.FogExp2(0xcfe9fb, 0.019);

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

  // ---- luces (día soleado y alegre) ----
  scene.add(new THREE.HemisphereLight(0xd8ecff, 0x5a7a42, 0.85)); // cielo azul / rebote verde del suelo
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const sun = new THREE.DirectionalLight(0xfffbe8, 1.35);          // sol blanco-cálido bien alto
  sun.position.set(-18, 45, -10);
  scene.add(sun);
  // relleno suave desde atrás para dar volumen sin sombras duras
  const rim = new THREE.DirectionalLight(0xeaf4ff, 0.3);
  rim.position.set(20, 10, 30);
  scene.add(rim);

  // ---- suelo con textura suave (no un color plano) ----
  const groundGeo = new THREE.PlaneGeometry(400, 400, 1, 1);
  const groundMat = new THREE.MeshStandardMaterial({ map: createGroundTexture(), color:0x8a9a6a, roughness:1 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI/2;
  scene.add(ground);

  // ---- camino sutil ----
  const pathGeo = new THREE.PlaneGeometry(3.2, 80);
  const pathMat = new THREE.MeshStandardMaterial({ color:0xb89a72, roughness:1, transparent:true, opacity:0.35 });
  const path = new THREE.Mesh(pathGeo, pathMat);
  path.rotation.x = -Math.PI/2;
  path.position.set(0, 0.012, -30);
  scene.add(path);

  // ---- flores densas y realistas ----
  initFlowers();

  // ---- polvo atmosférico ----
  dustPoints = createDust();
  scene.add(dustPoints);

  // (sin estrellas: es de día, un cielo azul alegre no las necesita)

  // ---- puntos de interés: fotos ----
  PHOTOS.forEach((p, idx) => {
    p.idx = idx; // clave para el contador: sin esto, visited.add(undefined) nunca avanza
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
// FLORES: texturas dibujadas + InstancedMesh
// Antes: ~1500 flores × 10-28 mallas = decenas de miles de draw calls (lentísimo).
// Ahora: 3 InstancedMesh de flores + 1 de follaje = ~4 draw calls para TODO
// el campo, con viento suave por shader. Rápido en móvil y más bonito.
// =====================================================================
let bloomMeshes = [], foliageMesh = null, flowerCount = 0;
const windUniform = { value: 0 };

function isMobileDevice(){
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || Math.min(window.innerWidth, window.innerHeight) < 820;
}

// Material de flor con tinte por-instancia + viento suave (GPU, gratis)
function flowerMaterial(tex, foliage){
  const mat = new THREE.MeshStandardMaterial({
    map: tex, alphaTest: 0.42, transparent: false, side: THREE.DoubleSide,
    roughness: 0.82, metalness: 0.0, color: 0xffffff
  });
  const amp = foliage ? 0.075 : 0.055;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       #ifdef USE_INSTANCING
         vec3 iP = instanceMatrix[3].xyz;
         float h = uv.y;
         float w = sin(uTime*1.15 + iP.x*0.45 + iP.z*0.32);
         float w2 = sin(uTime*0.7 + iP.z*0.5);
         transformed.x += (w*${amp.toFixed(3)} + w2*0.02) * h;
         transformed.z += w*${(amp*0.4).toFixed(3)} * h;
       #endif`
    );
  };
  return mat;
}

function initFlowers(){
  const defs = [
    { tex: createTulipTexture(),   colors:[COLORS.tulipRed,COLORS.tulipPink,COLORS.tulipYellow,COLORS.tulipWhite,COLORS.tulipOrange], w:0.62 },
    { tex: createRoseTexture(),    colors:[COLORS.roseRed,COLORS.rosePink,COLORS.roseWhite,COLORS.rosePeach],                         w:0.66 },
    { tex: createGerberaTexture(), colors:[COLORS.gerberaRed,COLORS.gerberaOrange,COLORS.gerberaPink,COLORS.gerberaYellow],           w:0.66 },
  ];

  // Posiciones del campo (denso pero barato gracias al instancing)
  const positions = [];
  const areaWidth = 48, areaDepth = 84;
  const spacing = isMobileDevice() ? 1.5 : 1.25;
  for(let z = 0; z > -areaDepth; z -= spacing){
    for(let x = -areaWidth/2; x < areaWidth/2; x += spacing){
      const fx = x + (Math.random()-0.5) * 0.9;
      const fz = z + (Math.random()-0.5) * 0.9;
      if(Math.abs(fx) < 1.5) continue;           // camino central
      positions.push({ x:fx, z:fz, s:0.7 + Math.random()*0.6, yaw:Math.random()*Math.PI*2, t:Math.floor(Math.random()*3) });
    }
  }
  flowerCount = positions.length;

  const byType = [[],[],[]];
  positions.forEach(p => byType[p.t].push(p));

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  // BLOOMS: 2 quads cruzados por flor -> volumen desde cualquier ángulo
  defs.forEach((def, ti) => {
    const list = byType[ti];
    if(!list.length) return;
    const geo = new THREE.PlaneGeometry(def.w, def.w);
    const inst = new THREE.InstancedMesh(geo, flowerMaterial(def.tex, false), list.length * 2);
    let n = 0;
    list.forEach(p => {
      col.set(def.colors[Math.floor(Math.random()*def.colors.length)]);
      for(let k = 0; k < 2; k++){
        dummy.position.set(p.x, 0.72 * p.s, p.z);
        dummy.rotation.set(0, p.yaw + k*Math.PI/2, 0);
        dummy.scale.setScalar(p.s);
        dummy.updateMatrix();
        inst.setMatrixAt(n, dummy.matrix);
        inst.setColorAt(n, col);
        n++;
      }
    });
    inst.instanceMatrix.needsUpdate = true;
    if(inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.frustumCulled = false;
    scene.add(inst);
    bloomMeshes.push(inst);
  });

  // FOLLAJE (tallo + hojas): un solo InstancedMesh verde para todas las flores
  const fgeo = new THREE.PlaneGeometry(0.52, 0.95);
  fgeo.translate(0, 0.475, 0);           // base en y=0
  foliageMesh = new THREE.InstancedMesh(fgeo, flowerMaterial(createFoliageTexture(), true), positions.length * 2);
  let m = 0;
  positions.forEach(p => {
    for(let k = 0; k < 2; k++){
      dummy.position.set(p.x, 0, p.z);
      dummy.rotation.set(0, p.yaw + k*Math.PI/2 + 0.35, 0);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      foliageMesh.setMatrixAt(m++, dummy.matrix);
    }
  });
  foliageMesh.instanceMatrix.needsUpdate = true;
  foliageMesh.frustumCulled = false;
  scene.add(foliageMesh);
}

// ---- Texturas de flores (canvas con alfa; en tonos claros para teñir por-instancia) ----
function newFlowerCanvas(){ const c = document.createElement('canvas'); c.width = c.height = 256; return c; }

function createTulipTexture(){
  const c = newFlowerCanvas(); const ctx = c.getContext('2d');
  const cx = 128;
  function petal(baseX, ang, tall, shade){
    ctx.save(); ctx.translate(baseX, 210); ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, 0, 0, -150*tall);
    g.addColorStop(0,   `rgba(205,205,205,1)`);
    g.addColorStop(0.4, `rgba(240,240,240,1)`);
    g.addColorStop(1,   `rgba(255,255,255,1)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(52, -34*tall, 44, -150*tall, 0, -158*tall);
    ctx.bezierCurveTo(-44, -150*tall, -52, -34*tall, 0, 0);
    ctx.closePath(); ctx.fill();
    // vena central sutil
    ctx.strokeStyle = 'rgba(180,180,180,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0,-8); ctx.lineTo(0,-150*tall); ctx.stroke();
    ctx.restore();
  }
  petal(cx-30, -0.26, 0.92, 1);   // externos
  petal(cx+30,  0.26, 0.92, 1);
  petal(cx,     0.00, 1.02, 1);   // central alto
  petal(cx-14, -0.11, 0.80, 1);   // internos (copa cerrada)
  petal(cx+14,  0.11, 0.80, 1);
  return alphaTexture(c);
}

function createRoseTexture(){
  const c = newFlowerCanvas(); const ctx = c.getContext('2d');
  const cx = 128, cy = 120;
  // capas de pétalos redondeados, de fuera (más oscuro) hacia dentro (más claro)
  function ring(count, radius, petalR, rot, lo, hi){
    for(let i=0;i<count;i++){
      const a = rot + (i/count)*Math.PI*2;
      const px = cx + Math.cos(a)*radius, py = cy + Math.sin(a)*radius;
      const g = ctx.createRadialGradient(px, py, 1, px, py, petalR);
      g.addColorStop(0, `rgba(${hi},${hi},${hi},1)`);
      g.addColorStop(1, `rgba(${lo},${lo},${lo},1)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, petalR, 0, Math.PI*2); ctx.fill();
    }
  }
  ring(8, 66, 40, 0.0,   190, 235);   // exterior
  ring(7, 46, 34, 0.4,   205, 245);
  ring(5, 28, 27, 0.9,   220, 252);
  ring(4, 14, 20, 0.2,   232, 255);   // capullo interno
  // remolino central
  ctx.strokeStyle = 'rgba(200,200,200,0.6)'; ctx.lineWidth = 3;
  ctx.beginPath();
  for(let t=0;t<10;t+=0.2){ const r=t*1.6; const x=cx+Math.cos(t)*r, y=cy+Math.sin(t)*r; t===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }
  ctx.stroke();
  return alphaTexture(c);
}

function createGerberaTexture(){
  const c = newFlowerCanvas(); const ctx = c.getContext('2d');
  const cx = 128, cy = 122;
  // dos anillos de pétalos finos radiales
  function petals(count, len, wid, r0, rot, lo, hi){
    for(let i=0;i<count;i++){
      const a = rot + (i/count)*Math.PI*2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      const g = ctx.createLinearGradient(0, -r0, 0, -r0-len);
      g.addColorStop(0, `rgba(${lo},${lo},${lo},1)`);
      g.addColorStop(0.5, `rgba(${hi},${hi},${hi},1)`);
      g.addColorStop(1, `rgba(255,255,255,1)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -r0);
      ctx.quadraticCurveTo(wid, -r0-len*0.5, 0, -r0-len);
      ctx.quadraticCurveTo(-wid, -r0-len*0.5, 0, -r0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  petals(20, 78, 9, 30, 0.0,   210, 245);   // exterior
  petals(16, 54, 8, 26, 0.16,  225, 252);   // interior
  // centro
  const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 30);
  g.addColorStop(0, 'rgba(120,120,120,1)');
  g.addColorStop(0.6, 'rgba(90,90,90,1)');
  g.addColorStop(1, 'rgba(150,150,150,1)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI*2); ctx.fill();
  // puntitos del disco
  ctx.fillStyle = 'rgba(60,60,60,0.8)';
  for(let i=0;i<40;i++){ const a=Math.random()*Math.PI*2, r=Math.random()*24; ctx.beginPath(); ctx.arc(cx+Math.cos(a)*r, cy+Math.sin(a)*r, 1.6, 0, Math.PI*2); ctx.fill(); }
  return alphaTexture(c);
}

function createFoliageTexture(){
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const ctx = c.getContext('2d');
  // tallo
  const sg = ctx.createLinearGradient(58,0,70,0);
  sg.addColorStop(0,'#5f7f45'); sg.addColorStop(0.5,'#8fae63'); sg.addColorStop(1,'#5f7f45');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.moveTo(60,256); ctx.lineTo(68,256); ctx.lineTo(66,20); ctx.lineTo(62,20); ctx.closePath(); ctx.fill();
  // hojas
  function leaf(y, dir, len){
    ctx.save(); ctx.translate(64, y); ctx.scale(dir,1); ctx.rotate(-0.5);
    const g = ctx.createLinearGradient(0,0,len,-len*0.4);
    g.addColorStop(0,'#4f7239'); g.addColorStop(0.6,'#7ea15a'); g.addColorStop(1,'#5f8347');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0,0);
    ctx.quadraticCurveTo(len*0.6,-len*0.35, len,-len*0.15);
    ctx.quadraticCurveTo(len*0.55,-len*0.05, 0,6);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  leaf(150, 1, 54); leaf(180, -1, 46); leaf(120, -1, 40);
  return alphaTexture(c);
}

function alphaTexture(canvas){
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createGroundTexture(){
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#43552f'; x.fillRect(0,0,256,256);
  // manchas suaves de césped (tonos de verde + toques cálidos del ocaso)
  for(let i=0;i<900;i++){
    const g = 45 + Math.random()*55;
    const warm = Math.random() < 0.15;
    x.fillStyle = warm
      ? `rgba(${150+Math.random()*40|0},${120+Math.random()*30|0},${70|0},0.18)`
      : `rgba(${g*0.55|0},${g|0},${g*0.45|0},0.28)`;
    const r = 2 + Math.random()*9;
    x.beginPath(); x.arc(Math.random()*256, Math.random()*256, r, 0, Math.PI*2); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(60, 60);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function createDust(){
  const count = performanceOptimized ? 60 : 150;
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
    // Fondo suave sin rayas
    ctx.fillStyle = '#F7F0E6'; ctx.fillRect(0,0,512,640);
    // Degradado suave
    const grad = ctx.createLinearGradient(0,0,512,640);
    grad.addColorStop(0, 'rgba(237,227,211,0.3)');
    grad.addColorStop(0.5, 'rgba(201,157,163,0.15)');
    grad.addColorStop(1, 'rgba(237,227,211,0.3)');
    ctx.fillStyle = grad; ctx.fillRect(0,0,512,640);
    // Texto elegante
    ctx.fillStyle = '#5C1A2B'; ctx.font = 'italic 24px Georgia'; ctx.textAlign = 'center';
    ctx.fillText('Cargando recuerdo…', 256, 320);
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

  // FPS monitoring para optimización automática
  frameCount++;
  if(walkTime - lastFpsCheck > 1.0){
    avgFps = frameCount;
    frameCount = 0;
    lastFpsCheck = walkTime;
    if(avgFps < 25 && !performanceOptimized){
      optimizeForLowPerformance();
    }
  }

  updateMovement(dt);
  updateFlowers();
  updateStars(dt);
  updatePOIs(dt);

  renderer.render(scene, camera);
}

function optimizeForLowPerformance(){
  performanceOptimized = true;
  if(dustPoints){
    scene.remove(dustPoints);
    dustPoints = createDust(); // menos partículas
    scene.add(dustPoints);
  }
  renderer.setPixelRatio(1);              // baja resolución de render
  if(scene.fog) scene.fog.density = 0.03; // niebla más cercana = menos que dibujar
  console.warn('⚠️ Optimizando performance para dispositivo lento');
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
    // z va de un poco delante del spawn (9) hasta un poco detrás del altar (LETTER_POS.z - 8).
    // Antes era clamp(z, -60, -25): como el spawn está en z=6 (> -25), el primer movimiento
    // "teletransportaba" la cámara a -25 de golpe, saltándose las primeras fotos sin poder volver.
    camera.position.x = clamp(camera.position.x + mx, -BOUNDS, BOUNDS);
    camera.position.z = clamp(camera.position.z + mz, LETTER_POS.z - 8, 9);
    camera.position.y = 1.6 + Math.sin(walkTime*7.5) * 0.035;
  } else {
    walking = false;
    camera.position.y += (1.6 - camera.position.y) * 0.15;
  }
}

function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }

function updateFlowers(){
  // Viento por shader: solo hay que avanzar el tiempo (coste ~0)
  windUniform.value = walkTime;
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
  playClickSound();
  if(nearestPOI.type === 'photo'){
    openPhoto(nearestPOI.data, nearestPOI.idx);
  } else if(nearestPOI.type === 'letter'){
    if(visited.size === PHOTOS.length){
      openLetter();
    } else {
      const remaining = PHOTOS.length - visited.size;
      showToast(`📍 Busca ${remaining} más recuerdo${remaining > 1 ? 's' : ''} en el camino`);
    }
  }
}

function playClickSound(){
  try {
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch(e) {}
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

// Menú (teletransporte) — se rellena tras cargar el contenido (PHOTOS async)
const menuList = document.getElementById('menuList');
const menuPanel = document.getElementById('menuPanel');
function buildTeleportMenu(){
  menuList.innerHTML = '';
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
}
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

document.getElementById('enterBtn').addEventListener('click', ()=>{
  document.getElementById('intro').classList.add('hide');
  document.getElementById('hud').classList.add('show');
  // Al entrar (gesto real del usuario) arrancamos la música si hay una canción subida
  if(hasRealSong()){
    startMusic();
    musicBtn.classList.add('playing');
    musicBtn.textContent = '🔊';
    isPlaying = true;
  }
});

// =====================================================================
// MÚSICA: canción real subida en el admin (fiable) con fallback a un
// tono ambiental generado si aún no se subió ninguna canción.
// Los enlaces de Spotify NUNCA sonaban aquí dentro (solo abren la app
// de Spotify por fuera) — por eso "no se escuchaba". Se dejan como
// extra opcional en la pulsación larga.
// =====================================================================
let audioCtx = null;
let ambientAudio = null;
let isPlaying = false;
const bgAudio = document.getElementById('bgAudio');
// bgAudio.src ya se asigna en initApp() una vez llega MUSIC_AUDIO_SRC de Supabase
function hasRealSong(){ return !!(MUSIC_AUDIO_SRC && MUSIC_AUDIO_SRC.trim()); }
function startMusic(){ hasRealSong() ? bgAudio.play().catch(()=>{}) : startAmbient(); }
function stopMusic(){ hasRealSong() ? bgAudio.pause() : stopAmbient(); }

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
      startMusic();
      musicBtn.classList.add('playing');
      musicBtn.textContent = '🔊';
      isPlaying = true;
      showToast(hasRealSong() ? '🎵 Reproduciendo vuestra canción' : '🎵 Música ambiental activada');
    }else{
      stopMusic();
      musicBtn.classList.remove('playing');
      musicBtn.textContent = '🎵';
      isPlaying = false;
      showToast('🔇 Música pausada');
    }
  });

  // Pulsación larga -> enlaces opcionales de Spotify (solo si hay alguno configurado)
  let pressTimer = null;
  musicBtn.addEventListener('pointerdown', (e) => {
    pressTimer = setTimeout(() => {
      const hasLinks = SPOTIFY_LINKS && SPOTIFY_LINKS.some(s => s.url && s.url.trim());
      if(hasLinks) showSpotifyMenu(e.clientX, e.clientY);
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