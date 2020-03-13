import { Worker } from './common/worker';
import { StringTestWorker } from './string-test.worker';
import { PingWorker } from './ping.worker';
import { GeoIPWorker } from './geoip.worker';
import { RDAPWorker } from './rdap.worker';

interface WorkerIndex {
    [key: string]: () => Worker;
}

export const Workers: WorkerIndex = {
    'string-test': () => new StringTestWorker(),
    ping: () => new PingWorker(),
    geoip: () => new GeoIPWorker(),
    rdap: () => new RDAPWorker(),
};
