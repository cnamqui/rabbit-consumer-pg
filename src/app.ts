const CONN_URL = 'amqp://localhost:32779/';
import amqp, { Connection, Channel } from 'amqplib/callback_api';
import config from 'config'; // test
interface WorkerConfig {
    workerExchange: string;
    resultExchange: string;
    route: string;
}

export default class App {
    protected connection: Connection | undefined;
    protected workerConfig: WorkerConfig;
    constructor() {
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
            amqp.connect(CONN_URL, (err, connection) => {
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
                    `Will listen for messages in ${this.workerConfig.workerExchange} with route key ${this.workerConfig.route} (${queue.queue})`,
                );
                channel.prefetch(1);
                channel.bindQueue(queue.queue, this.workerConfig.workerExchange, this.workerConfig.route);
                this.listen(channel, queue.queue);
            }
        });
    }

    private listen(channel: Channel, queueName: string): void {
        console.log(` [*] Waiting for messages in ${queueName}. To exit press CTRL+C`);
        channel.consume(
            queueName,
            msg => {
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
            },
            {
                // manual acknowledgment mode,
                // see https://www.rabbitmq.com/confirms.html for details
                noAck: false,
            },
        );
    }
}
