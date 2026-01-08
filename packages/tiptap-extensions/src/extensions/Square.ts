import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { generateSquareSVG, renderSVGToString, type SquareParams } from '../svg';

// Re-export SquareParams as SquareAttributes for API consistency
export type SquareAttributes = SquareParams;

export interface SquareOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    square: {
      insertSquare: (attrs?: SquareAttributes) => ReturnType;
    };
  }
}

// Helper to parse :sqr[attr1=val1,attr2=val2] into { attr1: val1, ... }
function parseSquareAttributes(input: string): SquareAttributes {
  const attrs: SquareAttributes = {};
  const match = input.match(/^:sqr\[(.*)\]$/);
  if (!match) return attrs;
  const inside = match[1];
  inside.split(',').forEach(pair => {
    const [key, value] = pair.split('=');
    if (!key || value === undefined) return;
    const k = key.trim();
    const v = value.trim();
    if (k === 'color') attrs.color = v;
    else if (k === 'border') attrs.border = v === 'true';
    else if (k === 'fill') attrs.fill = v as any;
    else if (k === 'pattern') attrs.pattern = v as any;
    else if (k === 'scale') attrs.scale = parseFloat(v);
  });
  return attrs;
}

function createSquareInputRule(type: any) {
  return nodeInputRule({
    find: /:sqr\[[^\]]*\]$/,
    type,
    getAttributes: (match: RegExpMatchArray) => parseSquareAttributes(match[0]),
  });
}

export const Square = Node.create<SquareOptions>({
  name: 'square',
  
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
      color: {
        default: 'none',
        parseHTML: element => element.getAttribute('data-color') || 'none',
        renderHTML: attrs => ({ 'data-color': attrs.color }),
      },
      border: {
        default: true,
        parseHTML: element => element.getAttribute('data-border') !== 'false',
        renderHTML: attrs => ({ 'data-border': String(attrs.border) }),
      },
      fill: {
        default: 'full',
        parseHTML: element => element.getAttribute('data-fill') || 'full',
        renderHTML: attrs => ({ 'data-fill': attrs.fill }),
      },
      pattern: {
        default: 'none',
        parseHTML: element => element.getAttribute('data-pattern') || 'none',
        renderHTML: attrs => ({ 'data-pattern': attrs.pattern }),
      },
      scale: {
        default: 1.0,
        parseHTML: element => parseFloat(element.getAttribute('data-scale') || '1'),
        renderHTML: attrs => ({ 'data-scale': String(attrs.scale) }),
      },
    };
  },
  
  parseHTML() {
    return [{ tag: 'sqr' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'sqr',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'shape-square',
        contenteditable: 'false',
      }),
    ];
  },
  
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('sqr');
      dom.classList.add('shape-square');
      dom.contentEditable = 'false';
      
      const svgData = generateSquareSVG(node.attrs as SquareAttributes);
      dom.innerHTML = renderSVGToString(svgData);
      
      dom.setAttribute('data-color', node.attrs.color);
      dom.setAttribute('data-border', String(node.attrs.border));
      dom.setAttribute('data-fill', node.attrs.fill);
      dom.setAttribute('data-pattern', node.attrs.pattern);
      dom.setAttribute('data-scale', String(node.attrs.scale));
      
      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'square') {
            return false;
          }
          const svgData = generateSquareSVG(updatedNode.attrs as SquareAttributes);
          dom.innerHTML = renderSVGToString(svgData);
          return true;
        },
      };
    };
  },
  
  addCommands() {
    return {
      insertSquare: (attrs: SquareAttributes = {}) => ({ commands }) => {
        return commands.insertContent({
          type: 'square',
          attrs,
        });
      },
    };
  },

  addInputRules() {
    return [createSquareInputRule(this.type)];
  },
});

export default Square;
