import * as THREE from 'three'

function createGridTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#2a2a3e'
  ctx.fillRect(0, 0, 512, 512)
  ctx.strokeStyle = '#383855'
  ctx.lineWidth = 2
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke()
  }
  // Accent dots at intersections
  ctx.fillStyle = '#ff6b3544'
  for (let x = 0; x <= 512; x += 64) {
    for (let y = 0; y <= 512; y += 64) {
      ctx.fillRect(x - 2, y - 2, 4, 4)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(10, 10)
  return tex
}

function addBox(scene, colliders, colliderMeshes, x, y, z, w, h, d, color, metalness = 0.3, roughness = 0.7) {
  const geo = new THREE.BoxGeometry(w, h, d)
  const mat = new THREE.MeshStandardMaterial({ color, metalness, roughness })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.solid = true
  scene.add(mesh)
  colliderMeshes.push(mesh)
  colliders.push({
    min: new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
    max: new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2),
  })
  return mesh
}

export function createArena(scene) {
  const colliders = []
  const colliderMeshes = []
  const SIZE = 80
  const HALF = SIZE / 2

  // Floor
  const floorGeo = new THREE.PlaneGeometry(SIZE, SIZE)
  const floorMat = new THREE.MeshStandardMaterial({ map: createGridTexture(), roughness: 0.85, metalness: 0.1 })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  floor.userData.solid = true
  scene.add(floor)
  colliderMeshes.push(floor)

  // Perimeter walls
  const wallH = 6
  const wallT = 1
  const wallColor = 0x2a2a40
  addBox(scene, colliders, colliderMeshes, 0, wallH / 2, -HALF, SIZE, wallH, wallT, wallColor)
  addBox(scene, colliders, colliderMeshes, 0, wallH / 2, HALF, SIZE, wallH, wallT, wallColor)
  addBox(scene, colliders, colliderMeshes, -HALF, wallH / 2, 0, wallT, wallH, SIZE, wallColor)
  addBox(scene, colliders, colliderMeshes, HALF, wallH / 2, 0, wallT, wallH, SIZE, wallColor)

  // Accent stripes on walls (emissive)
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xff6b35, emissive: 0xff6b35, emissiveIntensity: 0.6 })
  for (const [x, y, z, w, d] of [
    [0, 5.5, -HALF + 0.1, SIZE - 2, 0.05],
    [0, 5.5, HALF - 0.1, SIZE - 2, 0.05],
    [-HALF + 0.1, 5.5, 0, 0.05, SIZE - 2],
    [HALF - 0.1, 5.5, 0, 0.05, SIZE - 2],
  ]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d), stripeMat)
    s.position.set(x, y, z)
    scene.add(s)
  }

  // Cover crates
  const crateColor = 0x3a3a55
  const tallColor = 0x444466
  // Corner crates
  for (const [x, z] of [[-18, -18], [18, -18], [-18, 18], [18, 18]]) {
    addBox(scene, colliders, colliderMeshes, x, 1, z, 2.5, 2, 2.5, crateColor, 0.4, 0.6)
  }
  // Mid low walls
  addBox(scene, colliders, colliderMeshes, 0, 1, -22, 7, 2, 1.2, crateColor)
  addBox(scene, colliders, colliderMeshes, 0, 1, 22, 7, 2, 1.2, crateColor)
  addBox(scene, colliders, colliderMeshes, -22, 1, 0, 1.2, 2, 7, crateColor)
  addBox(scene, colliders, colliderMeshes, 22, 1, 0, 1.2, 2, 7, crateColor)
  // Tall pillars
  addBox(scene, colliders, colliderMeshes, -10, 1.75, 10, 2, 3.5, 2, tallColor, 0.5, 0.5)
  addBox(scene, colliders, colliderMeshes, 10, 1.75, -10, 2, 3.5, 2, tallColor, 0.5, 0.5)
  // Central low platform
  addBox(scene, colliders, colliderMeshes, 0, 0.5, 0, 5, 1, 5, 0x333348, 0.2, 0.8)
  // Scattered small crates
  for (const [x, z] of [[-6, -12], [12, 6], [-12, 6], [6, -16], [16, 14], [-16, -6]]) {
    addBox(scene, colliders, colliderMeshes, x, 0.75, z, 1.5, 1.5, 1.5, crateColor, 0.4, 0.6)
  }

  // Spawn points (arena edges)
  const spawnPoints = [
    new THREE.Vector3(-30, 0, -30), new THREE.Vector3(30, 0, -30),
    new THREE.Vector3(-30, 0, 30), new THREE.Vector3(30, 0, 30),
    new THREE.Vector3(0, 0, -35), new THREE.Vector3(0, 0, 35),
    new THREE.Vector3(-35, 0, 0), new THREE.Vector3(35, 0, 0),
  ]

  return { colliders, colliderMeshes, spawnPoints }
}
