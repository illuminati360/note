import React from 'react';
import Svg, { Rect, Circle as SvgCircle, Path, Line, G, Defs, ClipPath, Mask } from 'react-native-svg';
import {
  generateSquareSVG,
  generateCircleSVG,
  generateFlowerSVG,
  type SVGData,
  type SVGElement,
  type SquareParams,
  type CircleParams,
  type FlowerParams,
} from '@prose/tiptap-extensions';

// Render SVGElement to React Native SVG components
function renderElement(el: SVGElement, key: string | number): React.ReactNode {
  switch (el.type) {
    case 'rect':
      return (
        <Rect
          key={key}
          x={el.x}
          y={el.y}
          width={el.width}
          height={el.height}
          fill={el.fill || 'none'}
          stroke={el.stroke || 'none'}
          strokeWidth={el.strokeWidth}
          transform={el.transform}
        />
      );
    
    case 'circle':
      return (
        <SvgCircle
          key={key}
          cx={el.cx}
          cy={el.cy}
          r={el.r}
          fill={el.fill || 'none'}
          stroke={el.stroke || 'none'}
          strokeWidth={el.strokeWidth}
          transform={el.transform}
        />
      );
    
    case 'line':
      return (
        <Line
          key={key}
          x1={el.x1}
          y1={el.y1}
          x2={el.x2}
          y2={el.y2}
          stroke={el.stroke || '#000'}
          strokeWidth={el.strokeWidth}
          transform={el.transform}
        />
      );
    
    case 'path':
      return (
        <Path
          key={key}
          d={el.d}
          fill={el.fill || 'none'}
          stroke={el.stroke || 'none'}
          strokeWidth={el.strokeWidth}
          transform={el.transform}
          clipPath={el.clipPath}
          mask={el.mask}
        />
      );
    
    case 'g':
      return (
        <G key={key} transform={el.transform} clipPath={el.clipPath}>
          {el.children.map((child, i) => renderElement(child, i))}
        </G>
      );
    
    case 'defs':
      return (
        <Defs key={key}>
          {el.children.map((child, i) => renderElement(child as SVGElement, i))}
        </Defs>
      );
    
    case 'clipPath':
      return (
        <ClipPath key={key} id={el.id}>
          {el.children.map((child, i) => renderElement(child, i))}
        </ClipPath>
      );
    
    case 'mask':
      return (
        <Mask key={key} id={el.id}>
          {el.children.map((child, i) => renderElement(child, i))}
        </Mask>
      );
    
    default:
      return null;
  }
}

// Render SVGData to React Native SVG component
function renderSVG(data: SVGData): React.ReactNode {
  return (
    <Svg width={data.width} height={data.height} viewBox={data.viewBox}>
      {data.elements.map((el, i) => renderElement(el, i))}
    </Svg>
  );
}

interface IconProps {
  size?: number;
}

// Square icon - uses shared SVG generator
export const SquareIcon: React.FC<IconProps & SquareParams> = ({ size = 18, ...params }) => {
  const svgData = generateSquareSVG({ ...params, scale: size / 24 });
  return <>{renderSVG(svgData)}</>;
};

// Circle icon - uses shared SVG generator
export const CircleIcon: React.FC<IconProps & CircleParams> = ({ size = 18, ...params }) => {
  const svgData = generateCircleSVG({ ...params, scale: size / 24 });
  return <>{renderSVG(svgData)}</>;
};

// Flower icon - uses shared SVG generator
export const FlowerIcon: React.FC<IconProps & FlowerParams> = ({ size = 18, ...params }) => {
  const svgData = generateFlowerSVG({ ...params, scale: size / 28 });
  return <>{renderSVG(svgData)}</>;
};
