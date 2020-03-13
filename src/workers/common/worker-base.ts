/* eslint-disable @typescript-eslint/no-explicit-any */
import amqp, { Connection, Channel, Message } from 'amqplib/callback_api';
import config from 'config'; // test
import { Worker } from './worker';
interface WorkerConfig {
    workerExchange: string;
    resultExchange: string;
    connUrl: string;
}

export default class WorkerBase implements Worker {
    protected connection: Connection | undefined;
    protected workerConfig: WorkerConfig;
    constructor(protected routingKey: string) {
        this.workerConfig = config.get<WorkerConfig>('workerConfig');
    }

    async start(): Promise<void> {
        this.connection = await this.connect();
        const channel = await this.createChannel();
        await this.assertExchange(channel);
        this.createQueueAndListen(channel);
    }

    async connect(): Promise<Connection> {
        return new Promise((resolve, reject) => {
            amqp.connect(this.workerConfig.connUrl, (err, connection) => {
                if (err) {
                    reject(err);
                }
                resolve(connection);
            });
        });
    }
    async createChannel(): Promise<Channel> {
        return new Promise((resolve, reject) => {
            if (this.connection) {
                this.connection.createChannel(function(err, channel) {
                    if (err) {
                        reject(err);
                    }
                    resolve(channel);
                });
            }
        });
    }
    async assertExchange(channel: Channel): Promise<void> {
        return new Promise((resolve, reject) => {
            channel.assertExchange(this.workerConfig.workerExchange, 'direct', { durable: true }, (err, ok) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
    private createQueueAndListen(channel: Channel): void {
        channel.assertQueue('', { exclusive: true }, (err, queue) => {
            if (err) {
                throw err;
            } else {
                console.log(
                    `Will listen for messages in ${this.workerConfig.workerExchange} with route key ${this.routingKey} (${queue.queue})`,
                );
                channel.prefetch(1);
                channel.bindQueue(queue.queue, this.workerConfig.workerExchange, this.routingKey);
                this.listen(channel, queue.queue);
            }
        });
    }

    private listen(channel: Channel, queueName: string): void {
        console.log(` [*] Waiting for messages in ${queueName}. To exit press CTRL+C`);
        channel.consume(queueName, this.handleMessage(channel), { noAck: false });
    }

    handleMessage(channel: Channel): (msg: Message | null) => void {
        return (msg: Message | null): void => {
            console.log(`Cannot handle message for ${msg?.fields.routingKey}. Handler has not been implemented`);
            return;
        };
    }

    protected publishError(channel: Channel, exchangeName: string, routingKey: string, msg: Message, err: any): void {
        console.log('Error');
        console.log(err);

        if (channel.publish(exchangeName, routingKey, Buffer.from(`${err}`))) {
            channel.ack(msg);
            console.log(' [x] Errors occured');
        }
    }
    protected publishResult(
        channel: Channel,
        response: any,
        resexch: string,
        resultRoutingKey: string,
        msg: Message,
    ): void {
        const jsonResp = JSON.stringify(response);
        console.log(`Publishing result to ${resexch}/${resultRoutingKey}`);
        if (channel.publish(resexch, resultRoutingKey, Buffer.from(jsonResp))) {
            channel.ack(msg);
            console.log(' [x] Done');
        }
    }
}
