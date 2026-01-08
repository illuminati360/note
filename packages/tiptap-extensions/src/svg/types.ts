// Shared SVG element types that can be rendered to HTML string or React Native SVG

export interface SVGRect {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  transform?: string;
}

export interface SVGCircle {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  transform?: string;
}

export interface SVGLine {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke?: string;
  strokeWidth?: number;
  transform?: string;
}

export interface SVGPath {
  type: 'path';
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  transform?: string;
  clipPath?: string;
  mask?: string;
}

export interface SVGGroup {
  type: 'g';
  children: SVGElement[];
  transform?: string;
  clipPath?: string;
}

export interface SVGDefs {
  type: 'defs';
  children: (SVGClipPath | SVGMask)[];
}

export interface SVGClipPath {
  type: 'clipPath';
  id: string;
  children: SVGElement[];
}

export interface SVGMask {
  type: 'mask';
  id: string;
  children: SVGElement[];
}

export type SVGElement = SVGRect | SVGCircle | SVGLine | SVGPath | SVGGroup | SVGDefs | SVGClipPath | SVGMask;

export interface SVGData {
  width: number;
  height: number;
  viewBox: string;
  elements: SVGElement[];
}
