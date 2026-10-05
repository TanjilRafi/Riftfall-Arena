import * as THREE from 'three'

function makeHealthBar() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 12
  const ctx = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(1.4, 0.14, 1)
  sprite.position.set(0, 2.25, 0)
  sprite.renderOrder = 999
  return { sprite, canvas, ctx, texture }
}

function drawBar(bar, pct) {
  const { canvas, ctx, texture } = bar
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const w = (canvas.width - 4) * Math.max(0, pct)
  ctx.fillStyle = pct > 0.5 ? '#00ff66' : pct > 0.25 ? '#ffaa00' : '#ff3333'
  ctx.fillRect(2, 2, w, canvas.height - 4)
  texture.needsUpdate = true
}

export class Enemy {
  constructor(scene, position, wave) {
    this.scene = scene
    this.position = position.clone()
    this.position.y = 0
    this.wave = wave
    this.health = 100
    this.maxHealth = 100
    this.speed = 2.8 + wave * 0.25
    this.rangedDamage = 4 + wave * 0.3
    this.meleeDamage = 9 + wave * 0.5
    this.attackRange = 20
    this.meleeRange = 3
    this.attackCooldown = 1 + Math.random()
    this.dead = false
    this.deathComplete = false
    this.deathTimer = 0
    this.flashTimer = 0
    this.onAttack = null

    this.group = new THREE.Group()

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcc3344, roughness: 0.5, metalness: 0.2, emissive: 0x000000 })
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 4, 10), bodyMat)
    body.position.y = 1.0
    body.castShadow = true
    body.userData.enemy = this
    this.group.add(body)
    this.body = body

    const headMat = new THREE.MeshStandardMaterial({ color: 0xff5566, roughness: 0.4, emissive: 0x000000 })
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), headMat)
    head.position.y = 1.7
    head.castShadow = true
    head.userData.enemy = this
    head.userData.isHead = true
    this.group.add(head)
    this.head = head

    // Glowing eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 })
    const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6)
    for (const x of [-0.1, 0.1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat)
      eye.position.set(x, 1.74, 0.22)
      head.add(eye)
    }

    this.bar = makeHealthBar()
    drawBar(this.bar, 1)
    this.group.add(this.bar.sprite)

    this.group.position.copy(this.position)
    scene.add(this.group)
  }

  hasLineOfSight(playerPos, colliderMeshes) {
    const from = this.group.position.clone().setY(1.2)
    const dir = playerPos.clone().sub(from)
    const dist = dir.length()
    dir.normalize()
    const rc = new THREE.Raycaster(from, dir, 0, dist)
    const hits = rc.intersectObjects(colliderMeshes, false)
    return hits.length === 0
  }

  update(dt, playerPos, colliderMeshes) {
    if (this.dead) {
      this.deathTimer += dt
      const t = Math.min(this.deathTimer / 0.5, 1)
      this.group.scale.setScalar(Math.max(0.01, 1 - t))
      this.group.position.y = -t * 0.8
      if (t >= 1) this.deathComplete = true
      return
    }

    // Flash on hit
    if (this.flashTimer > 0) {
      this.flashTimer -= dt
      this.body.material.emissive.setHex(0x661111)
      this.head.material.emissive.setHex(0x661111)
    } else {
      this.body.material.emissive.setHex(0x000000)
      this.head.material.emissive.setHex(0x000000)
    }

    const dir = playerPos.clone().sub(this.position)
    dir.y = 0
    const dist = dir.length()

    if (dist > this.meleeRange) {
      dir.normalize()
      this.position.x += dir.x * this.speed * dt
      this.position.z += dir.z * this.speed * dt
      const b = 38
      this.position.x = Math.max(-b, Math.min(b, this.position.x))
      this.position.z = Math.max(-b, Math.min(b, this.position.z))
    }

    // Attack
    this.attackCooldown -= dt
    if (this.attackCooldown <= 0 && dist < this.attackRange) {
      if (this.hasLineOfSight(playerPos, colliderMeshes)) {
        const melee = dist < this.meleeRange
        const dmg = melee ? this.meleeDamage : this.rangedDamage
        if (this.onAttack) this.onAttack(dmg)
        this.attackCooldown = melee ? 0.6 : 1.5
      } else {
        this.attackCooldown = 0.3
      }
    }

    this.group.position.copy(this.position)
    this.group.lookAt(playerPos.x, this.position.y, playerPos.z)
  }

  takeDamage(amount) {
    if (this.dead) return
    this.health -= amount
    this.flashTimer = 0.08
    drawBar(this.bar, this.health / this.maxHealth)
    if (this.health <= 0) {
      this.health = 0
      this.dead = true
      drawBar(this.bar, 0)
    }
  }

  destroy() {
    this.scene.remove(this.group)
    this.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose()
        obj.material.dispose()
      }
    })
  }
}
