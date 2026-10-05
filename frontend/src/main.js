import * as THREE from 'three'
import { MAPS } from './maps.js'
import { WEAPONS } from './weapons.js'
import { createPlayer } from './player.js'
import { createHUD } from './hud.js'
import { createGame } from './game.js'
import { createAudio } from './audio.js'
import { createParticleSystem } from './particles.js'

// Scene
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.set(0, 1.7, 0)

// Renderer
const canvas = document.getElementById('canvas')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1

// Systems
const audio = createAudio()
const particles = createParticleSystem(scene)
const hud = createHUD()
const player = createPlayer(camera, [])
const game = createGame({ scene, camera, player, hud, weapons: WEAPONS, maps: MAPS, audio, particles })

// Loadout selection
let selectedWeapon = 0, selectedMap = 0
function refreshLoadout() { hud.updateLoadout(WEAPONS, MAPS, selectedWeapon, selectedMap) }
refreshLoadout()

document.getElementById('weapon-prev').addEventListener('click', () => { selectedWeapon = (selectedWeapon - 1 + WEAPONS.length) % WEAPONS.length; refreshLoadout() })
document.getElementById('weapon-next').addEventListener('click', () => { selectedWeapon = (selectedWeapon + 1) % WEAPONS.length; refreshLoadout() })
document.getElementById('map-prev').addEventListener('click', () => { selectedMap = (selectedMap - 1 + MAPS.length) % MAPS.length; refreshLoadout() })
document.getElementById('map-next').addEventListener('click', () => { selectedMap = (selectedMap + 1) % MAPS.length; refreshLoadout() })

// Input
const keys = {}
window.addEventListener('keydown', (e) => { keys[e.code] = true })
window.addEventListener('keyup', (e) => { keys[e.code] = false })

let mouseDown = false
document.addEventListener('mousedown', (e) => {
  if (e.button === 0 && document.pointerLockElement === canvas && game.state === 'playing') mouseDown = true
})
document.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false })

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas && game.state === 'playing') player.onMouseMove(e.movementX, e.movementY)
})

// Screen transitions
document.getElementById('play-btn').addEventListener('click', () => {
  audio.init()
  game.start(selectedWeapon, selectedMap)
  canvas.requestPointerLock()
})
document.getElementById('restart-btn').addEventListener('click', () => {
  game.start(selectedWeapon, selectedMap)
  canvas.requestPointerLock()
})
document.getElementById('resume-btn').addEventListener('click', () => { canvas.requestPointerLock() })
document.getElementById('quit-btn').addEventListener('click', () => { game.quitToMenu() })

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    if (game.state === 'paused') game.resume()
  } else {
    if (game.state === 'playing') game.pause()
  }
})

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Loop
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  game.update(dt, keys, mouseDown)
  renderer.render(scene, camera)
}
animate()
