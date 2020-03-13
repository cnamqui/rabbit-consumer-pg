import WorkerBase from './common/worker-base';
import { Worker } from './common/worker';
import { Channel, Message } from 'amqplib/callback_api';
import config from 'config';
import dns from 'dns';
import whois from 'whois-rdap';

export class RDAPWorker extends WorkerBase implements Worker {
    constructor() {
        const routingKey = config.get<string>('routingKeys.rdap');
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
                            console.log('Error');
                            console.log(err);

                            if (channel.publish(resexch, content.resultRoutingKey, Buffer.from(`${err}`))) {
                                channel.ack(msg);
                                console.log(' [x] Errors occured');
                            }
                        } else {
                            const w = new whois();
                            w.check(result)
                                .then((rdap: any) => {
                                    const response = {
                                        RDAPResponse: rdap.rdap,
                                    };
                                    this.publishResult(channel, response, resexch, resultRoutingKey, msg);
                                })
                                .catch((e: any) => {
                                    this.publishError(channel, resexch, resultRoutingKey, msg, e);
                                });
                        }
                    });
                });
            }
        };
    }
}
