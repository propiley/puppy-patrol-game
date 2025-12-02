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

// Лабиринт
let maze = [];
const mazeSize = 10;
let playerPos = { x: 1, y: 1 };
let exitPos = { x: mazeSize - 2, y: mazeSize - 2 };

// Щенки — ТВОИ ИМЕНА ФАЙЛОВ
const puppyImages = {
  rocky: 'images/rocky.png',
  chase: 'images/chase.png',
  marshall: 'images/marshall.png',
  rubble: 'images/rubble.png',
  skye: 'images/skye.png',
  // poket: 'images/poket.png'
};

// Типы мусора — ТВОИ ИМЕНА ФАЙЛОВ
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

function checkStartReady() {
  startGameBtn.disabled = !(selectedPuppy && selectedMode);
}

// === Лабиринт — БЕЛЫЙ ФОН, ТОНКИЕ СТЕНКИ ===
function generateMaze() {
  maze = Array(mazeSize).fill().map(() => Array(mazeSize).fill(1));
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
      if (maze[y][x] === 0 && Math.random() > 0.8 && !(x === 1 && y === 1) && !(x === exitPos.x && y === exitPos.y)) {
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
  // Касание — щёлкаем по клетке
  mazeEl.addEventListener('touchstart', e => {
    e.preventDefault();
    const touch = e.touches[0];
    const cell = getCellFromTouch(touch.clientX, touch.clientY);
    if (cell) {
      movePlayerToCell(cell);
    }
  });

  // Клавиши
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
  const cellIndex = playerPos.y * mazeSize + playerPos.x;
  const cell = mazeEl.children[cellIndex];
  if (cell && cell.dataset.trash) {
    delete cell.dataset.trash;
    cell.textContent = '';
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

// === Обычные режимы ===
function spawnTrash() {
  if (!gameActive || selectedMode === 'maze') return;

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
  if (!gameActive || selectedMode === 'maze') return;
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

// Управление игроком
function movePlayer(x, y) {
  if (!gameActive || selectedMode === 'maze') return;
  const rx = Math.max(0, Math.min(window.innerWidth - 60, x - 30));
  const ry = Math.max(0, Math.min(window.innerHeight - 60, y - 30));
  playerEl.style.left = rx + 'px';
  playerEl.style.top = ry + 'px';
}

gameScreen.addEventListener('touchmove', e => {
  if (selectedMode !== 'maze') {
    e.preventDefault();
    movePlayer(e.touches[0].clientX, e.touches[0].clientY);
  }
});

gameScreen.addEventListener('mousedown', e => {
  if (selectedMode !== 'maze') movePlayer(e.clientX, e.clientY);
});

gameScreen.addEventListener('mousemove', e => {
  if (selectedMode !== 'maze' && e.buttons === 1) movePlayer(e.clientX, e.clientY);
});

// Старт игры
startGameBtn.addEventListener('click', startGame);

function startGame() {
  if (!selectedPuppy || !selectedMode) return;
  playSound(soundStart);
  if (musicEnabled) {
    soundBgMusic.play().catch(e => console.log("Музыка заблокирована:", e));
  }
  startScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  score = 0;
  timeLeft = selectedMode === 'maze' ? 60 : 30;
  gameActive = true;
  scoreEl.textContent = 'Счёт: 0';
  timerEl.textContent = `Время: ${timeLeft}`;
  document.querySelectorAll('.trash, .collect-flash').forEach(el => el.remove());

  if (selectedMode === 'maze') {
    playerEl.style.display = 'none';
    mazeEl.style.display = 'block';
    startMazeGame();
  } else {
    playerEl.style.display = 'block';
    mazeEl.style.display = 'none';
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

// Конец игры
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

// Кнопки
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
