import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Square, Circle, Flower, MarginNote, NoteHighlight } from '@prose/tiptap-extensions';

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
  type: 'content-change' | 'content-response' | 'editor-ready' | 'selection-change' | 'anchor-positions' | 'margin-note-deleted' | 'editor-focus' | 'editor-blur';
  payload: any;
};

type MessageFromRN = {
  type: 'set-content' | 'get-content' | 'focus' | 'blur' | 'toggle-bold' | 'toggle-italic' | 'insert-square' | 'insert-circle' | 'insert-flower' | 'insert-margin-note' | 'delete-margin-note' | 'get-anchor-positions';
  payload?: any;
};

// Send message to React Native
function sendToRN(message: MessageToRN) {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
}

// Initialize the TipTap editor
function initEditor() {
  const initialContent = window.initialContent || '<p>Start typing...</p>';
  
  const editor = new Editor({
    element: document.getElementById('editor')!,
    extensions: [StarterKit, Square, Circle, Flower, MarginNote, NoteHighlight],
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
          isHeading: editor.isActive('heading'),
        },
      });
    },
    onFocus: () => {
      sendToRN({
        type: 'editor-focus',
        payload: {},
      });
    },
    onBlur: () => {
      sendToRN({
        type: 'editor-blur',
        payload: {},
      });
    },
  });

  // Expose editor to window for debugging
  window.editor = editor;

  // Track previous anchor IDs to detect deletions
  let previousAnchorIds = new Set<string>();

  // Get line number for a position in the document
  // Line = count of block nodes (paragraphs, headings, etc.) from start
  function getLineNumber(pos: number): number {
    let line = 0;
    const doc = editor.state.doc;
    
    doc.nodesBetween(0, pos, (node, nodePos) => {
      // Count block-level nodes that start before this position
      if (node.isBlock && nodePos < pos) {
        line++;
      }
      return true;
    });
    
    return line;
  }

  // Find all margin note anchors and their line positions
  function getAnchorPositions(): Array<{
    id: string;
    noteIndex: number;
    line: number;
    blockIndex: number;
  }> {
    const positions: Array<{
      id: string;
      noteIndex: number;
      line: number;
      blockIndex: number;
    }> = [];
    
    let blockIndex = 0;
    
    editor.state.doc.descendants((node, pos) => {
      // Track block nodes
      if (node.isBlock) {
        blockIndex++;
      }
      
      // Find margin note nodes
      if (node.type.name === 'marginNote') {
        const id = node.attrs.id;
        const noteIndex = node.attrs.noteIndex;
        const line = getLineNumber(pos);
        
        positions.push({
          id,
          noteIndex,
          line,
          blockIndex,
        });
      }
      
      return true;
    });
    
    return positions;
  }

  // Send anchor positions to React Native
  function sendAnchorPositions() {
    const positions = getAnchorPositions();

    // Detect deleted anchors
    const currentIds = new Set(positions.map(p => p.id).filter(Boolean) as string[]);
    previousAnchorIds.forEach(id => {
      if (!currentIds.has(id)) {
        sendToRN({
          type: 'margin-note-deleted',
          payload: { id },
        });
      }
    });
    previousAnchorIds = currentIds;

    sendToRN({
      type: 'anchor-positions',
      payload: { positions },
    });
  }

  // Send anchor positions on content update
  editor.on('update', sendAnchorPositions);

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
            messageId: data.payload?.messageId,  // 返回请求中的 messageId
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
      case 'insert-margin-note':
        editor.chain().focus().insertMarginNote(data.payload.id, data.payload.noteIndex).run();
        // Send updated positions after insertion
        setTimeout(sendAnchorPositions, 0);
        break;
      case 'delete-margin-note':
        editor.chain().focus().deleteMarginNote(data.payload.id).run();
        // Send updated positions after deletion
        setTimeout(sendAnchorPositions, 0);
        break;
      case 'get-anchor-positions':
        sendAnchorPositions();
        break;
    }
  }

  // Listen for messages from both window and document (for cross-platform compatibility)
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
