// Packages a Steam depot folder (QA STEAM-02 / 03). One command per Steam app, so the demo and the full game can never
// swap app ids, web builds or save folders by hand:
//   STEAM_APP_ID=<full game id> node package.cjs full [win|linux]
//   STEAM_APP_ID=<demo id> VITE_STORE_APP_ID=<full game id> node package.cjs demo [win|linux]
// (npm run package:full / package:demo do the same.) Output: ../release/<target>-<platform>/ (upload that folder to the
// app's depot). 480 (Valve's test app) is refused unless ALLOW_TEST_APPID=1, for a local test package.
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const TARGETS = {
  // The product name names the save folder (<appData>/<productName>/saves): never rename it after release.
  full: { mode: 'steam', productName: 'Reel Brawl', exe: 'ReelBrawl', appId: 'com.reelbrawl.game' },
  demo: { mode: 'steam-demo', productName: 'Reel Brawl Demo', exe: 'ReelBrawlDemo', appId: 'com.reelbrawl.demo' },
};
const target = process.argv[2];
const platform = process.argv[3] || 'win';
const t = TARGETS[target];
if (!t || !['win', 'linux'].includes(platform)) {
  console.error('usage: node package.cjs full|demo [win|linux]');
  process.exit(1);
}
const steamAppId = String(process.env.STEAM_APP_ID || '').trim();
if (!/^\d+$/.test(steamAppId) || (steamAppId === '480' && process.env.ALLOW_TEST_APPID !== '1')) {
  console.error(`package ${target}: set STEAM_APP_ID to this Steam app's id (the ${target === 'demo' ? "demo's own" : "full game's"} id from Steamworks). 480 is Valve's test app.`);
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const work = path.join(root, 'release', '.work', target);
const web = path.join(work, 'web');
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });

// 1. The web build for this target, in its own folder (both used to write ../dist).
execSync(`npx tsc --noEmit && npx vite build --mode ${t.mode} --outDir ${JSON.stringify(web)} --emptyOutDir`, { cwd: root, stdio: 'inherit', env: process.env });
// 2. The app id baked in beside it (main.cjs reads it when packaged; Steam's own SteamAppId still wins).
fs.writeFileSync(path.join(work, 'appid.json'), JSON.stringify({ appId: Number(steamAppId), target }));

// 3. The Electron app around it.
const builder = require('electron-builder');
builder
  .build({
    targets: builder.Platform[platform === 'win' ? 'WINDOWS' : 'LINUX'].createTarget('dir', builder.Arch.x64),
    config: {
      appId: t.appId,
      productName: t.productName,
      executableName: t.exe,
      directories: { output: path.join(root, 'release', `${target}-${platform}`), buildResources: __dirname },
      files: ['main.cjs', 'preload.cjs', 'package.json', 'icon.png'],
      extraResources: [
        { from: web, to: 'web' },
        { from: path.join(work, 'appid.json'), to: 'appid.json' },
      ],
      // steamworks.js's native module and steam_api libraries can't load from inside the asar.
      asarUnpack: ['**/node_modules/steamworks.js/**'],
      electronLanguages: ['en-US'],
      extraMetadata: { name: t.exe.toLowerCase(), productName: t.productName },
      win: { icon: path.join(__dirname, 'icon.png'), signAndEditExecutable: !!process.env.WIN_EDIT_EXE },
      linux: { icon: path.join(__dirname, 'icon.png'), category: 'Game' },
    },
  })
  .then((out) => console.log(`packaged ${target} (${platform}, Steam app ${steamAppId}):`, path.join(root, 'release', `${target}-${platform}`)))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
