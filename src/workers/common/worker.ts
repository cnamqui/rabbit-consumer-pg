import { Channel, Message } from 'amqplib/callback_api';

export interface Worker {
    start(): Promise<void>;
    handleMessage(channel: Channel): (msg: Message | null) => void;
}
