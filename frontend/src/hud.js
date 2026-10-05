export function createHUD() {
  const $ = (id) => document.getElementById(id)
  const hud = $('hud')
  const healthFill = $('health-bar-fill'), healthValue = $('health-value')
  const scoreValue = $('score-value'), waveValue = $('wave-value')
  const ammoValue = $('ammo-value'), ammoReserve = $('ammo-reserve'), ammoReloading = $('ammo-reloading')
  const hitMarker = $('hit-marker'), damageVignette = $('damage-vignette')
  const killFeed = $('kill-feed'), waveAnnounce = $('wave-announce')
  const startScreen = $('start-screen'), gameOverScreen = $('game-over-screen')
  const finalScore = $('final-score'), finalWave = $('final-wave')
  const pauseScreen = $('pause-screen')
  const weaponHud = $('weapon-hud')
  const weaponNameSel = $('weapon-name-sel'), mapNameSel = $('map-name-sel'), weaponStats = $('weapon-stats')

  let hitTimer = 0, announceTimer = 0

  function show() { hud.classList.remove('hidden') }
  function hide() { hud.classList.add('hidden') }

  function updateHealth(h, max) {
    const pct = Math.max(0, h / max)
    healthFill.style.width = `${pct * 100}%`
    healthValue.textContent = Math.ceil(h)
    healthFill.style.background = pct > 0.5 ? 'linear-gradient(90deg, #00ff88, #00cc66)'
      : pct > 0.25 ? 'linear-gradient(90deg, #ffaa00, #ff8800)' : 'linear-gradient(90deg, #ff3333, #cc1111)'
  }
  function updateScore(s) { scoreValue.textContent = s }
  function updateWave(w) {
    waveValue.textContent = w
    waveAnnounce.querySelector('.wa-title').textContent = `WAVE ${w}`
    waveAnnounce.querySelector('.wa-sub').textContent = `${3 + w * 2} HOSTILES INCOMING`
    waveAnnounce.style.opacity = '1'; announceTimer = 2.5
  }
  function updateAmmo(current, reserve) {
    ammoValue.textContent = current
    ammoReserve.textContent = reserve === Infinity ? '∞' : reserve
  }
  function setReloading(r) { ammoReloading.classList.toggle('hidden', !r) }
  function showHitMarker(headshot) {
    hitMarker.classList.toggle('headshot', headshot)
    hitMarker.style.opacity = '1'; hitTimer = 0.12
  }
  function showDamage() {
    damageVignette.style.boxShadow = 'inset 0 0 120px rgba(255,30,30,0.7)'
    setTimeout(() => { damageVignette.style.boxShadow = 'inset 0 0 120px rgba(255,30,30,0)' }, 100)
  }
  function addKill(text, headshot) {
    const msg = document.createElement('div')
    msg.className = 'kill-msg' + (headshot ? ' headshot' : '')
    msg.textContent = text
    killFeed.appendChild(msg)
    setTimeout(() => { msg.style.opacity = '0'; msg.style.transition = 'opacity 0.4s' }, 2500)
    setTimeout(() => msg.remove(), 3000)
    while (killFeed.children.length > 5) killFeed.firstChild.remove()
  }
  function showGameOver(score, wave) {
    finalScore.textContent = `Score: ${score}`
    finalWave.textContent = `Reached Wave ${wave}`
    gameOverScreen.classList.remove('hidden')
  }
  function showStart() { startScreen.classList.remove('hidden') }
  function hideStart() { startScreen.classList.add('hidden') }
  function showPause() { pauseScreen.classList.remove('hidden') }
  function hidePause() { pauseScreen.classList.add('hidden') }
  function hideGameOver() { gameOverScreen.classList.add('hidden') }

  function showWeaponName(name) { weaponHud.textContent = name }

  function updateLoadout(weapons, maps, weaponIdx, mapIdx) {
    const w = weapons[weaponIdx], m = maps[mapIdx]
    weaponNameSel.textContent = w.name
    mapNameSel.textContent = m.name
    const rpm = Math.round(60000 / w.fireRate)
    const dmg = w.pellets > 1 ? `${w.damage}×${w.pellets}` : w.damage
    weaponStats.textContent = `DMG ${dmg} · RPM ${rpm} · MAG ${w.magSize}`
  }

  function update(dt) {
    if (hitTimer > 0) { hitTimer -= dt; if (hitTimer <= 0) hitMarker.style.opacity = '0' }
    if (announceTimer > 0) { announceTimer -= dt; if (announceTimer <= 0) waveAnnounce.style.opacity = '0' }
  }

  return {
    show, hide, updateHealth, updateScore, updateWave, updateAmmo, setReloading,
    showHitMarker, showDamage, addKill, showGameOver,
    showStart, hideStart, showPause, hidePause, hideGameOver,
    showWeaponName, updateLoadout, update,
  }
}
