/**
 * Tests for MarginNotesContext
 * 
 * Verifies that the React context correctly integrates the focus state machine.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import {
  MarginNotesProvider,
  useMarginNotes,
  useFocus,
} from '../MarginNotesContext';

// Wrapper component for hooks that need the provider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MarginNotesProvider>{children}</MarginNotesProvider>
);

const wrapperWithDebug = ({ children }: { children: React.ReactNode }) => (
  <MarginNotesProvider debugFocus>{children}</MarginNotesProvider>
);

describe('MarginNotesContext', () => {
  describe('useMarginNotes', () => {
    it('should throw when used outside provider', () => {
      // Note: @testing-library/react throws synchronously when hook throws
      expect(() => {
        renderHook(() => useMarginNotes());
      }).toThrow('useMarginNotes must be used within a MarginNotesProvider');
    });

    it('should return context when used inside provider', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper });
      expect(result.current).toBeDefined();
      expect(result.current.focusState).toBeDefined();
    });
  });

  describe('useFocus', () => {
    it('should throw when used outside provider', () => {
      // useFocus calls useMarginNotes internally, so the error comes from there
      expect(() => {
        renderHook(() => useFocus());
      }).toThrow('useMarginNotes must be used within a MarginNotesProvider');
    });
  });

  describe('Initial state', () => {
    it('should start in IDLE state', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper });
      expect(result.current.focusState.type).toBe('IDLE');
    });

    it('should have isMainEditorFocused = false initially', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper });
      expect(result.current.isMainEditorFocused).toBe(false);
    });

    it('should have focusedNoteId = null initially', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper });
      expect(result.current.focusedNoteId).toBe(null);
    });

    it('should have toolbarTarget = null initially', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper });
      expect(result.current.toolbarTarget).toBe(null);
    });

    it('should have hasAnyEditorFocus = false initially', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper });
      expect(result.current.hasAnyEditorFocus).toBe(false);
    });
  });

  describe('Focus main editor', () => {
    it('should transition to MAIN_FOCUSED on focusMainEditor()', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper });
      
      act(() => {
        result.current.focusMainEditor();
      });

      expect(result.current.focusState.type).toBe('MAIN_FOCUSED');
      expect(result.current.isMainEditorFocused).toBe(true);
      expect(result.current.toolbarTarget).toBe('main');
      expect(result.current.hasAnyEditorFocus).toBe(true);
    });

    it('should transition to MAIN_FOCUSED via dispatchFocus', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper });
      
      act(() => {
        result.current.dispatchFocus({ type: 'MAIN_EDITOR_FOCUS' });
      });

      expect(result.current.focusState.type).toBe('MAIN_FOCUSED');
    });

    it('should transition to IDLE on blurMainEditor()', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper });
      
      act(() => {
        result.current.focusMainEditor();
      });
      expect(result.current.focusState.type).toBe('MAIN_FOCUSED');

      act(() => {
        result.current.blurMainEditor();
      });
      expect(result.current.focusState.type).toBe('IDLE');
      expect(result.current.isMainEditorFocused).toBe(false);
    });
  });

  describe('Focus note', () => {
    it('should transition to NOTE_FOCUSED on focusNote()', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper });
      
      act(() => {
        result.current.focusNote('note-1');
      });

      expect(result.current.focusState.type).toBe('NOTE_FOCUSED');
      expect(result.current.focusedNoteId).toBe('note-1');
      expect(result.current.toolbarTarget).toBe('margin');
      expect(result.current.hasAnyEditorFocus).toBe(true);
    });

    it('should update noteId when focusing different note', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper });
      
      act(() => {
        result.current.focusNote('note-1');
      });
      expect(result.current.focusedNoteId).toBe('note-1');

      act(() => {
        result.current.focusNote('note-2');
      });
      expect(result.current.focusedNoteId).toBe('note-2');
    });

    it('should transition to IDLE on blurNote()', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper });
      
      act(() => {
        result.current.focusNote('note-1');
      });
      expect(result.current.focusState.type).toBe('NOTE_FOCUSED');

      act(() => {
        result.current.blurNote();
      });
      expect(result.current.focusState.type).toBe('IDLE');
      expect(result.current.focusedNoteId).toBe(null);
    });
  });

  describe('Focus transitions between main and note', () => {
    it('should switch from main to note directly', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper });
      
      act(() => {
        result.current.focusMainEditor();
      });
      expect(result.current.focusState.type).toBe('MAIN_FOCUSED');

      act(() => {
        result.current.focusNote('note-1');
      });
      expect(result.current.focusState.type).toBe('NOTE_FOCUSED');
      expect(result.current.isMainEditorFocused).toBe(false);
      expect(result.current.focusedNoteId).toBe('note-1');
    });

    it('should switch from note to main directly', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper });
      
      act(() => {
        result.current.focusNote('note-1');
      });
      expect(result.current.focusState.type).toBe('NOTE_FOCUSED');

      act(() => {
        result.current.focusMainEditor();
      });
      expect(result.current.focusState.type).toBe('MAIN_FOCUSED');
      expect(result.current.isMainEditorFocused).toBe(true);
      expect(result.current.focusedNoteId).toBe(null);
    });
  });

  describe('Reset', () => {
    it('should reset to IDLE from MAIN_FOCUSED', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper });
      
      act(() => {
        result.current.focusMainEditor();
      });
      expect(result.current.focusState.type).toBe('MAIN_FOCUSED');

      act(() => {
        result.current.resetFocus();
      });
      expect(result.current.focusState.type).toBe('IDLE');
    });

    it('should reset to IDLE from NOTE_FOCUSED', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper });
      
      act(() => {
        result.current.focusNote('note-1');
      });
      expect(result.current.focusState.type).toBe('NOTE_FOCUSED');

      act(() => {
        result.current.resetFocus();
      });
      expect(result.current.focusState.type).toBe('IDLE');
    });
  });

  describe('Debug mode', () => {
    it('should not throw with debugFocus enabled', () => {
      const { result } = renderHook(() => useMarginNotes(), { wrapper: wrapperWithDebug });
      
      // Should work without errors
      act(() => {
        result.current.focusMainEditor();
      });
      expect(result.current.focusState.type).toBe('MAIN_FOCUSED');

      act(() => {
        result.current.focusNote('note-1');
      });
      expect(result.current.focusState.type).toBe('NOTE_FOCUSED');
    });
  });
});
