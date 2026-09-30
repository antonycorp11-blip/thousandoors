import type { GameManager } from '../core/GameManager';
import type { PuzzleDefinition } from '../core/types';
import { PUZZLE, PUZZLES } from '../data/puzzles';

export class PuzzleSystem {
  constructor(private g: GameManager) {}

  def(id: string): PuzzleDefinition | undefined { return PUZZLE[id] ?? PUZZLES.find(p => p.id === id); }
  solved(id: string): boolean { return this.g.meta.puzzlesSolved.includes(id); }

  check(p: PuzzleDefinition, answer: any): boolean {
    switch (p.type) {
      case 'code': return String(answer) === String(p.solution);
      case 'clock': return answer?.h === p.solution.h && answer?.m === p.solution.m;
      case 'sequence': case 'symbols': case 'order': return JSON.stringify(answer) === JSON.stringify(p.solution);
      case 'lights': return answer === p.solution;
      case 'choice': return answer === p.solution;
      default: return false;
    }
  }

  async solve(id: string): Promise<void> {
    if (this.solved(id)) return;
    const p = this.def(id);
    this.g.meta.puzzlesSolved.push(id);
    this.g.audio.play('solve');
    if (p) {
      this.g.journal.add('eventos', `Resolvi: ${p.title} (${this.g.roomLabel(p.room)}).`, 'solved_' + id);
      if (this.g.run) this.g.run.secrets++;
      await this.g.effects.run(p.onSolve, id);
    }
    await this.g.doors.onPuzzleSolved(id);
    this.g.save();
  }

  async fail(id: string): Promise<void> {
    const p = this.def(id);
    this.g.audio.play('fail');
    if (p?.onFail) await this.g.effects.run(p.onFail, id + ':fail');
  }
}
