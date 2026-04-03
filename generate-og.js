// generate-og.js
// Run once locally to generate og-image.png
// Usage: node generate-og.js
// Requires: npm install canvas

const { createCanvas } = require('canvas');
const fs = require('fs');

const W = 1200, H = 630;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#0A0E14';
ctx.fillRect(0, 0, W, H);

// Grid pattern
ctx.strokeStyle = 'rgba(10,191,163,0.06)';
ctx.lineWidth = 1;
for (let x = 0; x < W; x += 60) {
  ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
}
for (let y = 0; y < H; y += 60) {
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
}

// Glow
const grd = ctx.createRadialGradient(W * 0.75, H * 0.3, 0, W * 0.75, H * 0.3, 350);
grd.addColorStop(0, 'rgba(10,191,163,0.12)');
grd.addColorStop(1, 'rgba(10,191,163,0)');
ctx.fillStyle = grd;
ctx.fillRect(0, 0, W, H);

// Shield mark
const sx = 80, sy = 80;
ctx.strokeStyle = '#0ABFA3';
ctx.lineWidth = 3;
ctx.lineJoin = 'round';
ctx.beginPath();
ctx.moveTo(sx + 36, sy + 8);
ctx.lineTo(sx + 64, sy + 16);
ctx.lineTo(sx + 64, sy + 38);
ctx.quadraticCurveTo(sx + 64, sy + 56, sx + 36, sy + 64);
ctx.quadraticCurveTo(sx + 8, sy + 56, sx + 8, sy + 38);
ctx.lineTo(sx + 8, sy + 16);
ctx.closePath();
ctx.stroke();
ctx.beginPath();
ctx.moveTo(sx + 24, sy + 36);
ctx.lineTo(sx + 32, sy + 44);
ctx.lineTo(sx + 48, sy + 28);
ctx.stroke();

// Wordmark
ctx.font = 'bold 72px serif';
ctx.fillStyle = '#F0F6F8';
ctx.fillText('Veri', 80, 220);
const veriW = ctx.measureText('Veri').width;
ctx.fillStyle = '#0ABFA3';
ctx.fillText('base', 80 + veriW, 220);

// Tagline
ctx.font = '28px monospace';
ctx.fillStyle = '#5A7A8A';
ctx.letterSpacing = '4px';
ctx.fillText('AFRICA\'S ECONOMY, MADE LEGIBLE', 80, 280);

// Divider
ctx.strokeStyle = 'rgba(10,191,163,0.2)';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(80, 320); ctx.lineTo(W - 80, 320);
ctx.stroke();

// Description
ctx.font = '24px sans-serif';
ctx.fillStyle = '#8FAAB8';
const desc = 'The trust and verification infrastructure for Kenya\'s real economy.';
ctx.fillText(desc, 80, 390);

// Stats
const stats = [
  ['80%', "of Kenya's economy\nis informal"],
  ['$10T', 'in trapped global\ninformal value'],
  ['Layer 0', 'the missing\ninfrastructure'],
];
stats.forEach(([num, label], i) => {
  const x = 80 + i * 360;
  ctx.font = 'bold 40px serif';
  ctx.fillStyle = num.startsWith('L') ? '#0ABFA3' : '#F0F6F8';
  ctx.fillText(num, x, 490);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#5A7A8A';
  label.split('\n').forEach((line, j) => {
    ctx.fillText(line, x, 520 + j * 24);
  });
});

// URL
ctx.font = '20px monospace';
ctx.fillStyle = '#3A5A6A';
ctx.fillText('veribase.co', W - 80 - ctx.measureText('veribase.co').width, H - 40);

// Save
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('og-image.png', buffer);
console.log('og-image.png generated successfully.');
