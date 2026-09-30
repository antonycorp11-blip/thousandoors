import type { MetaState, RunState, Settings, SaveData, Axis } from './types';

export const SAVE_VERSION = 2;

export function defaultSettings(): Settings {
  return {
    master: 0.8, sfx: 0.9, music: 0.6, ambience: 0.7,
    textSize: 'normal', reduceMotion: false, reduceFlashes: false,
    highContrast: false, softScares: false, showHotspotsOnLongLook: true,
  };
}

export function emptyRoute(): Record<Axis, number> {
  return { memoria: 0, casa: 0, perdidos: 0, ruptura: 0, obediencia: 0 };
}

export function defaultMeta(): MetaState {
  const now = Date.now();
  return {
    version: SAVE_VERSION, createdAt: now, updatedAt: now, introDone: false,
    fragments: 0, fragmentsTotal: 0, upgrades: [], flags: {},
    rooms: {}, seenRooms: {}, doors: {}, keyring: {},
    lore: [], clues: [], symbols: [], rumors: [], journal: [],
    npcs: {}, collection: [], preserved: [], anchors: [], runs: [],
    runCount: 0, deaths: 0, achievements: [], puzzlesSolved: [],
    route: emptyRoute(),
    map: { layout: {}, roomMarks: {}, notes: {}, pins: [] },
    endings: [], onceEvents: [], propOverrides: {}, doorDestOverrides: {}, theoriesSeen: [],
  };
}

export function newRun(runNumber: number, seed: number, room: string, maxHp: number, inventory: string[]): RunState {
  return {
    run: runNumber, seed, startedAt: Date.now(), hp: maxHp, maxHp, inventory,
    keyUses: {}, currentRoom: room, facing: 'front', entryDoor: null, cameFrom: null,
    path: [], visited: {}, newRooms: 0, secrets: 0, doorsOpened: 0, keysUsed: 0,
    flags: {}, turnsTotal: 0, onceEvents: [], doorOverrides: {}, propOverrides: {},
    npcPositions: {}, npcSpawns: {}, lastDoorMaterials: [], relockedDoors: [], clock: 0,
    lastScareAt: 0, roomsSinceScare: 0,
  };
}

export function defaultSave(): SaveData {
  return { version: SAVE_VERSION, meta: defaultMeta(), run: null, settings: defaultSettings() };
}
