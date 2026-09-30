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

    const returnDoor = g.rooms.view(destination!, 'back').doors.find(v => v.reverse && v.door.id === door!.door.id);
    expect(returnDoor).toBeDefined();
    await g.openDoor(returnDoor!);
    expect(g.run?.currentRoom).toBe('r001');
    expect(g.meta.doors[door!.door.id].lastDest).toBe(destination);
    expect(g.map.graph().edges.some(e => e.door === door!.door.id && e.from === e.to)).toBe(false);
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
    old.run!.facing = 'back';
    const saved = migrate(old);

    const reloaded = new GameManager({ headless: true });
    reloaded.meta = saved.meta;
    reloaded.run = saved.run;
    await reloaded.resume();

    expect(reloaded.roomState.facing).toBe('back');
    expect(reloaded.roomState.roomId).toBe(old.run!.currentRoom);
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
