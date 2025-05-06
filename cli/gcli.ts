import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import Enquirer from 'enquirer';

import { FirebaseKey, UserAgent } from 'yolkbot/constants';

import Handler from '../gamma/handler';

const envPath = path.join(import.meta.dirname, '..', '.env');
const envBackupPath = path.join(import.meta.dirname, '..', '.env.backup');

const enquirer = new Enquirer();

const RED_LOG = (message: string) => console.log('\x1b[31m%s\x1b[0m', message);
const ORANGE_LOG = (message: string) => console.log('\x1b[38;5;214m%s\x1b[0m', message);
const YELLOW_LOG = (message: string) => console.log('\x1b[33m%s\x1b[0m', message);
const GREEN_LOG = (message: string) => console.log('\x1b[32m%s\x1b[0m', message);
const BLUE_LOG = (message: string) => console.log('\x1b[36m%s\x1b[0m', message);

const main = async () => {
    console.log('');

    // @ts-ignore enquirer is not typed
    const { command } = await enquirer.prompt({
        type: 'autocomplete',
        name: 'command',
        message: 'gcli $',
        choices: [
            { message: 'run gamma', name: 'run' },
            { message: 'configure gamma', name: 'config' },
            { message: 'log stats', name: 'stats' },
            { message: 'backup .env', name: 'envbackup' },
            { message: 'restore .env', name: 'envrestore' },
            { message: 'exit', name: 'exit' }
        ]
    });

    if (command === 'run') {
        const gammaProcess = spawn('gamma', [], { stdio: 'pipe' });

        gammaProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(output.endsWith('\n') ? output.slice(0, -1) : output);
        });

        gammaProcess.stderr.on('data', (data) => {
            const output = data.toString();
            console.error(output.endsWith('\n') ? output.slice(0, -1) : output);
        });

        gammaProcess.on('close', (code) => {
            ORANGE_LOG('gamma process exited with code ' + code);
            main();
        });

        const onSigInt = () => {
            ORANGE_LOG('\nkilling gamma process...');
            gammaProcess.kill('SIGINT');
            process.off('SIGINT', onSigInt);
        }

        return process.on('SIGINT', onSigInt);
    }

    if (command === 'config') {
        await import('./init');
        GREEN_LOG('gamma has been configured!');
        main();
    }

    if (command === 'stats') {
        const handler = new Handler(true);
        const stats = handler.compileStats();

        console.log('\n');

        ORANGE_LOG(`      accounts: ${stats.numAccounts.toLocaleString()}`);

        console.log('');

        YELLOW_LOG(`      total eggs: ${stats.eggs.toLocaleString()}`);
        YELLOW_LOG(`      100K+ eggs: ${Object.entries(stats.bigEggAccounts).length}`);

        console.log('');

        GREEN_LOG(`      total items: ${Object.values(stats.items).reduce((sum, count) => sum + count, 0).toLocaleString()}`);
        for (let i = 1; i <= 7; i++)
            GREEN_LOG(`      T${i}s: ${Object.entries(stats.items).filter(([key]) => key.startsWith(`[T${i}]`)).reduce((sum, [, count]) => sum + count, 0).toLocaleString()}`)

        console.log('');

        return setTimeout(() => main(), 5000);
    }

    if (command === 'email') {
        const input = await enquirer.prompt([
            {
                type: 'input',
                name: 'email',
                message: 'Enter email'
            },
            {
                type: 'input',
                name: 'password',
                message: 'Enter password'
            },
            {
                type: 'input',
                name: 'newEmail',
                message: 'Enter new email'
            }
        ]) as any;

        const { email, password, newEmail } = input;

        const headers = {
            'content-type': 'application/json',
            'origin': 'https://shellshock.io',
            'user-agent': UserAgent,
            'x-client-version': 'Chrome/JsCore/9.17.2/FirebaseCore-web',
            'x-firebase-locale': 'en'
        };

        let idToken = '';

        try {
            const login = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FirebaseKey}`, {
                method: 'POST',
                body: JSON.stringify({
                    email: email,
                    password: password,
                    returnSecureToken: true
                }),
                headers
            });

            const data = await login.json();

            idToken = data.idToken;

            if (!data.idToken) {
                RED_LOG('login failed with unknown error...');
                console.log(data);
                return main();
            }
        } catch (error) {
            RED_LOG('login failed with error ' + error);
            return main();
        }

        if (!idToken) {
            RED_LOG('login failed with unknown error...');
            return main();
        }

        let update = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:update?key=' + FirebaseKey, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                email: newEmail,
                idToken,
                returnSecureToken: true
            })
        });

        let data = await update.json();

        console.log(data);

        if (!data.email || data.email !== newEmail) {
            RED_LOG('email change failed with unknown error...');
            console.log(data);
        } else GREEN_LOG('email changed!');

        main();
    }

    if (command === 'envbackup') {
        fs.cpSync(envPath, envBackupPath, { force: true });
        GREEN_LOG('backed up .env to .env.backup');
        main();
    }

    if (command === 'envrestore') {
        fs.cpSync(envBackupPath, envPath, { force: true });
        GREEN_LOG('restored .env from .env.backup');
        main();
    }
}

main();