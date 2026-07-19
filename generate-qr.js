const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const QRCode = require('qrcode');

const VINO = '#5C1A2B';
const CREAM = '#F7F0E6';
const SIZE = 512;
const URL = 'https://elize-gamma.vercel.app';

async function generateHeartQR() {
  // 1. Generar QR como buffer PNG
  const qrBuffer = await QRCode.toBuffer(URL, {
    width: 400,
    margin: 2,
    color: { dark: VINO, light: CREAM },
    errorCorrectionLevel: 'H'
  });

  // 2. Cargar QR en canvas
  const qrImg = await loadImage(qrBuffer);

  // 3. Canvas final
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  // Fondo crema
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 4. Dibujar forma de corazón (path manual)
  const cx = SIZE / 2;
  const cy = SIZE / 2 - 15;
  const s = 155; // escala del corazón

  ctx.beginPath();
  // Punto inferior
  ctx.moveTo(cx, cy + 0.6 * s);
  // Lado izquierdo
  ctx.bezierCurveTo(cx, cy + 1.0 * s, cx - 1.0 * s, cy + 1.0 * s, cx - 1.0 * s, cy + 0.2 * s);
  ctx.bezierCurveTo(cx - 1.0 * s, cy - 0.5 * s, cx - 0.2 * s, cy - 0.8 * s, cx, cy - 0.4 * s);
  // Lado derecho
  ctx.bezierCurveTo(cx + 0.2 * s, cy - 0.8 * s, cx + 1.0 * s, cy - 0.5 * s, cx + 1.0 * s, cy + 0.2 * s);
  ctx.bezierCurveTo(cx + 1.0 * s, cy + 1.0 * s, cx, cy + 1.0 * s, cx, cy + 0.6 * s);
  ctx.closePath();

  // 5. Clip al corazón
  ctx.clip();

  // 6. Dibujar QR centrado en el corazón
  const qrSize = 220;
  const qrX = cx - qrSize / 2;
  const qrY = cy - qrSize / 2 - 10;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // 7. Borde del corazón
  ctx.strokeStyle = VINO;
  ctx.lineWidth = 5;
  ctx.stroke();

  // 8. Guardar
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
  fs.writeFileSync('qr-corazon-vinotinto.jpg', buffer);
  console.log('✅ QR guardado: qr-corazon-vinotinto.jpg');
}

generateHeartQR().catch(console.error);