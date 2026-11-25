// DATA 5 PEMAIN BINTANG (Total semua statistik wajib = 15 Poin)
const PRO_PLAYERS = {
  striker: [
    { name: "C. Ronaldo", power: 7, accuracy: 5, curve: 3 },
    { name: "L. Messi", power: 4, accuracy: 6, curve: 5 },
    { name: "K. Mbappé", power: 6, accuracy: 6, curve: 3 },
    { name: "E. Haaland", power: 8, accuracy: 5, curve: 2 },
    { name: "Neymar Jr", power: 4, accuracy: 5, curve: 6 }
  ],
  keeper: [
    { name: "E. Martínez", reflex: 6, dive: 5, positioning: 4 },
    { name: "T. Courtois", reflex: 5, dive: 6, positioning: 4 },
    { name: "Alisson", reflex: 5, dive: 5, positioning: 5 },
    { name: "G. Donnarumma", reflex: 4, dive: 7, positioning: 4 },
    { name: "M. Neuer", reflex: 6, dive: 4, positioning: 5 }
  ]
};

let role = 'striker';
let activeTab = 'pro';
let selectedProIndex = 0;
let customStats = {};
let kickMode = 'arrow';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let animId;
let roundTimer = null;

let match = {
  pScore: 0, cpuScore: 0,
  pHistory: [], cpuHistory: [],
  round: 1,
  turn: 'PLAYER', // 'PLAYER' atau 'CPU'
  phase: 'IDLE', // RUN_UP, AIM_X, AIM_Y, SWIPE_DRAW, KEEPER_WAIT, ANIMATING, ROUND_END
  playerStats: null,
  cpuStats: null,
  // Objek Animasi
  striker: { x: 240, y: 445, legAngle: 0, jersey: '#ef4444' },
  ball: { x: 300, y: 390, r: 12, startX: 300, startY: 390, targetX: 300, targetY: 150, ctrlX: 300, ctrlY: 270, progress: 0, speed: 0.03, spin: 0, trail: [] },
  keeper: { x: 300, y: 155, startX: 300, targetX: 300, diveY: 155, progress: 0, state: 'idle', jersey: '#facc15' },
  netShake: 0,
  particles: [],
  // Mekanik Panah
  arrowX: 300, arrowDirX: 5,
  arrowY: 185, arrowDirY: -4,
  // Mekanik Garis Lengkung (Freehand Curve)
  isDragging: false, dragPoints: [],
  keeperTarget: null
};
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function selectRole(chosenRole) {
  role = chosenRole;
  selectedProIndex = 0;
  document.getElementById('select-title').innerText = role === 'striker' ? 'Pilih Striker' : 'Pilih Kiper';
  document.getElementById('mode-selector').style.display = role === 'striker' ? 'block' : 'none';
  
  if (role === 'striker') {
    customStats = { power: 5, accuracy: 5, curve: 5 };
  } else {
    customStats = { reflex: 5, dive: 5, positioning: 5 };
  }

  renderProList();
  renderCustomSliders();
  switchTab('pro');
  showScreen('screen-select');
}

function switchTab(tab) {
  activeTab = tab;
  document.getElementById('tab-pro').classList.toggle('active', tab === 'pro');
  document.getElementById('tab-custom').classList.toggle('active', tab === 'custom');
  document.getElementById('panel-pro').classList.toggle('active', tab === 'pro');
  document.getElementById('panel-custom').classList.toggle('active', tab === 'custom');
}

function renderProList() {
  const list = document.getElementById('player-list');
  list.innerHTML = '';
  PRO_PLAYERS[role].forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = `player-card ${idx === selectedProIndex ? 'selected' : ''}`;
    card.onclick = () => { selectedProIndex = idx; renderProList(); };

    let statsHtml = '';
    if (role === 'striker') {
      statsHtml = `<span>Power: ${p.power}</span><span>Akurasi: ${p.accuracy}</span><span>Curve: ${p.curve}</span>`;
    } else {
      statsHtml = `<span>Refleks: ${p.reflex}</span><span>Lompatan: ${p.dive}</span><span>Posisi: ${p.positioning}</span>`;
    }

    card.innerHTML = `<strong>${p.name}</strong><div class="stats-mini">${statsHtml}</div>`;
    list.appendChild(card);
  });
}

function renderCustomSliders() {
  const container = document.getElementById('stat-sliders');
  container.innerHTML = '';
  const labels = role === 'striker'
    ? { power: 'Power Tendangan', accuracy: 'Akurasi', curve: 'Efek Lengkung (Curve)' }
    : { reflex: 'Refleks', dive: 'Jangkauan Lompat', positioning: 'Penempatan Posisi' };

  const totalUsed = Object.values(customStats).reduce((a, b) => a + b, 0);
  document.getElementById('points-left').innerText = 15 - totalUsed;

  Object.keys(customStats).forEach(key => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <span>${labels[key]}</span>
      <div class="stat-controls">
        <button onclick="changeStat('${key}', -1)">-</button>
        <strong>${customStats[key]}</strong>
        <button onclick="changeStat('${key}', 1)">+</button>
      </div>
    `;
    container.appendChild(row);
  });
}

function changeStat(key, delta) {
  const totalUsed = Object.values(customStats).reduce((a, b) => a + b, 0);
  if (delta > 0 && totalUsed >= 15) return;
  if (delta < 0 && customStats[key] <= 1) return;
  customStats[key] += delta;
  renderCustomSliders();
}
function startMatch() {
  if (activeTab === 'pro') {
    match.playerStats = { ...PRO_PLAYERS[role][selectedProIndex] };
  } else {
    const nameInput = document.getElementById('custom-name').value.trim() || 'Custom Player';
    match.playerStats = { name: nameInput, ...customStats };
  }

  const cpuRole = role === 'striker' ? 'keeper' : 'striker';
  const randomCpu = PRO_PLAYERS[cpuRole][Math.floor(Math.random() * 5)];
  match.cpuStats = { ...randomCpu };

  if (role === 'striker') {
    kickMode = document.querySelector('input[name="kickMode"]:checked').value;
  }

  document.getElementById('p-name-hud').innerText = `${match.playerStats.name} (Kamu)`;
  document.getElementById('cpu-name-hud').innerText = `${match.cpuStats.name} (CPU)`;

  restartMatch();
}

function restartMatch() {
  clearTimeout(roundTimer);
  match.pScore = 0;
  match.cpuScore = 0;
  match.pHistory = [];
  match.cpuHistory = [];
  match.round = 1;
  match.turn = 'PLAYER';
  match.particles = [];
  updateHUD();
  showScreen('screen-game');
  setupTurn();

  cancelAnimationFrame(animId);
  gameLoop();
}

function setupTurn() {
  clearTimeout(roundTimer);
  // Reset posisi objek
  match.striker = { x: 245, y: 440, legAngle: 0, jersey: match.turn === 'PLAYER' ? '#ef4444' : '#3b82f6' };
  match.ball = { x: 300, y: 390, r: 12, startX: 300, startY: 390, targetX: 300, targetY: 150, ctrlX: 300, ctrlY: 270, progress: 0, speed: 0.03, spin: 0, trail: [] };
  match.keeper = { x: 300, y: 155, startX: 300, targetX: 300, diveY: 155, progress: 0, state: 'idle', jersey: match.turn === 'PLAYER' ? '#facc15' : '#a855f7' };
  match.isDragging = false;
  match.dragPoints = [];
  match.keeperTarget = null;
  match.netShake = 0;

  const banner = document.getElementById('status-banner');
  const hint = document.getElementById('controls-hint');

  // CEK APAKAH GILIRAN PLAYER AKTIF ATAU MENONTON CPU
  const isPlayerActive = (role === 'striker' && match.turn === 'PLAYER') || (role === 'keeper' && match.turn === 'CPU');

  if (!isPlayerActive) {
    // MODE MENONTON CPU VS CPU
    match.phase = 'WATCH_CPU';
    banner.innerText = `Ronde ${match.round} (${match.turn === 'PLAYER' ? 'Tim Kamu' : 'Tim Lawan'}): Menonton Tendangan CPU...`;
    hint.innerText = "Saksikan giliran tendangan tim...";
    roundTimer = setTimeout(() => {
      startRunUpAndKick('CPU_SIM');
    }, 1100);
    return;
  }

  // JIKA PLAYER YANG BERMAIN:
  if (role === 'striker') {
    if (kickMode === 'arrow') {
      match.phase = 'AIM_X';
      match.arrowX = 300;
      const baseSpeed = 8 - (match.playerStats.accuracy * 0.4);
      match.arrowDirX = baseSpeed;
      match.arrowY = 185;
      match.arrowDirY = -baseSpeed * 0.8;
      banner.innerText = `Ronde ${match.round} (Giliranmu): Kunci Arah!`;
      hint.innerText = "Klik layar atau tekan SPASI untuk mengunci arah!";
    } else {
      match.phase = 'SWIPE_DRAW';
      banner.innerText = `Ronde ${match.round} (Giliranmu): Gambar Garis Lengkung!`;
      hint.innerText = "Tarik garis bebas (bisa melengkung!) dari bola ke arah gawang";
    }
  } else {
    // Player sebagai Kiper saat giliran CPU menendang
    match.phase = 'KEEPER_WAIT';
    banner.innerText = `Ronde ${match.round} (Giliranmu Menjaga): Klik Area Gawang!`;
    hint.innerText = "Klik posisi di gawang untuk melompat sebelum CPU menendang!";
    roundTimer = setTimeout(() => {
      if (match.phase === 'KEEPER_WAIT') {
        startRunUpAndKick('KEEPER_PLAYER');
      }
    }, 1800);
  }
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && document.getElementById('screen-game').classList.contains('active')) {
    e.preventDefault();
    handleActionClick();
  }
});

canvas.addEventListener('mousedown', (e) => {
  const pos = getCanvasPos(e);
  if (role === 'striker' && kickMode === 'arrow' && match.turn === 'PLAYER') {
    handleActionClick();
  } else if (role === 'striker' && kickMode === 'swipe' && match.phase === 'SWIPE_DRAW') {
    match.isDragging = true;
    match.dragPoints = [{ x: match.ball.x, y: match.ball.y }, pos];
  } else if (role === 'keeper' && match.phase === 'KEEPER_WAIT') {
    match.keeperTarget = { x: Math.max(150, Math.min(450, pos.x)), y: Math.max(95, Math.min(185, pos.y)) };
    startRunUpAndKick('KEEPER_PLAYER');
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!match.isDragging) return;
  match.dragPoints.push(getCanvasPos(e));
});

canvas.addEventListener('mouseup', () => {
  if (!match.isDragging || match.phase !== 'SWIPE_DRAW') return;
  match.isDragging = false;
  if (match.dragPoints.length < 3) return;

  const start = match.dragPoints;
  const end = match.dragPoints[match.dragPoints.length - 1];
  if (end.y > start.y - 25) {
    match.dragPoints = [];
    return;
  }

  // Ambil titik tengah tarikan untuk menciptakan efek lengkung (Bezier Control Point)
  const midIdx = Math.floor(match.dragPoints.length / 2);
  const midPoint = match.dragPoints[midIdx];

  // Hitung panjang total garis yang digambar sebagai Power
  let totalDist = 0;
  for (let i = 1; i < match.dragPoints.length; i++) {
    totalDist += Math.hypot(match.dragPoints[i].x - match.dragPoints[i-1].x, match.dragPoints[i].y - match.dragPoints[i-1].y);
  }

  const powerStat = match.playerStats.power;
  const curveStat = match.playerStats.curve;
  const accStat = match.playerStats.accuracy;

  // Perkuat lengkungan berdasarkan stat Curve pemain
  const curveMultiplier = 1 + (curveStat * 0.15);
  const straightMidX = (start.x + end.x) / 2;
  const devX = (midPoint.x - straightMidX) * curveMultiplier;

  let targetX = end.x + (Math.random() - 0.5) * ((10 - accStat) * 2.5);
  let targetY = Math.max(85, Math.min(190, end.y));
  let ctrlX = straightMidX + devX * 1.8;
  let ctrlY = (start.y + targetY) / 2;

  const speed = Math.min(0.055, Math.max(0.022, (totalDist / 6000) + (powerStat * 0.0025)));

  match.pendingShot = { tx: targetX, ty: targetY, cx: ctrlX, cy: ctrlY, speed };
  startRunUpAndKick('STRIKER_PLAYER');
});

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function handleActionClick() {
  if (role !== 'striker' || kickMode !== 'arrow' || match.turn !== 'PLAYER') return;
  const banner = document.getElementById('status-banner');

  if (match.phase === 'AIM_X') {
    match.phase = 'AIM_Y';
    banner.innerText = "Kunci Ketinggian Tendangan!";
  } else if (match.phase === 'AIM_Y') {
    const powerStat = match.playerStats.power;
    const curveStat = match.playerStats.curve;
    const speed = 0.025 + (powerStat * 0.003);
    const curveDir = match.arrowX > 300 ? 1 : -1;
    const ctrlX = (300 + match.arrowX) / 2 + (curveDir * curveStat * 14);
    const ctrlY = (390 + match.arrowY) / 2;

    match.pendingShot = { tx: match.arrowX, ty: match.arrowY, cx: ctrlX, cy: ctrlY, speed };
    startRunUpAndKick('STRIKER_PLAYER');
  }
}

// Animasi Striker Lari Ancang-Ancang Sebelum Menendang
function startRunUpAndKick(shotType) {
  match.phase = 'RUN_UP';
  match.shotType = shotType;
  match.striker.x = 240;
  match.striker.y = 445;
}

function executeShotAfterRunUp() {
  match.phase = 'ANIMATING';
  match.ball.progress = 0;
  match.ball.trail = [];

  if (match.shotType === 'STRIKER_PLAYER') {
    const s = match.pendingShot;
    setBallCurve(s.tx, s.ty, s.cx, s.cy, s.speed);

    // AI Kiper menebak
    const cpu = match.cpuStats;
    const guessRight = Math.random() < (0.38 + cpu.reflex * 0.04);
    let kTargetX = guessRight ? s.tx : (s.tx > 300 ? 200 : 400);
    const maxReach = 90 + (cpu.dive * 10);
    kTargetX = Math.max(300 - maxReach, Math.min(300 + maxReach, kTargetX));
    
    match.keeper.targetX = kTargetX;
    match.keeper.diveY = s.ty < 140 ? 120 : 165;
    match.keeper.state = 'diving';

  } else if (match.shotType === 'KEEPER_PLAYER') {
    const cpu = match.cpuStats;
    const tx = 165 + Math.random() * 270;
    const ty = 100 + Math.random() * 85;
    const curve = (Math.random() - 0.5) * (cpu.curve * 22);
    setBallCurve(tx, ty, (300 + tx)/2 + curve, (390 + ty)/2, 0.025 + cpu.power * 0.0025);

    const maxReach = 95 + (match.playerStats.dive * 11);
    if (match.keeperTarget) {
      match.keeper.targetX = Math.max(300 - maxReach, Math.min(300 + maxReach, match.keeperTarget.x));
      match.keeper.diveY = match.keeperTarget.y;
    } else {
      match.keeper.targetX = 300;
      match.keeper.diveY = 155;
    }
    match.keeper.state = 'diving';

  } else if (match.shotType === 'CPU_SIM') {
    // Simulasi visual CPU menendang & Kiper CPU menepis
    const tx = 155 + Math.random() * 290;
    const ty = 95 + Math.random() * 90;
    const curve = (Math.random() - 0.5) * 90;
    setBallCurve(tx, ty, (300 + tx)/2 + curve, (390 + ty)/2, 0.032);

    const guessRight = Math.random() < 0.52;
    match.keeper.targetX = guessRight ? Math.max(170, Math.min(430, tx)) : (tx > 300 ? 210 : 390);
    match.keeper.diveY = ty < 140 ? 125 : 165;
    match.keeper.state = 'diving';
  }
}

function setBallCurve(tx, ty, cx, cy, speed) {
  match.ball.targetX = tx;
  match.ball.targetY = ty;
  match.ball.ctrlX = cx;
  match.ball.ctrlY = cy;
  match.ball.speed = speed;
}
function gameLoop() {
  update();
  draw();
  animId = requestAnimationFrame(gameLoop);
}

function update() {
  // Update partikel konfeti / percikan
  for (let i = match.particles.length - 1; i >= 0; i--) {
    const p = match.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life -= 0.02;
    if (p.life <= 0) match.particles.splice(i, 1);
  }

  if (match.netShake > 0) match.netShake *= 0.88;

  if (match.phase === 'AIM_X') {
    match.arrowX += match.arrowDirX;
    if (match.arrowX > 460 || match.arrowX < 140) match.arrowDirX *= -1;
  } else if (match.phase === 'AIM_Y') {
    match.arrowY += match.arrowDirY;
    if (match.arrowY < 90 || match.arrowY > 190) match.arrowDirY *= -1;
  }

  // Animasi Striker Lari Menuju Bola
  if (match.phase === 'RUN_UP') {
    match.striker.x += (282 - match.striker.x) * 0.15;
    match.striker.y += (398 - match.striker.y) * 0.15;
    match.striker.legAngle = Math.sin(Date.now() * 0.03) * 0.5;
    if (Math.hypot(282 - match.striker.x, 398 - match.striker.y) < 4) {
      match.striker.legAngle = -0.8; // Ayunan tendangan
      executeShotAfterRunUp();
    }
  }

  // Animasi Bola Terbang dengan Kurva Quadratic Bezier
  if (match.phase === 'ANIMATING') {
    match.ball.progress += match.ball.speed;
    match.keeper.progress = Math.min(1, match.ball.progress * 1.15);

    const t = Math.min(1, match.ball.progress);
    const invT = 1 - t;
    // Rumus Kurva Bezier Kuadratik (mengikuti garis lengkung user!)
    match.ball.x = (invT * invT * match.ball.startX) + (2 * invT * t * match.ball.ctrlX) + (t * t * match.ball.targetX);
    match.ball.y = (invT * invT * match.ball.startY) + (2 * invT * t * match.ball.ctrlY) + (t * t * match.ball.targetY);
    match.ball.r = 12 - (t * 4.5);
    match.ball.spin += 0.35;

    match.ball.trail.push({ x: match.ball.x, y: match.ball.y, r: match.ball.r });
    if (match.ball.trail.length > 10) match.ball.trail.shift();

    match.keeper.x = match.keeper.startX + (match.keeper.targetX - match.keeper.startX) * match.keeper.progress;
    match.keeper.y = 155 + (match.keeper.diveY - 155) * match.keeper.progress;

    if (t >= 1) evaluateShot();
  }
}

function spawnConfetti(x, y) {
  const colors = ['#22c55e', '#facc15', '#38bdf8', '#f43f5e', '#ffffff'];
  for (let i = 0; i < 35; i++) {
    match.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 1) * 7,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1
    });
  }
}

function evaluateShot() {
  match.phase = 'ROUND_END';
  const bx = match.ball.x;
  const by = match.ball.y;

  const inGoalX = bx >= 162 && bx <= 438;
  const inGoalY = by >= 97 && by <= 192;

  const statBonus = (role === 'keeper' && match.turn === 'CPU') ? match.playerStats.positioning * 2 : 8;
  const distToKeeper = Math.hypot(bx - match.keeper.x, by - match.keeper.y);
  const isSaved = distToKeeper < (28 + statBonus);

  let isGoal = false;
  let msg = "";

  if (!inGoalX || !inGoalY) {
    msg = "MELESET / KENA TIANG! ❌";
  } else if (isSaved) {
    msg = "DITEPIS KIPER! 🧤";
  } else {
    isGoal = true;
    msg = "GOOOOOL! ⚽🔥";
    match.netShake = 8;
    spawnConfetti(bx, by);
  }

  document.getElementById('status-banner').innerText = msg;

  // Catat skor sesuai giliran tim (PLAYER atau CPU)
  if (match.turn === 'PLAYER') {
    if (isGoal) match.pScore++;
    match.pHistory.push(isGoal);
  } else {
    if (isGoal) match.cpuScore++;
    match.cpuHistory.push(isGoal);
  }

  updateHUD();

  roundTimer = setTimeout(() => {
    if (match.turn === 'PLAYER') {
      match.turn = 'CPU';
      setupTurn();
    } else {
      // Selesai 1 ronde penuh (Player + CPU sudah menendang)
      if (match.round >= 5 && match.pScore !== match.cpuScore) {
        showGameOver();
      } else {
        match.round++;
        match.turn = 'PLAYER';
        setupTurn();
      }
    }
  }, 1600);
}

function updateHUD() {
  document.getElementById('p-score').innerText = match.pScore;
  document.getElementById('cpu-score').innerText = match.cpuScore;

  const renderDots = (elId, arr) => {
    const el = document.getElementById(elId);
    el.innerHTML = '';
    for (let i = 0; i < Math.max(5, arr.length); i++) {
      const d = document.createElement('div');
      d.className = 'dot';
      if (arr[i] === true) d.classList.add('goal');
      if (arr[i] === false) d.classList.add('miss');
      el.appendChild(d);
    }
  };
  renderDots('p-dots', match.pHistory);
  renderDots('cpu-dots', match.cpuHistory);
}

function showGameOver() {
  cancelAnimationFrame(animId);
  const won = match.pScore > match.cpuScore;
  const title = document.getElementById('result-title');
  title.innerText = won ? "KAMU MENANG! 🏆" : "GAME OVER / KALAH! 💀";
  title.style.color = won ? "#22c55e" : "#ef4444";
  document.getElementById('result-detail').innerText = `Skor Akhir: ${match.pScore} - ${match.cpuScore}`;
  showScreen('screen-gameover');
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Tribun & Lampu Stadion
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 600, 190);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 130, 600, 60);

  // Rumput Lapangan
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(0, 190, 600, 260);
  ctx.fillStyle = '#15803d';
  for (let y = 210; y < 450; y += 60) ctx.fillRect(0, y, 600, 30);

  // Garis Kotak Penalti & Titik Putih
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 3;
  ctx.strokeRect(90, 190, 420, 240);
  ctx.beginPath();
  ctx.arc(300, 390, 4, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();

  // Gawang + Jaring Bergetar
  const shakeX = (Math.random() - 0.5) * match.netShake;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(160 + shakeX, 95, 280, 95);
  
  // Pola Jaring Gawang
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  for (let gx = 175; gx < 440; gx += 15) {
    ctx.beginPath(); ctx.moveTo(gx + shakeX, 95); ctx.lineTo(gx + shakeX, 190); ctx.stroke();
  }
  for (let gy = 110; gy < 190; gy += 15) {
    ctx.beginPath(); ctx.moveTo(160 + shakeX, gy); ctx.lineTo(440 + shakeX, gy); ctx.stroke();
  }

  // Tiang Gawang Putih
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(160, 95, 280, 95);

  // Gambar Kiper Detail
  ctx.save();
  ctx.translate(match.keeper.x, match.keeper.y);
  if (match.keeper.state === 'diving') {
    const tilt = match.keeper.targetX < 300 ? -0.75 : (match.keeper.targetX > 300 ? 0.75 : 0);
    ctx.rotate(tilt);
  }
  // Kaki & Celana Kiper
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-10, 12, 8, 16);
  ctx.fillRect(2, 12, 8, 16);
  // Jersey Kiper
  ctx.fillStyle = match.keeper.jersey;
  ctx.fillRect(-14, -18, 28, 32);
  // Lengan Terentang
  ctx.fillRect(-26, -16, 12, 7);
  ctx.fillRect(14, -16, 12, 7);
  // Sarung Tangan
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(-28, -12, 6, 0, Math.PI * 2);
  ctx.arc(28, -12, 6, 0, Math.PI * 2);
  ctx.fill();
  // Kepala
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(0, -26, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Indikator Mode Panah
  if (match.phase === 'AIM_X' || match.phase === 'AIM_Y') {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(match.arrowX, match.arrowY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Indikator Garis Lengkung Bebas (Freehand)
  if (match.isDragging && match.dragPoints.length > 1) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(match.dragPoints.x, match.dragPoints.y);
    for (let i = 1; i < match.dragPoints.length; i++) {
      ctx.lineTo(match.dragPoints[i].x, match.dragPoints[i].y);
    }
    ctx.stroke();
  }

  // Jejak Bola (Trail) & Bayangan
  match.ball.trail.forEach((tr, idx) => {
    ctx.fillStyle = `rgba(255, 255, 255, ${idx * 0.04})`;
    ctx.beginPath();
    ctx.arc(tr.x, tr.y, tr.r * 0.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // Gambar Bola Berputar
  ctx.save();
  ctx.translate(match.ball.x, match.ball.y);
  ctx.rotate(match.ball.spin);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, match.ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Motif Bola
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, match.ball.r * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Gambar Karakter Striker (Lari Ancang-Ancang & Tendang)
  ctx.save();
  ctx.translate(match.striker.x, match.striker.y);
  // Kaki Kiri & Kaki Kanan (Mengayun)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-10, 10, 7, 18);
  ctx.save();
  ctx.translate(6, 10);
  ctx.rotate(match.striker.legAngle);
  ctx.fillRect(-3, 0, 7, 18);
  ctx.restore();
  // Jersey Striker
  ctx.fillStyle = match.striker.jersey;
  ctx.fillRect(-13, -18, 26, 30);
  // Kepala Striker
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(0, -26, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Gambar Konfeti Gol
  match.particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillRect(p.x, p.y, 6, 6);
    ctx.globalAlpha = 1;
  });
}
