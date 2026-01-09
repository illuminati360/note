// Shape Extensions
export { Square, type SquareOptions, type SquareAttributes } from './extensions/Square';
export { Circle, type CircleOptions, type CircleAttributes } from './extensions/Circle';
export { Flower, type FlowerOptions, type FlowerAttributes } from './extensions/Flower';

// Margin Note Extension (inline anchor in main editor)
export { MarginNote, type MarginNoteOptions, type MarginNoteAttributes } from './extensions/MarginNote';

// Margin Note Block Extension (block wrapper in margin panel editor)
export { MarginNoteBlock, type MarginNoteBlockOptions, type MarginNoteBlockAttributes } from './extensions/MarginNoteBlock';

// Note Highlight Extension
export { NoteHighlight, type NoteHighlightOptions, type NoteHighlightAttributes } from './extensions/NoteHighlight';

// SVG generation utilities (for icons, etc.)
export * from './svg';
