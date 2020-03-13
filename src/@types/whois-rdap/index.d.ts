/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'whois-rdap' {
    export default class WhoIsIp {
        connect(url: string): any;
        use(client: any, dbName: any, collectionName: any): Promise<any>;
        configure(): any;
        checkOne(addr: string): Promise<any>;
        check(addr: string): Promise<any>;
        query(addr: string): any;
        fetch(addr: string): any;
    }
}
