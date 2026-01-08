// Circle shape SVG generator
// Based on visuals.tex cir command parameters

import type { SVGData, SVGElement } from './types';

export interface CircleParams {
  color?: string;
  border?: boolean;
  pattern?: 'none' | 'vert';
  clock?: 'none' | 'simple' | 'hollow' | 'double' | 'dot';
  rotate?: boolean;
  scale?: number;
}

export function generateCircleSVG(params: CircleParams = {}): SVGData {
  const {
    color = 'white',
    border = true,
    pattern = 'none',
    clock = 'none',
    rotate = false,
    scale = 1.0,
  } = params;

  const size = 24 * scale;
  const radius = (size / 2) - 2;
  const center = size / 2;
  const strokeWidth = 1.5;
  
  const fillColor = color === 'none' ? 'transparent' : color;
  const strokeColor = border ? '#000' : 'none';
  
  const elements: SVGElement[] = [];
  const rotateTransform = rotate ? `rotate(45 ${center} ${center})` : undefined;
  
  // Main circle
  elements.push({
    type: 'circle',
    cx: center,
    cy: center,
    r: radius,
    fill: fillColor,
    stroke: strokeColor,
    strokeWidth,
    transform: rotateTransform,
  });
  
  // Vertical pattern (3 lines)
  if (pattern === 'vert') {
    const sin60 = Math.sin(Math.PI / 3);
    const lineHeight = radius * sin60;
    
    const patternGroup: SVGElement = {
      type: 'g',
      transform: rotateTransform,
      children: [
        {
          type: 'line',
          x1: center - radius / 2,
          y1: center - lineHeight,
          x2: center - radius / 2,
          y2: center + lineHeight,
          stroke: '#000',
          strokeWidth,
        },
        {
          type: 'line',
          x1: center,
          y1: center - radius,
          x2: center,
          y2: center + radius,
          stroke: '#000',
          strokeWidth,
        },
        {
          type: 'line',
          x1: center + radius / 2,
          y1: center - lineHeight,
          x2: center + radius / 2,
          y2: center + lineHeight,
          stroke: '#000',
          strokeWidth,
        },
      ],
    };
    elements.push(patternGroup);
  }
  
  // Clock hands
  if (clock !== 'none') {
    const handWidth = radius * 0.25;
    const handHeight = radius * 0.8;
    const handY = center - radius * 0.3 - handHeight;
    
    const clockElements: SVGElement[] = [];
    
    if (clock === 'simple') {
      clockElements.push({
        type: 'rect',
        x: center - handWidth / 2,
        y: handY,
        width: handWidth,
        height: handHeight,
        fill: '#000',
        stroke: '#000',
        strokeWidth,
      });
    }
    
    if (clock === 'hollow') {
      clockElements.push({
        type: 'rect',
        x: center - handWidth / 2,
        y: handY,
        width: handWidth,
        height: handHeight,
        fill: fillColor,
        stroke: '#000',
        strokeWidth,
      });
    }
    
    if (clock === 'double') {
      const offset = handWidth * 0.85;
      clockElements.push({
        type: 'rect',
        x: center - offset - handWidth / 2,
        y: handY,
        width: handWidth,
        height: handHeight,
        fill: fillColor,
        stroke: '#000',
        strokeWidth,
      });
      clockElements.push({
        type: 'rect',
        x: center + offset - handWidth / 2,
        y: handY,
        width: handWidth,
        height: handHeight,
        fill: fillColor,
        stroke: '#000',
        strokeWidth,
      });
    }
    
    if (clock === 'dot') {
      clockElements.push({
        type: 'rect',
        x: center - handWidth / 2,
        y: handY,
        width: handWidth,
        height: handHeight,
        fill: '#000',
        stroke: '#000',
        strokeWidth,
      });
      clockElements.push({
        type: 'circle',
        cx: center,
        cy: center,
        r: handWidth / 2,
        fill: '#000',
        stroke: '#000',
        strokeWidth,
      });
    }
    
    if (clockElements.length > 0) {
      elements.push({
        type: 'g',
        transform: rotateTransform,
        children: clockElements,
      });
    }
  }
  
  return {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    elements,
  };
}
