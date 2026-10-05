import * as THREE from 'three'

function gridTexture(floorColor, gridColor) {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const ctx = c.getContext('2d')
  ctx.fillStyle = floorColor
  ctx.fillRect(0, 0, 512, 512)
  ctx.strokeStyle = gridColor
  ctx.lineWidth = 2
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(10, 10)
  return tex
}

export const MAPS = [
  {
    id: 'industrial', name: 'INDUSTRIAL',
    bgColor: 0x12121f, fogColor: 0x12121f, fogNear: 35, fogFar: 90,
    floorColor: '#2a2a3e', gridColor: '#383855',
    wallColor: 0x2a2a40, accentColor: 0xff6b35, accentEmissive: true,
    lightColor: 0xffeedd, lightIntensity: 1.2,
    hemiSky: 0x4a6a9a, hemiGround: 0x1a1a22,
    accentLights: [{ c: 0xff6b35, p: [-20, 5, -20] }, { c: 0x3366ff, p: [20, 5, 20] }],
    covers: [
      { x: -18, z: -18, w: 2.5, h: 2, d: 2.5 }, { x: 18, z: -18, w: 2.5, h: 2, d: 2.5 },
      { x: -18, z: 18, w: 2.5, h: 2, d: 2.5 }, { x: 18, z: 18, w: 2.5, h: 2, d: 2.5 },
      { x: 0, z: -22, w: 7, h: 2, d: 1.2 }, { x: 0, z: 22, w: 7, h: 2, d: 1.2 },
      { x: -22, z: 0, w: 1.2, h: 2, d: 7 }, { x: 22, z: 0, w: 1.2, h: 2, d: 7 },
      { x: -10, z: 10, w: 2, h: 3.5, d: 2 }, { x: 10, z: -10, w: 2, h: 3.5, d: 2 },
      { x: 0, z: 0, w: 5, h: 1, d: 5 },
      { x: -6, z: -12, w: 1.5, h: 1.5, d: 1.5 }, { x: 12, z: 6, w: 1.5, h: 1.5, d: 1.5 },
      { x: -12, z: 6, w: 1.5, h: 1.5, d: 1.5 }, { x: 6, z: -16, w: 1.5, h: 1.5, d: 1.5 },
      { x: 16, z: 14, w: 1.5, h: 1.5, d: 1.5 }, { x: -16, z: -6, w: 1.5, h: 1.5, d: 1.5 },
    ],
    spawns: [[-30,-30],[30,-30],[-30,30],[30,30],[0,-35],[0,35],[-35,0],[35,0]],
  },
  {
    id: 'desert', name: 'DESERT',
    bgColor: 0x4a3a28, fogColor: 0x6a5a38, fogNear: 40, fogFar: 100,
    floorColor: '#7a6a48', gridColor: '#8a7a58',
    wallColor: 0x7a5a40, accentColor: 0xffaa44, accentEmissive: false,
    lightColor: 0xffeecc, lightIntensity: 1.5,
    hemiSky: 0x9a8a6a, hemiGround: 0x4a3a2a,
    accentLights: [{ c: 0xffaa44, p: [-20, 8, -20] }, { c: 0xffaa44, p: [20, 8, 20] }],
    covers: [
      { x: -15, z: -15, w: 3, h: 2.5, d: 3 }, { x: 15, z: 15, w: 3, h: 2.5, d: 3 },
      { x: 15, z: -15, w: 3, h: 2.5, d: 3 }, { x: -15, z: 15, w: 3, h: 2.5, d: 3 },
      { x: 0, z: -25, w: 10, h: 3, d: 1.5 }, { x: 0, z: 25, w: 10, h: 3, d: 1.5 },
      { x: -25, z: 0, w: 1.5, h: 3, d: 10 }, { x: 25, z: 0, w: 1.5, h: 3, d: 10 },
      { x: -10, z: 5, w: 2, h: 4, d: 2 }, { x: 10, z: -5, w: 2, h: 4, d: 2 },
      { x: 0, z: 0, w: 6, h: 1.5, d: 6 },
      { x: -20, z: 10, w: 2, h: 2, d: 2 }, { x: 20, z: -10, w: 2, h: 2, d: 2 },
      { x: -5, z: -20, w: 1.5, h: 1.5, d: 1.5 }, { x: 5, z: 20, w: 1.5, h: 1.5, d: 1.5 },
      { x: 18, z: 18, w: 1.5, h: 1.5, d: 1.5 }, { x: -18, z: -18, w: 1.5, h: 1.5, d: 1.5 },
    ],
    spawns: [[-32,-32],[32,-32],[-32,32],[32,32],[0,-35],[0,35],[-35,0],[35,0]],
  },
  {
    id: 'neon', name: 'NEON GRID',
    bgColor: 0x0a0a1a, fogColor: 0x0a0a2a, fogNear: 30, fogFar: 75,
    floorColor: '#0a0a1a', gridColor: '#00ffff',
    wallColor: 0x111122, accentColor: 0x00ffff, accentEmissive: true,
    lightColor: 0xaaaaff, lightIntensity: 0.8,
    hemiSky: 0x3344aa, hemiGround: 0x0a0a22,
    accentLights: [
      { c: 0x00ffff, p: [-20, 4, -20] }, { c: 0xff00ff, p: [20, 4, 20] },
      { c: 0x00ffff, p: [20, 4, -20] }, { c: 0xff00ff, p: [-20, 4, 20] },
    ],
    covers: [
      { x: -12, z: -12, w: 2, h: 3, d: 2, e: 1 }, { x: 12, z: 12, w: 2, h: 3, d: 2, e: 1 },
      { x: -12, z: 12, w: 2, h: 3, d: 2, e: 1 }, { x: 12, z: -12, w: 2, h: 3, d: 2, e: 1 },
      { x: 0, z: -20, w: 5, h: 2.5, d: 1, e: 1 }, { x: 0, z: 20, w: 5, h: 2.5, d: 1, e: 1 },
      { x: -20, z: 0, w: 1, h: 2.5, d: 5, e: 1 }, { x: 20, z: 0, w: 1, h: 2.5, d: 5, e: 1 },
      { x: 0, z: 0, w: 4, h: 1, d: 4 },
      { x: -8, z: 0, w: 1.5, h: 1.5, d: 1.5 }, { x: 8, z: 0, w: 1.5, h: 1.5, d: 1.5 },
      { x: 0, z: -8, w: 1.5, h: 1.5, d: 1.5 }, { x: 0, z: 8, w: 1.5, h: 1.5, d: 1.5 },
      { x: -16, z: 16, w: 2, h: 2, d: 2 }, { x: 16, z: -16, w: 2, h: 2, d: 2 },
      { x: -16, z: -16, w: 2, h: 2, d: 2 }, { x: 16, z: 16, w: 2, h: 2, d: 2 },
    ],
    spawns: [[-30,-30],[30,-30],[-30,30],[30,30],[0,-35],[0,35],[-35,0],[35,0]],
  },
]

export function buildMap(scene, def) {
  const objs = []
  const SIZE = 80, HALF = SIZE / 2

  scene.background = new THREE.Color(def.bgColor)
  scene.fog = new THREE.Fog(def.fogColor, def.fogNear, def.fogFar)

  const ambient = new THREE.AmbientLight(0x404060, 0.4)
  scene.add(ambient); objs.push(ambient)
  const hemi = new THREE.HemisphereLight(def.hemiSky, def.hemiGround, 0.5)
  scene.add(hemi); objs.push(hemi)
  const dir = new THREE.DirectionalLight(def.lightColor, def.lightIntensity)
  dir.position.set(25, 50, 15); dir.castShadow = true
  dir.shadow.mapSize.set(2048, 2048)
  dir.shadow.camera.near = 1; dir.shadow.camera.far = 120
  dir.shadow.camera.left = -50; dir.shadow.camera.right = 50
  dir.shadow.camera.top = 50; dir.shadow.camera.bottom = -50
  dir.shadow.bias = -0.0005
  scene.add(dir); objs.push(dir)
  for (const al of def.accentLights) {
    const l = new THREE.PointLight(al.c, 0.7, 30, 2)
    l.position.set(al.p[0], al.p[1], al.p[2])
    scene.add(l); objs.push(l)
  }

  const floorTex = gridTexture(def.floorColor, def.gridColor)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE, SIZE),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0.1 })
  )
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.userData.solid = true
  scene.add(floor); objs.push(floor)

  const colliders = []
  const colliderMeshes = [floor]
  const wallH = 6, wallT = 1
  const wallMat = new THREE.MeshStandardMaterial({ color: def.wallColor, metalness: 0.3, roughness: 0.7 })

  for (const [x, z, w, d] of [[0,-HALF,SIZE,wallT],[0,HALF,SIZE,wallT],[-HALF,0,wallT,SIZE],[HALF,0,wallT,SIZE]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat)
    wall.position.set(x, wallH/2, z); wall.castShadow = true; wall.receiveShadow = true
    wall.userData.solid = true
    scene.add(wall); objs.push(wall); colliderMeshes.push(wall)
    colliders.push({ min: new THREE.Vector3(x-w/2, 0, z-d/2), max: new THREE.Vector3(x+w/2, wallH, z+d/2) })
  }

  if (def.accentEmissive) {
    const sm = new THREE.MeshStandardMaterial({ color: def.accentColor, emissive: def.accentColor, emissiveIntensity: 0.5 })
    for (const [x, z, w, d] of [[0,-HALF+0.1,SIZE-2,0.05],[0,HALF-0.1,SIZE-2,0.05],[-HALF+0.1,0,0.05,SIZE-2],[HALF-0.1,0,0.05,SIZE-2]]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d), sm)
      s.position.set(x, 5.5, z); scene.add(s); objs.push(s)
    }
  }

  for (const c of def.covers) {
    const mat = new THREE.MeshStandardMaterial({
      color: def.wallColor, metalness: c.e ? 0.1 : 0.4, roughness: c.e ? 0.3 : 0.6,
      emissive: c.e ? def.accentColor : 0x000000, emissiveIntensity: c.e ? 0.25 : 0,
    })
    const box = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), mat)
    box.position.set(c.x, c.h/2, c.z); box.castShadow = true; box.receiveShadow = true
    box.userData.solid = true
    scene.add(box); objs.push(box); colliderMeshes.push(box)
    colliders.push({ min: new THREE.Vector3(c.x-c.w/2, 0, c.z-c.d/2), max: new THREE.Vector3(c.x+c.w/2, c.h, c.z+c.d/2) })
  }

  const spawnPoints = def.spawns.map(([x, z]) => new THREE.Vector3(x, 0, z))

  function dispose() {
    for (const o of objs) {
      scene.remove(o)
      if (o.geometry) o.geometry.dispose()
      if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose() }
    }
    objs.length = 0
  }

  return { colliders, colliderMeshes, spawnPoints, dispose }
}
