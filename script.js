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
const joystickEl = document.getElementById('joystick');
const joystickKnob = document.getElementById('joystick-knob');

// Звуки
const soundCollect = document.getElementById('soundCollect');
const soundStart = document.getElementById('soundStart');
const soundEnd = document.getElementById('soundEnd');
const soundBgMusic = document.getElementById('soundBgMusic');

let selectedPuppy = null;
let selectedMode = 'falling'; // falling, to-center, static, maze
let score = 0;
let timeLeft = 30;
let gameActive = false;
let gameLoop;
let musicEnabled = true;
let moveInterval;
let joystickActive = false;
let joystickOffset = { x: 0, y: 0 };

// Лабиринт
let maze = [];
const mazeSize = 10;
let playerPos = { x: 1, y: 1 };
let exitPos = { x: mazeSize - 2, y: mazeSize - 2 };

// Щенки
const puppyImages = {
  rocky: 'images/rocky.png',
  chase: 'images/chase.png',
  marshall: 'images/marshall.png',
  rubble: 'images/rubble.png',
  skye: 'images/skye.png'
};

// Типы мусора (для режимов кроме лабиринта)
const trashTypes = [
  { name: 'can',    sizeRange: [35, 55] },
  { name: 'bag',    sizeRange: [40, 60] },
  { name: 'bottle', sizeRange: [30, 50] },
  { name: 'box',    sizeRange: [45, 70] }
];

// === Вспомогательные функции ===
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

// === Выбор щенка и режима ===
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

// === Управление джойстиком ===
function setupJoystick() {
  const radius = 40;

  const startDrag = (clientX, clientY) => {
    joystickActive = true;
    updateJoystick(clientX, clientY);
  };

  const moveDrag = (clientX, clientY) => {
    if (joystickActive) updateJoystick(clientX, clientY);
  };

  const stopDrag = () => {
    if (!joystickActive) return;
    joystickActive = false;
    joystickOffset = { x: 0, y: 0 };
    joystickKnob.style.transform = 'translate(-50%, -50%)';
  };

  // Касание
  joystickEl.addEventListener('touchstart', e => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); });
  window.addEventListener('touchmove', e => { if (joystickActive) { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }});
  window.addEventListener('touchend', stopDrag);

  // Мышь
  joystickEl.addEventListener('mousedown', e => startDrag(e.clientX, e.clientY));
  window.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
  window.addEventListener('mouseup', stopDrag);

  function updateJoystick(clientX, clientY) {
    const rect = joystickEl.getBoundingClientRect();
    const centerX = rect.left + radius;
    const centerY = rect.top + radius;
    let x = clientX - centerX;
    let y = clientY - centerY;
    const distance = Math.hypot(x, y);
    if (distance > radius) {
      x = (x / distance) * radius;
      y = (y / distance) * radius;
    }
    joystickOffset = { x, y };
    joystickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }
}

// === Лабиринт ===
function generateMaze() {
  maze = Array(mazeSize).fill().map(() => Array(mazeSize).fill(1));
  for (let y = 1; y < mazeSize - 1; y++) {
    for (let x = 1; x < mazeSize - 1; x++) {
      maze[y][x] = 0;
    }
  }
  // Случайные стены
  for (let i = 0; i < 15; i++) {
    const x = Math.floor(Math.random() * (mazeSize - 2)) + 1;
    const y = Math.floor(Math.random() * (mazeSize - 2)) + 1;
    if ((x !== 1 || y !== 1) && !(x === exitPos.x && y === exitPos.y)) {
      maze[y][x] = 1;
    }
  }
  maze[1][1] = 0;
  maze[exitPos.y][exitPos.x] = 0;
}

function renderMaze() {
  mazeEl.innerHTML = '';
  mazeEl.style.display = 'grid';
  mazeEl.style.gridTemplateColumns = `repeat(${mazeSize}, 30px)`;
  mazeEl.style.gridTemplateRows = `repeat(${mazeSize}, 30px)`;
  mazeEl.style.gap = '2px';
  mazeEl.style.padding = '6px';
  mazeEl.style.background = '#333';
  mazeEl.style.borderRadius = '10px';
  mazeEl.style.justifyContent = 'center';
  mazeEl.style.alignContent = 'center';
  mazeEl.style.position = 'absolute';
  mazeEl.style.top = '50px';
  mazeEl.style.left = '50%';
  mazeEl.style.transform = 'translateX(-50%)';
  mazeEl.style.maxWidth = '90vw';
  mazeEl.style.width = 'fit-content';

  for (let y = 0; y < mazeSize; y++) {
    for (let x = 0; x < mazeSize; x++) {
      const cell = document.createElement('div');
      cell.style.width = '30px';
      cell.style.height = '30px';
      cell.style.display = 'flex';
      cell.style.justifyContent = 'center';
      cell.style.alignItems = 'center';
      cell.style.borderRadius = '4px';
      cell.style.fontSize = '20px';

      if (maze[y][x] === 1) {
        cell.style.background = '#5d4037'; // wall
      } else {
        cell.style.background = '#cfd8dc'; // path
      }

      // Мусор
      if (maze[y][x] === 0 && Math.random() > 0.8 && !(x === 1 && y === 1) && !(x === exitPos.x && y === exitPos.y)) {
        cell.dataset.trash = '1';
        cell.textContent = '🗑️';
      }

      // Выход
      if (x === exitPos.x && y === exitPos.y) {
        cell.style.background = '#4caf50';
        cell.style.color = 'white';
        cell.style.fontWeight = 'bold';
        cell.textContent = '🚪';
      }

      // Игрок
      if (x === playerPos.x && y === playerPos.y) {
        const img = document.createElement('img');
        img.src = puppyImages[selectedPuppy];
        img.style.width = '24px';
        img.style.height = '24px';
        cell.appendChild(img);
      }

      mazeEl.appendChild(cell);
    }
  }
}

function startMazeGame() {
  clearInterval(moveInterval);
  moveInterval = setInterval(() => {
    if (!gameActive || selectedMode !== 'maze') return;

    const sensitivity = 20;
    let moved = false;

    if (Math.abs(joystickOffset.x) > sensitivity || Math.abs(joystickOffset.y) > sensitivity) {
      if (Math.abs(joystickOffset.x) > Math.abs(joystickOffset.y)) {
        const dir = joystickOffset.x > 0 ? 1 : -1;
        const newX = playerPos.x + dir;
        if (newX >= 0 && newX < mazeSize && maze[playerPos.y][newX] === 0) {
          playerPos.x = newX;
          moved = true;
        }
      } else {
        const dir = joystickOffset.y > 0 ? 1 : -1;
        const newY = playerPos.y + dir;
        if (newY >= 0 && newY < mazeSize && maze[newY][playerPos.x] === 0) {
          playerPos.y = newY;
          moved = true;
        }
      }
    }

    if (moved) {
      renderMaze();

      // Проверка мусора
      const cell = document.elementFromPoint(
        mazeEl.getBoundingClientRect().left + (playerPos.x + 0.5) * 32,
        mazeEl.getBoundingClientRect().top + (playerPos.y + 0.5) * 32
      );
      if (cell && cell.dataset.trash) {
        delete cell.dataset.trash;
        cell.textContent = '';
        score += 2;
        scoreEl.textContent = `Счёт: ${score}`;
        playSound(soundCollect);
        playerEl.classList.add('collect-jump');
        setTimeout(() => playerEl.classList.remove('collect-jump'), 300);
      }

      // Проверка выхода
      if (playerPos.x === exitPos.x && playerPos.y === exitPos.y) {
        score += 10;
        scoreEl.textContent = `Счёт: ${score}`;
        setTimeout(() => {
          alert('Ты нашёл выход! 🎉');
          endGame();
        }, 300);
      }
    }
  }, 150);
}

// === Обычные режимы (не лабиринт) ===
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

// === Управление игроком (для не-лабиринт режимов) ===
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

// === Старт и конец игры ===
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
    joystickEl.style.display = 'block';
    mazeEl.style.display = 'block';

    generateMaze();
    playerPos = { x: 1, y: 1 };
    renderMaze();
    setupJoystick();
    startMazeGame();

    clearInterval(window.gameTimer);
    window.gameTimer = setInterval(() => {
      timeLeft--;
      timerEl.textContent = `Время: ${timeLeft}`;
      if (timeLeft <= 0) endGame();
    }, 1000);

  } else {
    playerEl.style.display = 'block';
    joystickEl.style.display = 'none';
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

function endGame() {
  gameActive = false;
  clearInterval(window.gameTimer);
  clearInterval(window.trashSpawner);
  clearInterval(moveInterval);
  cancelAnimationFrame(gameLoop);

  playSound(soundEnd);
  soundBgMusic.pause();

  finalScoreEl.textContent = score;
  gameScreen.classList.add('hidden');
  endScreen.classList.remove('hidden');
}

// === Кнопки ===
restartBtn.addEventListener('click', () => {
  endScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  document.querySelectorAll('#puppySelect img').forEach(el => el.classList.remove('selected'));
  modeButtons.forEach(btn => btn.classList.remove('active'));
  modeButtons[0].classList.add('active');
  selectedPuppy = null;
  selectedMode = 'falling';
  startGameBtn.disabled = true;
  joystickEl.style.display = 'none';
  mazeEl.style.display = 'none';
});

exitBtn.addEventListener('click', () => {});

document.getElementById('volumeBtn')?.addEventListener('click', toggleMusic);
