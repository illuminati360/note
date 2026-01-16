/**
 * Margin Notes Types
 * 
 * Shared type definitions for the margin notes system.
 */

// Re-export from protocol for convenience
export type { NoteData, AnchorData } from '../protocol/messages';

// Re-export from state machine
export type { FocusState, FocusEvent } from './FocusStateMachine';

// Re-export from reconciler
export type { ReconcilerInput, ReconcilerOutput, ReconcilerDiff } from './MarginNoteReconciler';
