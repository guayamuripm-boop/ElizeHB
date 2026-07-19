# 🌿 Nuestro Jardín 3D - Documentación del Proyecto

> Un jardín 3D interactivo como regalo de cumpleaños (QR escaneable)

---

## 📋 Resumen del Proyecto

**Objetivo:** Página web que se abre escaneando un código QR. Es un **jardín 3D caminable** (first-person, touch controls) donde ella explora con el dedo, encuentra 8 fotos de la pareja con descripciones, y al final desbloquea una carta de amor decorada.

**Tono:** Romántico, elegante, cinematográfico, lento y contemplativo (no un juego rápido).

---

## 🏗️ Arquitectura Técnica

### Stack
- **Three.js r128** (CDN, sin módulos, un solo `<script>`)
- **Supabase** (PostgreSQL + JSONB) para persistencia de contenido
- **Vercel** para hosting estático (auto-deploy desde GitHub)
- **HTML/CSS/JS vanilla** - sin build, sin bundlers

### Estructura de Archivos
```
Elize/
├── index.html          # Jardín 3D principal (Three.js + UI + Supabase client)
├── admin.html          # Panel de edición visual (drag&drop fotos, textos, Spotify)
├── app.js              # Lógica 3D completa (escena, flores, controles, POIs)
├── qr-corazon-vinotinto.jpg  # QR código corazón color vino para imprimir
├── vercel.json         # Configuración deploy estático
├── package.json        # Metadatos (solo para referencia)
└── .gitignore          # Excluye node_modules
```

---

## 🎮 Funcionalidades Implementadas

### Jardín 3D (`index.html` + `app.js`)
| Feature | Estado | Detalles |
|---------|--------|----------|
| **Cielo con nubes** | ✅ | Canvas procedural + nubes suaves |
| **Estrellas fijas** | ✅ | 80 estrellas ✦ parpadeando + rotación lenta |
| **Flores realistas** | ✅ | ~300 flores densas: Tulipanes (copa 6 pétalos), Rosas (3 capas espiral), Gerberas (2 capas planas) |
| **Camino central** | ✅ | 3.5m ancho, libre de flores |
| **8 Puntos de interés (fotos)** | ✅ | Marcos dorados con billboard, bobbing suave, glow light |
| **Carta final (altar)** | ✅ | Sobre flotante + luz dorada, se desbloquea tras 8 fotos |
| **Controles táctiles** | ✅ | Joystick izq (mover) + arrastrar pantalla (mirar) + tap (interactuar) |
| **HUD** | ✅ | Contador "Recuerdos: X/8", botón menú ☰, botón música 🎵, prompt contextual |
| **Menú teletransporte** | ✅ | Panel lateral con lista de lugares + botón "Ir" |
| **Música ambiental** | ✅ | Web Audio API (sine waves + LFO) - click 🎵 = play/pause |
| **Spotify integration** | ✅ | Hold 600ms en 🎵 = menú con 4 links configurables |
| **Carga desde Supabase** | ✅ | Lee `jardin_content` row `id=1` → fallback localStorage → DEFAULTS |

### Panel Admin (`admin.html`)
| Feature | Estado | Detalles |
|---------|--------|----------|
| **Mensaje inicial** | ✅ | 4 líneas máquina de escribir (add/remove líneas) |
| **8 Fotos** | ✅ | Drag&drop JPG/PNG <2MB → base64 + preview, o URL externa |
| **Textos por foto** | ✅ | Caption + "Por qué es especial" (why) |
| **Posición X/Z** | ✅ | Inputs numéricos step 0.1 |
| **Carta final** | ✅ | Saludo + párrafos (add/remove) + firma |
| **Nombres** | ✅ | Ella (intro+carta) + Tu firma |
| **Música/Spotify** | ✅ | 4 enlaces configurables (nombre + URL) |
| **QR Corazón** | ✅ | Genera QR corazón vinotinto #5C1A2B → Descargar PNG |
| **Persistencia** | ✅ | Guarda en Supabase `jardin_content` row `id='1'` (jsonb) |
| **Fallback** | ✅ | Si falla Supabase → localStorage → DEFAULTS |

---

## 🗄️ Base de Datos (Supabase)

### Tabla: `jardin_content`
```sql
CREATE TABLE public.jardin_content (
  id text PRIMARY KEY DEFAULT '1',
  content jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.jardin_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON public.jardin_content
  FOR SELECT USING (true);

CREATE POLICY "service write" ON public.jardin_content
  FOR ALL USING (auth.role() = 'service_role');

INSERT INTO public.jardin_content (id, content) VALUES ('1', '{}')
ON CONFLICT (id) DO NOTHING;
```

### Estructura JSON guardada
```json
{
  "herName": "Elize",
  "myName": "Tu Nombre",
  "mensaje": ["Línea 1…", "Línea 2…", "Línea 3…", "Línea 4…"],
  "photos": [
    {"label":"Foto 1","caption":"Nuestro primer recuerdo","why":"...","x":-5,"z":-8,"image":"data:image/jpeg;base64,..."},
    ...
  ],
  "letter": {
    "greeting": "Querida Elize,",
    "paragraphs": ["Párrafo 1…", "Párrafo 2…"],
    "signature": "Con todo mi amor"
  },
  "music": {
    "links": [
      {"name":"Nuestra canción","url":"https://open.spotify.com/track/..."},
      {"name":"Esa que nos gusta","url":"https://open.spotify.com/track/..."},
      {"name":"El atardecer","url":"https://open.spotify.com/track/..."},
      {"name":"Nuestra playlist","url":"https://open.spotify.com/playlist/..."}
    ]
  }
}
```

---

## 🔧 Variables de Entorno (Vercel)

| Variable | Valor | Uso |
|----------|-------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vkvjjswnpitbroypjzta.supabase.co` | Cliente Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Cliente Supabase (anon) |
| `SUPABASE_SERVICE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Solo server (admin writes) |

> **Nota:** El admin usa `anon key` + RLS policy `service write` requiere `service_role`. Si el admin falla al guardar, verifica que la policy `service write` exista y que `SUPABASE_SERVICE_KEY` esté en Vercel.

---

## 🚀 Deploy & Workflow

### Auto-Deploy (GitHub → Vercel)
1. Push a `main` → Vercel detecta → Build estático → Deploy
2. URL fija: **https://elize-gamma.vercel.app**

### Para editar contenido (tú)
1. Abre **https://elize-gamma.vercel.app/admin.html**
2. Rellena todo → **Guardar todo** → Sube a Supabase
3. QR Corazón aparece abajo → **Descargar PNG** → Imprime en tarjeta

### Para ella (regalo)
1. Escanea QR → Abre **https://elize-gamma.vercel.app**
2. Camina con joystick (izq) + arrastra para mirar
3. Toca marcos dorados → ve fotos + textos
4. 8 fotos → Carta final desbloqueada
5. 🎵 click = música ambiental / hold = menú Spotify

---

## 🎨 Paleta & Tipografías

### Colores (CSS `:root`)
```css
--vino:#5C1A2B; --vino-dark:#3A1220; --beige:#EDE3D3; --rosa-vieja:#C99DA3;
--rosa-suave:#E7CFCF; --cream:#F7F0E6; --gold:#B08D57; --leaf:#7C9A6C;
```

### Fuentes (Google Fonts)
- **Display/Cursiva:** `Parisienne` (títulos, firma)
- **Cuerpo elegante:** `Cormorant Garamond` (mensajes, cartas, subtítulos)
- **UI/Labels:** `Jost` (botones, HUD, mayúsculas espaciadas)

---

## 🐛 Issues Conocidos / Pendientes

| Issue | Prioridad | Notas |
|-------|-----------|-------|
| **Admin save falla si policy `service write` no existe** | Alta | Verificar RLS policy `service write` usa `auth.role() = 'service_role'` |
| **Imágenes base64 grandes en jsonb** | Media | Considerar Supabase Storage + URLs firmadas para fotos >500KB |
| **Touch en móviles viejos** | Baja | Test en Android <10 / iOS <14 |
| **Collision con flores** | Baja | Actualmente se puede caminar "a través" - opcional añadir distancia mínima |
| **Audio autoplay policy** | Resuelto | Requiere interacción usuario (click 🎵 o Enter) |

---

## 📁 Archivos Clave para Modificar

| Archivo | Qué toca |
|---------|----------|
| `app.js:1-130` | Config (DEFAULTS, Supabase, CONSTANTES) |
| `app.js:130-400` | init3D, flores, cielo, nubes, estrellas, fotos, altar |
| `app.js:400-700` | Geometrías: flores reales, polvo, estrellas, marcos, altar |
| `app.js:700-900` | Loop animación, movimiento, POIs, HUD, menú, touch |
| `app.js:900-1100` | Intro typewriter, música WebAudio, Spotify menu |
| `admin.html:1-200` | UI Admin (HTML + CSS) |
| `admin.html:200-550` | Lógica Admin: render, handlers, Supabase CRUD, QR corazón |
| `index.html` | Estructura + CSS + Supabase client global |

---

## 🆘 Troubleshooting Rápido

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Admin: "Failed to fetch" al guardar | Policy `service write` falta | Ejecutar SQL de policies arriba |
| Admin: funciones `addX` not defined | Script duplicado o error previo | Verificar consola, recargar |
| Jardín: pantalla negra / no carga | Three.js error o Supabase down | Ver consola → fallback a DEFAULTS |
| QR no genera | QRCode lib no cargó | Verificar `qrcodejs@1.0.0` en CDN |
| Música no suena | Autoplay bloqueado | Click en 🎵 o botón "Entrar al jardín" primero |

---

## 📄 Licencia
Uso personal - regalo de cumpleaños. Código libre para adaptar.

---

> **Última actualización:** 2024 - Proyecto completo y funcional en https://elize-gamma.vercel.app