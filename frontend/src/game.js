import { Enemy } from './enemy.js'
import { buildMap } from './maps.js'
import { createWeapon } from './weapon.js'

const WAVE_DELAY = 3

export function createGame({ scene, camera, player, hud, weapons, maps, audio, particles }) {
  let state = 'menu'
  let score = 0, wave = 0
  let enemies = []
  let enemiesToSpawn = 0, spawnTimer = 0
  let betweenWaves = false, waveTimer = 0
  let currentMap = null, currentWeapon = null
  let colliderMeshes = [], spawnPoints = []

  function start(weaponIdx, mapIdx) {
    if (currentMap) currentMap.dispose()
    if (currentWeapon) currentWeapon.dispose()
    for (const e of enemies) e.destroy()
    enemies = []

    currentMap = buildMap(scene, maps[mapIdx])
    player.setColliders(currentMap.colliders)
    colliderMeshes = currentMap.colliderMeshes
    spawnPoints = currentMap.spawnPoints

    currentWeapon = createWeapon(camera, scene, player, weapons[weaponIdx], audio, particles)
    hud.showWeaponName(weapons[weaponIdx].name)

    state = 'playing'
    score = 0; wave = 0; betweenWaves = false
    player.reset(); currentWeapon.reset()
    hud.hideStart(); hud.hideGameOver(); hud.hidePause(); hud.show()
    hud.updateHealth(player.health, player.maxHealth)
    hud.updateScore(score)
    startWave()
  }

  function startWave() {
    wave++; enemiesToSpawn = 3 + wave * 2; spawnTimer = 0.5; betweenWaves = false
    hud.updateWave(wave); audio.playWaveStart()
  }

  function spawnEnemy() {
    const pos = spawnPoints[Math.floor(Math.random() * spawnPoints.length)].clone()
    pos.y = 0
    const enemy = new Enemy(scene, pos, wave)
    enemy.onAttack = (dmg) => {
      player.takeDamage(dmg); audio.playDamage()
      hud.showDamage(); hud.updateHealth(player.health, player.maxHealth)
    }
    enemies.push(enemy); enemiesToSpawn--
  }

  function update(dt, keys, mouseDown) {
    hud.update(dt)
    particles.update(dt)
    if (state !== 'playing') return

    player.update(dt, keys)

    const r = currentWeapon.tryShoot(mouseDown)
    if (r) {
      if (r.hit) {
        audio.playHit(); hud.showHitMarker(r.headshot)
        if (r.killed) {
          audio.playKill()
          score += r.headshot ? 150 : 100
          hud.updateScore(score)
          hud.addKill(r.headshot ? 'HEADSHOT ELIMINATION' : 'ELIMINATED', r.headshot)
        }
      }
      hud.updateAmmo(currentWeapon.ammo.current, currentWeapon.ammo.reserve)
    }

    if (keys['KeyR']) currentWeapon.startReload()
    hud.setReloading(currentWeapon.isReloading)
    if (!currentWeapon.isReloading) hud.updateAmmo(currentWeapon.ammo.current, currentWeapon.ammo.reserve)
    currentWeapon.update(dt)

    const playerPos = player.position
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]
      e.update(dt, playerPos, colliderMeshes)
      if (e.dead && e.deathComplete) {
        particles.spawnDeath(e.group.position.clone().setY(1))
        e.destroy(); enemies.splice(i, 1)
      }
    }

    if (enemiesToSpawn > 0) {
      spawnTimer -= dt
      if (spawnTimer <= 0) { spawnEnemy(); spawnTimer = 0.4 + Math.random() * 0.5 }
    }

    if (enemiesToSpawn === 0 && enemies.length === 0 && !betweenWaves) {
      betweenWaves = true; waveTimer = WAVE_DELAY
    }
    if (betweenWaves) { waveTimer -= dt; if (waveTimer <= 0) startWave() }

    if (!player.alive) {
      state = 'gameover'
      for (const e of enemies) e.destroy()
      enemies = []
      hud.hide(); hud.showGameOver(score, wave)
      document.exitPointerLock()
    }
  }

  function pause() { if (state === 'playing') { state = 'paused'; hud.showPause() } }
  function resume() { if (state === 'paused') { state = 'playing'; hud.hidePause() } }

  function quitToMenu() {
    state = 'menu'
    if (currentMap) { currentMap.dispose(); currentMap = null }
    if (currentWeapon) { currentWeapon.dispose(); currentWeapon = null }
    for (const e of enemies) e.destroy()
    enemies = []
    hud.hide(); hud.hidePause(); hud.showStart()
  }

  return { start, update, pause, resume, quitToMenu, get state() { return state } }
}
