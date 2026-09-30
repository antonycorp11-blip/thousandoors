import { simulate } from '../src/world/Simulator';
simulate(Number(process.argv[2] ?? 12), 500, 7, console.log).then(r => { console.log(r); process.exit(r.errors.length ? 1 : 0); });
