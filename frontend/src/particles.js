import * as THREE from 'three'

export function createParticleSystem(scene) {
  const particles = []

  function spawn(pos, count, color, speed, life, size, gravity = 15) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 4, 4), mat)
      mesh.position.copy(pos)
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.5 + speed * 0.3,
        (Math.random() - 0.5) * speed,
      )
      particles.push({ mesh, vel, life, maxLife: life, gravity })
      scene.add(mesh)
    }
  }

  function spawnHit(pos, headshot) {
    spawn(pos, headshot ? 16 : 8, headshot ? 0xffaa00 : 0xff4444, 5, 0.4, 0.04)
  }

  function spawnDeath(pos) {
    spawn(pos, 25, 0xcc3333, 8, 0.6, 0.06)
    spawn(pos, 10, 0xff6600, 6, 0.5, 0.04)
  }

  function spawnMuzzle(pos) {
    spawn(pos, 4, 0xffcc44, 2, 0.2, 0.03, 2)
  }

  function update(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.life -= dt
      if (p.life <= 0) {
        scene.remove(p.mesh)
        p.mesh.geometry.dispose()
        p.mesh.material.dispose()
        particles.splice(i, 1)
        continue
      }
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt))
      p.vel.y -= p.gravity * dt
      p.vel.multiplyScalar(0.96)
      p.mesh.material.opacity = p.life / p.maxLife
      p.mesh.scale.setScalar(Math.max(0.01, p.life / p.maxLife))
    }
  }

  return { spawnHit, spawnDeath, spawnMuzzle, update }
}
