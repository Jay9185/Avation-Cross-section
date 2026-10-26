// Renders the worker locally with demo traffic, checks the BMP against the firmware's header rules,
// and writes out/xs.bmp and out/xs.png.   node test-local.mjs
import worker from './worker.js';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('out', { recursive: true });
const get = async (p) => worker.fetch(new Request(`https://example.workers.dev${p}`), {});

const disp = await (await get('/api/display?demo=1')).json();
console.log('display:', disp);
const setup = await (await get('/api/setup')).json();
console.log('setup  :', setup);

const c0 = process.cpuUsage(), t0 = performance.now();
const bmp = new Uint8Array(await (await get('/img/xs-test.bmp?demo=1')).arrayBuffer());
const cpu = process.cpuUsage(c0), ms = performance.now() - t0;
const png = new Uint8Array(await (await get('/preview.png?demo=1')).arrayBuffer());
writeFileSync('out/xs.bmp', bmp); writeFileSync('out/xs.png', png);

const dv = new DataView(bmp.buffer);
const checks = {
  magic: bmp[0] === 0x42 && bmp[1] === 0x4d,
  width800: dv.getUint32(18, true) === 800, height480: dv.getUint32(22, true) === 480,
  bpp1: dv.getUint16(28, true) === 1, dataSize48000: dv.getUint32(34, true) === 48000,
  colors2: dv.getUint32(46, true) === 2, offset62: dv.getUint32(10, true) === 62,
  paletteStd: bmp[54] === 0 && bmp[55] === 0 && bmp[56] === 0 && bmp[57] === 0 && bmp[58] === 255 && bmp[59] === 255 && bmp[60] === 255 && bmp[61] === 0,
  totalBytes48062: bmp.length === 48062,
};
console.log(checks);
console.log(`bmp ${bmp.length} B, png ${png.length} B, wall ${ms.toFixed(1)} ms, cpu ${((cpu.user + cpu.system) / 1000).toFixed(1)} ms`);
if (!Object.values(checks).every(Boolean)) process.exit(1);
