// This script reads the built HTML files and exports them as TypeScript strings
const fs = require('fs');
const path = require('path');

// Helper to escape HTML for template literal
function escapeHtml(html) {
  return html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

// Ensure the output directory exists
const outputDir = path.join(__dirname, '..', 'src', 'editor');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate main editor HTML export
const mainHtmlPath = path.join(__dirname, 'dist', 'index.html');
const mainOutputPath = path.join(outputDir, 'editorHtml.ts');
const mainHtml = fs.readFileSync(mainHtmlPath, 'utf-8');
const mainOutput = `// Auto-generated file - do not edit directly
// Run "npm run build" in editor-web to regenerate

export const editorHtml = \`${escapeHtml(mainHtml)}\`;
`;
fs.writeFileSync(mainOutputPath, mainOutput);
console.log('Generated editorHtml.ts');

// Generate margin editor HTML export
const marginHtmlPath = path.join(__dirname, 'dist', 'margin.html');
const marginOutputPath = path.join(outputDir, 'marginEditorHtml.ts');
const marginHtml = fs.readFileSync(marginHtmlPath, 'utf-8');
const marginOutput = `// Auto-generated file - do not edit directly
// Run "npm run build" in editor-web to regenerate

export const marginEditorHtml = \`${escapeHtml(marginHtml)}\`;
`;
fs.writeFileSync(marginOutputPath, marginOutput);
console.log('Generated marginEditorHtml.ts');

