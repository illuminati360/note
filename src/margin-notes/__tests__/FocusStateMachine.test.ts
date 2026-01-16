/**
 * Focus State Machine Tests
 * 
 * Run with: npx jest src/margin-notes/__tests__/FocusStateMachine.test.ts
 */

import {
  focusReducer,
  initialFocusState,
  isMainFocused,
  isNoteFocused,
  getFocusedNoteId,
  isSpecificNoteFocused,
  getToolbarTarget,
  hasAnyFocus,
  FocusState,
  FocusEvent,
} from '../FocusStateMachine';

describe('FocusStateMachine', () => {
  describe('initialFocusState', () => {
    it('should start in IDLE state', () => {
      expect(initialFocusState).toEqual({ type: 'IDLE' });
    });
  });

  describe('focusReducer', () => {
    describe('from IDLE state', () => {
      const state: FocusState = { type: 'IDLE' };

      it('should transition to MAIN_FOCUSED on MAIN_EDITOR_FOCUS', () => {
        const event: FocusEvent = { type: 'MAIN_EDITOR_FOCUS' };
        expect(focusReducer(state, event)).toEqual({ type: 'MAIN_FOCUSED' });
      });

      it('should transition to NOTE_FOCUSED on NOTE_FOCUS', () => {
        const event: FocusEvent = { type: 'NOTE_FOCUS', noteId: 'note-1' };
        expect(focusReducer(state, event)).toEqual({ type: 'NOTE_FOCUSED', noteId: 'note-1' });
      });

      it('should stay IDLE on MAIN_EDITOR_BLUR', () => {
        const event: FocusEvent = { type: 'MAIN_EDITOR_BLUR' };
        expect(focusReducer(state, event)).toEqual({ type: 'IDLE' });
      });

      it('should stay IDLE on NOTE_BLUR', () => {
        const event: FocusEvent = { type: 'NOTE_BLUR' };
        expect(focusReducer(state, event)).toEqual({ type: 'IDLE' });
      });

      it('should stay IDLE on RESET', () => {
        const event: FocusEvent = { type: 'RESET' };
        expect(focusReducer(state, event)).toEqual({ type: 'IDLE' });
      });
    });

    describe('from MAIN_FOCUSED state', () => {
      const state: FocusState = { type: 'MAIN_FOCUSED' };

      it('should transition to IDLE on MAIN_EDITOR_BLUR', () => {
        const event: FocusEvent = { type: 'MAIN_EDITOR_BLUR' };
        expect(focusReducer(state, event)).toEqual({ type: 'IDLE' });
      });

      it('should transition to NOTE_FOCUSED on NOTE_FOCUS', () => {
        const event: FocusEvent = { type: 'NOTE_FOCUS', noteId: 'note-2' };
        expect(focusReducer(state, event)).toEqual({ type: 'NOTE_FOCUSED', noteId: 'note-2' });
      });

      it('should stay MAIN_FOCUSED on MAIN_EDITOR_FOCUS', () => {
        const event: FocusEvent = { type: 'MAIN_EDITOR_FOCUS' };
        expect(focusReducer(state, event)).toEqual({ type: 'MAIN_FOCUSED' });
      });

      it('should stay MAIN_FOCUSED on NOTE_BLUR', () => {
        const event: FocusEvent = { type: 'NOTE_BLUR' };
        expect(focusReducer(state, event)).toEqual({ type: 'MAIN_FOCUSED' });
      });

      it('should transition to IDLE on RESET', () => {
        const event: FocusEvent = { type: 'RESET' };
        expect(focusReducer(state, event)).toEqual({ type: 'IDLE' });
      });
    });

    describe('from NOTE_FOCUSED state', () => {
      const state: FocusState = { type: 'NOTE_FOCUSED', noteId: 'note-1' };

      it('should transition to IDLE on NOTE_BLUR', () => {
        const event: FocusEvent = { type: 'NOTE_BLUR' };
        expect(focusReducer(state, event)).toEqual({ type: 'IDLE' });
      });

      it('should transition to MAIN_FOCUSED on MAIN_EDITOR_FOCUS', () => {
        const event: FocusEvent = { type: 'MAIN_EDITOR_FOCUS' };
        expect(focusReducer(state, event)).toEqual({ type: 'MAIN_FOCUSED' });
      });

      it('should update noteId on NOTE_FOCUS with different noteId', () => {
        const event: FocusEvent = { type: 'NOTE_FOCUS', noteId: 'note-2' };
        expect(focusReducer(state, event)).toEqual({ type: 'NOTE_FOCUSED', noteId: 'note-2' });
      });

      it('should stay same on NOTE_FOCUS with same noteId', () => {
        const event: FocusEvent = { type: 'NOTE_FOCUS', noteId: 'note-1' };
        const result = focusReducer(state, event);
        expect(result).toEqual({ type: 'NOTE_FOCUSED', noteId: 'note-1' });
      });

      it('should stay NOTE_FOCUSED on MAIN_EDITOR_BLUR', () => {
        const event: FocusEvent = { type: 'MAIN_EDITOR_BLUR' };
        expect(focusReducer(state, event)).toEqual({ type: 'NOTE_FOCUSED', noteId: 'note-1' });
      });

      it('should transition to IDLE on RESET', () => {
        const event: FocusEvent = { type: 'RESET' };
        expect(focusReducer(state, event)).toEqual({ type: 'IDLE' });
      });
    });
  });

  describe('selector functions', () => {
    describe('isMainFocused', () => {
      it('should return true for MAIN_FOCUSED', () => {
        expect(isMainFocused({ type: 'MAIN_FOCUSED' })).toBe(true);
      });

      it('should return false for IDLE', () => {
        expect(isMainFocused({ type: 'IDLE' })).toBe(false);
      });

      it('should return false for NOTE_FOCUSED', () => {
        expect(isMainFocused({ type: 'NOTE_FOCUSED', noteId: 'note-1' })).toBe(false);
      });
    });

    describe('isNoteFocused', () => {
      it('should return true for NOTE_FOCUSED', () => {
        expect(isNoteFocused({ type: 'NOTE_FOCUSED', noteId: 'note-1' })).toBe(true);
      });

      it('should return false for IDLE', () => {
        expect(isNoteFocused({ type: 'IDLE' })).toBe(false);
      });

      it('should return false for MAIN_FOCUSED', () => {
        expect(isNoteFocused({ type: 'MAIN_FOCUSED' })).toBe(false);
      });
    });

    describe('getFocusedNoteId', () => {
      it('should return noteId for NOTE_FOCUSED', () => {
        expect(getFocusedNoteId({ type: 'NOTE_FOCUSED', noteId: 'note-1' })).toBe('note-1');
      });

      it('should return null for IDLE', () => {
        expect(getFocusedNoteId({ type: 'IDLE' })).toBeNull();
      });

      it('should return null for MAIN_FOCUSED', () => {
        expect(getFocusedNoteId({ type: 'MAIN_FOCUSED' })).toBeNull();
      });
    });

    describe('isSpecificNoteFocused', () => {
      it('should return true for matching noteId', () => {
        expect(isSpecificNoteFocused({ type: 'NOTE_FOCUSED', noteId: 'note-1' }, 'note-1')).toBe(true);
      });

      it('should return false for non-matching noteId', () => {
        expect(isSpecificNoteFocused({ type: 'NOTE_FOCUSED', noteId: 'note-1' }, 'note-2')).toBe(false);
      });

      it('should return false for IDLE', () => {
        expect(isSpecificNoteFocused({ type: 'IDLE' }, 'note-1')).toBe(false);
      });

      it('should return false for MAIN_FOCUSED', () => {
        expect(isSpecificNoteFocused({ type: 'MAIN_FOCUSED' }, 'note-1')).toBe(false);
      });
    });

    describe('getToolbarTarget', () => {
      it('should return "main" for MAIN_FOCUSED', () => {
        expect(getToolbarTarget({ type: 'MAIN_FOCUSED' })).toBe('main');
      });

      it('should return "margin" for NOTE_FOCUSED', () => {
        expect(getToolbarTarget({ type: 'NOTE_FOCUSED', noteId: 'note-1' })).toBe('margin');
      });

      it('should return null for IDLE', () => {
        expect(getToolbarTarget({ type: 'IDLE' })).toBeNull();
      });
    });

    describe('hasAnyFocus', () => {
      it('should return true for MAIN_FOCUSED', () => {
        expect(hasAnyFocus({ type: 'MAIN_FOCUSED' })).toBe(true);
      });

      it('should return true for NOTE_FOCUSED', () => {
        expect(hasAnyFocus({ type: 'NOTE_FOCUSED', noteId: 'note-1' })).toBe(true);
      });

      it('should return false for IDLE', () => {
        expect(hasAnyFocus({ type: 'IDLE' })).toBe(false);
      });
    });
  });

  describe('complex scenarios', () => {
    it('should handle typical user flow: main → note → main', () => {
      let state: FocusState = { type: 'IDLE' };

      // User clicks main editor
      state = focusReducer(state, { type: 'MAIN_EDITOR_FOCUS' });
      expect(state).toEqual({ type: 'MAIN_FOCUSED' });

      // User clicks a margin note
      state = focusReducer(state, { type: 'NOTE_FOCUS', noteId: 'note-1' });
      expect(state).toEqual({ type: 'NOTE_FOCUSED', noteId: 'note-1' });

      // User clicks main editor again
      state = focusReducer(state, { type: 'MAIN_EDITOR_FOCUS' });
      expect(state).toEqual({ type: 'MAIN_FOCUSED' });
    });

    it('should handle switching between notes', () => {
      let state: FocusState = { type: 'NOTE_FOCUSED', noteId: 'note-1' };

      // User clicks a different note
      state = focusReducer(state, { type: 'NOTE_FOCUS', noteId: 'note-2' });
      expect(state).toEqual({ type: 'NOTE_FOCUSED', noteId: 'note-2' });

      // User clicks another note
      state = focusReducer(state, { type: 'NOTE_FOCUS', noteId: 'note-3' });
      expect(state).toEqual({ type: 'NOTE_FOCUSED', noteId: 'note-3' });
    });
  });
});
