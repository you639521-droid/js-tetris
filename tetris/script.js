const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');

const holdCanvas = document.getElementById('hold');
const holdContext = holdCanvas.getContext('2d');

const BLOCK_SIZE = 20;

canvas.width = 10 * BLOCK_SIZE;  // 200px
canvas.height = 20 * BLOCK_SIZE; // 400px

const arena = createMatrix(10, 20);

const PIECES = [
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  [[2, 0, 0], [2, 2, 2], [0, 0, 0]],                         // J
  [[0, 0, 3], [3, 3, 3], [0, 0, 0]],                         // L
  [[4, 4], [4, 4]],                                         // O
  [[0, 5, 5], [5, 5, 0], [0, 0, 0]],                         // S
  [[0, 6, 0], [6, 6, 6], [0, 0, 0]],                         // T
  [[7, 7, 0], [0, 7, 7], [0, 0, 0]]                          // Z
];

const COLORS = [
  null,
  { base: '#00f0f0', light: '#a6ffff', dark: '#008b8b' }, // 1: I
  { base: '#1e90ff', light: '#87cefa', dark: '#00008b' }, // 2: J
  { base: '#ff8c00', light: '#ffc04d', dark: '#b36200' }, // 3: L
  { base: '#ffd700', light: '#ffec8b', dark: '#b8860b' }, // 4: O
  { base: '#32cd32', light: '#98fb98', dark: '#006400' }, // 5: S
  { base: '#ba55d3', light: '#e6a8d7', dark: '#4b0082' }, // 6: T
  { base: '#ff3333', light: '#ff9999', dark: '#8b0000' }  // 7: Z
];

const player = {
  pos: {x: 0, y: 0},
  matrix: null,
  score: 0,
};

let nextPiece = null;
let holdPiece = null;
let canHold = true;
let isGameOver = false;

let clearingRows = [];
let clearAnimTimer = 0;
let isTetrisClear = false;

const keys = {
  37: { pressed: false, timer: 0 },
  39: { pressed: false, timer: 0 }
};
const DAS_DELAY = 150;
const ARR_RATE = 30;

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function collide(arena, player) {
  const [m, o] = [player.matrix, player.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0) {
        const targetX = x + o.x;
        const targetY = y + o.y;

        if (
          targetX < 0 || 
          targetX >= 10 || 
          targetY >= 20 || 
          (targetY >= 0 && arena[targetY][targetX] !== 0)
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        const targetY = y + player.pos.y;
        const targetX = x + player.pos.x;
        if (targetY >= 0 && targetY < 20 && targetX >= 0 && targetX < 10) {
          arena[targetY][targetX] = value;
        }
      }
    });
  });
}

function updateSpeed() {
  const speedBonus = Math.floor(player.score / 10) * 20;
  dropInterval = Math.max(130, 1000 - speedBonus);
}

function checkLines() {
  clearingRows = [];
  let rowCount = 1;

  for (let y = arena.length - 1; y >= 0; --y) {
    let filled = true;
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        filled = false;
        break;
      }
    }
    if (filled) {
      clearingRows.push(y);
      player.score += rowCount * 10;
      rowCount *= 2;
    }
  }

  if (clearingRows.length > 0) {
    isTetrisClear = (clearingRows.length === 4);
    clearAnimTimer = isTetrisClear ? 250 : 150;
    
    document.getElementById('score').innerText = player.score;
    updateSpeed();
  } else {
    playerReset();
  }
}

function removeClearedLines() {
  clearingRows.sort((a, b) => a - b);
  clearingRows.forEach(y => {
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
  });
  clearingRows = [];
  isTetrisClear = false;
}

function rotate(matrix) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  matrix.forEach(row => row.reverse());
}

function getRandomPiece() {
  const randomIndex = Math.floor(Math.random() * PIECES.length);
  return JSON.parse(JSON.stringify(PIECES[randomIndex]));
}

function gameReset() {
  arena.forEach(row => row.fill(0));
  player.score = 0;
  holdPiece = null;
  nextPiece = null;
  isGameOver = false;
  clearingRows = [];
  clearAnimTimer = 0;
  isTetrisClear = false;

  keys[37].pressed = false;
  keys[39].pressed = false;

  document.getElementById('score').innerText = player.score;
  updateSpeed();
  drawHold();
  playerReset();
}

function playerReset() {
  if (nextPiece === null) {
    nextPiece = getRandomPiece();
  }

  player.matrix = nextPiece;
  nextPiece = getRandomPiece();

  player.pos.y = 0;
  player.pos.x = Math.floor(10 / 2) - Math.floor(player.matrix[0].length / 2);

  canHold = true;

  if (collide(arena, player)) {
    isGameOver = true;
  }

  drawNext();
}

function holdBlock() {
  if (!canHold || isGameOver || clearAnimTimer > 0) return;

  if (holdPiece === null) {
    holdPiece = player.matrix;
    player.matrix = nextPiece;
    nextPiece = getRandomPiece();
    drawNext();
  } else {
    const temp = player.matrix;
    player.matrix = holdPiece;
    holdPiece = temp;
  }

  player.pos.y = 0;
  player.pos.x = Math.floor(10 / 2) - Math.floor(player.matrix[0].length / 2);

  canHold = false;
  dropCounter = 0;

  drawHold();
}

function playerDrop() {
  if (isGameOver || clearAnimTimer > 0) return;

  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    checkLines();
  }
  dropCounter = 0;
}

function hardDrop() {
  if (isGameOver || clearAnimTimer > 0) return;

  while (!collide(arena, player)) {
    player.pos.y++;
  }
  player.pos.y--;
  merge(arena, player);
  checkLines();
  dropCounter = 0;
}

function playerMove(dir) {
  if (isGameOver || clearAnimTimer > 0) return;

  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

function handleMoveInput(deltaTime) {
  if (isGameOver || clearAnimTimer > 0) return;

  [37, 39].forEach(code => {
    const key = keys[code];
    if (key.pressed) {
      key.timer += deltaTime;

      if (key.timer > DAS_DELAY) {
        playerMove(code === 37 ? -1 : 1);
        key.timer -= ARR_RATE;
      }
    }
  });
}

function getGhostPosition() {
  const ghost = {
    pos: { x: player.pos.x, y: player.pos.y },
    matrix: player.matrix
  };

  while (!collide(arena, ghost)) {
    ghost.pos.y++;
  }
  ghost.pos.y--;
  return ghost.pos;
}

function draw() {
  // ダーク感のある背景描画
  context.fillStyle = '#0b0c10';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // グリッド（薄めのスタイリッシュなライン）
  context.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  context.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += BLOCK_SIZE) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= canvas.height; y += BLOCK_SIZE) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  drawMatrix(arena, {x: 0, y: 0}, context);

  // 消去エフェクト
  if (clearingRows.length > 0) {
    clearingRows.forEach(y => {
      const pixelY = y * BLOCK_SIZE;

      if (isTetrisClear) {
        // 金色のゴージャスな光
        const goldGrad = context.createLinearGradient(0, pixelY, canvas.width, pixelY + BLOCK_SIZE);
        goldGrad.addColorStop(0, '#fff5cc');
        goldGrad.addColorStop(0.3, '#ffd700');
        goldGrad.addColorStop(0.7, '#ffaa00');
        goldGrad.addColorStop(1, '#fff5cc');

        context.fillStyle = goldGrad;
        context.fillRect(0, pixelY, canvas.width, BLOCK_SIZE);

        context.fillStyle = '#ffffff';
        context.fillRect(0, pixelY + BLOCK_SIZE / 3, canvas.width, BLOCK_SIZE / 3);
      } else {
        // 通常のスタイリッシュな白光
        context.fillStyle = 'rgba(255, 255, 255, 0.9)';
        context.fillRect(0, pixelY, canvas.width, BLOCK_SIZE);
      }
    });
  }

  if (!isGameOver) {
    if (clearAnimTimer === 0) {
      if (player.matrix) {
        const ghostPos = getGhostPosition();
        drawGhostMatrix(player.matrix, ghostPos, context);
      }
      drawMatrix(player.matrix, player.pos, context);
    }
  } else {
    drawGameOver();
  }
}

function drawGameOver() {
  context.fillStyle = 'rgba(9, 10, 15, 0.88)';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.textAlign = 'center';

  context.fillStyle = '#ff3366';
  context.font = '900 20px "Segoe UI", system-ui, sans-serif';
  context.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 35);

  context.fillStyle = '#e0e0e0';
  context.font = '600 13px "Segoe UI", system-ui, sans-serif';
  context.fillText(`SCORE : ${player.score}`, canvas.width / 2, canvas.height / 2 + 5);

  context.fillStyle = '#6b7280';
  context.font = '400 11px "Segoe UI", system-ui, sans-serif';
  context.fillText('PRESS ANY KEY', canvas.width / 2, canvas.height / 2 + 50);
  context.fillText('TO RESTART', canvas.width / 2, canvas.height / 2 + 66);
}

function drawNext() {
  nextContext.fillStyle = '#0b0c10';
  nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  const offsetX = (nextCanvas.width / BLOCK_SIZE - nextPiece[0].length) / 2;
  const offsetY = (nextCanvas.height / BLOCK_SIZE - nextPiece.length) / 2;

  drawMatrix(nextPiece, {x: offsetX, y: offsetY}, nextContext);
}

function drawHold() {
  holdContext.fillStyle = '#0b0c10';
  holdContext.fillRect(0, 0, holdCanvas.width, holdCanvas.height);

  if (holdPiece !== null) {
    const offsetX = (holdCanvas.width / BLOCK_SIZE - holdPiece[0].length) / 2;
    const offsetY = (holdCanvas.height / BLOCK_SIZE - holdPiece.length) / 2;
    drawMatrix(holdPiece, {x: offsetX, y: offsetY}, holdContext);
  }
}

function drawBlock(x, y, colorIndex, ctx) {
  const pixelX = x * BLOCK_SIZE;
  const pixelY = y * BLOCK_SIZE;
  const color = COLORS[colorIndex];

  const grad = ctx.createLinearGradient(
    pixelX, pixelY, 
    pixelX + BLOCK_SIZE, pixelY + BLOCK_SIZE
  );
  grad.addColorStop(0, color.light);
  grad.addColorStop(0.5, color.base);
  grad.addColorStop(1, color.dark);

  ctx.fillStyle = grad;
  ctx.fillRect(pixelX, pixelY, BLOCK_SIZE, BLOCK_SIZE);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillRect(pixelX + 1, pixelY + 1, BLOCK_SIZE - 2, 2);
  ctx.fillRect(pixelX + 1, pixelY + 1, 2, BLOCK_SIZE - 2);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(pixelX + 1, pixelY + BLOCK_SIZE - 2, BLOCK_SIZE - 2, 1);
  ctx.fillRect(pixelX + BLOCK_SIZE - 2, pixelY + 1, 1, BLOCK_SIZE - 2);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(pixelX, pixelY, BLOCK_SIZE, BLOCK_SIZE);
}

function drawGhostBlock(x, y, colorIndex, ctx) {
  const pixelX = x * BLOCK_SIZE;
  const pixelY = y * BLOCK_SIZE;
  const color = COLORS[colorIndex];

  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillRect(pixelX, pixelY, BLOCK_SIZE, BLOCK_SIZE);

  ctx.strokeStyle = color.light;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pixelX + 1, pixelY + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
}

function drawMatrix(matrix, offset, ctx) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        drawBlock(x + offset.x, y + offset.y, value, ctx);
      }
    });
  });
}

function drawGhostMatrix(matrix, offset, ctx) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        drawGhostBlock(x + offset.x, y + offset.y, value, ctx);
      }
    });
  });
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;

  handleMoveInput(deltaTime);

  if (clearAnimTimer > 0) {
    clearAnimTimer -= deltaTime;
    if (clearAnimTimer <= 0) {
      clearAnimTimer = 0;
      removeClearedLines();
      playerReset();
    }
  } else if (!isGameOver) {
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
      playerDrop();
    }
  }

  draw();
  requestAnimationFrame(update);
}

document.addEventListener('keydown', event => {
  if (isGameOver) {
    gameReset();
    return;
  }

  if (clearAnimTimer > 0) return;

  const code = event.keyCode;

  if (code === 37 || code === 39) {
    if (!keys[code].pressed) {
      keys[code].pressed = true;
      keys[code].timer = 0;
      playerMove(code === 37 ? -1 : 1);
    }
  } else if (code === 40) {
    playerDrop();
  } else if (code === 38) {
    rotate(player.matrix);
    if (collide(arena, player)) {
      rotate(player.matrix);
      rotate(player.matrix);
      rotate(player.matrix);
    }
  } else if (code === 32) {
    event.preventDefault();
    hardDrop();
  } else if (code === 16) {
    event.preventDefault();
    holdBlock();
  }
});

document.addEventListener('keyup', event => {
  const code = event.keyCode;
  if (code === 37 || code === 39) {
    keys[code].pressed = false;
    keys[code].timer = 0;
  }
});

gameReset();
update();