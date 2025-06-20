const fs = require('fs');
// check for removeWs=false
const cliFile = fs.readFileSync('src/cli.ts', 'utf-8');
const containsRemoveWsTrue = cliFile.replace(/ /g, '').includes('removeWsFile=false');
const extensionFile = fs.readFileSync('src/extension.ts', 'utf-8');
const containsAwaitedCommented = extensionFile.replace(/ /g, '').includes('//awaitfs.unlink');

console.error('IS WATCH RUNNNNNNNING???');


if(containsAwaitedCommented || containsRemoveWsTrue) {
  console.log('remove commented out');
  process.exit(1);
}
