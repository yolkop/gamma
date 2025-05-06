import Enquirer from 'enquirer';
import fs from 'fs';
import path from 'path';

const options = [
    { name: 'PROXY_URL', message: 'Proxy URL (leave empty for no proxy)', initial: Bun.env.PROXY_URL || '' },
    { name: 'EMAIL_DOMAIN', message: 'Email domain to use for accounts; set to getstate.farm for auto verification', initial: Bun.env.EMAIL_DOMAIN || '' },
    { name: 'ANTI_DELETE_ON', message: 'Should the accounts be verified via gameplay? (0 or 1)', initial: Bun.env.ANTI_DELETE_ON || '0' },
    { name: 'LOG_EMAILS', message: 'Log emails in the terminal? (0 or 1)', initial: Bun.env.LOG_EMAILS || '1' },
    { name: 'AES_KEY', message: 'AES Key (16 characters)', initial: Bun.env.AES_KEY || '' },
    { name: 'AES_IV', message: 'AES IV (16 characters)', initial: Bun.env.AES_IV || '' },
    { name: 'ACC_INTERVAL', message: 'Account creation interval (in ms)', initial: Bun.env.ACC_INTERVAL || '1000' },
    { name: 'CW_INTERVAL', message: 'Chikn Winner interval (in ms)', initial: Bun.env.CW_INTERVAL || '200' }
]

let prompt = new (Enquirer as any).Snippet({
    name: 'env',
    message: 'Fill out the environment variables',
    required: true,
    fields: options.map((option) => ({
        name: option.name,
        message: option.message
    })),
    values: Object.fromEntries(options.map(option => [option.name, option.initial])),
    template: options.map((option) => `${option.name}=\${${option.name}}`).join('\n')
});

const result = await prompt.run();

const envContent = Object.entries(result.values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

const envPath = path.join(import.meta.dirname, '..', '.env');
fs.writeFileSync(envPath, envContent, 'utf8');