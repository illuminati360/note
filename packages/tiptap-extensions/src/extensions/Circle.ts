import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { generateCircleSVG, renderSVGToString, type CircleParams } from '../svg';

// Re-export CircleParams as CircleAttributes for API consistency
export type CircleAttributes = CircleParams;

export interface CircleOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    circle: {
      insertCircle: (attrs?: CircleAttributes) => ReturnType;
    };
  }
}

// Helper to parse :cir[attr1=val1, attr2=val2] into { attr1: val1, ... }
function parseCircleAttributes(input: string): CircleAttributes {
  const attrs: CircleAttributes = {};
  const match = input.match(/^:cir\[(.*)\]$/);
  if (!match) return attrs;
  const inside = match[1];
  inside.split(',').forEach(pair => {
    const [key, value] = pair.split('=');
    if (!key || value === undefined) return;
    const k = key.trim();
    const v = value.trim();
    if (k === 'color') attrs.color = v;
    else if (k === 'border') attrs.border = v === 'true';
    else if (k === 'pattern') attrs.pattern = v as any;
    else if (k === 'clock') attrs.clock = v as any;
    else if (k === 'rotate') attrs.rotate = v === 'true';
    else if (k === 'scale') attrs.scale = parseFloat(v);
  });
  return attrs;
}

function createCircleInputRule(type: any) {
  return nodeInputRule({
    find: /:cir\[[^\]]*\]$/,
    type,
    getAttributes: (match: RegExpMatchArray) => parseCircleAttributes(match[0]),
  });
}

export const Circle = Node.create<CircleOptions>({
  name: 'circle',
  
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
        default: 'white',
        parseHTML: element => element.getAttribute('data-color') || 'white',
        renderHTML: attrs => ({ 'data-color': attrs.color }),
      },
      border: {
        default: true,
        parseHTML: element => element.getAttribute('data-border') !== 'false',
        renderHTML: attrs => ({ 'data-border': String(attrs.border) }),
      },
      pattern: {
        default: 'none',
        parseHTML: element => element.getAttribute('data-pattern') || 'none',
        renderHTML: attrs => ({ 'data-pattern': attrs.pattern }),
      },
      clock: {
        default: 'none',
        parseHTML: element => element.getAttribute('data-clock') || 'none',
        renderHTML: attrs => ({ 'data-clock': attrs.clock }),
      },
      rotate: {
        default: false,
        parseHTML: element => element.getAttribute('data-rotate') === 'true',
        renderHTML: attrs => ({ 'data-rotate': String(attrs.rotate) }),
      },
      scale: {
        default: 1.0,
        parseHTML: element => parseFloat(element.getAttribute('data-scale') || '1'),
        renderHTML: attrs => ({ 'data-scale': String(attrs.scale) }),
      },
    };
  },
  
  parseHTML() {
    return [{ tag: 'cir' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'cir',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'shape-circle',
        contenteditable: 'false',
      }),
    ];
  },
  
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('cir');
      dom.classList.add('shape-circle');
      dom.contentEditable = 'false';
      
      const svgData = generateCircleSVG(node.attrs as CircleAttributes);
      dom.innerHTML = renderSVGToString(svgData);
      
      dom.setAttribute('data-color', node.attrs.color);
      dom.setAttribute('data-border', String(node.attrs.border));
      dom.setAttribute('data-pattern', node.attrs.pattern);
      dom.setAttribute('data-clock', node.attrs.clock);
      dom.setAttribute('data-rotate', String(node.attrs.rotate));
      dom.setAttribute('data-scale', String(node.attrs.scale));
      
      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'circle') {
            return false;
          }
          const svgData = generateCircleSVG(updatedNode.attrs as CircleAttributes);
          dom.innerHTML = renderSVGToString(svgData);
          return true;
        },
      };
    };
  },
  
  addCommands() {
    return {
      insertCircle: (attrs: CircleAttributes = {}) => ({ commands }) => {
        return commands.insertContent({
          type: 'circle',
          attrs,
        });
      },
    };
  },

  addInputRules() {
    return [createCircleInputRule(this.type)];
  },
});

export default Circle;
