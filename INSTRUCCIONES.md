# Proyecto: Jardín 3D de Cumpleaños (QR interactivo)

## 1. Objetivo
Página web que se abre escaneando un QR (regalo de cumpleaños para la novia del usuario).
Es un **jardín 3D caminable** (no scroll, no slides) donde ella explora con el dedo, encuentra
fotos de la pareja con descripciones, y al final desbloquea una carta de amor decorada.
Tono: romántico, elegante, cinematográfico, lento y contemplativo (no un juego rápido).

## 2. Estado actual — YA CONSTRUIDO
Dos archivos funcionales en `/jardin-3d/`:
- `index.html` — estructura, todos los estilos (CSS), overlays (foto, carta, menú, HUD).
- `app.js` — toda la lógica 3D con Three.js (r128, cargado desde cdnjs vía `<script>`, sin módulos).

### Flujo implementado
1. **Intro**: pantalla oscura con blur (`backdrop-filter`), mensaje inicial con efecto
   máquina de escribir (array `MENSAJE` en `app.js`), botón "Entrar al jardín".
   El jardín 3D ya está renderizando de fondo (desenfocado) antes de entrar, para que la
   transición sea un fundido y no un corte.
2. **Jardín 3D**: cielo con degradado (canvas → textura), niebla (`FogExp2`) del mismo color
   del horizonte para que el suelo se funda con el cielo sin líneas duras, ~70 flores 3D
   (tulipanes/gerberas de geometría primitiva: cilindro + esferas achatadas), un campo de
   "polvo floral" (`THREE.Points`, 500 partículas) para dar profundidad/volumen de fondo,
   y pétalos cayendo continuamente alrededor de la cámara.
3. **Controles táctiles**: joystick virtual (abajo-izquierda) para caminar; arrastrar el dedo
   en el resto de la pantalla para mirar alrededor (estilo FPS de un solo dedo).
   Un toque corto (sin arrastre) sobre un punto de interés cercano lo activa.
4. **4 puntos de interés — fotos**: marcos dorados flotantes que hacen "billboard"
   (siempre miran a la cámara), con bobbing suave. Al acercarse (radio 3.4 unidades) aparece
   el prompt "Toca para ver"; al tocar se abre un overlay con foto + `caption` + `why`
   (por qué esa foto importa). Se van marcando como "visitadas" (contador HUD arriba-izquierda).
5. **Altar final**: al fondo del camino, con sobre flotante y luz dorada. Si faltan fotos por
   visitar, un toast avisa cuántas faltan; al completar las 4, se abre la carta decorada
   (mismo componente visual: papel con ramita, cursiva, firma, sello).
6. **Menú de teletransporte**: botón `☰` arriba-derecha abre panel lateral con lista de
   lugares (mensaje inicial, cada foto, carta final) y botón "Ir" que mueve la cámara
   instantáneamente ahí — para poder revisitar cualquier parte sin caminar de nuevo.
7. Detalles cinematográficos: barras negras arriba/abajo (letterbox), viñeta oscura en bordes.

### Paleta y tipografía (usarlas siempre, no improvisar otras)
```
--vino:       #5C1A2B
--vino-dark:  #3A1220
--beige:      #EDE3D3
--rosa-vieja: #C99DA3
--rosa-suave: #E7CFCF
--cream:      #F7F0E6
--gold:       #B08D57
--leaf:       #7C9A6C
```
Fuentes (Google Fonts, ya enlazadas en `<head>`):
- Display/cursiva: **Parisienne** (títulos, firma)
- Cuerpo elegante: **Cormorant Garamond** (mensajes, cartas, subtítulos)
- UI/labels: **Jost** (botones, HUD, mayúsculas espaciadas)

## 3. Lo que falta — contenido real del usuario
El usuario (dueño del proyecto) todavía debe entregar:
1. **El mensaje inicial completo** → reemplazar el array `MENSAJE` en `app.js` (líneas ~4-9).
2. **4 (o más) fotos reales** de la pareja + su descripción corta (`caption`) y el texto de
   "por qué es importante" (`why`) → editar el array `PHOTOS` en `app.js` (líneas ~11-16).
   - Las fotos en sí están como *placeholder dibujado en canvas* (función `createPhotoFrame`
     en `app.js`, usa `ctx.fillRect` con un patrón rayado). Cuando haya fotos reales, hay que
     cambiar esa función para cargar una imagen real con `THREE.TextureLoader` en vez de
     dibujar el placeholder (ver sección 5, punto "Cargar fotos reales").
3. **El texto completo de la carta final** → editar directamente los `<p>` dentro de
   `.letter-card` en `index.html` (sección `<!-- OVERLAY CARTA -->`).
4. **Nombre de la novia** → aparece en dos lugares marcados con `🔧` en `index.html`
   (intro `<h1>` y saludo `<h2>Querida Amor,</h2>` de la carta).
5. **Nombre/firma del usuario** (opcional) → línea `<div class="signature">Con todo mi amor</div>`.

## 4. Cómo probarlo y publicarlo
- **No sirve abrir el archivo local directamente** (`file://`) sin conexión, porque carga
  Three.js desde un CDN externo (`cdnjs.cloudflare.com`) — necesita estar en un servidor con
  internet.
- Pasos para publicarlo gratis:
  1. Subir la carpeta completa (`index.html` + `app.js`) a **Netlify Drop**
     (netlify.com/drop, arrastrar la carpeta) o a un repositorio de **GitHub Pages** o a
     **Vercel**.
  2. Obtener el link público que genera el hosting.
  3. Generar el código QR con ese link (cualquier generador, ej. qr-code-generator.com).
  4. Probar en un celular real (no solo en la vista previa de escritorio) antes de entregarlo,
     revisando: sensibilidad del joystick, si el radio de interacción de las fotos se siente
     bien, y el tiempo de las animaciones.

## 5. Posibles siguientes pasos / mejoras (si se retoma el proyecto)
- **Cargar fotos reales**: en `createPhotoFrame()` (app.js), reemplazar el bloque que dibuja
  el placeholder en `canvas` por:
  ```js
  const loader = new THREE.TextureLoader();
  const tex = loader.load('fotos/foto1.jpg');
  ```
  y usar esa textura directamente en el material del plano de la foto.
- **Sonido ambiental** (opcional): agregar audio de fondo suave con `<audio>` y desbloquear
  reproducción en el clic de "Entrar al jardín" (los navegadores móviles bloquean autoplay
  sin interacción del usuario).
- **Más puntos de interés**: agregar más objetos al array `PHOTOS` (el sistema ya está armado
  para escalar); ajustar `BOUNDS` en `app.js` si el jardín necesita ser más grande.
- **Collision/paredes invisibles**: actualmente se puede caminar "a través" de las flores;
  si se quiere más pulido, se podría añadir una comprobación simple de distancia mínima a
  cada `flowerObjs` para desviar el movimiento, pero no es prioritario.
- **Optimizar para gama baja**: si el celular de destino es antiguo, bajar `count` de
  `createDust()` (500) y el número de flores (70) en `init3D()`.

## 6. Instrucción resumida para un agente de código
> Tienes un proyecto de Three.js (r128, sin módulos, un solo `<script>` vía CDN) que renderiza
> un jardín 3D caminable con controles táctiles (joystick + arrastre para mirar). Los archivos
> son `index.html` (estructura + CSS) y `app.js` (toda la lógica: escena, flores, fotos, altar,
> controles, HUD). El contenido editable (mensaje, fotos, carta, nombres) está marcado con
> comentarios `🔧` en `index.html` y en las constantes `MENSAJE` / `PHOTOS` al inicio de
> `app.js`. Respeta la paleta y tipografías ya definidas en `:root` de `index.html` — no
> introduzcas otros colores ni fuentes. El tono debe seguir siendo lento, cinematográfico y
> romántico: evita animaciones rápidas o bruscas.
