import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';

export interface MarginNoteBlockAttributes {
  noteId: string;
  noteIndex: number;
}

export interface MarginNoteBlockOptions {
  HTMLAttributes: Record<string, any>;
  onDeleteNote?: (noteId: string) => void;
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
      /**
       * Select all content within the current margin note block
       */
      selectAllInNoteBlock: () => ReturnType;
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
      onDeleteNote: undefined,
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
          const { doc } = state;
          
          // Find the correct position to insert based on noteIndex
          // We want to insert BEFORE the first block with noteIndex > our noteIndex
          let insertPos = doc.content.size; // Default to end
          
          doc.descendants((node, pos) => {
            if (node.type.name === this.name) {
              const existingIndex = node.attrs.noteIndex as number;
              if (existingIndex >= noteIndex) {
                // Insert before this node
                insertPos = pos;
                return false; // Stop searching
              }
            }
            return true;
          });
          
          return commands.insertContentAt(insertPos, {
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

      selectAllInNoteBlock:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection, doc } = state;
          const { $from } = selection;
          
          // Find the marginNoteBlock that contains the cursor
          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === this.name) {
              // Found the note block - get the position of this block
              const blockStart = $from.before(depth);
              const blockEnd = $from.after(depth);
              
              // We need to find positions inside text-containing nodes
              // Find the first and last valid text positions within the block
              let firstTextPos: number | null = null;
              let lastTextPos: number | null = null;
              
              doc.nodesBetween(blockStart, blockEnd, (child, pos) => {
                // Skip the marginNoteBlock itself
                if (child.type.name === this.name) {
                  return true; // Continue into children
                }
                
                // Find nodes that can contain text (inline content)
                if (child.isTextblock) {
                  const start = pos + 1; // Inside the textblock
                  const end = pos + child.nodeSize - 1;
                  
                  if (firstTextPos === null) {
                    firstTextPos = start;
                  }
                  lastTextPos = end;
                }
                return true;
              });
              
              if (firstTextPos !== null && lastTextPos !== null && dispatch) {
                const newSelection = TextSelection.create(doc, firstTextPos, lastTextPos);
                tr.setSelection(newSelection);
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-a': () => {
        // If we're inside a note block, select only its content
        const { state } = this.editor;
        const { $from } = state.selection;
        
        for (let depth = $from.depth; depth > 0; depth--) {
          const node = $from.node(depth);
          if (node.type.name === this.name) {
            return this.editor.commands.selectAllInNoteBlock();
          }
        }
        // Not in a note block, let default behavior happen
        return false;
      },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
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

      // Add click handler to badge for deleting empty notes
      badge.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const pos = getPos();
        if (pos === undefined) return;
        
        // Get the current node from the document
        const currentNode = editor.state.doc.nodeAt(pos);
        if (!currentNode) return;
        
        // Check if the note is empty (only contains empty paragraph(s))
        let isEmpty = true;
        currentNode.content.forEach((child) => {
          if (child.type.name === 'paragraph') {
            if (child.textContent.trim() !== '') {
              isEmpty = false;
            }
          } else {
            // Has non-paragraph content
            isEmpty = false;
          }
        });
        
        if (isEmpty) {
          const noteId = currentNode.attrs.noteId;
          // Delete the note block
          editor.commands.deleteMarginNoteBlock(noteId);
          // Call the onDeleteNote callback if provided
          const onDeleteNote = this.options.onDeleteNote;
          if (onDeleteNote) {
            onDeleteNote(noteId);
          }
        }
      });

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
