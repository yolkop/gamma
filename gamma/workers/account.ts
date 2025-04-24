import fs from 'node:fs';
import path from 'node:path';
import { isMainThread, parentPort } from 'node:worker_threads';

import Bot from 'yolkbot/bot';
import { createAccount } from 'yolkbot/api';

import FireDispatch from 'yolkbot/dispatch/FireDispatch';
import LookAtDispatch from 'yolkbot/dispatch/LookAtDispatch';
import ReloadDispatch from 'yolkbot/dispatch/ReloadDispatch';
import SpawnDispatch from 'yolkbot/dispatch/SpawnDispatch';

const names = fs.readFileSync(path.join(import.meta.dirname, '..', 'data', 'names.txt'), 'utf-8').split('\n');

const getHourNum = () => Math.floor(Date.now() / 3600000);

class GameManager {
    games: { [key: string]: number } = {};

    getNextOpenGame() {
        return Object.entries(this.games).find(([, numPlayers]) => numPlayers < 15)?.[0];
    }

    async runBot(bot: Bot) {
        const nextOpenGame = this.getNextOpenGame();
        if (!nextOpenGame) {
            const game = await bot.createPrivateGame({
                region: 'useast',
                mode: 'ffa',
                map: 'Downfall'
            });

            this.games[game.id] = 0;

            await bot.join(names[Math.random() * names.length | 0], game);
            console.log('created private game, joining', game.id);
        } else {
            await bot.join(names[Math.random() * names.length | 0], nextOpenGame);
            console.log('joined game from list', nextOpenGame);
        }

        const updateNumPlayers = () => {
            if (!bot.players) return;

            const numPlayers = Object.keys(bot.players).length;
            const gamePoolEntry = this.games[bot.game.code];

            if (numPlayers !== gamePoolEntry)
                this.games[bot.game.raw.id] = numPlayers;
        }

        return await new Promise((resolve) => {
            bot.on('playerJoin', (player) => {
                if (bot.me && bot.players) {
                    if (player.id == bot.me.id) bot.dispatch(new SpawnDispatch());
                    updateNumPlayers();
                }
            });

            bot.on('playerLeave', () => updateNumPlayers());

            let botKills = 0;
            let botDeaths = 0;

            bot.on('playerDeath', (killed, killer) => {
                if (!bot.me) return;

                if (killed && killed.id == bot.me.id) {
                    botDeaths++;
                    bot.dispatch(new SpawnDispatch());
                }

                if (killer && killer.id == bot.me.id) botKills++;

                if (botKills > 1 || botDeaths > 1) console.log('botKills', botKills, 'botDeaths', botDeaths);

                if (botKills >= 3 || botDeaths >= 3) {
                    console.log('a bot has finished a game', bot.account.email, botKills, botDeaths);
                    resolve({ email: bot.account.email, password: bot.account.password });
                    bot.quit();
                }
            });

            setTimeout(() => {
                if (!bot.account?.email) return;
                console.log('we are assuming playtime was hit, closing and resolving');
                resolve({ email: bot.account.email, password: bot.account.password });
                bot.quit(false);
            }, 2 * 60 * 1000);

            let tickStage = 1;

            bot.on('tick', () => {
                if (bot.state.reloading || !bot.me?.playing) return;

                const stage1 = () => {
                    const nearestPlayer = bot.getBestTarget();

                    if (nearestPlayer) {
                        tickStage = 2;
                        bot.dispatch(new LookAtDispatch(nearestPlayer.id));
                    } else tickStage = 3;
                };

                const stage2 = () => {
                    bot.dispatch(new FireDispatch(7));

                    if (bot.me.weapons[0] && bot.me.weapons[0].ammo && bot.me.weapons[0].ammo.rounds <= 1) tickStage = 3;
                    else tickStage = 1;
                };

                const stage3 = () => {
                    tickStage = 1;

                    if (bot.me.weapons[0] && bot.me.weapons[0].ammo && bot.me.weapons[0].ammo.rounds <= 1) bot.dispatch(new ReloadDispatch());
                    else stage1();
                };

                if (tickStage == 1) stage1();
                else if (tickStage == 2) stage2();
                else if (tickStage == 3) stage3();
            });
        })
    }
}

const gm = new GameManager();

class AccountWorker {
    isAntiDelete = parseInt(process.env.ANTI_DELETE_ON) == 1;

    hourNum = getHourNum();
    done = 0;

    isFirstCycle = true;

    constructor() {
        console.log('account worker has started');
        this.cycle();
    }

    async create(email: string, password: string) {
        let bot: Bot | null = new Bot({
            proxy: process.env.PROXY_URL,
            instance: 'egg.dance',
            intents: [Bot.Intents.PATHFINDING]
        });

        await bot.createAccount(email, password);
        console.log('created', bot.account.email);

        if (bot.account.id == 0) {
            return console.log('account FAILED');
        }

        gm.runBot(bot).then(() => parentPort && parentPort.postMessage({ email, password }));
    }

    async createNoVerify(email: string, password: string) {
        let account = await createAccount(email, password, process.env.PROXY_URL, 'egg.dance');
        if (typeof account === 'object' && (account.id || account.playerOutput.id)) parentPort && parentPort.postMessage({ email, password });
        else console.log('account error', account);
    }

    async cycle() {
        if (this.hourNum !== getHourNum()) this.done = 0;

        this.done++;

        const email = names[Math.random() * names.length | 0] + Math.random().toString(36).substring(2, 8) + '@' + process.env.EMAIL_DOMAIN;
        const password = Math.random().toString(36).substring(2, 10);

        if (this.isAntiDelete) this.create(email, password);
        else this.createNoVerify(email, password);

        await new Promise((r) => setTimeout(r, (this.isFirstCycle && this.isAntiDelete) ? 3000 : (Number(process.env.ACC_INTERVAL) || 1000)));
        this.isFirstCycle = false;
        this.cycle();
    }
}

if (!isMainThread) new AccountWorker();