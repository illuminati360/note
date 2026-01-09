import React, { useRef, useCallback, useState, useEffect } from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { StyleSheet, View, ViewStyle, Text } from 'react-native';
import { marginEditorHtml } from './marginEditorHtml';
import { asyncMessages } from './AsyncMessages';
import { useEditorFocus } from './EditorFocusContext';
import type { EditorState, EditorContent, SquareAttributes, CircleAttributes, FlowerAttributes } from './TipTapEditor';

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
  style?: ViewStyle;
}

export const MarginEditor = React.forwardRef<MarginEditorRef, MarginEditorProps>(
  ({ initialContent, onContentChange, onSelectionChange, onFocus, onBlur, onNoteBlockFocus, style }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [isReady, setIsReady] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const { setFocusedEditor } = useEditorFocus();

    // Send message to the WebView
    const sendMessage = useCallback((type: string, payload?: any) => {
      if (webViewRef.current) {
        const message = JSON.stringify({ type, payload });
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
        
        switch (data.type) {
          case 'editor-ready':
            setIsReady(true);
            break;
          case 'content-change':
            // Check if content is empty
            const html = data.payload?.html || '';
            setIsEmpty(!html || html === '<p></p>' || html.trim() === '');
            onContentChange?.(data.payload);
            break;
          case 'content-response':
            if (data.payload?.messageId) {
              asyncMessages.handleResponse(data.payload.messageId, {
                html: data.payload.html,
                json: data.payload.json,
              });
            }
            break;
          case 'selection-change':
            onSelectionChange?.(data.payload);
            break;
          case 'editor-focus':
            onFocus?.();
            break;
          case 'editor-blur':
            onBlur?.();
            break;
          case 'note-block-focus':
            const noteId = data.payload?.noteId || null;
            onNoteBlockFocus?.(noteId);
            if (noteId) {
              setFocusedEditor(noteId);
            }
            break;
        }
      } catch (error) {
        console.warn('Failed to parse message from margin editor:', error);
      }
    }, [onContentChange, onSelectionChange, onFocus, onBlur, onNoteBlockFocus, setFocusedEditor]);

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
      getContent: () => {
        return asyncMessages.sendAsyncMessage<EditorContent>(
          'get-content',
          sendMessage,
          5000
        );
      },
      setContent: (content: string) => sendMessage('set-content', content),
      insertNoteBlock: (noteId: string, noteIndex: number) => {
        sendMessage('insert-note-block', { noteId, noteIndex });
        setIsEmpty(false);
        // The WebView will send a 'note-block-focus' event after insertion
        // which will set the focusedEditor state
      },
      deleteNoteBlock: (noteId: string) => sendMessage('delete-note-block', { noteId }),
      updateNoteBlockIndex: (noteId: string, noteIndex: number) => 
        sendMessage('update-note-block-index', { noteId, noteIndex }),
      updateAllNoteBlockIndices: (indices: { noteId: string; noteIndex: number }[]) =>
        sendMessage('update-all-note-block-indices', { indices }),
      focus: () => sendMessage('focus'),
      blur: () => sendMessage('blur'),
      focusNoteBlock: (noteId: string) => sendMessage('focus-note-block', { noteId }),
      toggleBold: () => sendMessage('toggle-bold'),
      toggleItalic: () => sendMessage('toggle-italic'),
      insertSquare: (attrs?: SquareAttributes) => sendMessage('insert-square', attrs || {}),
      insertCircle: (attrs?: CircleAttributes) => sendMessage('insert-circle', attrs || {}),
      insertFlower: (attrs?: FlowerAttributes) => sendMessage('insert-flower', attrs || {}),
    }), [sendMessage]);

    // Inject initial content when ready
    useEffect(() => {
      if (isReady && initialContent) {
        sendMessage('set-content', initialContent);
      }
    }, [isReady, initialContent, sendMessage]);

    // Inject initial content script before page loads
    const injectedJavaScript = initialContent
      ? `window.initialContent = ${JSON.stringify(initialContent)}; true;`
      : 'true;';

    return (
      <View style={[styles.container, style]}>
        {isEmpty && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No notes</Text>
            <Text style={styles.emptyHint}>Click 📝 to add a note</Text>
          </View>
        )}
        <View style={[styles.webViewContainer, isEmpty && styles.hidden]}>
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
