import worker from './worker.js';
const get = (p) => worker.fetch(new Request(`https://x.dev${p}`), {});
for (let i = 0; i < 30; i++) await (await get('/img/a.bmp?demo=1')).arrayBuffer(); // warm up
const N = 40, c0 = process.cpuUsage();
for (let i = 0; i < N; i++) await (await get('/img/a.bmp?demo=1')).arrayBuffer();
const c = process.cpuUsage(c0);
console.log(`warm cpu per image: ${((c.user + c.system) / 1000 / N).toFixed(2)} ms`);
