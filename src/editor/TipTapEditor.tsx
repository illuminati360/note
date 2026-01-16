import { useRef, useCallback, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { editorHtml } from './editorHtml';
import { asyncMessages } from './AsyncMessages';
import type { SquareAttributes, CircleAttributes, FlowerAttributes, MarginNoteAttributes } from '@prose/tiptap-extensions';
import type { MarginNoteData } from '../components/MarginNotesPanel';

// Re-export shape attributes for consumers
export type { SquareAttributes, CircleAttributes, FlowerAttributes, MarginNoteAttributes } from '@prose/tiptap-extensions';

// Re-export MarginNoteData for consumers
export type { MarginNoteData } from '../components/MarginNotesPanel';

// Types for editor state
export interface EditorState {
  isBold: boolean;
  isItalic: boolean;
  isStrike: boolean;
  isCode: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
  isHeading: boolean;
}

// Types for content
export interface EditorContent {
  html: string;
  json: any;
}

// Props for the TipTap editor component
export interface TipTapEditorProps {
  initialContent?: string;
  onContentChange?: (content: EditorContent) => void;
  onSelectionChange?: (state: EditorState) => void;
  onReady?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onAnchorPositions?: (positions: MarginNoteData[]) => void;
  onMarginNoteDeleted?: (id: string) => void;
  style?: ViewStyle;
}

// Ref interface for controlling the editor
export interface TipTapEditorRef {
  setContent: (content: string) => void;
  getContent: () => Promise<EditorContent | null>;
  focus: () => void;
  blur: () => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  insertSquare: (attrs?: SquareAttributes) => void;
  insertCircle: (attrs?: CircleAttributes) => void;
  insertFlower: (attrs?: FlowerAttributes) => void;
  insertMarginNote: (id: string, noteIndex: number) => void;
  deleteMarginNote: (id: string) => void;
  getAnchorPositions: () => void;
}

export const TipTapEditor = forwardRef<TipTapEditorRef, TipTapEditorProps>(
  ({ initialContent, onContentChange, onSelectionChange, onReady, onFocus, onBlur, onAnchorPositions, onMarginNoteDeleted, style }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [isReady, setIsReady] = useState(false);

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
            onReady?.();
            break;
          case 'content-change':
            // Content changed by user editing
            onContentChange?.(data.payload);
            break;
          case 'content-response':
            // Response to getContent request, match by messageId
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
          case 'anchor-positions':
            onAnchorPositions?.(data.payload.positions);
            break;
          case 'margin-note-deleted':
            onMarginNoteDeleted?.(data.payload.id);
            break;
          case 'editor-focus':
            onFocus?.();
            console.log("main editor focus event received")
            break;
          case 'editor-blur':
            onBlur?.();
            break;
        }
      } catch (error) {
        console.warn('Failed to parse message from editor:', error);
      }
    }, [onContentChange, onSelectionChange, onReady, onFocus, onBlur, onAnchorPositions, onMarginNoteDeleted]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      setContent: (content: string) => sendMessage('set-content', content),
      getContent: () => {
        return asyncMessages.sendAsyncMessage<EditorContent>(
          'get-content',
          sendMessage,
          5000  // 5 second timeout
        );
      },
      focus: () => sendMessage('focus'),
      blur: () => sendMessage('blur'),
      toggleBold: () => sendMessage('toggle-bold'),
      toggleItalic: () => sendMessage('toggle-italic'),
      insertSquare: (attrs?: SquareAttributes) => sendMessage('insert-square', attrs || {}),
      insertCircle: (attrs?: CircleAttributes) => sendMessage('insert-circle', attrs || {}),
      insertFlower: (attrs?: FlowerAttributes) => sendMessage('insert-flower', attrs || {}),
      insertMarginNote: (id: string, noteIndex: number) => sendMessage('insert-margin-note', { id, noteIndex }),
      deleteMarginNote: (id: string) => sendMessage('delete-margin-note', { id }),
      getAnchorPositions: () => sendMessage('get-anchor-positions'),
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
        <WebView
          ref={webViewRef}
          source={{ html: editorHtml }}
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
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default TipTapEditor;
