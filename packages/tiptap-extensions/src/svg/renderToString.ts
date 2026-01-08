// Render SVG data structure to HTML string (for browser DOM)

import type { SVGData, SVGElement, SVGRect, SVGCircle, SVGLine, SVGPath, SVGGroup, SVGDefs, SVGClipPath, SVGMask } from './types';

function renderAttributes(attrs: Record<string, string | number | undefined>): string {
  return Object.entries(attrs)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
}

function renderElement(el: SVGElement): string {
  switch (el.type) {
    case 'rect': {
      const attrs = renderAttributes({
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        fill: el.fill,
        stroke: el.stroke,
        'stroke-width': el.strokeWidth,
        transform: el.transform,
      });
      return `<rect ${attrs}/>`;
    }
    
    case 'circle': {
      const attrs = renderAttributes({
        cx: el.cx,
        cy: el.cy,
        r: el.r,
        fill: el.fill,
        stroke: el.stroke,
        'stroke-width': el.strokeWidth,
        transform: el.transform,
      });
      return `<circle ${attrs}/>`;
    }
    
    case 'line': {
      const attrs = renderAttributes({
        x1: el.x1,
        y1: el.y1,
        x2: el.x2,
        y2: el.y2,
        stroke: el.stroke,
        'stroke-width': el.strokeWidth,
        transform: el.transform,
      });
      return `<line ${attrs}/>`;
    }
    
    case 'path': {
      const attrs = renderAttributes({
        d: el.d,
        fill: el.fill,
        stroke: el.stroke,
        'stroke-width': el.strokeWidth,
        transform: el.transform,
        'clip-path': el.clipPath,
        mask: el.mask,
      });
      return `<path ${attrs}/>`;
    }
    
    case 'g': {
      const attrs = renderAttributes({
        transform: el.transform,
        'clip-path': el.clipPath,
      });
      const children = el.children.map(renderElement).join('');
      return `<g ${attrs}>${children}</g>`;
    }
    
    case 'defs': {
      const children = el.children.map(renderElement).join('');
      return `<defs>${children}</defs>`;
    }
    
    case 'clipPath': {
      const children = el.children.map(renderElement).join('');
      return `<clipPath id="${el.id}">${children}</clipPath>`;
    }
    
    case 'mask': {
      const children = el.children.map(renderElement).join('');
      return `<mask id="${el.id}">${children}</mask>`;
    }
    
    default:
      return '';
  }
}

export function renderSVGToString(data: SVGData): string {
  const elements = data.elements.map(renderElement).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${data.width}" height="${data.height}" viewBox="${data.viewBox}" style="display: inline-block; vertical-align: middle;">${elements}</svg>`;
}
