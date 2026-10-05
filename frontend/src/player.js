import * as THREE from 'three'

const EYE_HEIGHT = 1.7
const RADIUS = 0.4
const WALK_SPEED = 6
const SPRINT_SPEED = 9.5
const ACCEL = 60
const FRICTION = 12
const JUMP_FORCE = 7.5
const GRAVITY = 22
const BOUND = 38

export function createPlayer(camera, initialColliders) {
  let colliders = initialColliders
  const position = new THREE.Vector3(0, EYE_HEIGHT, 0)
  const velocity = new THREE.Vector3(0, 0, 0)
  let yaw = 0
  let pitch = 0
  let onGround = true
  let health = 100
  const maxHealth = 100
  let recoilPitch = 0
  let bobTime = 0

  function setColliders(c) { colliders = c }

  function onMouseMove(dx, dy) {
    yaw -= dx * 0.0022
    pitch -= dy * 0.0022
    pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch))
  }

  function update(dt, keys) {
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))

    const moveDir = new THREE.Vector3()
    if (keys['KeyW']) moveDir.add(forward)
    if (keys['KeyS']) moveDir.sub(forward)
    if (keys['KeyD']) moveDir.add(right)
    if (keys['KeyA']) moveDir.sub(right)

    const moving = moveDir.lengthSq() > 0
    const sprinting = keys['ShiftLeft'] && moving
    const maxSpeed = sprinting ? SPRINT_SPEED : WALK_SPEED

    if (moving) {
      moveDir.normalize()
      velocity.x += moveDir.x * ACCEL * dt
      velocity.z += moveDir.z * ACCEL * dt
      const s = Math.hypot(velocity.x, velocity.z)
      if (s > maxSpeed) {
        velocity.x = (velocity.x / s) * maxSpeed
        velocity.z = (velocity.z / s) * maxSpeed
      }
    } else {
      const s = Math.hypot(velocity.x, velocity.z)
      if (s > 0) {
        const decel = FRICTION * dt
        if (s <= decel) { velocity.x = 0; velocity.z = 0 }
        else { velocity.x -= (velocity.x / s) * decel; velocity.z -= (velocity.z / s) * decel }
      }
    }

    if (keys['Space'] && onGround) { velocity.y = JUMP_FORCE; onGround = false }
    velocity.y -= GRAVITY * dt

    position.x += velocity.x * dt
    position.z += velocity.z * dt
    position.y += velocity.y * dt

    if (position.y <= EYE_HEIGHT) { position.y = EYE_HEIGHT; velocity.y = 0; onGround = true }

    for (const c of colliders) {
      if (c.max.y < 0.5) continue
      const minX = c.min.x - RADIUS, maxX = c.max.x + RADIUS
      const minZ = c.min.z - RADIUS, maxZ = c.max.z + RADIUS
      if (position.x > minX && position.x < maxX && position.z > minZ && position.z < maxZ) {
        const dL = position.x - minX, dR = maxX - position.x
        const dN = position.z - minZ, dF = maxZ - position.z
        const m = Math.min(dL, dR, dN, dF)
        if (m === dL) { position.x = minX; velocity.x = 0 }
        else if (m === dR) { position.x = maxX; velocity.x = 0 }
        else if (m === dN) { position.z = minZ; velocity.z = 0 }
        else { position.z = maxZ; velocity.z = 0 }
      }
    }

    position.x = Math.max(-BOUND, Math.min(BOUND, position.x))
    position.z = Math.max(-BOUND, Math.min(BOUND, position.z))

    const s = Math.hypot(velocity.x, velocity.z)
    if (s > 0.5 && onGround) bobTime += dt * s * 1.4
    const bobY = onGround ? Math.abs(Math.sin(bobTime)) * 0.04 * Math.min(s / WALK_SPEED, 1) : 0
    recoilPitch *= Math.exp(-dt * 9)

    camera.position.copy(position)
    camera.position.y += bobY
    camera.rotation.set(pitch + recoilPitch, yaw, 0, 'YXZ')
  }

  function addRecoil(amount) { recoilPitch += amount }
  function takeDamage(amount) { health = Math.max(0, health - amount) }

  function reset() {
    position.set(0, EYE_HEIGHT, 0); velocity.set(0, 0, 0)
    yaw = 0; pitch = 0; health = maxHealth; onGround = true; recoilPitch = 0
  }

  return {
    update, onMouseMove, addRecoil, takeDamage, reset, setColliders,
    get health() { return health },
    get maxHealth() { return maxHealth },
    get position() { return position },
    get alive() { return health > 0 },
  }
}
