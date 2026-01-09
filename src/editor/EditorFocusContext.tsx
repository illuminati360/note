import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Represents which editor is currently focused
// 'main' = main editor, string = note ID
export type FocusedEditor = 'main' | string | null;

interface EditorFocusContextType {
  focusedEditor: FocusedEditor;
  setFocusedEditor: (editor: FocusedEditor) => void;
  isMainEditorFocused: boolean;
  focusedNoteId: string | null;
}

const EditorFocusContext = createContext<EditorFocusContextType | null>(null);

export function EditorFocusProvider({ children }: { children: ReactNode }) {
  const [focusedEditor, setFocusedEditor] = useState<FocusedEditor>(null);

  const isMainEditorFocused = focusedEditor === 'main';
  const focusedNoteId = focusedEditor && focusedEditor !== 'main' ? focusedEditor : null;

  return (
    <EditorFocusContext.Provider
      value={{
        focusedEditor,
        setFocusedEditor,
        isMainEditorFocused,
        focusedNoteId,
      }}
    >
      {children}
    </EditorFocusContext.Provider>
  );
}

export function useEditorFocus() {
  const context = useContext(EditorFocusContext);
  if (!context) {
    throw new Error('useEditorFocus must be used within an EditorFocusProvider');
  }
  return context;
}

export default EditorFocusContext;
