// This script reads the built HTML and exports it as a TypeScript string
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'dist', 'index.html');
const outputPath = path.join(__dirname, '..', 'src', 'editor', 'editorHtml.ts');

const html = fs.readFileSync(htmlPath, 'utf-8');

// Escape backticks and ${} for template literal
const escapedHtml = html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const output = `// Auto-generated file - do not edit directly
// Run "npm run build" in editor-web to regenerate

export const editorHtml = \`${escapedHtml}\`;
`;

// Ensure the output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, output);
console.log('Generated editorHtml.ts');
