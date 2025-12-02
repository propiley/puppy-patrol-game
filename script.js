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
let trashPositions = []; // ← добавлено
const mazeSize = 10;
let playerPos = { x: 1, y: 1 };
let exitPos = { x: mazeSize - 2, y: mazeSize - 2 };

// Щенки
const puppyImages = {
  rocky: 'images/rocky.png',
  chase: 'images/chase.png',
  marshall: 'images/marshall.png',
  rubble: 'images/rubble.png',
  skye: 'images/skye.png',
};

// Типы мусора (для других режимов)
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

// === ЛАБИРИНТ ===
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

  // Генерация мусора
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

// === Остальной код без изменений ===
// (spawnTrash, checkCollection, movePlayer, startGame, и т.д. — остаются как в предыдущей версии)
// ... (остальной код тот же, что и выше)
