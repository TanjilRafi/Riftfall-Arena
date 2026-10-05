import * as THREE from 'three'

function buildViewModel(type) {
  const vm = new THREE.Group()
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a38, metalness: 0.8, roughness: 0.3 })
  const accent = new THREE.MeshStandardMaterial({ color: 0xff6b35, metalness: 0.6, roughness: 0.4 })
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x181820, roughness: 0.9 })

  if (type === 'rifle') {
    vm.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.42), dark))
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.28, 8), dark)
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, -0.36); vm.add(barrel)
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.08), accent)
    sight.position.set(0, 0.09, -0.05); vm.add(sight)
  } else if (type === 'smg') {
    vm.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.3), dark))
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 8), dark)
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.28); vm.add(barrel)
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), gripMat)
    mag.position.set(0, -0.1, -0.05); vm.add(mag)
  } else if (type === 'shotgun') {
    vm.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.5), dark))
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 8), dark)
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, -0.42); vm.add(barrel)
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.12), gripMat)
    pump.position.set(0, -0.04, -0.2); vm.add(pump)
  } else {
    vm.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.22), dark))
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8), dark)
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.18); vm.add(barrel)
  }
  const g = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, 0.08), gripMat)
  g.position.set(0, -0.11, 0.05); vm.add(g)

  const muzzleZ = { rifle: -0.52, smg: -0.4, shotgun: -0.6, pistol: -0.26 }[type]
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false })
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), flashMat)
  flash.position.set(0, 0.03, muzzleZ); vm.add(flash)
  const muzzleLight = new THREE.PointLight(0xffaa33, 0, 10)
  muzzleLight.position.copy(flash.position); vm.add(muzzleLight)

  return { vm, flash, flashMat, muzzleLight }
}

export function createWeapon(camera, scene, player, def, audio, particles) {
  const raycaster = new THREE.Raycaster()
  const ammo = { current: def.magSize, reserve: Infinity }
  let lastShot = 0, reloading = false, reloadTimer = 0, vmRecoil = 0, swayTime = 0, triggerHeld = false
  const tracers = []

  const { vm, flash, flashMat, muzzleLight } = buildViewModel(def.view)
  vm.position.set(0.28, -0.26, -0.55)
  camera.add(vm)

  function tryShoot(mouseDown) {
    if (!mouseDown) { triggerHeld = false; return null }
    if (reloading) return null
    if (!def.auto && triggerHeld) return null
    const now = performance.now()
    if (now - lastShot < def.fireRate) return null
    if (ammo.current <= 0) { audio.playEmpty(); startReload(); return null }
    triggerHeld = true; lastShot = now; ammo.current--
    audio.playShot(def.id)

    let hit = false, headshot = false, killed = false, hitPoint = null

    for (let p = 0; p < def.pellets; p++) {
      const sx = (Math.random() - 0.5) * def.spread
      const sy = (Math.random() - 0.5) * def.spread
      raycaster.setFromCamera({ x: sx, y: sy }, camera)
      raycaster.far = 200
      const hits = raycaster.intersectObjects(scene.children, true)
      for (const h of hits) {
        let obj = h.object, enemy = null, isHead = false
        while (obj) {
          if (obj.userData.enemy) { enemy = obj.userData.enemy; isHead = !!obj.userData.isHead; break }
          obj = obj.parent
        }
        if (enemy) {
          const dmg = isHead ? def.damage * def.headshotMult : def.damage
          enemy.takeDamage(dmg)
          if (enemy.dead) killed = true
          hit = true; if (isHead) headshot = true
          hitPoint = h.point
          particles.spawnHit(h.point, isHead)
          break
        }
        if (h.object.userData.solid) { if (!hitPoint) hitPoint = h.point; break }
      }
    }

    if (!hitPoint) {
      const dir = new THREE.Vector3(); camera.getWorldDirection(dir)
      hitPoint = camera.position.clone().add(dir.multiplyScalar(100))
    }

    flashMat.opacity = 1; flash.rotation.z = Math.random() * Math.PI
    flash.scale.setScalar(0.7 + Math.random() * 0.6)
    muzzleLight.intensity = 4; vmRecoil = 0.06
    player.addRecoil(0.018)

    const muzzlePos = new THREE.Vector3(); flash.getWorldPosition(muzzlePos)
    particles.spawnMuzzle(muzzlePos)

    const tg = new THREE.BufferGeometry().setFromPoints([muzzlePos, hitPoint])
    const tm = new THREE.LineBasicMaterial({ color: 0xffee55, transparent: true, opacity: 0.7 })
    const tracer = new THREE.Line(tg, tm); tracer.userData.tracer = true
    scene.add(tracer); tracers.push({ line: tracer, life: 0.08 })

    return { hit, headshot, killed, point: hitPoint }
  }

  function startReload() {
    if (reloading || ammo.current >= def.magSize) return
    reloading = true; reloadTimer = def.reloadTime; audio.playReload()
  }

  function update(dt) {
    if (reloading) { reloadTimer -= dt; if (reloadTimer <= 0) { ammo.current = def.magSize; reloading = false } }
    flashMat.opacity *= Math.exp(-dt * 25)
    muzzleLight.intensity *= Math.exp(-dt * 25)
    vmRecoil *= Math.exp(-dt * 18)
    swayTime += dt
    vm.position.set(0.28 + Math.sin(swayTime * 1.5) * 0.005, -0.26, -0.55 + vmRecoil)
    vm.rotation.x = vmRecoil * 2
    for (let i = tracers.length - 1; i >= 0; i--) {
      const t = tracers[i]; t.life -= dt
      t.line.material.opacity = Math.max(0, t.life / 0.08) * 0.7
      if (t.life <= 0) { scene.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose(); tracers.splice(i, 1) }
    }
  }

  function reset() {
    ammo.current = def.magSize; reloading = false; reloadTimer = 0; vmRecoil = 0; triggerHeld = false
    for (const t of tracers) { scene.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose() }
    tracers.length = 0
  }

  function dispose() {
    camera.remove(vm)
    vm.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose() })
    for (const t of tracers) { scene.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose() }
    tracers.length = 0
  }

  return { tryShoot, startReload, update, reset, dispose, get ammo() { return ammo }, get isReloading() { return reloading } }
}
