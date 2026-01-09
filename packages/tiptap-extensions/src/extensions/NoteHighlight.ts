import { Mark, mergeAttributes } from '@tiptap/core';

export interface NoteHighlightAttributes {
  noteId: string;
}

export interface NoteHighlightOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    noteHighlight: {
      /**
       * Set note highlight mark with a note ID
       */
      setNoteHighlight: (noteId: string) => ReturnType;
      /**
       * Remove note highlight mark for a specific note ID
       */
      removeNoteHighlight: (noteId: string) => ReturnType;
    };
  }
}

export const NoteHighlight = Mark.create<NoteHighlightOptions>({
  name: 'noteHighlight',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: element => element.getAttribute('data-note-id'),
        renderHTML: attributes => {
          if (!attributes.noteId) {
            return {};
          }
          return {
            'data-note-id': attributes.noteId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'note-highlight',
      },
      {
        tag: 'span[data-note-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'note-highlight',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        style: 'text-decoration: underline; text-decoration-color: #007AFF; text-underline-offset: 2px;',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setNoteHighlight:
        (noteId: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { noteId });
        },
      removeNoteHighlight:
        (noteId: string) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          const markType = state.schema.marks[this.name];
          
          if (!markType) return false;

          let removed = false;

          doc.descendants((node, pos) => {
            if (!node.isText) return;
            
            const marks = node.marks.filter(mark => 
              mark.type === markType && mark.attrs.noteId === noteId
            );

            if (marks.length > 0) {
              marks.forEach(mark => {
                tr.removeMark(pos, pos + node.nodeSize, mark);
                removed = true;
              });
            }
          });

          if (dispatch && removed) {
            dispatch(tr);
          }
          
          return removed;
        },
    };
  },
});

export default NoteHighlight;
