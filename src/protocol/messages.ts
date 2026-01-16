/**
 * Typed Message Protocol for Editor Communication
 * 
 * This module defines all message types for communication between:
 * - React Native ↔ Main Editor WebView
 * - React Native ↔ Margin Editor WebView
 * 
 * Messages are categorized as:
 * - Events: Notifications from WebView to RN (something happened)
 * - Commands: Instructions from RN to WebView (do something)
 * - Responses: Replies to queries (here's what you asked for)
 */

// ============================================
// BASE TYPES
// ============================================

export interface BaseMessage {
  /** Protocol version for future compatibility */
  version: 1;
  /** Timestamp for debugging and ordering */
  timestamp: number;
  /** Optional correlation ID for request/response tracking */
  correlationId?: string;
}

/** Factory function to create base message properties */
export function createBaseMessage(correlationId?: string): BaseMessage {
  return {
    version: 1,
    timestamp: Date.now(),
    correlationId,
  };
}

// ============================================
// SHARED TYPES
// ============================================

/** Anchor data from the main editor */
export interface AnchorData {
  id: string;
  line: number;
  blockIndex: number;
}

/** Selection/formatting state */
export interface SelectionState {
  isBold: boolean;
  isItalic: boolean;
  isStrike: boolean;
  isCode: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
  isHeading: boolean;
}

/** Note data managed by React Native */
export interface NoteData {
  id: string;
  noteIndex: number;
  line: number;
  blockIndex: number;
}

// ============================================
// MAIN EDITOR → REACT NATIVE (Events)
// ============================================

export type MainEditorEvent = BaseMessage & (
  | { type: 'EDITOR_READY' }
  | { type: 'EDITOR_FOCUS' }
  | { type: 'EDITOR_BLUR' }
  | { type: 'CONTENT_CHANGED'; payload: { html: string; json: object } }
  | { type: 'SELECTION_CHANGED'; payload: SelectionState }
  | { type: 'ANCHORS_CHANGED'; payload: { anchors: AnchorData[] } }
);

/** Response to GET_CONTENT command */
export type MainEditorResponse = BaseMessage & (
  | { type: 'CONTENT_RESPONSE'; payload: { html: string; json: object; messageId: string } }
);

/** All messages from Main Editor to RN */
export type MainEditorToRN = MainEditorEvent | MainEditorResponse;

// ============================================
// REACT NATIVE → MAIN EDITOR (Commands)
// ============================================

export type MainEditorCommand = BaseMessage & (
  | { type: 'SET_CONTENT'; payload: { html: string } }
  | { type: 'GET_CONTENT'; payload: { messageId: string } }
  | { type: 'FOCUS' }
  | { type: 'BLUR' }
  | { type: 'FORMAT'; payload: { command: 'bold' | 'italic' | 'strike' } }
  | { type: 'INSERT_SHAPE'; payload: { shape: 'square' | 'circle' | 'flower'; attrs?: object } }
  | { type: 'INSERT_MARGIN_NOTE'; payload: { id: string; index: number } }
  | { type: 'DELETE_MARGIN_NOTE'; payload: { id: string } }
);

// ============================================
// MARGIN EDITOR → REACT NATIVE (Events)
// ============================================

export type MarginEditorEvent = BaseMessage & (
  | { type: 'EDITOR_READY' }
  | { type: 'EDITOR_FOCUS'; payload: { noteId: string | null } }
  | { type: 'EDITOR_BLUR' }
  | { type: 'CONTENT_CHANGED'; payload: { html: string; json: object } }
  | { type: 'SELECTION_CHANGED'; payload: SelectionState }
  | { type: 'NOTE_DELETED'; payload: { noteId: string } }
);

/** Response to GET_CONTENT command */
export type MarginEditorResponse = BaseMessage & (
  | { type: 'CONTENT_RESPONSE'; payload: { html: string; json: object; messageId: string } }
);

/** All messages from Margin Editor to RN */
export type MarginEditorToRN = MarginEditorEvent | MarginEditorResponse;

// ============================================
// REACT NATIVE → MARGIN EDITOR (Commands)
// ============================================

export type MarginEditorCommand = BaseMessage & (
  | { type: 'SET_CONTENT'; payload: { html: string } }
  | { type: 'GET_CONTENT'; payload: { messageId: string } }
  | { type: 'INSERT_NOTE_BLOCK'; payload: { noteId: string; noteIndex: number } }
  | { type: 'DELETE_NOTE_BLOCK'; payload: { noteId: string } }
  | { type: 'UPDATE_NOTE_INDICES'; payload: { notes: Array<{ noteId: string; noteIndex: number }> } }
  | { type: 'FOCUS_NOTE'; payload: { noteId: string } }
  | { type: 'FOCUS' }
  | { type: 'BLUR' }
  | { type: 'FORMAT'; payload: { command: 'bold' | 'italic' | 'strike' } }
  | { type: 'INSERT_SHAPE'; payload: { shape: 'square' | 'circle' | 'flower'; attrs?: object } }
);

// ============================================
// TYPE GUARDS
// ============================================

/** Check if a message is from the main editor */
export function isMainEditorEvent(msg: unknown): msg is MainEditorEvent {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return (
    m.version === 1 &&
    typeof m.type === 'string' &&
    ['EDITOR_READY', 'EDITOR_FOCUS', 'EDITOR_BLUR', 'CONTENT_CHANGED', 'SELECTION_CHANGED', 'ANCHORS_CHANGED'].includes(m.type)
  );
}

/** Check if a message is from the margin editor */
export function isMarginEditorEvent(msg: unknown): msg is MarginEditorEvent {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return (
    m.version === 1 &&
    typeof m.type === 'string' &&
    ['EDITOR_READY', 'EDITOR_FOCUS', 'EDITOR_BLUR', 'CONTENT_CHANGED', 'SELECTION_CHANGED', 'NOTE_DELETED'].includes(m.type)
  );
}

// ============================================
// LEGACY MESSAGE MAPPING
// ============================================

/**
 * Maps legacy message types to new protocol types.
 * Use this during migration to support both old and new formats.
 */
export const LegacyMainEditorMessageMap = {
  // Main Editor events (old → new)
  'editor-ready': 'EDITOR_READY',
  'editor-focus': 'EDITOR_FOCUS',
  'editor-blur': 'EDITOR_BLUR',
  'content-change': 'CONTENT_CHANGED',
  'selection-change': 'SELECTION_CHANGED',
  'anchor-positions': 'ANCHORS_CHANGED',
  'content-response': 'CONTENT_RESPONSE',
  
  // Main Editor commands (old → new)
  'set-content': 'SET_CONTENT',
  'get-content': 'GET_CONTENT',
  'focus': 'FOCUS',
  'blur': 'BLUR',
  'toggle-bold': 'FORMAT',
  'toggle-italic': 'FORMAT',
  'insert-square': 'INSERT_SHAPE',
  'insert-circle': 'INSERT_SHAPE',
  'insert-flower': 'INSERT_SHAPE',
  'insert-margin-note': 'INSERT_MARGIN_NOTE',
  'delete-margin-note': 'DELETE_MARGIN_NOTE',
} as const;

export const LegacyMarginEditorMessageMap = {
  // Margin Editor events (old → new)
  'editor-ready': 'EDITOR_READY',
  'editor-focus': 'EDITOR_FOCUS',
  'editor-blur': 'EDITOR_BLUR',
  'content-change': 'CONTENT_CHANGED',
  'selection-change': 'SELECTION_CHANGED',
  'note-block-focus': 'EDITOR_FOCUS',
  'delete-margin-note': 'NOTE_DELETED',
  'content-response': 'CONTENT_RESPONSE',
  
  // Margin Editor commands (old → new)
  'set-content': 'SET_CONTENT',
  'get-content': 'GET_CONTENT',
  'focus': 'FOCUS',
  'blur': 'BLUR',
  'toggle-bold': 'FORMAT',
  'toggle-italic': 'FORMAT',
  'insert-square': 'INSERT_SHAPE',
  'insert-circle': 'INSERT_SHAPE',
  'insert-flower': 'INSERT_SHAPE',
  'insert-note-block': 'INSERT_NOTE_BLOCK',
  'delete-note-block': 'DELETE_NOTE_BLOCK',
  'update-note-block-index': 'UPDATE_NOTE_INDICES',
  'update-all-note-block-indices': 'UPDATE_NOTE_INDICES',
  'focus-note-block': 'FOCUS_NOTE',
} as const;

// ============================================
// DEBUG HELPERS
// ============================================

/** Format a message for debug logging */
export function formatMessageForLog(msg: BaseMessage & { type: string }): string {
  const payload = 'payload' in msg ? msg.payload : undefined;
  if (payload) {
    return `${msg.type} ${JSON.stringify(payload)}`;
  }
  return msg.type;
}
