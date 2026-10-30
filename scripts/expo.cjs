/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

// Use the project runtime when Windows has an older system Node installed.
const localNode = path.resolve(__dirname, '../.tools/node.exe');
const runtime = process.platform === 'win32' && fs.existsSync(localNode)
  ? localNode
  : process.execPath;
const child = spawn(runtime, [require.resolve('expo/bin/cli'), ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, PATH: `${path.dirname(runtime)}${path.delimiter}${process.env.PATH || ''}` },
});
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
