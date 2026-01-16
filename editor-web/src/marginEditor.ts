import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Square, Circle, Flower, MarginNoteBlock } from '@prose/tiptap-extensions';
import {
  MarginEditorEvent,
  MarginEditorCommand,
  createBaseMessage,
} from './protocol';

const DEBUG = process.env.NODE_ENV === 'development';

// Declare the ReactNativeWebView interface for type safety
declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    editor?: Editor;
    initialContent?: string;
  }
}

// Send typed message to React Native
function sendToRN(event: MarginEditorEvent) {
  if (window.ReactNativeWebView) {
    if (DEBUG) {
      console.log('[MarginEditor] Sending:', event.type, event.payload);
    }
    window.ReactNativeWebView.postMessage(JSON.stringify(event));
  }
}

// Debug log that sends to React Native
function debugLog(tag: string, ...args: any[]) {
  console.log(tag, ...args);
  if (DEBUG && window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'debug-log',
      payload: { tag, message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') },
    }));
  }
}

// Initialize the margin editor
function initEditor() {
  const initialContent = window.initialContent || '';
  
  let lastFocusedNoteId: string | null = null;

  const editor = new Editor({
    element: document.getElementById('editor')!,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Square,
      Circle,
      Flower,
      MarginNoteBlock.configure({
        onDeleteNote: (noteId: string) => {
          // Send message to React Native to delete the anchor in main editor
          sendToRN({
            ...createBaseMessage(),
            type: 'DELETE_MARGIN_NOTE',
            payload: { noteId },
          });
        },
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      sendToRN({
        ...createBaseMessage(),
        type: 'CONTENT_CHANGED',
        payload: {
          html: editor.getHTML(),
          json: editor.getJSON(),
        },
      });
    },
    onSelectionUpdate: ({ editor }) => {
      sendToRN({
        ...createBaseMessage(),
        type: 'SELECTION_CHANGED',
        payload: {
          isBold: editor.isActive('bold'),
          isItalic: editor.isActive('italic'),
          isStrike: editor.isActive('strike'),
          isCode: editor.isActive('code'),
          isBulletList: editor.isActive('bulletList'),
          isOrderedList: editor.isActive('orderedList'),
          isHeading: false,
        },
      });

      // Only detect note block focus if the editor actually has focus
      // This prevents sending note-block-focus when note blocks are inserted/deleted
      // while the main editor has focus
      if (!editor.isFocused) {
        return;
      }

      // Detect which note block has the cursor
      const { $from } = editor.state.selection;
      let currentNoteId: string | null = null;
      
      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d);
        if (node.type.name === 'marginNoteBlock') {
          currentNoteId = node.attrs.noteId;
          break;
        }
      }

      if (currentNoteId !== lastFocusedNoteId) {
        lastFocusedNoteId = currentNoteId;
        sendToRN({
          ...createBaseMessage(),
          type: 'NOTE_BLOCK_FOCUS',
          payload: { noteId: currentNoteId },
        });
      }
    },
    onFocus: ({ editor }) => {
      debugLog('[MarginEditor]', 'onFocus triggered');
      sendToRN({
        ...createBaseMessage(),
        type: 'EDITOR_FOCUS',
        payload: {},
      });
      
      // Also detect and send the current note block when editor gains focus
      const { $from } = editor.state.selection;
      let currentNoteId: string | null = null;
      
      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d);
        if (node.type.name === 'marginNoteBlock') {
          currentNoteId = node.attrs.noteId;
          break;
        }
      }
      
      if (currentNoteId) {
        lastFocusedNoteId = currentNoteId;
        sendToRN({
          ...createBaseMessage(),
          type: 'NOTE_BLOCK_FOCUS',
          payload: { noteId: currentNoteId },
        });
      }
    },
    onBlur: () => {
      debugLog('[MarginEditor]', 'onBlur triggered');
      sendToRN({
        ...createBaseMessage(),
        type: 'EDITOR_BLUR',
        payload: {},
      });
      lastFocusedNoteId = null;
      sendToRN({
        ...createBaseMessage(),
        type: 'NOTE_BLOCK_FOCUS',
        payload: { noteId: null },
      });
    },
  });

  // Expose editor to window for debugging
  window.editor = editor;

  // Helper to focus a note block by ID
  function focusNoteBlock(noteId: string) {
    const { doc } = editor.state;
    let targetPos: number | null = null;

    doc.descendants((node, pos) => {
      if (node.type.name === 'marginNoteBlock' && node.attrs.noteId === noteId) {
        targetPos = pos + 2;
        return false;
      }
      return true;
    });

    if (targetPos !== null) {
      editor.chain().focus().setTextSelection(targetPos).run();
    }
  }

  // Handle messages from React Native
  function handleMessage(event: MessageEvent) {
    let data: MarginEditorCommand;
    try {
      data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch {
      return;
    }

    if (DEBUG) {
      console.log('[MarginEditor] Received:', data.type);
    }

    switch (data.type) {
      case 'SET_CONTENT':
        editor.commands.setContent(data.payload.content);
        break;
      case 'GET_CONTENT':
        sendToRN({
          ...createBaseMessage(data.correlationId),
          type: 'CONTENT_RESPONSE',
          payload: {
            messageId: data.payload.messageId,
            html: editor.getHTML(),
            json: editor.getJSON(),
          },
        });
        break;
      case 'FOCUS':
        editor.commands.focus();
        break;
      case 'BLUR':
        editor.commands.blur();
        break;
      case 'TOGGLE_BOLD':
        editor.chain().focus().toggleBold().run();
        break;
      case 'TOGGLE_ITALIC':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'INSERT_SQUARE':
        editor.chain().focus().insertSquare(data.payload || {}).run();
        break;
      case 'INSERT_CIRCLE':
        editor.chain().focus().insertCircle(data.payload || {}).run();
        break;
      case 'INSERT_FLOWER':
        editor.chain().focus().insertFlower(data.payload || {}).run();
        break;
      case 'INSERT_NOTE_BLOCK': {
        debugLog('[MarginEditor]', 'INSERT_NOTE_BLOCK received:', data.payload);
        const { noteId, noteIndex } = data.payload;
        editor.chain().insertMarginNoteBlock(noteId, noteIndex).run();
        debugLog('[MarginEditor]', 'INSERT_NOTE_BLOCK done, NOT focusing');
        // Don't auto-focus the new note block - let the user decide where to focus
        // This prevents stealing focus from the main editor
        break;
      }
      case 'DELETE_NOTE_BLOCK':
        debugLog('[MarginEditor]', 'DELETE_NOTE_BLOCK received:', data.payload);
        editor.commands.deleteMarginNoteBlock(data.payload.noteId);
        // After deletion, blur the editor to prevent focus issues
        // The user can click to focus whatever editor they want
        editor.commands.blur();
        debugLog('[MarginEditor]', 'DELETE_NOTE_BLOCK done, blurred');
        break;
      case 'UPDATE_NOTE_BLOCK_INDEX':
        editor.commands.updateMarginNoteBlockIndex(data.payload.noteId, data.payload.noteIndex);
        break;
      case 'UPDATE_ALL_NOTE_BLOCK_INDICES': {
        const indices = data.payload.indices as { noteId: string; noteIndex: number }[];
        const { tr, doc } = editor.state;
        
        doc.descendants((node, pos) => {
          if (node.type.name === 'marginNoteBlock') {
            const update = indices.find(i => i.noteId === node.attrs.noteId);
            if (update && update.noteIndex !== node.attrs.noteIndex) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                noteIndex: update.noteIndex,
              });
            }
          }
          return true;
        });
        
        if (tr.docChanged) {
          editor.view.dispatch(tr);
        }
        break;
      }
      case 'FOCUS_NOTE_BLOCK':
        focusNoteBlock(data.payload.noteId);
        break;
    }
  }

  // Listen for messages
  window.addEventListener('message', handleMessage);
  document.addEventListener('message', handleMessage as EventListener);

  // Notify React Native that editor is ready
  sendToRN({
    ...createBaseMessage(),
    type: 'EDITOR_READY',
    payload: { success: true },
  });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditor);
} else {
  initEditor();
}
