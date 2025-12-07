// Элементы
const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const endScreen = document.getElementById('endScreen');
const playerEl = document.getElementById('player');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');
const exitBtn = document.getElementById('exitBtn');
const startGameBtn = document.getElementById('startGameBtn');
const modeButtons = document.querySelectorAll('.mode-btn');
const mazeEl = document.getElementById('maze');
const mazeLineContainer = document.getElementById('mazeLineContainer');
const mazeLineImg = document.getElementById('mazeLineImg');
const mazeLineCanvas = document.getElementById('mazeLineCanvas');

// Звуки
const soundCollect = document.getElementById('soundCollect');
const soundStart = document.getElementById('soundStart');
const soundEnd = document.getElementById('soundEnd');
const soundBgMusic = document.getElementById('soundBgMusic');

let selectedPuppy = null;
let selectedMode = 'falling';
let score = 0;
let timeLeft = 30;
let gameActive = false;
let gameLoop;
let musicEnabled = true;

// Лабиринт 15x15
let maze = [];
let trashPositions = [];
const mazeSize = 15;
let playerPos = { x: 1, y: 1 };
let exitPos = { x: mazeSize - 2, y: mazeSize - 2 };

// Лабиринт-линия
let mazeLineActive = false;
let mazeLineStart = { x: 0, y: 0 };
let mazeLineEnd = { x: 0, y: 0 };
let mazeLineGameStarted = false;

// Щенки
const puppyImages = {
  rocky: 'images/rocky.png',
  chase: 'images/chase.png',
  marshall: 'images/marshall.png',
  rubble: 'images/rubble.png',
  skye: 'images/skye.png',
};

// Типы мусора
const trashTypes = [
  { name: 'can',    sizeRange: [35, 55] },
  { name: 'bag',    sizeRange: [40, 60] },
  { name: 'bottle', sizeRange: [30, 50] },
  { name: 'box',    sizeRange: [45, 70] }
];

// Вспомогательные функции
function playSound(audioEl) {
  if (!audioEl) return;
  audioEl.currentTime = 0;
  audioEl.play().catch(e => console.log("Звук заблокирован:", e));
}

function toggleMusic() {
  musicEnabled = !musicEnabled;
  const btn = document.getElementById('volumeBtn');
  if (musicEnabled) {
    soundBgMusic.play().catch(e => console.log("Музыка заблокирована:", e));
    if (btn) btn.textContent = '🔊';
  } else {
    soundBgMusic.pause();
    if (btn) btn.textContent = '🔇';
  }
}

function checkStartReady() {
  startGameBtn.disabled = !(selectedPuppy && selectedMode);
}

// Выбор щенка и режима
document.querySelectorAll('#puppySelect img').forEach(img => {
  img.addEventListener('click', () => {
    document.querySelectorAll('#puppySelect img').forEach(el => el.classList.remove('selected'));
    img.classList.add('selected');
    selectedPuppy = img.dataset.puppy;
    checkStartReady();
  });
});

modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    modeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMode = btn.dataset.mode;
    checkStartReady();
  });
});

// === ЛАБИРИНТ 15x15 ===
function generateMaze() {
  maze = Array(mazeSize).fill().map(() => Array(mazeSize).fill(1));
  trashPositions = [];

  const stack = [{ x: 1, y: 1 }];
  maze[1][1] = 0;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = [];
    const dirs = [
      { dx: 0, dy: -2 },
      { dx: 2, dy: 0 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 }
    ];

    for (let dir of dirs) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      if (nx >= 1 && nx < mazeSize - 1 && ny >= 1 && ny < mazeSize - 1 && maze[ny][nx] === 1) {
        neighbors.push({ x: nx, y: ny, wallX: current.x + dir.dx/2, wallY: current.y + dir.dy/2 });
      }
    }

    if (neighbors.length > 0) {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      maze[next.y][next.x] = 0;
      maze[next.wallY][next.wallX] = 0;
      stack.push(next);
    } else {
      stack.pop();
    }
  }

  let exitFound = false;
  while (!exitFound) {
    const x = Math.floor(Math.random() * (mazeSize - 2)) + 1;
    const y = Math.floor(Math.random() * (mazeSize - 2)) + 1;
    if (maze[y][x] === 0 && !(x === 1 && y === 1)) {
      exitPos = { x, y };
      exitFound = true;
    }
  }

  maze[1][1] = 0;
  maze[exitPos.y][exitPos.x] = 0;

  for (let y = 1; y < mazeSize - 1; y++) {
    for (let x = 1; x < mazeSize - 1; x++) {
      if (maze[y][x] === 0 && !(x === 1 && y === 1) && !(x === exitPos.x && y === exitPos.y)) {
        if (Math.random() > 0.7) {
          trashPositions.push({ x, y });
        }
      }
    }
  }
}

function renderMaze() {
  mazeEl.style.display = 'grid';
  mazeEl.innerHTML = '';

  for (let y = 0; y < mazeSize; y++) {
    for (let x = 0; x < mazeSize; x++) {
      const cell = document.createElement('div');
      cell.className = 'maze-cell';
      if (maze[y][x] === 1) {
        cell.classList.add('wall');
      } else {
        cell.classList.add('path');
      }

      const hasTrash = trashPositions.some(trash => trash.x === x && trash.y === y);
      if (hasTrash) {
        cell.dataset.trash = '1';
        cell.textContent = '🗑️';
      }

      if (x === exitPos.x && y === exitPos.y) {
        cell.classList.add('exit');
        cell.textContent = '🚪';
      }

      if (x === playerPos.x && y === playerPos.y) {
        const img = document.createElement('img');
        img.src = puppyImages[selectedPuppy];
        img.style.width = '80%';
        img.style.height = '80%';
        img.style.objectFit = 'contain';
        cell.appendChild(img);
      }

      mazeEl.appendChild(cell);
    }
  }
}

function setupMazeControls() {
  mazeEl.addEventListener('touchstart', e => {
    e.preventDefault();
    const touch = e.touches[0];
    const cell = getCellFromTouch(touch.clientX, touch.clientY);
    if (cell) {
      movePlayerToCell(cell);
    }
  });

  window.addEventListener('keydown', e => {
    if (!gameActive || selectedMode !== 'maze') return;
    let dx = 0, dy = 0;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': dy = -1; break;
      case 'ArrowDown': case 's': case 'S': dy = 1; break;
      case 'ArrowLeft': case 'a': case 'A': dx = -1; break;
      case 'ArrowRight': case 'd': case 'D': dx = 1; break;
      default: return;
    }
    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;
    if (newX >= 0 && newX < mazeSize && newY >= 0 && newY < mazeSize && maze[newY][newX] === 0) {
      playerPos.x = newX;
      playerPos.y = newY;
      renderMaze();
      checkMazeCollect();
    }
  });
}

function getCellFromTouch(clientX, clientY) {
  const rect = mazeEl.getBoundingClientRect();
  const cellSize = rect.width / mazeSize;
  const x = Math.floor((clientX - rect.left) / cellSize);
  const y = Math.floor((clientY - rect.top) / cellSize);
  if (x >= 0 && x < mazeSize && y >= 0 && y < mazeSize) {
    return { x, y };
  }
  return null;
}

function movePlayerToCell(cell) {
  const dx = Math.abs(cell.x - playerPos.x);
  const dy = Math.abs(cell.y - playerPos.y);
  if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
    if (maze[cell.y][cell.x] === 0) {
      playerPos.x = cell.x;
      playerPos.y = cell.y;
      renderMaze();
      checkMazeCollect();
    }
  }
}

function checkMazeCollect() {
  const trashIndex = trashPositions.findIndex(trash => trash.x === playerPos.x && trash.y === playerPos.y);
  if (trashIndex !== -1) {
    trashPositions.splice(trashIndex, 1);
    score += 2;
    scoreEl.textContent = `Счёт: ${score}`;
    playSound(soundCollect);
    playerEl.classList.add('collect-jump');
    setTimeout(() => playerEl.classList.remove('collect-jump'), 300);
  }

  if (playerPos.x === exitPos.x && playerPos.y === exitPos.y) {
    score += 10;
    scoreEl.textContent = `Счёт: ${score}`;
    setTimeout(() => {
      alert('Ты нашёл выход! 🎉');
      endGame();
    }, 300);
  }
}

function startMazeGame() {
  generateMaze();
  playerPos = { x: 1, y: 1 };
  renderMaze();
  setupMazeControls();

  clearInterval(window.gameTimer);
  window.gameTimer = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `Время: ${timeLeft}`;
    if (timeLeft <= 0) endGame();
  }, 1000);
}

// === ЛАБИРИНТ-ЛИНИЯ ===
function startMazeLineGame() {
  mazeLineActive = true;
  mazeLineGameStarted = false;

  // Устанавливаем размер canvas
  if (!mazeLineImg.complete) {
    mazeLineImg.onload = () => {
      mazeLineCanvas.width = mazeLineImg.naturalWidth;
      mazeLineCanvas.height = mazeLineImg.naturalHeight;
      mazeLineStart = { x: 50, y: 50 }; // ЗАМЕНИ НА СВОИ КООРДИНАТЫ!
      mazeLineEnd = { x: 700, y: 600 }; // ЗАМЕНИ НА СВОИ КООРДИНАТЫ!
      setupMazeLineControls();
    };
  } else {
    mazeLineCanvas.width = mazeLineImg.naturalWidth;
    mazeLineCanvas.height = mazeLineImg.naturalHeight;
    mazeLineStart = { x: 50, y: 50 }; // ЗАМЕНИ НА СВОИ КООРДИНАТЫ!
    mazeLineEnd = { x: 700, y: 600 }; // ЗАМЕНИ НА СВОИ КООРДИНАТЫ!
    setupMazeLineControls();
  }

  mazeLineContainer.style.display = 'block';
  playerEl.style.display = 'none';
  mazeEl.style.display = 'none';

  score = 0;
  scoreEl.textContent = `Счёт: ${score}`;
  timeLeft = 60; // 60 секунд
  timerEl.textContent = `Время: ${timeLeft}`;

  clearInterval(window.gameTimer);
  window.gameTimer = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `Время: ${timeLeft}`;
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function setupMazeLineControls() {
  let isTouching = false;
  let lastX = 0, lastY = 0;

  const handleTouch = (clientX, clientY) => {
    lastX = clientX;
    lastY = clientY;
    checkPosition(lastX, lastY);
  };

  mazeLineCanvas.addEventListener('touchstart', e => {
    e.preventDefault();
    isTouching = true;
    handleTouch(e.touches[0].clientX, e.touches[0].clientY);
  });

  mazeLineCanvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!isTouching) return;
    handleTouch(e.touches[0].clientX, e.touches[0].clientY);
  });

  mazeLineCanvas.addEventListener('touchend', () => {
    isTouching = false;
  });

  // Для ПК
  mazeLineCanvas.addEventListener('mousedown', e => {
    isTouching = true;
    handleTouch(e.clientX, e.clientY);
  });

  mazeLineCanvas.addEventListener('mousemove', e => {
    if (!isTouching) return;
    handleTouch(e.clientX, e.clientY);
  });

  mazeLineCanvas.addEventListener('mouseup', () => {
    isTouching = false;
  });
}

function checkPosition(x, y) {
  const rect = mazeLineCanvas.getBoundingClientRect();
  const scaleX = mazeLineImg.naturalWidth / rect.width;
  const scaleY = mazeLineImg.naturalHeight / rect.height;
  const imgX = (x - rect.left) * scaleX;
  const imgY = (y - rect.top) * scaleY;

  // Проверяем, что координаты в пределах изображения
  if (imgX < 0 || imgX >= mazeLineImg.naturalWidth || imgY < 0 || imgY >= mazeLineImg.naturalHeight) {
    return;
  }

  const ctx = mazeLineCanvas.getContext('2d');
  const pixel = ctx.getImageData(imgX, imgY, 1, 1).data;

  // Белый цвет (R=255, G=255, B=255)
  if (pixel[0] > 200 && pixel[1] > 200 && pixel[2] > 200) {
    if (!mazeLineGameStarted) {
      mazeLineGameStarted = true;
      playSound(soundStart);
    }

    const distanceToExit = Math.hypot(imgX - mazeLineEnd.x, imgY - mazeLineEnd.y);
    if (distanceToExit < 20) {
      score += 10;
      scoreEl.textContent = `Счёт: ${score}`;
      setTimeout(() => {
        alert('Ты прошёл лабиринт! 🎉');
        endGame();
      }, 300);
    }
  } else {
    // Сбился с пути
    alert('Ой, ты сбился с пути! 😢');
    endGame();
  }
}

// === ОБЫЧНЫЕ РЕЖИМЫ ===
function spawnTrash() {
  if (!gameActive || selectedMode === 'maze' || selectedMode === 'maze-line') return;

  const type = trashTypes[Math.floor(Math.random() * trashTypes.length)];
  const [minSize, maxSize] = type.sizeRange;
  const size = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;

  const trash = document.createElement('div');
  trash.className = 'trash';
  trash.dataset.type = type.name;
  trash.dataset.points = Math.floor(size / 10);
  trash.style.position = 'absolute';
  trash.style.width = size + 'px';
  trash.style.height = size + 'px';
  trash.style.background = `url(images/trash_${type.name}.png) center/contain no-repeat`;
  gameScreen.appendChild(trash);

  if (selectedMode === 'static') {
    trash.style.left = Math.random() * (window.innerWidth - size) + 'px';
    trash.style.top = Math.random() * (window.innerHeight - size - 80) + 'px';
    setTimeout(() => { if (trash.parentNode === gameScreen) trash.remove(); }, 4000 + Math.random() * 2000);
  } else if (selectedMode === 'to-center') {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    switch (side) {
      case 0: x = Math.random() * window.innerWidth; y = -size; break;
      case 1: x = window.innerWidth + size; y = Math.random() * window.innerHeight; break;
      case 2: x = Math.random() * window.innerWidth; y = window.innerHeight + size; break;
      case 3: x = -size; y = Math.random() * window.innerHeight; break;
    }
    trash.style.left = x + 'px';
    trash.style.top = y + 'px';
    const dx = (cx - x) / 150;
    const dy = (cy - y) / 150;
    function move() {
      if (!gameActive || !trash.parentNode) return;
      let curX = parseFloat(trash.style.left) || 0;
      let curY = parseFloat(trash.style.top) || 0;
      curX += dx;
      curY += dy;
      trash.style.left = curX + 'px';
      trash.style.top = curY + 'px';
      const dist = Math.hypot(curX - cx, curY - cy);
      if (dist > Math.hypot(cx, cy) + 200) { trash.remove(); return; }
      requestAnimationFrame(move);
    }
    move();
    setTimeout(() => { if (trash.parentNode === gameScreen) trash.remove(); }, 8000);
  } else { // falling
    trash.style.left = Math.random() * (window.innerWidth - size) + 'px';
    trash.style.top = -size + 'px';
    const speed = 0.8 + Math.random() * 1.2;
    const drift = (Math.random() - 0.5) * 0.5;
    function move() {
      if (!gameActive || !trash.parentNode) return;
      let top = parseFloat(trash.style.top) || 0;
      let left = parseFloat(trash.style.left) || 0;
      top += speed;
      left += drift;
      left = Math.max(0, Math.min(window.innerWidth - size, left));
      trash.style.top = top + 'px';
      trash.style.left = left + 'px';
      if (top > window.innerHeight) { trash.remove(); return; }
      requestAnimationFrame(move);
    }
    move();
    setTimeout(() => { if (trash.parentNode === gameScreen) trash.remove(); }, 8000);
  }
}

function checkCollection() {
  if (!gameActive || selectedMode === 'maze' || selectedMode === 'maze-line') return;
  const trashes = document.querySelectorAll('.trash');
  const playerRect = playerEl.getBoundingClientRect();
  trashes.forEach(trash => {
    const trashRect = trash.getBoundingClientRect();
    if (
      playerRect.left < trashRect.right &&
      playerRect.right > trashRect.left &&
      playerRect.top < trashRect.bottom &&
      playerRect.bottom > trashRect.top
    ) {
      const flash = document.createElement('div');
      flash.className = 'collect-flash';
      flash.style.left = (trashRect.left + trashRect.width / 2 - 40) + 'px';
      flash.style.top = (trashRect.top + trashRect.height / 2 - 40) + 'px';
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 600);
      playSound(soundCollect);
      const points = parseInt(trash.dataset.points) || 1;
      score += points;
      scoreEl.textContent = `Счёт: ${score}`;
      playerEl.classList.add('collect-jump');
      setTimeout(() => playerEl.classList.remove('collect-jump'), 300);
      trash.remove();
    }
  });
  gameLoop = requestAnimationFrame(checkCollection);
}

function movePlayer(x, y) {
  if (!gameActive || selectedMode === 'maze' || selectedMode === 'maze-line') return;
  const rx = Math.max(0, Math.min(window.innerWidth - 60, x - 30));
  const ry = Math.max(0, Math.min(window.innerHeight - 60, y - 30));
  playerEl.style.left = rx + 'px';
  playerEl.style.top = ry + 'px';
}

gameScreen.addEventListener('touchmove', e => {
  if (selectedMode !== 'maze' && selectedMode !== 'maze-line') {
    e.preventDefault();
    movePlayer(e.touches[0].clientX, e.touches[0].clientY);
  }
});

gameScreen.addEventListener('mousedown', e => {
  if (selectedMode !== 'maze' && selectedMode !== 'maze-line') movePlayer(e.clientX, e.clientY);
});

gameScreen.addEventListener('mousemove', e => {
  if ((selectedMode !== 'maze' && selectedMode !== 'maze-line') && e.buttons === 1) movePlayer(e.clientX, e.clientY);
});

// === СТАРТ ИГРЫ ===
function startGame() {
  if (!selectedPuppy || !selectedMode) return;
  playSound(soundStart);
  if (musicEnabled) {
    soundBgMusic.play().catch(e => console.log("Музыка заблокирована:", e));
  }
  startScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  score = 0;
  gameActive = true;
  scoreEl.textContent = 'Счёт: 0';

  if (selectedMode === 'maze') {
    timeLeft = 90;
    timerEl.textContent = `Время: ${timeLeft}`;
    playerEl.style.display = 'none';
    mazeEl.style.display = 'block';
    mazeLineContainer.style.display = 'none';
    startMazeGame();
  } else if (selectedMode === 'maze-line') {
    timeLeft = 60;
    timerEl.textContent = `Время: ${timeLeft}`;
    playerEl.style.display = 'none';
    mazeEl.style.display = 'none';
    mazeLineContainer.style.display = 'block';
    startMazeLineGame();
  } else {
    timeLeft = 30;
    timerEl.textContent = `Время: ${timeLeft}`;
    playerEl.style.display = 'block';
    mazeEl.style.display = 'none';
    mazeLineContainer.style.display = 'none';
    playerEl.style.backgroundImage = `url(${puppyImages[selectedPuppy]})`;
    clearInterval(window.gameTimer);
    window.gameTimer = setInterval(() => {
      timeLeft--;
      timerEl.textContent = `Время: ${timeLeft}`;
      if (timeLeft <= 0) endGame();
    }, 1000);
    clearInterval(window.trashSpawner);
    window.trashSpawner = setInterval(spawnTrash, selectedMode === 'static' ? 1200 : 800);
    gameLoop = requestAnimationFrame(checkCollection);
  }
}

// === КОНЕЦ ИГРЫ ===
function endGame() {
  gameActive = false;
  clearInterval(window.gameTimer);
  clearInterval(window.trashSpawner);
  cancelAnimationFrame(gameLoop);
  playSound(soundEnd);
  soundBgMusic.pause();
  finalScoreEl.textContent = score;
  gameScreen.classList.add('hidden');
  endScreen.classList.remove('hidden');
}

// === КНОПКИ ===
startGameBtn.addEventListener('click', startGame);

restartBtn.addEventListener('click', () => {
  endScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  document.querySelectorAll('#puppySelect img').forEach(el => el.classList.remove('selected'));
  modeButtons.forEach(btn => btn.classList.remove('active'));
  modeButtons[0].classList.add('active');
  selectedPuppy = null;
  selectedMode = 'falling';
  startGameBtn.disabled = true;
  mazeEl.style.display = 'none';
  mazeLineContainer.style.display = 'none';
});

exitBtn.addEventListener('click', () => {});

document.getElementById('volumeBtn')?.addEventListener('click', toggleMusic);

// Анимация прыжка
const style = document.createElement('style');
style.textContent = `
  #player.collect-jump {
    animation: puppyJump 0.3s ease-out;
  }
  @keyframes puppyJump {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-15px); }
  }
`;
document.head.appendChild(style);
