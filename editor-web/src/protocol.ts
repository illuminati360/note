/**
 * Message Protocol for Editor ↔ React Native Communication
 * 
 * This file defines the typed message protocol used between
 * the WebView editors and React Native.
 * 
 * Convention:
 * - Events: WebView → React Native (something happened)
 * - Commands: React Native → WebView (do something)
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

/** Anchor data from the main editor */
export interface AnchorData {
  id: string;
  noteIndex: number;
  line: number;
  blockIndex: number;
}

// ============================================
// MAIN EDITOR EVENTS (WebView → RN)
// ============================================

export type MainEditorEventType = 
  | 'EDITOR_READY'
  | 'EDITOR_FOCUS'
  | 'EDITOR_BLUR'
  | 'CONTENT_CHANGED'
  | 'SELECTION_CHANGED'
  | 'ANCHORS_CHANGED'
  | 'CONTENT_RESPONSE'
  | 'MARGIN_NOTE_DELETED';

export type MainEditorEvent = BaseMessage & (
  | { type: 'EDITOR_READY'; payload: { success: boolean } }
  | { type: 'EDITOR_FOCUS'; payload: Record<string, never> }
  | { type: 'EDITOR_BLUR'; payload: Record<string, never> }
  | { type: 'CONTENT_CHANGED'; payload: { html: string; json: object } }
  | { type: 'SELECTION_CHANGED'; payload: SelectionState }
  | { type: 'ANCHORS_CHANGED'; payload: { positions: AnchorData[] } }
  | { type: 'CONTENT_RESPONSE'; payload: { html: string; json: object; messageId: string } }
  | { type: 'MARGIN_NOTE_DELETED'; payload: { id: string } }
);

// ============================================
// MAIN EDITOR COMMANDS (RN → WebView)
// ============================================

export type MainEditorCommandType =
  | 'SET_CONTENT'
  | 'GET_CONTENT'
  | 'FOCUS'
  | 'BLUR'
  | 'TOGGLE_BOLD'
  | 'TOGGLE_ITALIC'
  | 'INSERT_SQUARE'
  | 'INSERT_CIRCLE'
  | 'INSERT_FLOWER'
  | 'INSERT_MARGIN_NOTE'
  | 'DELETE_MARGIN_NOTE'
  | 'GET_ANCHOR_POSITIONS';

export type MainEditorCommand = BaseMessage & (
  | { type: 'SET_CONTENT'; payload: { content: string } }
  | { type: 'GET_CONTENT'; payload: { messageId: string } }
  | { type: 'FOCUS'; payload?: Record<string, never> }
  | { type: 'BLUR'; payload?: Record<string, never> }
  | { type: 'TOGGLE_BOLD'; payload?: Record<string, never> }
  | { type: 'TOGGLE_ITALIC'; payload?: Record<string, never> }
  | { type: 'INSERT_SQUARE'; payload?: object }
  | { type: 'INSERT_CIRCLE'; payload?: object }
  | { type: 'INSERT_FLOWER'; payload?: object }
  | { type: 'INSERT_MARGIN_NOTE'; payload: { id: string; noteIndex: number } }
  | { type: 'DELETE_MARGIN_NOTE'; payload: { id: string } }
  | { type: 'GET_ANCHOR_POSITIONS'; payload?: Record<string, never> }
);

// ============================================
// MARGIN EDITOR EVENTS (WebView → RN)
// ============================================

export type MarginEditorEventType =
  | 'EDITOR_READY'
  | 'EDITOR_FOCUS'
  | 'EDITOR_BLUR'
  | 'CONTENT_CHANGED'
  | 'SELECTION_CHANGED'
  | 'CONTENT_RESPONSE'
  | 'NOTE_BLOCK_FOCUS'
  | 'DELETE_MARGIN_NOTE';

export type MarginEditorEvent = BaseMessage & (
  | { type: 'EDITOR_READY'; payload: { success: boolean } }
  | { type: 'EDITOR_FOCUS'; payload: Record<string, never> }
  | { type: 'EDITOR_BLUR'; payload: Record<string, never> }
  | { type: 'CONTENT_CHANGED'; payload: { html: string; json: object } }
  | { type: 'SELECTION_CHANGED'; payload: SelectionState }
  | { type: 'CONTENT_RESPONSE'; payload: { html: string; json: object; messageId: string } }
  | { type: 'NOTE_BLOCK_FOCUS'; payload: { noteId: string | null } }
  | { type: 'DELETE_MARGIN_NOTE'; payload: { noteId: string } }
);

// ============================================
// MARGIN EDITOR COMMANDS (RN → WebView)
// ============================================

export type MarginEditorCommandType =
  | 'SET_CONTENT'
  | 'GET_CONTENT'
  | 'FOCUS'
  | 'BLUR'
  | 'TOGGLE_BOLD'
  | 'TOGGLE_ITALIC'
  | 'INSERT_SQUARE'
  | 'INSERT_CIRCLE'
  | 'INSERT_FLOWER'
  | 'INSERT_NOTE_BLOCK'
  | 'DELETE_NOTE_BLOCK'
  | 'UPDATE_NOTE_BLOCK_INDEX'
  | 'UPDATE_ALL_NOTE_BLOCK_INDICES'
  | 'FOCUS_NOTE_BLOCK';

export type MarginEditorCommand = BaseMessage & (
  | { type: 'SET_CONTENT'; payload: { content: string } }
  | { type: 'GET_CONTENT'; payload: { messageId: string } }
  | { type: 'FOCUS'; payload?: Record<string, never> }
  | { type: 'BLUR'; payload?: Record<string, never> }
  | { type: 'TOGGLE_BOLD'; payload?: Record<string, never> }
  | { type: 'TOGGLE_ITALIC'; payload?: Record<string, never> }
  | { type: 'INSERT_SQUARE'; payload?: object }
  | { type: 'INSERT_CIRCLE'; payload?: object }
  | { type: 'INSERT_FLOWER'; payload?: object }
  | { type: 'INSERT_NOTE_BLOCK'; payload: { noteId: string; noteIndex: number } }
  | { type: 'DELETE_NOTE_BLOCK'; payload: { noteId: string } }
  | { type: 'UPDATE_NOTE_BLOCK_INDEX'; payload: { noteId: string; noteIndex: number } }
  | { type: 'UPDATE_ALL_NOTE_BLOCK_INDICES'; payload: { indices: Array<{ noteId: string; noteIndex: number }> } }
  | { type: 'FOCUS_NOTE_BLOCK'; payload: { noteId: string } }
);

// ============================================
// DEBUG HELPERS
// ============================================

/** Debug log event that can also be sent to RN */
export interface DebugLogEvent extends BaseMessage {
  type: 'DEBUG_LOG';
  payload: { tag: string; message: string };
}

/** Format a message for debug logging */
export function formatMessage(msg: { type: string; payload?: unknown }): string {
  if (msg.payload && Object.keys(msg.payload as object).length > 0) {
    return `${msg.type} ${JSON.stringify(msg.payload)}`;
  }
  return msg.type;
}

// ============================================
// LEGACY MESSAGE MAPPING (for gradual migration)
// ============================================

/** Maps legacy message types to new typed message types */
export const LEGACY_TO_NEW: Record<string, string> = {
  // Main Editor Events
  'editor-ready': 'EDITOR_READY',
  'editor-focus': 'EDITOR_FOCUS',
  'editor-blur': 'EDITOR_BLUR',
  'content-change': 'CONTENT_CHANGED',
  'selection-change': 'SELECTION_CHANGED',
  'anchor-positions': 'ANCHORS_CHANGED',
  'content-response': 'CONTENT_RESPONSE',
  'margin-note-deleted': 'MARGIN_NOTE_DELETED',
  
  // Main Editor Commands
  'set-content': 'SET_CONTENT',
  'get-content': 'GET_CONTENT',
  'focus': 'FOCUS',
  'blur': 'BLUR',
  'toggle-bold': 'TOGGLE_BOLD',
  'toggle-italic': 'TOGGLE_ITALIC',
  'insert-square': 'INSERT_SQUARE',
  'insert-circle': 'INSERT_CIRCLE',
  'insert-flower': 'INSERT_FLOWER',
  'insert-margin-note': 'INSERT_MARGIN_NOTE',
  'delete-margin-note': 'DELETE_MARGIN_NOTE',
  'get-anchor-positions': 'GET_ANCHOR_POSITIONS',
  
  // Margin Editor Events
  'note-block-focus': 'NOTE_BLOCK_FOCUS',
  
  // Margin Editor Commands
  'insert-note-block': 'INSERT_NOTE_BLOCK',
  'delete-note-block': 'DELETE_NOTE_BLOCK',
  'update-note-block-index': 'UPDATE_NOTE_BLOCK_INDEX',
  'update-all-note-block-indices': 'UPDATE_ALL_NOTE_BLOCK_INDICES',
  'focus-note-block': 'FOCUS_NOTE_BLOCK',
};

/** Maps new message types to legacy types (for backwards compatibility) */
export const NEW_TO_LEGACY: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_TO_NEW).map(([legacy, newType]) => [newType, legacy])
);

/**
 * Convert a legacy message type to the new format.
 * Returns the original type if not found in mapping.
 */
export function toLegacyType(newType: string): string {
  return NEW_TO_LEGACY[newType] || newType.toLowerCase().replace(/_/g, '-');
}

/**
 * Convert a new message type from legacy format.
 * Returns the original type if not found in mapping.
 */
export function fromLegacyType(legacyType: string): string {
  return LEGACY_TO_NEW[legacyType] || legacyType.toUpperCase().replace(/-/g, '_');
}
