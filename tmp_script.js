const fs = require('fs');
const path = require('path');

const screensDir = 'd:\\project\\baby log\\babysync\\src\\screens';

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Replace global mock with default empty state
  content = content.replace(
    /useAuthStore:\s*jest\.fn\(\)(?!\.)/g,
    `useAuthStore: jest.fn((selector) => { const state = { session: { user: { id: 'test-user' } }, activeParent: 'mom' }; return selector ? selector(state) : state; })`
  );

  // Replace specific global mock in Diaper/Doctor
  content = content.replace(
    /useAuthStore:\s*jest\.fn\(\)\.mockReturnValue\(\{\s*session:\s*\{\s*user:\s*\{\s*id:\s*'test-user'\s*\}\s*\}\s*\}\)/g,
    `useAuthStore: jest.fn((selector) => { const state = { session: { user: { id: 'test-user' } }, activeParent: 'mom' }; return selector ? selector(state) : state; })`
  );

  // Replace beforeEach mock
  // (useAuthStore as unknown as jest.Mock).mockReturnValue({ ... });
  const regex = /\(useAuthStore as unknown as jest\.Mock\)\.mockReturnValue\(\{\s*([\s\S]*?)\s*\}\);/g;
  content = content.replace(regex, (match, body) => {
    return `(useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {\n      const state = {\n        ${body}\n      };\n      return selector ? selector(state) : state;\n    });`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${path.basename(file)}`);
  }
}

const files = fs.readdirSync(screensDir).filter(f => f.endsWith('.test.tsx'));
files.forEach(f => processFile(path.join(screensDir, f)));
