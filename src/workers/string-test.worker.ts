import WorkerBase from './common/worker-base';
import { Worker } from './common/worker';
import { Channel, Message } from 'amqplib/callback_api';
import config from 'config';

export class StringTestWorker extends WorkerBase implements Worker {
    constructor() {
        const routingKey = config.get<string>('routingKeys.stringTest');
        super(routingKey);
    }

    handleMessage(channel: Channel): (msg: Message | null) => void {
        return (msg: Message | null): void => {
            if (msg) {
                const secs = msg.content.toString().split('.').length - 1;

                console.log(' [x] Received %s', msg.content.toString());
                const resexch = this.workerConfig.resultExchange;
                channel.assertExchange(resexch, 'direct', { durable: true }, err => {
                    if (err) {
                        throw err;
                    }
                    setTimeout(function() {
                        // return results to the result exchange;
                        const content = JSON.parse(msg.content.toString());
                        const originalPayload = Object.assign({}, msg, { content });
                        const response = {
                            date: new Date(),
                            message: 'this request has been processed',
                            originalPayload,
                        };
                        const jsonResp = JSON.stringify(response);
                        console.log(`------------ CONTENT ------------`);
                        console.log(content);
                        console.log(`Publishing result to ${resexch}/${content.resultRoutingKey}`);
                        if (channel.publish(resexch, content.resultRoutingKey, Buffer.from(jsonResp))) {
                            channel.ack(msg);
                            console.log(' [x] Done');
                        }
                    }, secs * 1000);
                });
            }
        };
    }
}
