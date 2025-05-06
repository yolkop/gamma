import cluster from 'node:cluster';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Worker } from 'node:worker_threads';

import Handler from './handler.ts';
import logger from './log.ts';
import type { DatabaseAccount } from './types.d.ts';

if (!process.env.PROXY_URL) {
    logger.red('[!] Gamma has never been tested without proxies.');
    logger.red('[!] There is a high chance that issues will arise.');
    logger.red('[!] I HIGHLY recommend you add a PROXY_URL to the .env file.');
}

const dbPath = path.join(import.meta.dirname, 'db');
if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath);

const accountPath = path.join(dbPath, 'accounts.json');
if (!fs.existsSync(accountPath)) fs.writeFileSync(accountPath, '[]');

if (cluster.isPrimary) {
    logger.magenta('[init] started gamma @', new Date().toLocaleString());

    const handler = new Handler();

    const accountWorker = cluster.fork(process.env);
    const cwWorker = cluster.fork(process.env);

    logger.magenta('[init] forked clusters, processes running')

    accountWorker.on('message', async (account: DatabaseAccount | string) => {
        if (typeof account === 'string') {
            logger.magenta('[init] account worker ready');
            return accountWorker.send('accountWorker');
        }

        logger.green('[acc] account sent up:', process.env.LOG_EMAILS === '1' ? account.email : '[hidden]');

        handler.addAccount(account);
        cwWorker.send(account);
    });

    interface Pull {
        email: string;
        type: string;
        eggs: number;
        item: string;
        tier: number;
        canPlayAgain: number;
    }

    cwWorker.on('message', async (pull: Pull | string) => {
        if (typeof pull === 'string') {
            logger.magenta('[init] cw worker ready');
            return cwWorker.send('cwWorker');
        }

        if (pull.type == 'eggs') handler.pulledEggs(pull);
        else if (pull.type == 'item') handler.pulledItem(pull);
        else if (pull.type == 'delete') handler.delete(pull);
        else if (pull.type === 'update') handler.update(pull);
        else logger.red('[!] unknown pull type??', pull.type, pull);
    });

    setTimeout(() => {
        logger.magenta('[init] alright, lets get this show on the road...');

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
} else if (process.send) {
    process.send('ready');

    let designatedWorker: Worker, myRole: string;

    process.on('message', async (message: any) => {
        if (!myRole && typeof message === 'string') {
            myRole = message;

            if (myRole === 'accountWorker') designatedWorker = new Worker(path.join(import.meta.dirname, 'workers', 'account.ts'));
            if (myRole === 'cwWorker') designatedWorker = new Worker(path.join(import.meta.dirname, 'workers', 'cw.ts'));

            designatedWorker.on('message', (message) => process.send && process.send(message));
        } else if (designatedWorker) designatedWorker.postMessage(message);
    });
}