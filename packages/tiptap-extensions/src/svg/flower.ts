// Flower shape SVG generator
// Based on visuals.tex flower command with bezier curve petals

import type { SVGData, SVGElement } from './types';

export interface FlowerParams {
  color?: string;
  pattern?: 'none' | 'vert';
  fill?: 'full' | 'thin' | 'thick';
  clock?: 'none' | 'simple' | 'hollow' | 'double' | 'dot';
  rotate?: boolean;
  scale?: number;
}

// Helper function to convert polar to cartesian coordinates
function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number): { x: number; y: number } {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

// Generate SVG path for flower petals using bezier curves
// Based on the LaTeX \dfl command with parameters r (radius) and b (depth)
function generateFlowerPath(cx: number, cy: number, r: number, b: number): string {
  let path = '';
  
  // Start at the first point A at angle 0
  const startPoint = polarToCartesian(cx, cy, r, 0);
  path += `M ${startPoint.x} ${startPoint.y}`;
  
  // Generate 6 petals (every 60 degrees)
  for (let i = 0; i < 6; i++) {
    const angle = i * 60;
    
    // Point A: outer point at current angle
    const A = polarToCartesian(cx, cy, r, angle);
    
    // Point A1: control point for A, at angle+90 with distance 0.28*r from A
    const A1 = polarToCartesian(A.x, A.y, 0.28 * r, angle + 90);
    
    // Point B: inner point at angle+30 with radius (r-b)
    const B = polarToCartesian(cx, cy, r - b, angle + 30);
    
    // Point B1: control point before B, at angle+30-90 with distance 0.12*r from B
    const B1 = polarToCartesian(B.x, B.y, 0.12 * r, angle + 30 - 90);
    
    // Point B2: control point after B, at angle+30+90 with distance 0.12*r from B
    const B2 = polarToCartesian(B.x, B.y, 0.12 * r, angle + 30 + 90);
    
    // Point C: outer point at angle+60
    const C = polarToCartesian(cx, cy, r, angle + 60);
    
    // Point C1: control point for C, at angle-30 with distance 0.28*r from C
    const C1 = polarToCartesian(C.x, C.y, 0.28 * r, angle + 60 - 90);
    
    // First bezier: A -> B (using A1 and B1 as control points)
    path += ` C ${A1.x} ${A1.y}, ${B1.x} ${B1.y}, ${B.x} ${B.y}`;
    
    // Second bezier: B -> C (using B2 and C1 as control points)
    path += ` C ${B2.x} ${B2.y}, ${C1.x} ${C1.y}, ${C.x} ${C.y}`;
  }
  
  path += ' Z'; // Close the path
  
  return path;
}

export function generateFlowerSVG(params: FlowerParams = {}): SVGData {
  const {
    color = 'lightgray',
    pattern = 'none',
    fill = 'full',
    clock = 'none',
    rotate = false,
    scale = 1.0,
  } = params;

  const size = 28 * scale;
  const center = size / 2;
  const r = size * 0.4; // Radius of the flower
  const b = r * 0.2;    // Depth of the inner points (how much they "sink")
  const strokeWidth = 1;
  
  const fillColor = color === 'none' ? 'transparent' : color;
  const rotateTransform = rotate ? `rotate(45 ${center} ${center})` : undefined;
  
  const elements: SVGElement[] = [];
  
  // Generate the flower path
  const flowerPath = generateFlowerPath(center, center, r, b);
  
  // For thin/thick fill, we need to create a clipping mask
  if (fill === 'thin' || fill === 'thick') {
    const innerScale = fill === 'thick' ? 0.55 : 0.7;
    const innerR = r * innerScale;
    const innerB = b * innerScale;
    const innerPath = generateFlowerPath(center, center, innerR, innerB);
    
    // Create defs with mask
    elements.push({
      type: 'defs',
      children: [
        {
          type: 'mask',
          id: 'flowerMask',
          children: [
            {
              type: 'rect',
              x: 0,
              y: 0,
              width: size,
              height: size,
              fill: 'white',
            },
            {
              type: 'path',
              d: innerPath,
              fill: 'black',
            },
          ],
        },
      ],
    });
    
    // Draw the outer shape with mask
    elements.push({
      type: 'path',
      d: flowerPath,
      fill: fillColor,
      stroke: 'none',
      mask: 'url(#flowerMask)',
      transform: rotateTransform,
    });
  } else {
    // Full fill
    elements.push({
      type: 'path',
      d: flowerPath,
      fill: fillColor,
      stroke: 'none',
      transform: rotateTransform,
    });
  }
  
  // Vertical pattern (3 lines)
  if (pattern === 'vert') {
    const sin60 = Math.sin(Math.PI / 3);
    
    // Create clip path for pattern
    elements.push({
      type: 'defs',
      children: [
        {
          type: 'clipPath',
          id: 'flowerPatternClip',
          children: [
            {
              type: 'path',
              d: flowerPath,
            },
          ],
        },
      ],
    });
    
    elements.push({
      type: 'g',
      clipPath: 'url(#flowerPatternClip)',
      transform: rotateTransform,
      children: [
        {
          type: 'line',
          x1: center - r / 2,
          y1: center - r * sin60,
          x2: center - r / 2,
          y2: center + r * sin60,
          stroke: '#000',
          strokeWidth,
        },
        {
          type: 'line',
          x1: center,
          y1: center - r + b,
          x2: center,
          y2: center + r - b,
          stroke: '#000',
          strokeWidth,
        },
        {
          type: 'line',
          x1: center + r / 2,
          y1: center - r * sin60,
          x2: center + r / 2,
          y2: center + r * sin60,
          stroke: '#000',
          strokeWidth,
        },
      ],
    });
  }
  
  // Clock hands
  if (clock !== 'none') {
    const handWidth = r * 0.25;
    const handHeight = r * 0.8;
    const handY = center - r * 0.3 - handHeight;
    
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
