/**
 * Margin Note Reconciler Tests
 * 
 * Run with: npx jest src/margin-notes/__tests__/MarginNoteReconciler.test.ts
 */

import {
  reconcile,
  getNoteById,
  getNextNoteIndex,
  hasNote,
  ReconcilerInput,
} from '../MarginNoteReconciler';
import type { AnchorData, NoteData } from '../../protocol/messages';

describe('MarginNoteReconciler', () => {
  describe('reconcile', () => {
    describe('with empty inputs', () => {
      it('should return empty output for empty inputs', () => {
        const input: ReconcilerInput = {
          anchors: [],
          currentNotes: [],
        };

        const output = reconcile(input);

        expect(output.notes).toEqual([]);
        expect(output.commands).toEqual([]);
        expect(output.diff.hasChanges).toBe(false);
      });
    });

    describe('adding notes', () => {
      it('should generate INSERT command for new anchor', () => {
        const input: ReconcilerInput = {
          anchors: [{ id: 'note-1', line: 1, blockIndex: 0 }],
          currentNotes: [],
        };

        const output = reconcile(input);

        expect(output.notes).toHaveLength(1);
        expect(output.notes[0]).toEqual({
          id: 'note-1',
          noteIndex: 1,
          line: 1,
          blockIndex: 0,
        });

        // Should have INSERT + UPDATE_INDICES commands
        expect(output.commands.some(c => c.type === 'INSERT_NOTE_BLOCK')).toBe(true);
        expect(output.diff.added).toEqual(['note-1']);
        expect(output.diff.hasChanges).toBe(true);
      });

      it('should add multiple notes in document order', () => {
        const input: ReconcilerInput = {
          anchors: [
            { id: 'note-2', line: 5, blockIndex: 0 },
            { id: 'note-1', line: 2, blockIndex: 0 },
            { id: 'note-3', line: 10, blockIndex: 0 },
          ],
          currentNotes: [],
        };

        const output = reconcile(input);

        expect(output.notes).toHaveLength(3);
        // Should be sorted by line
        expect(output.notes[0].id).toBe('note-1');
        expect(output.notes[0].noteIndex).toBe(1);
        expect(output.notes[1].id).toBe('note-2');
        expect(output.notes[1].noteIndex).toBe(2);
        expect(output.notes[2].id).toBe('note-3');
        expect(output.notes[2].noteIndex).toBe(3);
      });
    });

    describe('removing notes', () => {
      it('should generate DELETE command for removed anchor', () => {
        const input: ReconcilerInput = {
          anchors: [],
          currentNotes: [{ id: 'note-1', noteIndex: 1, line: 1, blockIndex: 0 }],
        };

        const output = reconcile(input);

        expect(output.notes).toHaveLength(0);
        expect(output.commands.some(c => c.type === 'DELETE_NOTE_BLOCK')).toBe(true);
        expect(output.diff.removed).toEqual(['note-1']);
        expect(output.diff.hasChanges).toBe(true);
      });

      it('should remove only the deleted note', () => {
        const input: ReconcilerInput = {
          anchors: [{ id: 'note-2', line: 5, blockIndex: 0 }],
          currentNotes: [
            { id: 'note-1', noteIndex: 1, line: 2, blockIndex: 0 },
            { id: 'note-2', noteIndex: 2, line: 5, blockIndex: 0 },
          ],
        };

        const output = reconcile(input);

        expect(output.notes).toHaveLength(1);
        expect(output.notes[0].id).toBe('note-2');
        expect(output.notes[0].noteIndex).toBe(1); // Reindexed
        expect(output.diff.removed).toEqual(['note-1']);
      });
    });

    describe('reordering notes', () => {
      it('should detect reordering when indices change', () => {
        const input: ReconcilerInput = {
          anchors: [
            { id: 'note-1', line: 5, blockIndex: 0 }, // Was at line 2, now at line 5
            { id: 'note-2', line: 2, blockIndex: 0 }, // Was at line 5, now at line 2
          ],
          currentNotes: [
            { id: 'note-1', noteIndex: 1, line: 2, blockIndex: 0 },
            { id: 'note-2', noteIndex: 2, line: 5, blockIndex: 0 },
          ],
        };

        const output = reconcile(input);

        // note-2 should now be first (line 2), note-1 second (line 5)
        expect(output.notes[0].id).toBe('note-2');
        expect(output.notes[0].noteIndex).toBe(1);
        expect(output.notes[1].id).toBe('note-1');
        expect(output.notes[1].noteIndex).toBe(2);

        expect(output.diff.reordered).toContain('note-1');
        expect(output.diff.reordered).toContain('note-2');
      });

      it('should always send UPDATE_NOTE_INDICES command', () => {
        const input: ReconcilerInput = {
          anchors: [{ id: 'note-1', line: 1, blockIndex: 0 }],
          currentNotes: [{ id: 'note-1', noteIndex: 1, line: 1, blockIndex: 0 }],
        };

        const output = reconcile(input);

        expect(output.commands.some(c => c.type === 'UPDATE_NOTE_INDICES')).toBe(true);
      });
    });

    describe('complex scenarios', () => {
      it('should handle simultaneous add and remove', () => {
        const input: ReconcilerInput = {
          anchors: [
            { id: 'note-1', line: 1, blockIndex: 0 },
            { id: 'note-3', line: 10, blockIndex: 0 }, // New
          ],
          currentNotes: [
            { id: 'note-1', noteIndex: 1, line: 1, blockIndex: 0 },
            { id: 'note-2', noteIndex: 2, line: 5, blockIndex: 0 }, // Removed
          ],
        };

        const output = reconcile(input);

        expect(output.notes).toHaveLength(2);
        expect(output.diff.added).toEqual(['note-3']);
        expect(output.diff.removed).toEqual(['note-2']);
      });

      it('should sort by blockIndex when lines are equal', () => {
        const input: ReconcilerInput = {
          anchors: [
            { id: 'note-2', line: 5, blockIndex: 2 },
            { id: 'note-1', line: 5, blockIndex: 1 },
            { id: 'note-3', line: 5, blockIndex: 3 },
          ],
          currentNotes: [],
        };

        const output = reconcile(input);

        expect(output.notes[0].id).toBe('note-1');
        expect(output.notes[1].id).toBe('note-2');
        expect(output.notes[2].id).toBe('note-3');
      });
    });

    describe('command generation', () => {
      it('should generate DELETE commands before INSERT commands', () => {
        const input: ReconcilerInput = {
          anchors: [{ id: 'note-2', line: 5, blockIndex: 0 }],
          currentNotes: [{ id: 'note-1', noteIndex: 1, line: 1, blockIndex: 0 }],
        };

        const output = reconcile(input);

        const deleteIndex = output.commands.findIndex(c => c.type === 'DELETE_NOTE_BLOCK');
        const insertIndex = output.commands.findIndex(c => c.type === 'INSERT_NOTE_BLOCK');

        expect(deleteIndex).toBeLessThan(insertIndex);
      });

      it('should include timestamp in all commands', () => {
        const input: ReconcilerInput = {
          anchors: [{ id: 'note-1', line: 1, blockIndex: 0 }],
          currentNotes: [],
        };

        const output = reconcile(input);

        for (const command of output.commands) {
          expect(command.timestamp).toBeDefined();
          expect(typeof command.timestamp).toBe('number');
        }
      });

      it('should include version in all commands', () => {
        const input: ReconcilerInput = {
          anchors: [{ id: 'note-1', line: 1, blockIndex: 0 }],
          currentNotes: [],
        };

        const output = reconcile(input);

        for (const command of output.commands) {
          expect(command.version).toBe(1);
        }
      });
    });
  });

  describe('helper functions', () => {
    const testNotes: NoteData[] = [
      { id: 'note-1', noteIndex: 1, line: 1, blockIndex: 0 },
      { id: 'note-2', noteIndex: 2, line: 5, blockIndex: 0 },
      { id: 'note-3', noteIndex: 3, line: 10, blockIndex: 0 },
    ];

    describe('getNoteById', () => {
      it('should find note by ID', () => {
        expect(getNoteById(testNotes, 'note-2')).toEqual(testNotes[1]);
      });

      it('should return undefined for non-existent ID', () => {
        expect(getNoteById(testNotes, 'note-999')).toBeUndefined();
      });
    });

    describe('getNextNoteIndex', () => {
      it('should return length + 1', () => {
        expect(getNextNoteIndex(testNotes)).toBe(4);
      });

      it('should return 1 for empty array', () => {
        expect(getNextNoteIndex([])).toBe(1);
      });
    });

    describe('hasNote', () => {
      it('should return true for existing note', () => {
        expect(hasNote(testNotes, 'note-2')).toBe(true);
      });

      it('should return false for non-existent note', () => {
        expect(hasNote(testNotes, 'note-999')).toBe(false);
      });
    });
  });
});
