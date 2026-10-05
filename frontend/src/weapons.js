export const WEAPONS = [
  {
    id: 'rifle', name: 'ASSAULT RIFLE',
    damage: 34, fireRate: 100, magSize: 30, reloadTime: 1.5,
    spread: 0.008, pellets: 1, headshotMult: 2, auto: true,
    view: 'rifle',
  },
  {
    id: 'smg', name: 'SMG',
    damage: 20, fireRate: 55, magSize: 40, reloadTime: 1.3,
    spread: 0.025, pellets: 1, headshotMult: 2, auto: true,
    view: 'smg',
  },
  {
    id: 'shotgun', name: 'SHOTGUN',
    damage: 14, fireRate: 700, magSize: 8, reloadTime: 2.0,
    spread: 0.07, pellets: 8, headshotMult: 1.5, auto: false,
    view: 'shotgun',
  },
  {
    id: 'pistol', name: 'PISTOL',
    damage: 40, fireRate: 180, magSize: 12, reloadTime: 1.0,
    spread: 0.003, pellets: 1, headshotMult: 2.5, auto: false,
    view: 'pistol',
  },
]
