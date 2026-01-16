/**
 * Margin Note Reconciler
 * 
 * A pure function that reconciles the main editor's anchors with
 * the margin editor's note blocks.
 * 
 * This is the SINGLE POINT OF LOGIC for synchronization between editors.
 * 
 * Input:
 * - Anchors from main editor (source of truth for note existence)
 * - Current notes in React Native state
 * 
 * Output:
 * - New notes state for React Native
 * - Commands to send to margin editor
 * 
 * Benefits:
 * - Testable: Pure function with no side effects
 * - Deterministic: Same inputs always produce same outputs
 * - Debuggable: Easy to log inputs/outputs
 * - Single Point of Change: All sync logic in one place
 */

import type { AnchorData, NoteData, MarginEditorCommand } from '../protocol/messages';
import { createBaseMessage } from '../protocol/messages';

// ============================================
// TYPES
// ============================================

export interface ReconcilerInput {
  /** Anchors from the main editor (source of truth) */
  anchors: AnchorData[];
  /** Current notes in React Native state */
  currentNotes: NoteData[];
}

export interface ReconcilerOutput {
  /** New notes state for React Native */
  notes: NoteData[];
  /** Commands to send to the margin editor */
  commands: MarginEditorCommand[];
  /** Debug info about what changed */
  diff: ReconcilerDiff;
}

export interface ReconcilerDiff {
  /** IDs of notes that were added */
  added: string[];
  /** IDs of notes that were removed */
  removed: string[];
  /** IDs of notes whose index changed */
  reordered: string[];
  /** Whether any changes occurred */
  hasChanges: boolean;
}

// ============================================
// RECONCILER
// ============================================

/**
 * Reconcile anchors from main editor with current notes.
 * 
 * Algorithm:
 * 1. Sort anchors by document position (line, then blockIndex)
 * 2. Assign noteIndex based on sorted order (1-indexed)
 * 3. Compute diff: added, removed, reordered
 * 4. Generate commands for margin editor
 * 
 * @param input - Anchors and current notes
 * @returns New notes, commands, and diff info
 */
export function reconcile(input: ReconcilerInput): ReconcilerOutput {
  const { anchors, currentNotes } = input;

  // Step 1: Sort anchors by document position
  const sortedAnchors = [...anchors].sort((a, b) => {
    if (a.line !== b.line) {
      return a.line - b.line;
    }
    return a.blockIndex - b.blockIndex;
  });

  // Step 2: Build new notes array with correct indices
  const newNotes: NoteData[] = sortedAnchors.map((anchor, index) => ({
    id: anchor.id,
    noteIndex: index + 1,
    line: anchor.line,
    blockIndex: anchor.blockIndex,
  }));

  // Step 3: Compute diff
  const currentIds = new Set(currentNotes.map(n => n.id));
  const newIds = new Set(newNotes.map(n => n.id));
  const currentIndexMap = new Map(currentNotes.map(n => [n.id, n.noteIndex]));

  const added: string[] = [];
  const removed: string[] = [];
  const reordered: string[] = [];

  // Find removed notes
  for (const note of currentNotes) {
    if (!newIds.has(note.id)) {
      removed.push(note.id);
    }
  }

  // Find added and reordered notes
  for (const note of newNotes) {
    if (!currentIds.has(note.id)) {
      added.push(note.id);
    } else {
      const oldIndex = currentIndexMap.get(note.id);
      if (oldIndex !== note.noteIndex) {
        reordered.push(note.id);
      }
    }
  }

  const hasChanges = added.length > 0 || removed.length > 0 || reordered.length > 0;

  // Step 4: Generate commands
  const commands: MarginEditorCommand[] = [];

  // Deletions first (order matters for indices)
  for (const noteId of removed) {
    commands.push({
      ...createBaseMessage(),
      type: 'DELETE_NOTE_BLOCK',
      payload: { noteId },
    });
  }

  // Insertions
  for (const noteId of added) {
    const note = newNotes.find(n => n.id === noteId)!;
    commands.push({
      ...createBaseMessage(),
      type: 'INSERT_NOTE_BLOCK',
      payload: { noteId: note.id, noteIndex: note.noteIndex },
    });
  }

  // Always send index updates if there are any notes
  // This is idempotent and ensures indices are correct after any operation
  if (newNotes.length > 0) {
    commands.push({
      ...createBaseMessage(),
      type: 'UPDATE_NOTE_INDICES',
      payload: {
        notes: newNotes.map(n => ({ noteId: n.id, noteIndex: n.noteIndex })),
      },
    });
  }

  return {
    notes: newNotes,
    commands,
    diff: {
      added,
      removed,
      reordered,
      hasChanges,
    },
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a note by ID from the notes array.
 */
export function getNoteById(notes: NoteData[], id: string): NoteData | undefined {
  return notes.find(n => n.id === id);
}

/**
 * Get the next available note index.
 */
export function getNextNoteIndex(notes: NoteData[]): number {
  return notes.length + 1;
}

/**
 * Check if a note exists in the notes array.
 */
export function hasNote(notes: NoteData[], id: string): boolean {
  return notes.some(n => n.id === id);
}

// ============================================
// DEBUG HELPERS
// ============================================

/**
 * Format reconciler output for logging.
 */
export function formatReconcilerOutput(output: ReconcilerOutput): string {
  const { diff } = output;
  const parts: string[] = [];

  if (diff.added.length > 0) {
    parts.push(`+${diff.added.length} added`);
  }
  if (diff.removed.length > 0) {
    parts.push(`-${diff.removed.length} removed`);
  }
  if (diff.reordered.length > 0) {
    parts.push(`~${diff.reordered.length} reordered`);
  }

  if (parts.length === 0) {
    return 'no changes';
  }

  return parts.join(', ');
}

/**
 * Create a logging wrapper for the reconciler.
 */
export function createLoggingReconciler(
  prefix: string = '[Reconciler]'
): (input: ReconcilerInput) => ReconcilerOutput {
  return (input: ReconcilerInput): ReconcilerOutput => {
    const output = reconcile(input);

    console.log(
      prefix,
      `Input: ${input.anchors.length} anchors, ${input.currentNotes.length} notes`,
      '→',
      formatReconcilerOutput(output),
      `(${output.commands.length} commands)`
    );

    return output;
  };
}
