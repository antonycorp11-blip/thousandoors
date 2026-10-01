// ─────────────────────────────────────────────────────────────
// A THOUSAND DOORS — shared type definitions (source of truth)
// ─────────────────────────────────────────────────────────────

export type Side = 'front' | 'back';
export type Axis = 'memoria' | 'casa' | 'perdidos' | 'ruptura' | 'obediencia';
export const AXES: Axis[] = ['memoria', 'casa', 'perdidos', 'ruptura', 'obediencia'];

export type RoomCategory =
  | 'normal' | 'character' | 'event' | 'puzzle' | 'object' | 'secret' | 'lore'
  | 'transition' | 'anomaly' | 'echo' | 'danger' | 'sanctuary' | 'impossible'
  | 'memory' | 'hub' | 'final';

export type RegionId =
  | 'zero' | 'residencial' | 'servico' | 'biblioteca' | 'galeria' | 'infantil'
  | 'arquivos' | 'subsolo' | 'antiga' | 'abandonado' | 'semnome';

export type DoorType =
  | 'stable' | 'unstable' | 'oneway' | 'cyclic' | 'conditional' | 'sealed'
  | 'false' | 'hidden' | 'observer' | 'echo' | 'memory' | 'impossible';

export type ShellLayout = 'box' | 'corridor' | 'wide' | 'narrow' | 'void';
export type WallKind = 'back' | 'left' | 'right';

// ── Conditions ──────────────────────────────────────────────
export interface Range { gte?: number; lte?: number; eq?: number }

/** Every key present must be satisfied (AND). Use any / not for composition. */
export interface Condition {
  flag?: string; notFlag?: string;               // meta (persistent) flags
  runFlag?: string; notRunFlag?: string;          // flags for current run
  roomFlag?: string; notRoomFlag?: string;        // flags for current visit
  item?: string; noItem?: string; itemTag?: string;
  keyFor?: string;                                // carrying a key that opens this door id
  visitsHere?: Range;                             // total visits to current room (all runs)
  runVisitsHere?: Range;                          // visits during this run
  visited?: string; notVisited?: string;
  runs?: Range; deaths?: Range; hp?: Range;
  npcAlive?: string; npcDead?: string; npcKnown?: string; npcUnknown?: string;
  npcTrust?: { npc: string } & Range;
  npcHere?: string; npcStage?: { npc: string } & Range;
  route?: { axis: Axis } & Range; dominantRoute?: Axis;
  turnsHere?: Range; turnsTotal?: Range; timeHere?: Range; facing?: Side;
  firstVisit?: boolean; cameFrom?: string; viaDoor?: string;
  chance?: number;                                // seeded per run + salt
  lore?: string; noLore?: string; loreCount?: Range;
  fragmentsTotal?: Range; collectionCount?: Range; anchorsCount?: Range; achievementsCount?: Range;
  puzzleSolved?: string; puzzleUnsolved?: string;
  upgrade?: string; noUpgrade?: string;
  runRooms?: Range;                               // rooms visited this run
  doorState?: { door: string; is: DoorStateName | DoorStateName[] };
  doorUnlocked?: string; doorLocked?: string;
  endingSeen?: string;
  doorPos?: 'left' | 'center' | 'right';
  since?: { flag: string } & Range;         // seconds since a room flag (numeric timestamp) was set
  doorMaterial?: string;
  setting?: { key: keyof Settings; value: any };
  any?: Condition[]; all?: Condition[]; not?: Condition;
}

// ── Effects ─────────────────────────────────────────────────
export type JournalCat =
  | 'pessoas' | 'salas' | 'portas' | 'objetos' | 'simbolos' | 'memorias'
  | 'teorias' | 'eventos' | 'rumores' | 'chaves';

export type Effect =
  | { type: 'text'; text: string; speaker?: string; style?: 'whisper' | 'loud' | 'system' }
  | { type: 'wait'; ms: number }
  | { type: 'setFlag'; flag: string; value?: any; scope?: 'meta' | 'run' | 'room' }
  | { type: 'clearFlag'; flag: string; scope?: 'meta' | 'run' | 'room' }
  | { type: 'giveItem'; item: string; silent?: boolean }
  | { type: 'takeItem'; item: string; silent?: boolean }
  | { type: 'damage'; n: number; cause: string }
  | { type: 'heal'; n: number }
  | { type: 'fragments'; n: number; reason?: string }
  | { type: 'lore'; id: string; read?: boolean }
  | { type: 'journal'; cat: JournalCat; text: string; id?: string }
  | { type: 'rumor'; id: string }
  | { type: 'clue'; id: string }
  | { type: 'symbol'; id: string }
  | { type: 'revealDoor'; door: string }
  | { type: 'hideDoor'; door: string; scope?: 'run' | 'visit' }
  | { type: 'setDoorDest'; door: string; to: string; scope?: 'run' | 'meta' }
  | { type: 'setDoorState'; door: string; state: DoorStateName }
  | { type: 'unlockDoor'; door: string; silent?: boolean }
  | { type: 'prop'; prop: string; hidden?: boolean; x?: number; side?: Side; variant?: string; flip?: boolean; scope?: 'run' | 'visit' | 'meta'; room?: string }
  | { type: 'sound'; id: string; pan?: number; behind?: boolean; volume?: number }
  | { type: 'ambience'; id: string | null }
  | { type: 'dialogue'; id: string; npc?: string }
  | { type: 'puzzle'; id: string }
  | { type: 'read'; lore: string }
  | { type: 'spawnNpc'; npc: string; side?: Side; x?: number; room?: string }
  | { type: 'removeNpc'; npc: string }
  | { type: 'npc'; npc: string; trust?: number; alive?: boolean; known?: boolean; memory?: string; stage?: number; flag?: string; location?: string | null }
  | { type: 'route'; axis: Axis; n: number }
  | { type: 'flicker'; ms?: number }
  | { type: 'shake'; intensity?: number; ms?: number }
  | { type: 'darkness'; ms: number }
  | { type: 'jumpscare'; kind: 'close_figure' | 'face' | 'hands'; soft?: string }
  | { type: 'teleport'; room: string; side?: Side }
  | { type: 'achievement'; id: string }
  | { type: 'mapNote'; room: string; text: string }
  | { type: 'revealMap'; rooms?: string[]; around?: number; count?: number }
  | { type: 'phantomNode'; room: string }
  | { type: 'uiGlitch'; text: string; ms?: number }
  | { type: 'roomTitle'; text: string; ms?: number }
  | { type: 'choice'; text?: string; speaker?: string; options: { text: string; cond?: Condition; effects: Effect[] }[] }
  | { type: 'kill'; cause: string }
  | { type: 'theoryEvidence'; theory: string; evidence: string }
  | { type: 'anchor'; room?: string }
  | { type: 'combineKeys' }
  | { type: 'stealKey'; npc: string }
  | { type: 'returnKeys'; npc: string }
  | { type: 'apparition'; kind: 'figure' | 'child' | 'self' | 'faceless'; side?: Side; x?: number; ms?: number }
  | { type: 'doorAnim'; anim: 'breathe' | 'shiver' }
  | { type: 'solvePuzzle'; id: string }
  | { type: 'ui'; panel: 'map' | 'journal' | 'upgrades' | 'inventory' | 'runs' | 'keyring' | 'anchors' }
  | { type: 'startRun'; anchor?: string }
  | { type: 'pickupKeyChoice'; item: string; text: string }
  | { type: 'ending'; id: string }
  | { type: 'if'; cond: Condition; then: Effect[]; else?: Effect[] }
  | { type: 'random'; options: Effect[][]; salt?: string }
  | { type: 'openDoor'; door: string }
  | { type: 'tilt'; deg: number }
  | { type: 'light'; level: number; ms?: number };

// ── Visual definitions ──────────────────────────────────────
export type DoorMaterial =
  | 'wood_dark' | 'wood_light' | 'white' | 'green' | 'blue' | 'grey' | 'oxblood'
  | 'red' | 'metal' | 'apartment' | 'old' | 'black' | 'teal' | 'gold' | 'bone' | 'painted' | 'glass';

export interface DoorVisual {
  material: DoorMaterial;
  panels?: 0 | 2 | 4 | 6;            // 0 = flush
  window?: boolean;                   // small glass pane
  peeling?: number;                   // 0..1
  scratches?: number;                 // 0..1
  damage?: number;                    // 0..1 cracks / boards
  symbol?: string;                    // painted symbol id
  chain?: boolean;
  lightUnder?: string | null;         // css color of light leaking under the door
  numberPlate?: string;               // number painted on door
  lock?: LockVisual;                  // visible lock hardware (subtle)
  scale?: number;                     // size multiplier (anomalies)
  yOffset?: number;                   // floating doors
  tint?: string;
  stain?: boolean;
  handle?: 'knob' | 'lever' | 'none' | 'ring';
}

export type LockVisual = 'none' | 'iron' | 'brass' | 'padlock' | 'chain' | 'bolt' | 'symbol' | 'number' | 'toothless' | 'bone' | 'gold' | 'glass' | 'memory';

// ── Props & hotspots ────────────────────────────────────────
export interface Interaction {
  label: string;
  cond?: Condition;
  effects: Effect[];
  once?: 'run' | 'forever' | 'visit';
  id?: string;
}

export interface PropDef {
  id: string;
  kind: string;                 // painter key
  x: number;                    // world x (1920 reference)
  y?: number;                   // wall props: y on wall ; floor props: computed from depth
  d?: number;                   // depth 0 (back wall) .. 1 (camera) for floor props
  scale?: number;
  variant?: string;
  flip?: boolean;
  flipY?: boolean;
  rot?: number;                 // degrees
  cond?: Condition;             // visible only if
  label?: string;               // short name when examined
  examine?: string | Effect[];  // long-press / right-click
  interact?: Interaction[];     // tap
  anim?: 'flicker' | 'flame' | 'sway' | 'breathe' | 'swing' | 'drip' | 'rock' | 'tick';
  light?: { r: number; color?: string; i?: number; dy?: number };
  hotspot?: { w: number; h: number; secret?: boolean }; // invisible zone instead of image hit area
  invisible?: boolean;          // hotspot only, nothing drawn
  z?: number;
  item?: string;                // pickup convenience: auto interaction 'Pegar'
}

export interface PerspectiveDef {
  props: PropDef[];
  desc?: string;
}

export interface NpcSpawnRule {
  npc: string;
  side?: Side;
  x?: number;
  d?: number;
  cond?: Condition;
  chance?: number;
  pose?: string;
}

export interface RoomDefinition {
  id: string;
  number?: number;
  name: string;               // internal name
  title: string;              // known title
  subtitle?: string;
  category: RoomCategory;
  region: RegionId;
  theme: string;
  layout?: ShellLayout;
  depth: number;              // escalation 0..1
  front: PerspectiveDef;
  back: PerspectiveDef;
  ambient?: number;           // 0..1 base light
  ambience?: string;          // audio profile
  music?: string;
  npcs?: NpcSpawnRule[];
  events?: string[];          // event ids bound to this room (in addition to global filters)
  puzzle?: string;
  tags: string[];
  rarity?: number;
  onEnter?: Effect[];
  onFirstEnter?: Effect[];
  echoOf?: string;
  tilt?: number;
  mirror?: boolean;
  modifiers?: string[];
  authored?: boolean;
  hideNumber?: boolean;
  anchorable?: boolean;
  noCeilingLamp?: boolean;
}

// ── Doors, locks & keys ─────────────────────────────────────
export interface DestinationRule { cond: Condition; to: string | null }

export interface DoorDefinition {
  id: string;
  displayNumber: number;
  type: DoorType;
  origin: string;
  side: Side;
  wall?: WallKind;
  x?: number;
  d?: number;                       // depth for side-wall doors / perspective
  to: string | null;                // null = false door
  destinationRules?: DestinationRule[];
  bidirectional: boolean;
  hidden?: boolean;
  revealHint?: string;
  lock?: string;                    // LockDefinition id
  requirements?: Condition;         // conditional doors
  failText?: string;
  visual: DoorVisual;
  audio: 'wood' | 'metal' | 'heavy' | 'squeak' | 'soft';
  listen?: string;
  peek?: string;
  observe?: string;
  knock?: Effect[];
  talk?: string;                    // dialogue id when talking through the door
  onOpen?: Effect[];
  meta?: boolean;                   // hub/meta doors not counted in the thousand
  important?: boolean;              // spine / progression — never changes silently
  observerAlt?: string;             // observer doors: alternative room when unobserved
}

export type LockType =
  | 'old_iron' | 'brass_small' | 'simple' | 'symbol_sun' | 'symbol_moon' | 'number_17'
  | 'memory_lock' | 'toothless' | 'bone' | 'gold' | 'glass' | 'service' | 'chapel'
  | 'clock' | 'impossible' | 'none_keyhole' | 'padlock' | 'broken_pair' | 'warm';

export type UnlockMethod =
  | { kind: 'key' }
  | { kind: 'puzzle'; puzzle: string }
  | { kind: 'npc'; npc: string; cond?: Condition; text?: string }
  | { kind: 'otherSide' }
  | { kind: 'tool'; item: string; consequence?: Effect[]; text?: string }
  | { kind: 'force'; consequence?: Effect[]; hpRisk?: number }
  | { kind: 'flag'; flag: string };

export interface LockDefinition {
  id: string;
  door: string;
  lockType: LockType;
  visual: LockVisual;
  description: string;            // what the player sees when examining the lock
  shortDesc: string;              // journal / map summary
  methods: UnlockMethod[];        // any one opens it
  forceable: boolean;
  forceConsequence?: Effect[];
  unforceableText?: string;
  relock?: 'never' | 'eachRun';   // 'eachRun' = House resets it (choice locks)
  important?: boolean;            // narrative lock (never forceable, never vanishes)
  reward?: string;                // human note for docs / validation
  onUnlock?: Effect[];
  wrongKeyHint?: 'no_fit' | 'no_turn';
}

export type KeyType =
  | 'iron' | 'brass' | 'numbered' | 'toothless' | 'warm' | 'bone' | 'broken' | 'rusty'
  | 'master' | 'impossible' | 'unreal' | 'gold' | 'glass' | 'ephemeral' | 'mutant' | 'plain' | 'symbol';

export interface KeyDefinition {
  id: string;                     // same as item id
  name: string;                   // known name after it is understood
  unknownName: string;            // shown before understanding
  description: string;
  keyType: KeyType;
  opensLocks: LockType[];
  opensDoors?: string[];
  notOpens?: LockType[];          // master key limits
  fitsButNoTurn?: LockType[];     // "entra, mas não gira"
  consumable: boolean;
  uses?: number;                  // breaks after N uses
  persistentAcrossRuns: boolean;
  visualVariant: string;
  origin: string;                 // human description of where it is found
  loreEntry?: string;
  special?: 'warm' | 'impossible' | 'unreal' | 'mutant' | 'half' | 'glass' | 'ephemeral';
  combineWith?: string;           // broken halves
  combineInto?: string;
  knownNameAfterUse?: string;     // e.g. "Chave da Ala de Serviço"
}

export type DoorStateName =
  | 'unknown' | 'seen' | 'opened' | 'closed' | 'locked' | 'unlocked' | 'sealed'
  | 'puzzle_pending' | 'puzzle_solved' | 'needs_key' | 'needs_item' | 'event_blocked'
  | 'permanently_open' | 'destroyed' | 'vanished';

export interface DoorRecord {
  state: DoorStateName;
  seen: boolean;
  used: number;
  lastDest?: string;
  destsSeen?: string[];
  lockExamined?: boolean;
  lockKnown?: boolean;          // lock type identified
  triedKeys?: Record<string, 'no_fit' | 'no_turn'>;
  unlockedRun?: number;
  unlocked?: boolean;
  revealed?: boolean;
  firstSeenAt?: number;          // meta.totalRooms at first sighting (to measure 'long ago')
  lockMethod?: string;
  firstSeenRun?: number;
  marks?: MarkId[];
  chalk?: boolean;
  notes?: string[];
}

export type MarkId = 'importante' | 'voltar' | 'chave' | 'puzzle' | 'perigo' | 'personagem' | 'misterio';

// ── Items ───────────────────────────────────────────────────
export type ItemCategory = 'chave' | 'objeto' | 'ferramenta' | 'memoria' | 'consumivel';

export interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;
  description: string;
  icon: string;               // painter key for icon
  permanent?: boolean;        // goes to collection, uses no slot
  persistent?: boolean;       // survives death
  use?: Effect[];             // using from inventory
  useLabel?: string;
  read?: string;              // lore id
  tags?: string[];
  key?: KeyDefinition;
}

// ── Characters ──────────────────────────────────────────────
export interface CharacterDefinition {
  id: string;
  name: string;               // shown once known
  unknownName: string;
  description: string;
  figure: FigureSpec;
  talk: { cond?: Condition; dialogue: string }[];
  observe: string;
  spawn: NpcPlacementRule[];
  axis?: Axis;
  ages?: boolean;
  youngs?: boolean;
  canDie?: boolean;
}

export interface NpcPlacementRule {
  rooms?: string[];
  tags?: string[];
  regions?: RegionId[];
  cond?: Condition;
  chance?: number;
  count?: number;             // how many rooms per run (merchant may be in several)
  side?: Side;
  x?: number;
}

export interface FigureSpec {
  pose: 'stand' | 'sit' | 'floor' | 'hunch' | 'lean' | 'kneel';
  height?: number;
  build?: number;
  coat: string;
  skin?: string;
  hair?: string;
  hat?: 'cap' | 'none' | 'veil' | 'nurse' | 'bowler' | 'hood' | 'bun' | 'long';
  faceless?: boolean;
  accessory?: 'cane' | 'lantern' | 'maps' | 'backpack' | 'medallion' | 'camera' | 'papers' | 'candle' | 'drawing' | 'ruler' | 'magnifier' | 'book' | 'none' | 'doll' | 'keys';
  child?: boolean;
  glasses?: boolean;
  beard?: boolean;
  dress?: boolean;
}

export interface NpcState {
  alive: boolean;
  location: string | null;
  trust: number;
  known: boolean;
  memories: string[];
  route?: Axis;
  flags: Record<string, any>;
  lastEncounter?: { run: number; room: string };
  timelineState: number;
  encounters: number;
  heldKeys?: string[];
}

// ── Dialogue ────────────────────────────────────────────────
export interface DialogueChoice {
  text: string;
  cond?: Condition;
  effects?: Effect[];
  next?: string | null;
  remember?: string;          // stored in npc memories
}

export interface TradeOffer {
  give: string;               // item id player gives, or 'fragments:N'
  get: string;                // item id player receives
  cond?: Condition;
  line?: string;
}

export interface DialogueNode {
  speaker?: string;           // npc id or 'self' or '?'
  text: string;
  cond?: Condition;
  alt?: { cond: Condition; text: string }[];
  effects?: Effect[];
  choices?: DialogueChoice[];
  next?: string | null;
  trade?: TradeOffer[];
}

export interface DialogueDefinition {
  id: string;
  npc?: string;
  start: string;
  nodes: Record<string, DialogueNode>;
}

// ── Lore, puzzles, events ───────────────────────────────────
export interface LoreFragment {
  id: string;
  title: string;
  kind: 'carta' | 'foto' | 'gravacao' | 'documento' | 'nota' | 'livro' | 'desenho' | 'inscricao' | 'memoria';
  text: string;
  back?: string;
  axis: Axis;
  fragments?: number;
  contradicts?: string[];
}

export type PuzzleType = 'code' | 'clock' | 'sequence' | 'order' | 'lights' | 'choice' | 'symbols' | 'doors';

export interface PuzzleDefinition {
  id: string;
  type: PuzzleType;
  title: string;
  prompt: string;
  room: string;
  config: any;
  solution: any;
  clues: { room: string; text: string; clueId: string }[];
  onSolve: Effect[];
  onFail?: Effect[];
  generated?: boolean;
  multiRun?: boolean;
}

export type EventTrigger = 'enter' | 'firstEnter' | 'exit' | 'turn' | 'tick' | 'doorOpen' | 'runStart' | 'death' | 'pickup' | 'unlock' | 'listen' | 'knock' | 'peek' | 'lockedTry';

export interface EventDefinition {
  id: string;
  trigger: EventTrigger;
  rooms?: string[];
  tags?: string[];
  categories?: RoomCategory[];
  regions?: RegionId[];
  depth?: Range;
  cond?: Condition;
  chance?: number;
  once?: 'forever' | 'run' | 'visit';
  scare?: boolean;
  strong?: boolean;
  priority?: number;
  delay?: number;
  effects: Effect[];
  note?: string;
}

// ── Meta progression ────────────────────────────────────────
export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  cost: number;
  requires?: string[];
  cond?: Condition;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  hidden?: boolean;
}

export interface TheoryDefinition {
  id: string;
  title: string;
  evidence: { id: string; text: string; cond: Condition }[];
  minEvidence: number;
}

export interface RumorDefinition { id: string; source: string; text: string }

export interface JournalEntry {
  id: string;
  cat: JournalCat;
  text: string;
  room?: string;
  run: number;
  t: number;
}

export interface RunRecord {
  run: number;
  seed: number;
  startedAt: number;
  endedAt?: number;
  roomsVisited: number;
  newRooms: number;
  secrets: number;
  lastRoom: string;
  cause?: string;
  doorsOpened: number;
  keysUsed: number;
  anchor?: string;
  ending?: string;
}

export interface Settings {
  master: number; sfx: number; music: number; ambience: number;
  textSize: 'small' | 'normal' | 'large';
  reduceMotion: boolean;
  reduceFlashes: boolean;
  highContrast: boolean;
  softScares: boolean;
  showHotspotsOnLongLook: boolean;
}

export interface MapNodeMeta { x: number; y: number }

export interface MetaState {
  version: number;
  createdAt: number;
  updatedAt: number;
  introDone: boolean;
  fragments: number;
  fragmentsTotal: number;
  upgrades: string[];
  flags: Record<string, any>;
  rooms: Record<string, { visits: number; firstRun: number; lastRun: number; named: boolean }>;
  seenRooms: Record<string, 'heard' | 'peeked' | 'mapped' | 'phantom'>;
  doors: Record<string, DoorRecord>;
  keyring: Record<string, KeyRecord>;
  lore: string[];
  clues: string[];
  symbols: string[];
  rumors: string[];
  journal: JournalEntry[];
  npcs: Record<string, NpcState>;
  collection: string[];
  preserved: string[];
  anchors: string[];
  runs: RunRecord[];
  runCount: number;
  deaths: number;
  achievements: string[];
  puzzlesSolved: string[];
  route: Record<Axis, number>;
  map: {
    layout: Record<string, MapNodeMeta>;
    roomMarks: Record<string, MarkId[]>;
    notes: Record<string, string[]>;
    pins: string[];
  };
  endings: string[];
  onceEvents: string[];
  propOverrides: Record<string, Record<string, PropOverride>>;
  doorDestOverrides: Record<string, string>;
  theoriesSeen: string[];
}

export interface KeyRecord {
  found: boolean;
  foundIn?: string;
  foundRun?: number;
  timesUsed: number;
  understood: boolean;        // known name revealed
  notes: string[];
  broken?: boolean;
}

export interface PropOverride { hidden?: boolean; x?: number; side?: Side; variant?: string; flip?: boolean }

/** The current visit is saved separately from permanent room and run changes. */
export interface SavedRoomVisit {
  roomId: string;
  turns: number;
  time: number;
  facing: Side;
  flags: Record<string, any>;
  onceEvents: string[];
  hiddenDoors: string[];
  propOverrides: Record<string, PropOverride>;
  visitIndex: number;
}

export interface RunState {
  run: number;
  seed: number;
  startedAt: number;
  hp: number;
  maxHp: number;
  inventory: string[];
  keyUses: Record<string, number>;
  currentRoom: string;
  facing: Side;
  roomVisit?: SavedRoomVisit;
  entryDoor?: string | null;
  cameFrom?: string | null;
  path: string[];
  trail?: { from: string; to: string; door: string; reverse: boolean }[];
  visited: Record<string, number>;
  newRooms: number;
  secrets: number;
  doorsOpened: number;
  keysUsed: number;
  flags: Record<string, any>;
  turnsTotal: number;
  onceEvents: string[];
  doorOverrides: Record<string, { hidden?: boolean; to?: string; revealed?: boolean }>;
  propOverrides: Record<string, Record<string, PropOverride>>;
  npcPositions: Record<string, string[]>;
  npcSpawns: Record<string, { room: string; side: Side; x: number }[]>;
  lastDoorMaterials: string[];
  anchor?: string;
  relockedDoors: string[];
  clock: number;              // internal minutes since run start
  lastScareAt: number;
  roomsSinceScare: number;
}

export interface SaveData {
  version: number;
  meta: MetaState;
  run: RunState | null;
  settings: Settings;
}
