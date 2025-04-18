import { parentPort } from 'node:worker_threads';

import Bot from 'yolkbot/bot';

console.log('cw worker has started');

interface XBot extends Bot {
    isBroken?: boolean;
}

const runOn = async (bot: XBot) => {
    if (!parentPort || bot.isBroken) return;

    console.log('playing chikn winner...');
    const result = await bot.playChiknWinner(false);
    console.log('played chikn winner', result);

    /*
        egg format -> { email: 'example@gmail.com', type: 'eggs', eggs: 696969 }
        item format -> { email: 'example@gmail.com', type: 'item', tier: 2, item: 'StateFarm Stamp' }
    */

    if (result === 'session_expired') {
        console.log('session_expired was called - going to flag it as isBroken:', bot.account.email);

        bot.isBroken = true;

        return parentPort.postMessage({
            email: bot.account.email,
            type: 'delete'
        });
    }

    if (typeof result === 'string') {
        if (result !== 'on_cooldown') console.log('play resulted in', result, bot.account.cw);
        else console.log('bot on cooldown, canPlayAgain in', bot.account.cw.secondsUntilPlay.toLocaleString(), 'sec /', Math.round(bot.account.cw.secondsUntilPlay / 1000).toLocaleString(), 'min', (bot.account.cw.secondsUntilPlay < 20 ? bot.account.cw : 'lgtm??'))
        return parentPort.postMessage({
            type: 'update',
            email: bot.account.email,
            canPlayAgain: bot.account.cw.canPlayAgain
        })
    }

    if (result.eggsGiven > 0) parentPort.postMessage({
        email: bot.account.email,
        type: 'eggs',
        eggs: result.eggsGiven
    });

    if (result.itemIds && result.itemIds.length) parentPort.postMessage({
        email: bot.account.email,
        type: 'item',
        tier: result.rewardTier,
        item: result.itemIds[0]
    });

    parentPort.postMessage({
        type: 'update',
        email: bot.account.email,
        canPlayAgain: bot.account.cw.canPlayAgain
    })
}

parentPort && parentPort.on('message', async (account) => {
    const bot = new Bot({ proxy: process.env.PROXY_URL, instance: 'egg.dance' });

    // @ts-expect-error i dont care
    delete bot.game;
    // @ts-expect-error i still dont care
    delete bot.me;

    await bot.login(account.email, account.password);

    const runAndWait = async () => {
        await runOn(bot);

        const timeToWait = bot.account.cw.canPlayAgain - Date.now();
        setTimeout(runAndWait, Math.max(timeToWait, 0));
    };

    runAndWait();
});