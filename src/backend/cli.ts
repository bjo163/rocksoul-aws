// @ts-nocheck
import {createBackend} from './bootstrap.js';
const {runtime} = createBackend({dataDir:process.env.MOONWITNESS_DATA_DIR ?? '.data'});
const [, , command] = process.argv;
if (command === 'health') console.log(JSON.stringify(runtime.health(),null,2));
else if (command === 'types') console.log(JSON.stringify(runtime.types.list(),null,2));
else if (command === 'graph') console.log(JSON.stringify(runtime.graph.snapshot(),null,2));
else if (command === 'integrity') console.log(JSON.stringify(runtime.graph.integrity(),null,2));
else { console.log('Usage: node src/backend/cli.ts <health|types|graph|integrity>'); process.exitCode=1; }
