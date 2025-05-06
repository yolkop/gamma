import fs from 'node:fs';
import path from 'node:path';

import { decrypt, encrypt } from './encoding.ts';

import type { DatabaseAccount, Stats } from './types.d.ts';

const isAntiDelete = parseInt(process.env.ANTI_DELETE_ON) == 1;

const databaseDir = path.join(import.meta.dirname, 'db');
const databasePath = path.join(databaseDir, 'accounts.json');
const lastDayPath = path.join(databaseDir, 'dayTick.txt');

const dayTick = () => Math.floor((Date.now() - new Date(Date.UTC(2025, 3, 21)).getTime()) / (1000 * 60 * 60 * 24));

class Handler {
    stats: Stats = {
        numAccounts: 0,
        eggs: 0,
        items: {},
        bigEggAccounts: {}
    }

    constructor(noStats: boolean = false) {
        if (fs.readFileSync(lastDayPath, 'utf8') != dayTick().toString()) {
            fs.cpSync(databasePath, path.join(databaseDir, `accounts-backup-${dayTick().toString()}.json`), { force: true });
            fs.writeFileSync(lastDayPath, dayTick().toString());
        }

        if (noStats) return;

        this.compileStats();

        console.log('compiled initial stats! global eggs:', this.stats.eggs.toLocaleString(), '/ accounts:', this.stats.numAccounts, '/ items:', Object.values(this.stats.items).reduce((sum, count) => sum + count, 0));
    }

    compileStats() {
        const accounts = this.#fetch();

        this.stats.numAccounts = accounts.length;

        for (const accountI in accounts) {
            const account = accounts[accountI];

            account.items && Object.entries(account.items).forEach(([item, count]) => {
                if (!this.stats.items[item]) this.stats.items[item] = count;
                else this.stats.items[item] += count;
            });

            this.stats.eggs += account.eggs || 0;
            if (account.eggs >= 100000) this.stats.bigEggAccounts[encrypt(account.email.split('@')[0])] = account.eggs;
        }

        return this.stats;
    }

    #fetch(): DatabaseAccount[] {
        return JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'db', 'accounts.json'), 'utf8'));
    }

    write(db: DatabaseAccount[]) {
        fs.writeFileSync(path.join(import.meta.dirname, 'db', 'accounts.json'), JSON.stringify(db, null, 4));
    }

    addAccount(credentials: { email: string; password: string }) {
        const db = this.#fetch();

        db.push({
            email: credentials.email,
            password: credentials.password,

            eggs: 0,
            items: {},

            canPlayAgain: 0,
            isAntiDelete
        });

        this.stats.numAccounts++;

        this.write(db);
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

            if (pull.eggs >= 100000) this.stats.bigEggAccounts[encrypt(account.email.split('@')[0])] = account.eggs;
        } else console.log('[!] cannot find account for', pull.email);

        this.write(db);
    }

    pulledItem(pull: { email: string; tier: number; item: string }) {
        const db = this.#fetch();

        const account = db.find((acc: DatabaseAccount) => acc.email == pull.email);
        if (!account) return console.log('[!] cannot find account for', pull.email);

        const formedItemName = `[T${pull.tier}] ${pull.item}`;

        if (!account.items) account.items = {};

        if (!account.items[formedItemName]) account.items[formedItemName] = 1;
        else account.items[formedItemName]++;

        if (!this.stats.items[formedItemName]) this.stats.items[formedItemName] = 1;
        else this.stats.items[formedItemName]++;

        this.write(db);
    }

    delete(pull: { email: string }) {
        const db = this.#fetch();

        const account = db.find((acc: DatabaseAccount) => acc.email == pull.email);
        if (account) account.isBroken = true;
        else console.log('[!] cannot find account for', pull.email);

        this.write(db);
    }

    update(data: { email: string; canPlayAgain: number }) {
        const db = this.#fetch();

        const account = db.find((acc: DatabaseAccount) => acc.email == data.email);
        if (account) account.canPlayAgain = data.canPlayAgain;
        else console.log('something seems to have happened', data);

        this.write(db);
    }

    getEncodedAccount(encoded: string) {
        const db = this.#fetch();

        const decodedEmail = decrypt(encoded) + '@gmail.com';
        const account = db.find((acc: DatabaseAccount) => acc.email === decodedEmail);

        return account;
    }

    getAccountsWithItem(item: string) {
        const db = this.#fetch();

        const accounts = db.filter((acc: DatabaseAccount) => acc.items[item] >= 1);
        return accounts.slice(0, 10);
    }
}

export default Handler;