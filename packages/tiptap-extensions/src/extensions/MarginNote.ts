import { Node, mergeAttributes } from '@tiptap/core';

export interface MarginNoteAttributes {
  id: string;
  noteIndex: number;
}

export interface MarginNoteOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    marginNote: {
      /**
       * Insert a margin note anchor at the current position
       */
      insertMarginNote: (id: string, noteIndex: number) => ReturnType;
      /**
       * Delete a margin note anchor by its ID
       */
      deleteMarginNote: (id: string) => ReturnType;
    };
  }
}

export const MarginNote = Node.create<MarginNoteOptions>({
  name: 'marginNote',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => ({
          'data-id': attributes.id,
        }),
      },
      noteIndex: {
        default: 1,
        parseHTML: element => parseInt(element.getAttribute('data-index') || '1', 10),
        renderHTML: attributes => ({
          'data-index': attributes.noteIndex,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'margin-note',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const index = HTMLAttributes['data-index'] || 1;

    return [
      'margin-note',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'margin-note-anchor',
        contenteditable: 'false',
        style: `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.2em;
          height: 1.2em;
          font-size: 0.7em;
          font-weight: bold;
          color: white;
          background-color: #007AFF;
          border-radius: 50%;
          vertical-align: super;
          margin: 0 2px;
          cursor: pointer;
          user-select: none;
        `.replace(/\s+/g, ' ').trim(),
      }),
      String(index),
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('margin-note');
      dom.classList.add('margin-note-anchor');
      dom.contentEditable = 'false';
      
      const index = node.attrs.noteIndex || 1;
      dom.textContent = String(index);
      
      dom.setAttribute('data-id', node.attrs.id);
      dom.setAttribute('data-index', String(index));
      
      // Inline styles for the anchor badge
      dom.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.2em;
        height: 1.2em;
        font-size: 0.7em;
        font-weight: bold;
        color: white;
        background-color: #007AFF;
        border-radius: 50%;
        vertical-align: super;
        margin: 0 2px;
        cursor: pointer;
        user-select: none;
      `;

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'marginNote') {
            return false;
          }
          const newIndex = updatedNode.attrs.noteIndex || 1;
          dom.textContent = String(newIndex);
          dom.setAttribute('data-id', updatedNode.attrs.id);
          dom.setAttribute('data-index', String(newIndex));
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      insertMarginNote:
        (id: string, noteIndex: number) =>
        ({ chain, state }) => {
          const { from, to, empty } = state.selection;
          
          if (empty) {
            // No selection - just insert the anchor at cursor
            return chain()
              .insertContent({
                type: this.name,
                attrs: { id, noteIndex },
              })
              .run();
          } else {
            // Has selection - apply note highlight with noteId, then insert anchor at end
            return chain()
              .setMark('noteHighlight', { noteId: id })  // Apply highlight linked to this note
              .setTextSelection(to)   // Move cursor to end of selection
              .insertContent({
                type: this.name,
                attrs: { id, noteIndex },
              })
              .run();
          }
        },
      deleteMarginNote:
        (id: string) =>
        ({ tr, state, dispatch, commands }) => {
          let hasChanges = false;
          
          // First, remove the associated highlight
          const markType = state.schema.marks['noteHighlight'];
          if (markType) {
            state.doc.descendants((node, pos) => {
              if (!node.isText) return;
              
              const marks = node.marks.filter(mark => 
                mark.type === markType && mark.attrs.noteId === id
              );

              if (marks.length > 0) {
                marks.forEach(mark => {
                  tr.removeMark(pos, pos + node.nodeSize, mark);
                  hasChanges = true;
                });
              }
            });
          }

          // Then, delete the anchor node (if it still exists)
          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.id === id) {
              if (dispatch) {
                tr.delete(pos, pos + node.nodeSize);
                hasChanges = true;
              }
            }
          });
          
          if (dispatch && hasChanges) {
            dispatch(tr);
          }
          return hasChanges;
        },
    };
  },
});

export default MarginNote;
