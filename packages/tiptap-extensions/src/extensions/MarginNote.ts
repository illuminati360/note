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
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { id, noteIndex },
          });
        },
      deleteMarginNote:
        (id: string) =>
        ({ tr, state, dispatch }) => {
          let deleted = false;
          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.id === id) {
              if (dispatch) {
                tr.delete(pos, pos + node.nodeSize);
                deleted = true;
              }
            }
          });
          if (dispatch && deleted) {
            dispatch(tr);
          }
          return deleted;
        },
    };
  },
});

export default MarginNote;
