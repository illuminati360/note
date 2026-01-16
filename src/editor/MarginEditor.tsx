import { useRef, useCallback, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { StyleSheet, View, ViewStyle, Text } from 'react-native';
import { marginEditorHtml } from './marginEditorHtml';
import { asyncMessages } from './AsyncMessages';
import { useFocus } from '../margin-notes';
import { createBaseMessage } from '../protocol/messages';
import type { EditorState, EditorContent, SquareAttributes, CircleAttributes, FlowerAttributes } from './TipTapEditor';

const DEBUG = __DEV__;

// Ref interface for the margin editor
export interface MarginEditorRef {
  // Content management
  getContent: () => Promise<EditorContent | null>;
  setContent: (content: string) => void;
  
  // Note block management
  insertNoteBlock: (noteId: string, noteIndex: number) => void;
  deleteNoteBlock: (noteId: string) => void;
  updateNoteBlockIndex: (noteId: string, noteIndex: number) => void;
  updateAllNoteBlockIndices: (indices: { noteId: string; noteIndex: number }[]) => void;
  
  // Focus management
  focus: () => void;
  blur: () => void;
  focusNoteBlock: (noteId: string) => void;
  
  // Formatting
  toggleBold: () => void;
  toggleItalic: () => void;
  insertSquare: (attrs?: SquareAttributes) => void;
  insertCircle: (attrs?: CircleAttributes) => void;
  insertFlower: (attrs?: FlowerAttributes) => void;
}

export interface MarginEditorProps {
  initialContent?: string;
  onContentChange?: (content: EditorContent) => void;
  onSelectionChange?: (state: EditorState) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onNoteBlockFocus?: (noteId: string | null) => void;
  onDeleteNote?: (noteId: string) => void;
  style?: ViewStyle;
}

export const MarginEditor = forwardRef<MarginEditorRef, MarginEditorProps>(
  ({ initialContent, onContentChange, onSelectionChange, onFocus, onBlur, onNoteBlockFocus, onDeleteNote, style }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [isReady, setIsReady] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const { focusNote } = useFocus();
    
    // Track if this editor has focus (at the TipTap level)
    const hasFocusRef = useRef(false);

    // Send typed message to the WebView
    const sendCommand = useCallback((type: string, payload?: any) => {
      if (webViewRef.current) {
        const message = JSON.stringify({
          ...createBaseMessage(),
          type,
          payload,
        });
        if (DEBUG) {
          console.log('[MarginEditor] Sending:', type);
        }
        webViewRef.current.injectJavaScript(`
          window.postMessage(${JSON.stringify(message)}, '*');
          true;
        `);
      }
    }, []);

    // Handle messages from the WebView
    const handleMessage = useCallback((event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (DEBUG) {
          console.log('[MarginEditor] Received:', data.type);
        }
        
        switch (data.type) {
          case 'EDITOR_READY':
            setIsReady(true);
            break;
          case 'CONTENT_CHANGED':
            // Check if content is empty
            const html = data.payload?.html || '';
            setIsEmpty(!html || html === '<p></p>' || html.trim() === '');
            onContentChange?.(data.payload);
            break;
          case 'CONTENT_RESPONSE':
            if (data.payload?.messageId) {
              asyncMessages.handleResponse(data.payload.messageId, {
                html: data.payload.html,
                json: data.payload.json,
              });
            }
            break;
          case 'SELECTION_CHANGED':
            onSelectionChange?.(data.payload);
            break;
          case 'EDITOR_FOCUS':
            hasFocusRef.current = true;
            onFocus?.();
            break;
          case 'EDITOR_BLUR':
            hasFocusRef.current = false;
            onBlur?.();
            break;
          case 'NOTE_BLOCK_FOCUS':
            const noteId = data.payload?.noteId || null;
            onNoteBlockFocus?.(noteId);
            // When a note block is focused, update the global focus state via state machine
            if (noteId) {
              hasFocusRef.current = true;
              focusNote(noteId);
            }
            break;
          case 'DELETE_MARGIN_NOTE':
            // User clicked badge to delete an empty note - notify parent to delete anchor in main editor
            if (data.payload?.noteId) {
              onDeleteNote?.(data.payload.noteId);
            }
            break;
          case 'DEBUG_LOG':
            console.log(`[WebView] ${data.payload?.tag}`, data.payload?.message);
            break;
        }
      } catch (error) {
        console.warn('Failed to parse message from margin editor:', error);
      }
    }, [onContentChange, onSelectionChange, onFocus, onBlur, onNoteBlockFocus, onDeleteNote, focusNote]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getContent: () => {
        return asyncMessages.sendAsyncMessage<EditorContent>(
          'GET_CONTENT',
          sendCommand,
          5000
        );
      },
      setContent: (content: string) => sendCommand('SET_CONTENT', { content }),
      insertNoteBlock: (noteId: string, noteIndex: number) => {
        sendCommand('INSERT_NOTE_BLOCK', { noteId, noteIndex });
        setIsEmpty(false);
        // The WebView will send a 'NOTE_BLOCK_FOCUS' event after insertion
        // which will set the focusedEditor state
      },
      deleteNoteBlock: (noteId: string) => sendCommand('DELETE_NOTE_BLOCK', { noteId }),
      updateNoteBlockIndex: (noteId: string, noteIndex: number) => 
        sendCommand('UPDATE_NOTE_BLOCK_INDEX', { noteId, noteIndex }),
      updateAllNoteBlockIndices: (indices: { noteId: string; noteIndex: number }[]) =>
        sendCommand('UPDATE_ALL_NOTE_BLOCK_INDICES', { indices }),
      focus: () => sendCommand('FOCUS'),
      blur: () => sendCommand('BLUR'),
      focusNoteBlock: (noteId: string) => sendCommand('FOCUS_NOTE_BLOCK', { noteId }),
      toggleBold: () => sendCommand('TOGGLE_BOLD'),
      toggleItalic: () => sendCommand('TOGGLE_ITALIC'),
      insertSquare: (attrs?: SquareAttributes) => sendCommand('INSERT_SQUARE', attrs || {}),
      insertCircle: (attrs?: CircleAttributes) => sendCommand('INSERT_CIRCLE', attrs || {}),
      insertFlower: (attrs?: FlowerAttributes) => sendCommand('INSERT_FLOWER', attrs || {}),
    }), [sendCommand]);

    // Inject initial content when ready
    useEffect(() => {
      if (isReady && initialContent) {
        sendCommand('SET_CONTENT', { content: initialContent });
      }
    }, [isReady, initialContent, sendCommand]);

    // Inject initial content script before page loads
    const injectedJavaScript = initialContent
      ? `window.initialContent = ${JSON.stringify(initialContent)}; true;`
      : 'true;';

    return (
      <View style={[styles.container, style]}>
        {isEmpty && (
          <View style={[styles.emptyState, { pointerEvents: 'none' }]}>
            <Text style={styles.emptyText}>Margin Notes</Text>
          </View>
        )}
        <View 
          style={[styles.webViewContainer, isEmpty && styles.hidden, { pointerEvents: isEmpty ? 'none' : 'auto' }]}
        >
          <WebView
            ref={webViewRef}
            source={{ html: marginEditorHtml }}
            style={styles.webView}
            onMessage={handleMessage}
            injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
            keyboardDisplayRequiresUserAction={false}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            originWhitelist={['*']}
          />
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  emptyState: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 12,
    color: '#999',
  },
  hidden: {
    opacity: 0,
  },
});

export default MarginEditor;
