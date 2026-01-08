import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { generateFlowerSVG, renderSVGToString, type FlowerParams } from '../svg';

// Re-export FlowerParams as FlowerAttributes for API consistency
export type FlowerAttributes = FlowerParams;

export interface FlowerOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    flower: {
      insertFlower: (attrs?: FlowerAttributes) => ReturnType;
    };
  }
}

// Helper to parse :flower[attr1=val1, attr2=val2] into { attr1: val1, ... }
function parseFlowerAttributes(input: string): FlowerAttributes {
  const attrs: FlowerAttributes = {};
  const match = input.match(/^:flower\[(.*)\]$/);
  if (!match) return attrs;
  const inside = match[1];
  inside.split(',').forEach(pair => {
    const [key, value] = pair.split('=');
    if (!key || value === undefined) return;
    const k = key.trim();
    const v = value.trim();
    if (k === 'color') attrs.color = v;
    else if (k === 'pattern') attrs.pattern = v as any;
    else if (k === 'fill') attrs.fill = v as any;
    else if (k === 'clock') attrs.clock = v as any;
    else if (k === 'rotate') attrs.rotate = v === 'true';
    else if (k === 'scale') attrs.scale = parseFloat(v);
  });
  return attrs;
}

function createFlowerInputRule(type: any) {
  return nodeInputRule({
    find: /:flower\[[^\]]*\]$/,
    type,
    getAttributes: (match: RegExpMatchArray) => parseFlowerAttributes(match[0]),
  });
}

export const Flower = Node.create<FlowerOptions>({
  name: 'flower',
  
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
        default: 'lightgray',
        parseHTML: element => element.getAttribute('data-color') || 'lightgray',
        renderHTML: attrs => ({ 'data-color': attrs.color }),
      },
      pattern: {
        default: 'none',
        parseHTML: element => element.getAttribute('data-pattern') || 'none',
        renderHTML: attrs => ({ 'data-pattern': attrs.pattern }),
      },
      fill: {
        default: 'full',
        parseHTML: element => element.getAttribute('data-fill') || 'full',
        renderHTML: attrs => ({ 'data-fill': attrs.fill }),
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
    return [{ tag: 'flower' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'flower',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'shape-flower',
        contenteditable: 'false',
      }),
    ];
  },
  
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('flower');
      dom.classList.add('shape-flower');
      dom.contentEditable = 'false';
      
      const svgData = generateFlowerSVG(node.attrs as FlowerAttributes);
      dom.innerHTML = renderSVGToString(svgData);
      
      dom.setAttribute('data-color', node.attrs.color);
      dom.setAttribute('data-pattern', node.attrs.pattern);
      dom.setAttribute('data-fill', node.attrs.fill);
      dom.setAttribute('data-clock', node.attrs.clock);
      dom.setAttribute('data-rotate', String(node.attrs.rotate));
      dom.setAttribute('data-scale', String(node.attrs.scale));
      
      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'flower') {
            return false;
          }
          const svgData = generateFlowerSVG(updatedNode.attrs as FlowerAttributes);
          dom.innerHTML = renderSVGToString(svgData);
          return true;
        },
      };
    };
  },
  
  addCommands() {
    return {
      insertFlower: (attrs: FlowerAttributes = {}) => ({ commands }) => {
        return commands.insertContent({
          type: 'flower',
          attrs,
        });
      },
    };
  },

  addInputRules() {
    return [createFlowerInputRule(this.type)];
  },
});

export default Flower;
