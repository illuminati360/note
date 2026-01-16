import { useRef, useCallback, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { editorHtml } from './editorHtml';
import { asyncMessages } from './AsyncMessages';
import { createBaseMessage } from '../protocol/messages';
import type { SquareAttributes, CircleAttributes, FlowerAttributes, MarginNoteAttributes } from '@prose/tiptap-extensions';
import type { MarginNoteData } from '../components/MarginNotesPanel';

const DEBUG = __DEV__;

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

    // Send typed message to the WebView
    const sendCommand = useCallback((type: string, payload?: any) => {
      if (webViewRef.current) {
        const message = JSON.stringify({
          ...createBaseMessage(),
          type,
          payload,
        });
        if (DEBUG) {
          console.log('[TipTapEditor] Sending:', type);
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
          console.log('[TipTapEditor] Received:', data.type);
        }
        
        switch (data.type) {
          case 'EDITOR_READY':
            setIsReady(true);
            onReady?.();
            break;
          case 'CONTENT_CHANGED':
            // Content changed by user editing
            onContentChange?.(data.payload);
            break;
          case 'CONTENT_RESPONSE':
            // Response to getContent request, match by messageId
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
          case 'ANCHORS_CHANGED':
            onAnchorPositions?.(data.payload.positions);
            break;
          case 'MARGIN_NOTE_DELETED':
            onMarginNoteDeleted?.(data.payload.id);
            break;
          case 'EDITOR_FOCUS':
            onFocus?.();
            if (DEBUG) console.log('[TipTapEditor] Focus event received');
            break;
          case 'EDITOR_BLUR':
            onBlur?.();
            break;
        }
      } catch (error) {
        console.warn('Failed to parse message from editor:', error);
      }
    }, [onContentChange, onSelectionChange, onReady, onFocus, onBlur, onAnchorPositions, onMarginNoteDeleted]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      setContent: (content: string) => sendCommand('SET_CONTENT', { content }),
      getContent: () => {
        return asyncMessages.sendAsyncMessage<EditorContent>(
          'GET_CONTENT',
          sendCommand,
          5000  // 5 second timeout
        );
      },
      focus: () => sendCommand('FOCUS'),
      blur: () => sendCommand('BLUR'),
      toggleBold: () => sendCommand('TOGGLE_BOLD'),
      toggleItalic: () => sendCommand('TOGGLE_ITALIC'),
      insertSquare: (attrs?: SquareAttributes) => sendCommand('INSERT_SQUARE', attrs || {}),
      insertCircle: (attrs?: CircleAttributes) => sendCommand('INSERT_CIRCLE', attrs || {}),
      insertFlower: (attrs?: FlowerAttributes) => sendCommand('INSERT_FLOWER', attrs || {}),
      insertMarginNote: (id: string, noteIndex: number) => sendCommand('INSERT_MARGIN_NOTE', { id, noteIndex }),
      deleteMarginNote: (id: string) => sendCommand('DELETE_MARGIN_NOTE', { id }),
      getAnchorPositions: () => sendCommand('GET_ANCHOR_POSITIONS'),
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
