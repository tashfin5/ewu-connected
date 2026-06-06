const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'node_modules/app-builder-lib/templates/nsis/include/allowOnlyOneInstallerInstance.nsh');
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/!macro CHECK_APP_RUNNING[\s\S]*?!macroend/, '!macro CHECK_APP_RUNNING\n!macroend');
  content = content.replace(/!macro _CHECK_APP_RUNNING[\s\S]*?!macroend/, '!macro _CHECK_APP_RUNNING\n!macroend');
  fs.writeFileSync(file, content);
  console.log('NSIS patched successfully');
}
