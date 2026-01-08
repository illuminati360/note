// Square shape SVG generator
// Based on visuals.tex sqr command parameters

import type { SVGData, SVGElement } from './types';

export interface SquareParams {
  color?: string;
  border?: boolean;
  fill?: 'full' | 'half' | 'none' | 'large' | 'middle' | 'small';
  pattern?: 'none' | 'vert' | 'diag';
  scale?: number;
}

export function generateSquareSVG(params: SquareParams = {}): SVGData {
  const {
    color = 'none',
    border = true,
    fill = 'full',
    pattern = 'none',
    scale = 1.0,
  } = params;

  const size = 24 * scale;
  const strokeWidth = 1.5;
  const halfSize = size / 2;
  
  // Determine fill color based on fill type
  let fillColor = 'none';
  if (fill === 'full' || fill === 'large') {
    fillColor = color === 'none' ? 'transparent' : color;
  }
  
  const strokeColor = border ? '#000' : 'none';
  
  const elements: SVGElement[] = [];
  
  // Main outer square
  elements.push({
    type: 'rect',
    x: strokeWidth,
    y: strokeWidth,
    width: size - strokeWidth * 2,
    height: size - strokeWidth * 2,
    fill: fillColor,
    stroke: strokeColor,
    strokeWidth,
  });
  
  // Half fill (bottom half)
  if (fill === 'half') {
    const rectColor = color === 'none' ? '#ccc' : color;
    elements.push({
      type: 'rect',
      x: strokeWidth,
      y: halfSize,
      width: size - strokeWidth * 2,
      height: halfSize - strokeWidth,
      fill: rectColor,
      stroke: 'none',
    });
  }
  
  // Inner square for large/middle/small variants
  const innerSize = size * 0.7;
  const innerOffset = (size - innerSize) / 2;
  
  if (fill === 'large' || fill === 'small') {
    elements.push({
      type: 'rect',
      x: innerOffset,
      y: innerOffset,
      width: innerSize,
      height: innerSize,
      fill: 'none',
      stroke: '#000',
      strokeWidth,
    });
  }
  
  if (fill === 'middle') {
    const middleColor = color === 'none' ? '#ccc' : color;
    elements.push({
      type: 'rect',
      x: innerOffset,
      y: innerOffset,
      width: innerSize,
      height: innerSize,
      fill: middleColor,
      stroke: '#000',
      strokeWidth,
    });
  }
  
  // Patterns
  if (pattern === 'vert') {
    const third = size / 3;
    elements.push({
      type: 'line',
      x1: third,
      y1: strokeWidth,
      x2: third,
      y2: size - strokeWidth,
      stroke: '#000',
      strokeWidth,
    });
    elements.push({
      type: 'line',
      x1: third * 2,
      y1: strokeWidth,
      x2: third * 2,
      y2: size - strokeWidth,
      stroke: '#000',
      strokeWidth,
    });
  }
  
  if (pattern === 'diag') {
    elements.push({
      type: 'line',
      x1: 0,
      y1: halfSize,
      x2: halfSize,
      y2: 0,
      stroke: '#000',
      strokeWidth,
    });
    elements.push({
      type: 'line',
      x1: 0,
      y1: size,
      x2: size,
      y2: 0,
      stroke: '#000',
      strokeWidth,
    });
    elements.push({
      type: 'line',
      x1: halfSize,
      y1: size,
      x2: size,
      y2: halfSize,
      stroke: '#000',
      strokeWidth,
    });
  }
  
  return {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    elements,
  };
}
