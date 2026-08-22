import { revelationSemanticCoreSnapshot } from '../src/revelation/revelation-semantic-core.js';
const report=revelationSemanticCoreSnapshot(process.cwd());
console.log(JSON.stringify(report,null,2));
