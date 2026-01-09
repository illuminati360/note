import { Node, mergeAttributes } from '@tiptap/core';

export interface MarginNoteBlockAttributes {
  noteId: string;
  noteIndex: number;
}

export interface MarginNoteBlockOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    marginNoteBlock: {
      /**
       * Insert a margin note block at the end of the document
       */
      insertMarginNoteBlock: (noteId: string, noteIndex: number) => ReturnType;
      /**
       * Delete a margin note block by its ID
       */
      deleteMarginNoteBlock: (noteId: string) => ReturnType;
      /**
       * Update the noteIndex of a margin note block
       */
      updateMarginNoteBlockIndex: (noteId: string, noteIndex: number) => ReturnType;
    };
  }
}

export const MarginNoteBlock = Node.create<MarginNoteBlockOptions>({
  name: 'marginNoteBlock',

  group: 'block',

  content: 'block+',

  defining: true,

  isolating: true,

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
        renderHTML: attributes => ({
          'data-note-id': attributes.noteId,
        }),
      },
      noteIndex: {
        default: 1,
        parseHTML: element => parseInt(element.getAttribute('data-note-index') || '1', 10),
        renderHTML: attributes => ({
          'data-note-index': attributes.noteIndex,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-margin-note-block]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-margin-note-block': '',
        class: 'margin-note-block',
      }),
      0, // Content placeholder
    ];
  },

  addCommands() {
    return {
      insertMarginNoteBlock:
        (noteId: string, noteIndex: number) =>
        ({ commands, state }) => {
          // Insert at the end of the document
          const { doc } = state;
          const endPos = doc.content.size;
          
          return commands.insertContentAt(endPos, {
            type: this.name,
            attrs: { noteId, noteIndex },
            content: [
              {
                type: 'paragraph',
              },
            ],
          });
        },

      deleteMarginNoteBlock:
        (noteId: string) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          let found = false;
          let deleteFrom = 0;
          let deleteTo = 0;

          doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.noteId === noteId) {
              found = true;
              deleteFrom = pos;
              deleteTo = pos + node.nodeSize;
              return false; // Stop searching
            }
            return true;
          });

          if (found && dispatch) {
            tr.delete(deleteFrom, deleteTo);
            dispatch(tr);
          }

          return found;
        },

      updateMarginNoteBlockIndex:
        (noteId: string, noteIndex: number) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          let found = false;

          doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.noteId === noteId) {
              found = true;
              if (dispatch) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  noteIndex,
                });
              }
              return false;
            }
            return true;
          });

          if (found && dispatch) {
            dispatch(tr);
          }

          return found;
        },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement('div');
      dom.classList.add('margin-note-block');
      dom.setAttribute('data-margin-note-block', '');
      dom.setAttribute('data-note-id', node.attrs.noteId || '');
      dom.setAttribute('data-note-index', String(node.attrs.noteIndex || 1));

      // Create the badge
      const badge = document.createElement('div');
      badge.classList.add('margin-note-badge');
      badge.textContent = String(node.attrs.noteIndex || 1);
      badge.contentEditable = 'false';
      
      // Style the badge
      badge.style.cssText = `
        position: absolute;
        left: -28px;
        top: 4px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: #007AFF;
        color: white;
        font-size: 11px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        cursor: pointer;
      `.replace(/\s+/g, ' ').trim();

      // Create content wrapper
      const contentDOM = document.createElement('div');
      contentDOM.classList.add('margin-note-content');
      contentDOM.style.cssText = `
        min-height: 1.5em;
        padding: 4px 8px;
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
      `.replace(/\s+/g, ' ').trim();

      // Style the container
      dom.style.cssText = `
        position: relative;
        margin: 8px 0 8px 32px;
        padding-left: 0;
      `.replace(/\s+/g, ' ').trim();

      dom.appendChild(badge);
      dom.appendChild(contentDOM);

      return {
        dom,
        contentDOM,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false;
          }
          badge.textContent = String(updatedNode.attrs.noteIndex || 1);
          dom.setAttribute('data-note-index', String(updatedNode.attrs.noteIndex || 1));
          return true;
        },
      };
    };
  },
});
