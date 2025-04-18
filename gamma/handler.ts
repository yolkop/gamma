import fs from 'node:fs';
import path from 'node:path';

import { findItemById } from 'yolkbot/constants';

import { DatabaseAccount, Stats } from './types.d';

const isAntiDelete = parseInt(process.env.ANTI_DELETE_ON) == 1;

class Handler {
    stats: Stats = {
        numAccounts: 0,
        eggs: 0,
        items: {},
        bigEggAccounts: {}
    }

    maskEmail(email: string) {
        const [localPart, domain] = email.split('@');
        const maskedLocalPart = localPart.slice(0, 2) + '*'.repeat(localPart.length - 2);
        return `${maskedLocalPart}@${domain}`;
    }

    constructor() {
        const accounts = this.getAccounts();

        this.stats.numAccounts = accounts.length;

        for (const accountI in accounts) {
            const account = accounts[accountI];

            account.items && Object.entries(account.items).forEach(([item, count]) => {
                if (!this.stats.items[item]) this.stats.items[item] = count;
                else this.stats.items[item] += count;
            });

            this.stats.eggs += account.eggs || 0;
            if (account.eggs >= 100000) this.stats.bigEggAccounts[this.maskEmail(account.email)] = account.eggs;
        }

        console.log('compiled initial stats! global eggs:', this.stats.eggs.toLocaleString(), '/ accounts:', this.stats.numAccounts, '/ items:', Object.values(this.stats.items).reduce((sum, count) => sum + count, 0));
    }

    #fetch(): DatabaseAccount[] {
        return JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'db', 'accounts.json'), 'utf8'));
    }

    #write(db: DatabaseAccount[]) {
        fs.writeFileSync(path.join(import.meta.dirname, 'db', 'accounts.json'), JSON.stringify(db, null, 4));
    }

    addAccount(credentials: { email: string; password: string }) {
        const db = this.#fetch();

        db.push({ ...credentials, eggs: 0, items: {}, canPlayAgain: 0, isAntiDelete });

        this.stats.numAccounts++;

        this.#write(db);
    }

    getAccounts() {
        return this.#fetch();
    }

    pulledEggs(pull: { email: string; eggs: number }) {
        const db = this.#fetch();

        const account = db.find((acc: DatabaseAccount) => acc.email == pull.email);
        if (account) {
            account.eggs += pull.eggs;
            this.stats.eggs += pull.eggs;

            if (pull.eggs >= 100000) this.stats.bigEggAccounts[this.maskEmail(account.email)] = account.eggs;
        } else console.log('[!] cannot find account for', pull.email);

        this.#write(db);
    }

    pulledItem(pull: { email: string; tier: number; item: number }) {
        const db = this.#fetch();

        const account = db.find((acc: DatabaseAccount) => acc.email == pull.email);
        if (!account) return console.log('[!] cannot find account for', pull.email);

        const formedItemName = `[T${pull.tier}] ${findItemById(pull.item).name}`;

        if (!account.items) account.items = {};

        if (!account.items[formedItemName]) account.items[formedItemName] = 1;
        else account.items[formedItemName]++;

        if (!this.stats.items[formedItemName]) this.stats.items[formedItemName] = 1;
        else this.stats.items[formedItemName]++;

        this.#write(db);
    }

    delete(pull: { email: string }) {
        const db = this.#fetch();

        const account = db.find((acc: DatabaseAccount) => acc.email == pull.email);
        if (account) account.isBroken = true;
        else console.log('[!] cannot find account for', pull.email);

        this.#write(db);
    }

    update(data: { email: string; canPlayAgain: number }) {
        const db = this.#fetch();

        const account = db.find((acc: DatabaseAccount) => acc.email == data.email);
        if (account) account.canPlayAgain = data.canPlayAgain;
        else console.log('something seems to have happened', data);

        this.#write(db);
    }
}

export default Handler;