import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Square, Circle, Flower, MarginNoteBlock } from '@prose/tiptap-extensions';

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

// Message types for communication with React Native
type MessageToRN = {
  type: 'content-change' | 'content-response' | 'editor-ready' | 'selection-change' | 'editor-focus' | 'editor-blur' | 'note-block-focus' | 'delete-margin-note';
  payload: any;
};

type MessageFromRN = {
  type: 'set-content' | 'get-content' | 'focus' | 'blur' | 'toggle-bold' | 'toggle-italic' 
      | 'insert-square' | 'insert-circle' | 'insert-flower'
      | 'insert-note-block' | 'delete-note-block' | 'update-note-block-index' | 'update-all-note-block-indices'
      | 'focus-note-block';
  payload?: any;
};

// Send message to React Native
function sendToRN(message: MessageToRN) {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
}

// Debug log that sends to React Native
function debugLog(tag: string, ...args: any[]) {
  console.log(tag, ...args);
  if (window.ReactNativeWebView) {
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
            type: 'delete-margin-note',
            payload: { noteId },
          });
        },
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      sendToRN({
        type: 'content-change',
        payload: {
          html: editor.getHTML(),
          json: editor.getJSON(),
        },
      });
    },
    onSelectionUpdate: ({ editor }) => {
      sendToRN({
        type: 'selection-change',
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
          type: 'note-block-focus',
          payload: { noteId: currentNoteId },
        });
      }
    },
    onFocus: ({ editor }) => {
      debugLog('[MarginEditor]', 'onFocus triggered');
      sendToRN({
        type: 'editor-focus',
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
          type: 'note-block-focus',
          payload: { noteId: currentNoteId },
        });
      }
    },
    onBlur: () => {
      debugLog('[MarginEditor]', 'onBlur triggered');
      sendToRN({
        type: 'editor-blur',
        payload: {},
      });
      lastFocusedNoteId = null;
      sendToRN({
        type: 'note-block-focus',
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
    let data: MessageFromRN;
    try {
      data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch {
      return;
    }

    switch (data.type) {
      case 'set-content':
        editor.commands.setContent(data.payload);
        break;
      case 'get-content':
        sendToRN({
          type: 'content-response',
          payload: {
            messageId: data.payload?.messageId,
            html: editor.getHTML(),
            json: editor.getJSON(),
          },
        });
        break;
      case 'focus':
        editor.commands.focus();
        break;
      case 'blur':
        editor.commands.blur();
        break;
      case 'toggle-bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'toggle-italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'insert-square':
        editor.chain().focus().insertSquare(data.payload || {}).run();
        break;
      case 'insert-circle':
        editor.chain().focus().insertCircle(data.payload || {}).run();
        break;
      case 'insert-flower':
        editor.chain().focus().insertFlower(data.payload || {}).run();
        break;
      case 'insert-note-block': {
        debugLog('[MarginEditor]', 'insert-note-block received:', data.payload);
        const { noteId, noteIndex } = data.payload;
        editor.chain().insertMarginNoteBlock(noteId, noteIndex).run();
        debugLog('[MarginEditor]', 'insert-note-block done, NOT focusing');
        // Don't auto-focus the new note block - let the user decide where to focus
        // This prevents stealing focus from the main editor
        break;
      }
      case 'delete-note-block':
        debugLog('[MarginEditor]', 'delete-note-block received:', data.payload);
        editor.commands.deleteMarginNoteBlock(data.payload.noteId);
        // After deletion, blur the editor to prevent focus issues
        // The user can click to focus whatever editor they want
        editor.commands.blur();
        debugLog('[MarginEditor]', 'delete-note-block done, blurred');
        break;
      case 'update-note-block-index':
        editor.commands.updateMarginNoteBlockIndex(data.payload.noteId, data.payload.noteIndex);
        break;
      case 'update-all-note-block-indices': {
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
      case 'focus-note-block':
        focusNoteBlock(data.payload.noteId);
        break;
    }
  }

  // Listen for messages
  window.addEventListener('message', handleMessage);
  document.addEventListener('message', handleMessage as EventListener);

  // Notify React Native that editor is ready
  sendToRN({
    type: 'editor-ready',
    payload: { success: true },
  });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditor);
} else {
  initEditor();
}
