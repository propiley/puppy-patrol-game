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

// Звуки
const soundCollect = document.getElementById('soundCollect');
const soundStart = document.getElementById('soundStart');
const soundEnd = document.getElementById('soundEnd');

let selectedPuppy = null;
let score = 0;
let timeLeft = 30;
let gameActive = false;
let gameLoop;

// Картинки щенков
const puppyImages = {
  rocky: 'images/rocky.png',
  chase: 'images/chase.png',
  marshall: 'images/marshall.png',
  rubble: 'images/rubble.png',
  skye: 'images/skye.png'
};

// Типы мусора
const trashTypes = [
  { name: 'can',    sizeRange: [35, 55] },
  { name: 'bag',    sizeRange: [40, 60] },
  { name: 'bottle', sizeRange: [30, 50] },
  { name: 'box',    sizeRange: [45, 70] }
];

// Вспомогательная функция воспроизведения звука
function playSound(audioEl) {
  if (!audioEl) return;
  audioEl.currentTime = 0;
  audioEl.play().catch(e => console.log("Звук отключён:", e));
}

// === ВЫБОР ЩЕНКА ===
document.querySelectorAll('#puppySelect img').forEach(img => {
  img.addEventListener('click', () => {
    document.querySelectorAll('#puppySelect img').forEach(el => el.classList.remove('selected'));
    img.classList.add('selected');
    selectedPuppy = img.dataset.puppy;
    startGame();
  });
});

// === СТАРТ ИГРЫ ===
function startGame() {
  if (!selectedPuppy) return;

  playSound(soundStart);

  playerEl.style.backgroundImage = `url(${puppyImages[selectedPuppy]})`;

  startScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');

  score = 0;
  timeLeft = 30;
  gameActive = true;
  scoreEl.textContent = 'Счёт: 0';
  timerEl.textContent = 'Время: 30';

  // Очистка
  document.querySelectorAll('.trash, .collect-flash').forEach(el => el.remove());

  // Таймер
  clearInterval(window.gameTimer);
  window.gameTimer = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `Время: ${timeLeft}`;
    if (timeLeft <= 0) endGame();
  }, 1000);

  // Генерация мусора
  clearInterval(window.trashSpawner);
  window.trashSpawner = setInterval(spawnTrash, 800); // чаще, т.к. мусор уходит вниз

  // Запуск проверки
  gameLoop = requestAnimationFrame(checkCollection);
}

// === ДВИЖЕНИЕ ИГРОКА ===
function movePlayer(x, y) {
  if (!gameActive) return;
  const rx = Math.max(0, Math.min(window.innerWidth - 60, x - 30));
  const ry = Math.max(0, Math.min(window.innerHeight - 60, y - 30));
  playerEl.style.left = rx + 'px';
  playerEl.style.top = ry + 'px';
}

gameScreen.addEventListener('touchmove', e => {
  e.preventDefault();
  movePlayer(e.touches[0].clientX, e.touches[0].clientY);
});

gameScreen.addEventListener('mousedown', e => movePlayer(e.clientX, e.clientY));
gameScreen.addEventListener('mousemove', e => {
  if (e.buttons === 1) movePlayer(e.clientX, e.clientY);
});

// === СОЗДАНИЕ МУСОРА С ДВИЖЕНИЕМ ===
function spawnTrash() {
  if (!gameActive) return;

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
  trash.style.left = Math.random() * (window.innerWidth - size) + 'px';
  trash.style.top = -size + 'px';
  gameScreen.appendChild(trash);

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

    if (top > window.innerHeight) {
      trash.remove();
      return;
    }

    requestAnimationFrame(move);
  }

  move();

  setTimeout(() => {
    if (trash.parentNode === gameScreen) trash.remove();
  }, 8000);
}

// === ПРОВЕРКА СБОРА ===
function checkCollection() {
  if (!gameActive) return;
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
      // Вспышка
      const flash = document.createElement('div');
      flash.className = 'collect-flash';
      flash.style.left = (trashRect.left + trashRect.width / 2 - 40) + 'px';
      flash.style.top = (trashRect.top + trashRect.height / 2 - 40) + 'px';
      document.body.appendChild(flash);

      setTimeout(() => flash.remove(), 600);

      // Звук и очки
      playSound(soundCollect);
      const points = parseInt(trash.dataset.points) || 1;
      score += points;
      scoreEl.textContent = `Счёт: ${score}`;

      trash.remove();
    }
  });

  gameLoop = requestAnimationFrame(checkCollection);
}

// === КОНЕЦ ИГРЫ ===
function endGame() {
  gameActive = false;
  clearInterval(window.gameTimer);
  clearInterval(window.trashSpawner);
  cancelAnimationFrame(gameLoop);

  playSound(soundEnd);

  finalScoreEl.textContent = score;
  gameScreen.classList.add('hidden');
  endScreen.classList.remove('hidden');
}

// === КНОПКИ ===
restartBtn.addEventListener('click', () => {
  endScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  document.querySelectorAll('#puppySelect img').forEach(el => el.classList.remove('selected'));
  selectedPuppy = null;
});

exitBtn.addEventListener('click', () => {
  // Можно оставить или перенаправить
});