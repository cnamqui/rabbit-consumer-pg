import config from 'config';

import { Workers } from './workers';
const defaultWorkerName = config.get<string>('defaultWorkerName');
const defaultWorker = Workers[defaultWorkerName];

let workerName = process.env.RCPG_WORKER_NAME || defaultWorkerName;
if (process.argv.length > 3) {
    workerName = process.argv[3];
}
console.log(`ARGS: ${process.argv.join('\n')}`);
console.log(`Worker name: ${workerName}`);
const worker = (Workers[workerName] || defaultWorker)();

worker.start().then(() => {
    console.log(`Worker ${workerName} is running`);
});
