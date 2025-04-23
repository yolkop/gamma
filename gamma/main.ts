import cluster from 'node:cluster';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Worker } from 'node:worker_threads';

import { WebSocketServer } from 'ws';

import Handler from './handler';
import { DatabaseAccount, Stats } from './types';

if (!process.env.PROXY_URL) throw new Error('PROXY_URL is not set. Please set it in the .env file.');

const dbPath = path.join(import.meta.dirname, 'db');
if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath);

const accountPath = path.join(dbPath, 'accounts.json');
if (!fs.existsSync(accountPath)) fs.writeFileSync(accountPath, '[]');

if (cluster.isPrimary) {
    const handler = new Handler();

    const accountWorker = cluster.fork(process.env);
    const cwWorker = cluster.fork(process.env);
    const socketWorker = cluster.fork(process.env);

    socketWorker.on('message', (message: string) => {
        if (message === 'ready') socketWorker.send('socketWorker');
    });

    accountWorker.on('message', async (account: DatabaseAccount | string) => {
        if (typeof account === 'string') return accountWorker.send('accountWorker');

        console.log('account verified successfully (party face):', account.email);

        handler.addAccount(account);
        cwWorker.send(account);
    });

    interface Pull {
        email: string;
        type: string;
        eggs: number;
        item: number;
        tier: number;
        canPlayAgain: number;
    }

    cwWorker.on('message', async (pull: Pull | string) => {
        if (typeof pull === 'string') return cwWorker.send('cwWorker');

        if (pull.type == 'eggs') handler.pulledEggs(pull);
        else if (pull.type == 'item') handler.pulledItem(pull);
        else if (pull.type == 'delete') handler.delete(pull);
        else if (pull.type === 'update') handler.update(pull);
        else console.log('unknown pull type??', pull.type, pull);
    });

    setTimeout(() => {
        console.log('assuming everything is done, posting messages');

        const accountQueue: DatabaseAccount[] = [];

        handler.getAccounts().filter((acc: DatabaseAccount) => !acc.isBroken).forEach((acc: DatabaseAccount) => {
            if (acc.canPlayAgain < Date.now()) accountQueue.push(acc);
            else {
                const waitingFor = (acc.canPlayAgain - Date.now()) + 10000;
                setTimeout(() => accountQueue.push(acc), waitingFor);
            }
        });

        setInterval(() => {
            if (accountQueue.length) {
                const acc = accountQueue.shift();
                if (acc) cwWorker.send(acc);
            }
        }, Number(process.env.CW_INTERVAL) || 1000);
    }, 1000);

    setInterval(() => socketWorker.send(handler.stats), 1000);
} else if (process.send) {
    process.send('ready');

    let stats: Stats;

    const runSocketWorker = () => {
        const handler = new Handler();

        const nodes = process.env.PORTS.split(',').map((port) => parseInt(port.trim()));
        const passwords = process.env.PASSWORDS.split(',').map((password) => password.trim());

        nodes.forEach((port, i) => {
            const wss = new WebSocketServer({ port });

            wss.on('connection', (ws) => {
                let isAuthorized = false;

                ws.on('message', (msg) => {
                    try {
                        const message = msg.toString();
                        if (!message.startsWith('{') || !message.endsWith('}')) return;

                        const data = JSON.parse(message);

                        if (data.type === 'auth' && data.code === passwords[i]) {
                            isAuthorized = true;
                            ws.send(JSON.stringify({ type: 'stats', stats }));
                        }

                        if (data.type === 'info' && data.email && isAuthorized) {
                            const entry = handler.getEncodedAccount(data.email);
                            ws.send(JSON.stringify({ type: 'info', entry }));
                        }

                        if (data.type === 'accounts' && data.item && isAuthorized) {
                            const accounts = handler.getAccountsWithItem(data.item);
                            ws.send(JSON.stringify({ type: 'accounts', accounts }));
                        }
                    } catch (e) {
                        console.error(e);
                    }
                })
            })
        })
    }

    let designatedWorker: Worker, myRole: string;

    process.on('message', async (message: Stats | string) => {
        if (!myRole && typeof message === 'string') {
            myRole = message;

            console.log(`worker ${process.pid} has been assigned ${myRole}`)

            if (myRole === 'accountWorker') designatedWorker = new Worker(path.join(import.meta.dirname, 'workers', 'account.ts'));
            if (myRole === 'cwWorker') designatedWorker = new Worker(path.join(import.meta.dirname, 'workers', 'cw.ts'));
            if (myRole === 'socketWorker') return runSocketWorker();

            designatedWorker.on('message', (message) => process.send && process.send(message));
        } else if (designatedWorker) designatedWorker.postMessage(message);
        else if (myRole === 'socketWorker' && typeof message === 'object') stats = message as Stats;
    });
}