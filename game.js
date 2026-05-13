'use strict';

// ─── BOARD CONFIG ───────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;

// ─── PIECES ─────────────────────────────────────────────────────
const PIECES = [
  { shape: [[1,1,1,1]], color: '#00ffcc' },
  { shape: [[1,1],[1,1]], color: '#ffe600' },
  { shape: [[0,1,0],[1,1,1]], color: '#cc44ff' },
  { shape: [[0,1,1],[1,1,0]], color: '#44ff66' },
  { shape: [[1,1,0],[0,1,1]], color: '#ff3366' },
  { shape: [[1,0,0],[1,1,1]], color: '#ff8800' },
  { shape: [[0,0,1],[1,1,1]], color: '#0088ff' },
];

// ─── SCORING ────────────────────────────────────────────────────
const LINE_SCORES = [0, 100, 300, 500, 800];
const LINES_PER_LEVEL = 10;
const BASE_INTERVAL = 800;
const MIN_INTERVAL  = 80;

// ─── STATE ──────────────────────────────────────────────────────
let board, score, level, lines, current, next, gameOver, paused, animId, lastTime, dropTimer;

// ─── CANVAS SETUP ───────────────────────────────────────────────
const canvas     = document.getElementById('boardCanvas');
const ctx        = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nCtx       = nextCanvas.getContext('2d');

function computeCell() {
  const wrap = document.querySelector('.board-wrap');
  const maxH = wrap.clientHeight - 8;
  const maxW = wrap.clientWidth  - 8;
  const byH  = Math.floor(maxH / ROWS);
  const byW  = Math.floor(maxW / COLS);
  return Math.max(10, Math.min(byH, byW));
}

function resizeCanvas() {
  const cell = computeCell();
  canvas.width  = COLS * cell;
  canvas.height = ROWS * cell;
}

// ─── HELPERS ────────────────────────────────────────────────────
function rotate(shape) {
  return shape[0].map((_, c) => shape.map(r => r[c]).reverse());
}

function randomPiece() {
  const p = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    shape: p.shape.map(r => [...r]),
    color: p.color,
    x: Math.floor(COLS / 2) - Math.floor(p.shape[0].length / 2),
    y: 0,
  };
}

function collides(piece, dx, dy, shape) {
  const s = shape || piece.shape;
  for (let r = 0; r < s.length; r++) {
    for (let c = 0; c < s[r].length; c++) {
      if (!s[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function lock() {
  for (let r = 0; r < current.shape.length; r++) {
    for (let c = 0; c < current.shape[r].length; c++) {
      if (!current.shape[r][c]) continue;
      const ny = current.y + r;
      if (ny < 0) { endGame(); return; }
      board[ny][current.x + c] = current.color;
    }
  }
  clearLines();
  current = next;
  next    = randomPiece();
  if (collides(current, 0, 0)) { endGame(); return; }
  drawNext();
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(c => c)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    score += LINE_SCORES[cleared] * level;
    lines += cleared;
    level  = Math.floor(lines / LINES_PER_LEVEL) + 1;
    updateUI();
  }
}

// ─── DRAW ────────────────────────────────────────────────────────
function drawBoard() {
  const cell = computeCell();
  canvas.width  = COLS * cell;
  canvas.height = ROWS * cell;

  ctx.fillStyle = '#0d0d14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#1a1a28';
  ctx.lineWidth = 0.5;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.strokeRect(c * cell, r * cell, cell, cell);
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) drawCell(ctx, c, r, board[r][c], cell);
    }
  }

  if (!gameOver && current) {
    for (let r = 0; r < current.shape.length; r++) {
      for (let c = 0; c < current.shape[r].length; c++) {
        if (current.shape[r][c]) drawCell(ctx, current.x + c, current.y + r, current.color, cell);
      }
    }
  }
}

function drawCell(context, x, y, color, cell) {
  context.fillStyle = color;
  context.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.fillRect(x * cell + 1, y * cell + 1, cell - 2, 4);
  context.strokeStyle = 'rgba(255,255,255,0.12)';
  context.lineWidth = 1;
  context.strokeRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
}

function drawNext() {
  const cell = 18;
  const pw   = next.shape[0].length;
  const ph   = next.shape.length;
  const ox   = Math.floor((nextCanvas.width  / cell - pw) / 2);
  const oy   = Math.floor((nextCanvas.height / cell - ph) / 2);

  nCtx.fillStyle = '#12121a';
  nCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  for (let r = 0; r < ph; r++) {
    for (let c = 0; c < pw; c++) {
      if (next.shape[r][c]) drawCell(nCtx, ox + c, oy + r, next.color, cell);
    }
  }
}

function updateUI() {
  document.getElementById('scoreDisplay').textContent = score;
  document.getElementById('levelDisplay').textContent = level;
  document.getElementById('linesDisplay').textContent = lines;
}

// ─── GAME LOOP ───────────────────────────────────────────────────
function dropInterval() {
  return Math.max(MIN_INTERVAL, BASE_INTERVAL - (level - 1) * 70);
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime  = ts;
  dropTimer += dt;

  if (dropTimer >= dropInterval()) {
    moveDown();
    dropTimer = 0;
  }

  drawBoard();
  animId = requestAnimationFrame(loop);
}

// ─── MOVES ───────────────────────────────────────────────────────
function moveLeft()  { if (!gameOver && !paused && !collides(current, -1, 0)) current.x--; }
function moveRight() { if (!gameOver && !paused && !collides(current,  1, 0)) current.x++; }
function moveDown()  {
  if (gameOver || paused) return;
  if (!collides(current, 0, 1)) { current.y++; }
  else { lock(); }
}
function hardDrop() {
  if (gameOver || paused) return;
  while (!collides(current, 0, 1)) current.y++;
  lock();
  drawBoard();
}
function rotatePiece() {
  if (gameOver || paused) return;
  const rotated = rotate(current.shape);
  if (!collides(current, 0, 0, rotated)) {
    current.shape = rotated;
  } else if (!collides(current, 1, 0, rotated)) {
    current.x++; current.shape = rotated;
  } else if (!collides(current, -1, 0, rotated)) {
    current.x--; current.shape = rotated;
  }
}

// ─── INIT / RESTART ─────────────────────────────────────────────
function initGame() {
  board     = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  score     = 0;
  level     = 1;
  lines     = 0;
  gameOver  = false;
  paused    = false;
  dropTimer = 0;
  lastTime  = 0;

  current = randomPiece();
  next    = randomPiece();

  updateUI();
  drawNext();
  removeOverlay();
  document.getElementById('gameStatusText').textContent = '▶ OYNANIYOR';

  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(ts => { lastTime = ts; loop(ts); });
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  drawBoard();
  document.getElementById('gameStatusText').textContent = '✖ OYUN BİTTİ';
  showOverlay();
}

// ─── OVERLAY ─────────────────────────────────────────────────────
function showOverlay() {
  removeOverlay();
  const div = document.createElement('div');
  div.className = 'overlay';
  div.id = 'gameOverlay';
  div.innerHTML = `
    <h2>OYUN BİTTİ</h2>
    <p>TOPLAM SKOR</p>
    <div class="final-score">${score}</div>
    <button id="overlayRestart">YENİDEN OYNA</button>
  `;
  document.getElementById('app').appendChild(div);
  document.getElementById('overlayRestart').addEventListener('click', initGame);
}

function removeOverlay() {
  const el = document.getElementById('gameOverlay');
  if (el) el.remove();
}

// ─── CONTROLS ────────────────────────────────────────────────────
document.getElementById('moveLeft').addEventListener('click',    moveLeft);
document.getElementById('moveRight').addEventListener('click',   moveRight);
document.getElementById('rotateBtn').addEventListener('click',   rotatePiece);
document.getElementById('hardDropBtn').addEventListener('click', hardDrop);
document.getElementById('restartBtn').addEventListener('click',  initGame);

let holdInterval = null;
function startHold(fn) {
  fn();
  holdInterval = setInterval(fn, 100);
}
function stopHold() { clearInterval(holdInterval); holdInterval = null; }

['moveLeft', 'moveRight'].forEach(id => {
  const btn = document.getElementById(id);
  const fn  = id === 'moveLeft' ? moveLeft : moveRight;
  btn.addEventListener('touchstart', e => { e.preventDefault(); startHold(fn); }, { passive: false });
  btn.addEventListener('touchend',   stopHold);
  btn.addEventListener('touchcancel',stopHold);
});

document.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowLeft':  e.preventDefault(); moveLeft();    break;
    case 'ArrowRight': e.preventDefault(); moveRight();   break;
    case 'ArrowDown':  e.preventDefault(); moveDown();    break;
    case 'ArrowUp':    e.preventDefault(); rotatePiece(); break;
    case ' ':          e.preventDefault(); hardDrop();    break;
    case 'p': case 'P':
      if (!gameOver) {
        paused = !paused;
        document.getElementById('gameStatusText').textContent = paused ? '⏸ DURAKLATILDI' : '▶ OYNANIYOR';
        if (!paused) { lastTime = performance.now(); animId = requestAnimationFrame(loop); }
      }
      break;
  }
});

let touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });
canvas.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const absDx = Math.abs(dx), absDy = Math.abs(dy);
  if (absDx < 10 && absDy < 10) { rotatePiece(); return; }
  if (absDx > absDy) { dx < 0 ? moveLeft() : moveRight(); }
  else               { dy > 0 ? hardDrop() : rotatePiece(); }
}, { passive: true });

window.addEventListener('resize', () => { resizeCanvas(); drawBoard(); });

resizeCanvas();
initGame();
