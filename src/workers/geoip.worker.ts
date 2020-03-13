import WorkerBase from './common/worker-base';
import { Worker } from './common/worker';
import { Channel, Message } from 'amqplib/callback_api';
import config from 'config';
import dns from 'dns';
import geoip from 'geoip-lite';

export class GeoIPWorker extends WorkerBase implements Worker {
    constructor() {
        const routingKey = config.get<string>('routingKeys.geoip');
        super(routingKey);
    }

    handleMessage(channel: Channel): (msg: Message | null) => void {
        return (msg: Message | null): void => {
            if (msg) {
                console.log(' [x] Received %s', msg.content.toString());
                const resexch = this.workerConfig.resultExchange;
                channel.assertExchange(resexch, 'direct', { durable: true }, err => {
                    if (err) {
                        throw err;
                    }
                    const content = JSON.parse(msg.content.toString());
                    const { address, resultRoutingKey } = content;
                    dns.lookup(address, (err: NodeJS.ErrnoException | null, result: string) => {
                        if (err) {
                            this.publishError(channel, resexch, resultRoutingKey, msg, err);
                        } else {
                            const geo = geoip.lookup(result);
                            const response = {
                                geoIpResponse: geo,
                            };
                            this.publishResult(channel, response, resexch, resultRoutingKey, msg);
                        }
                    });
                });
            }
        };
    }
}
