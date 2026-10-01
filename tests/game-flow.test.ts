import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { GameManager } from '../src/core/GameManager';
import { migrate, SaveManager } from '../src/core/SaveManager';
import { defaultSave } from '../src/core/state';

describe('exploration flow', () => {
  it('opens a real door and records its destination on the mental map', async () => {
    const g = new GameManager({ headless: true });
    await g.startRun();
    const door = g.currentView().doors.find(v => !v.locked && !!g.doors.resolveTo(v.door, v.reverse));
    expect(door).toBeDefined();
    const destination = g.doors.resolveTo(door!.door, door!.reverse);

    await g.openDoor(door!);

    expect(g.run?.currentRoom).toBe(destination);
    expect(g.meta.doors[door!.door.id].lastDest).toBe(destination);
    expect(g.map.graph().edges.some(e => e.door === door!.door.id && e.to === destination)).toBe(true);
    expect(g.run?.trail?.at(-1)).toEqual({ from: 'r001', to: destination, door: door!.door.id, reverse: false });
    expect(g.map.routeTo('r001')).toEqual([{ from: destination, to: 'r001', door: door!.door.id, uncertain: false }]);

    const returnDoor = g.rooms.view(destination!, 'back').doors.find(v => v.reverse && v.door.id === door!.door.id);
    expect(returnDoor).toBeDefined();
    await g.openDoor(returnDoor!);
    expect(g.run?.currentRoom).toBe('r001');
    expect(g.meta.doors[door!.door.id].lastDest).toBe(destination);
    expect(g.map.graph().edges.some(e => e.door === door!.door.id && e.from === e.to)).toBe(false);
    expect(g.run?.trail?.at(-1)?.reverse).toBe(true);
  });

  it('restores the active side and visit events after a reload', async () => {
    const g = new GameManager({ headless: true });
    await g.startRun();
    await g.turn();
    g.roomState.flags.inspected = true;
    g.roomState.onceEvents.add('visit_test');
    g.roomState.hiddenDoors.add('d_test');
    const saved = structuredClone(g.snapshot());

    const reloaded = new GameManager({ headless: true });
    reloaded.meta = saved.meta;
    reloaded.run = saved.run;
    await reloaded.resume();

    expect(reloaded.roomState.facing).toBe('back');
    expect(reloaded.roomState.turns).toBe(1);
    expect(reloaded.roomState.flags.inspected).toBe(true);
    expect(reloaded.roomState.onceEvents.has('visit_test')).toBe(true);
    expect(reloaded.roomState.hiddenDoors.has('d_test')).toBe(true);
  });

  it('moves a dead player to Sala Zero while keeping discoveries', async () => {
    const g = new GameManager({ headless: true });
    await g.startRun();
    const room = g.run!.currentRoom;
    await g.damage(g.run!.hp, 'teste');

    expect(g.run).toBeNull();
    expect(g.roomState.roomId).toBe('r000');
    expect(g.meta.rooms[room]).toBeDefined();
    expect(g.meta.runs.at(-1)?.cause).toBe('teste');
  });

  it('migrates an older save and allows a missing visit snapshot', async () => {
    const g = new GameManager({ headless: true });
    await g.startRun();
    const old = structuredClone(g.snapshot());
    delete old.run!.roomVisit;
    delete old.run!.trail;
    old.run!.facing = 'back';
    const saved = migrate(old);

    const reloaded = new GameManager({ headless: true });
    reloaded.meta = saved.meta;
    reloaded.run = saved.run;
    await reloaded.resume();

    expect(reloaded.roomState.facing).toBe('back');
    expect(reloaded.roomState.roomId).toBe(old.run!.currentRoom);
    expect(saved.run?.trail).toEqual([]);
  });

  it('opens a new investigation when a major clue is found', async () => {
    const g = new GameManager({ headless: true });
    await g.startRun();
    g.memory.addLore('foto_casa');
    g.investigation.refresh(true);
    expect(g.investigation.active()?.id).toBe('fotografia');
    expect(g.meta.flags.lead_pending_fotografia).toBe(true);
    g.memory.addClue('clue_ordem_sete');
    g.investigation.refresh(true);
    expect(g.investigation.active()?.id).toBe('mesa');
    g.meta.puzzlesSolved.push('p_mesa_jantar');
    g.investigation.refresh(true);
    expect(g.investigation.active()?.id).toBe('arquivos');
  });

  it('keeps an older exploration readable when its door trail is missing', async () => {
    const g = new GameManager({ headless: true });
    await g.startRun();
    const saved = structuredClone(g.snapshot());
    saved.run!.path = ['r001', 'r002', 'r005'];
    delete saved.run!.trail;
    const migrated = migrate(saved);
    expect(migrated.run?.trail).toEqual([
      { from: 'r001', to: 'r002', door: '', reverse: false },
      { from: 'r002', to: 'r005', door: '', reverse: false },
    ]);
  });

  it('places a person after seven rooms in one exploration without an encounter', async () => {
    const g = new GameManager({ headless: true });
    await g.startRun();
    const room = Object.values(g.house.rooms).find(r => r.tags.includes('generated') && r.category === 'normal' && !g.npcs.presentIn(r.id).length)!;
    g.run!.visited = Object.fromEntries(['r001', 'r002', 'r003', 'r004', 'r006', 'r007', room.id].map(id => [id, 1]));
    g.npcs.onEnterRoom(room.id);
    expect(g.npcs.presentIn(room.id).length).toBe(1);
    expect(g.run!.flags.lastPersonRunRooms).toBe(7);
  });

  it('does not restore a queued autosave after resetting all progress', async () => {
    const saves = new SaveManager();
    const data = defaultSave();
    data.meta.fragments = 99;
    void saves.save(data);
    await saves.reset();

    expect((await saves.load()).meta.fragments).toBe(0);
  });
});
