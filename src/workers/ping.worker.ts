import WorkerBase from './common/worker-base';
import { Worker } from './common/worker';
import { Channel, Message } from 'amqplib/callback_api';
import config from 'config';
import dns from 'dns';
import tcpp from 'tcp-ping';

export class PingWorker extends WorkerBase implements Worker {
    constructor() {
        const routingKey = config.get<string>('routingKeys.ping');
        super(routingKey);
    }

    handleMessage(channel: Channel): (msg: Message | null) => void {
        return (msg: Message | null): void => {
            if (msg) {
                console.log(' [x] Received %s', msg.content.toString());
                const resexch = this.workerConfig.resultExchange;
                const content = JSON.parse(msg.content.toString());
                const { payload, resultRoutingKey } = content;
                const { address } = payload;
                channel.assertExchange(resexch, 'direct', { durable: true }, err => {
                    if (err) {
                        throw new Error(`Exchange: "${resexch} is not alive`);
                    }
                    tcpp.ping({ address }, (err, data) => {
                        if (err) {
                            this.publishError(channel, resexch, resultRoutingKey, msg, err);
                        } else {
                            const response = {
                                pingResponse: data,
                            };
                            this.publishResult(channel, response, resexch, resultRoutingKey, msg);
                        }
                    });
                });
            }
        };
    }
}
