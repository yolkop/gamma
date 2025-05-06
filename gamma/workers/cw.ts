import { parentPort } from 'node:worker_threads';

import Bot from 'yolkbot/bot';
import { findItemById } from 'yolkbot/constants';

import logger from '../log.ts';

interface XBot extends Bot {
    isBroken?: boolean;
}

const runOn = async (bot: XBot) => {
    if (!parentPort || bot.isBroken) return;

    const result = await bot.playChiknWinner(false);

    if (result === 'session_expired') {
        logger.red('session_expired was called - going to flag it as isBroken:', bot.account);

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

    if (result.eggsGiven > 0) {
        logger.yellow('[cw]', result.eggsGiven + ' eggs');

        parentPort.postMessage({
            email: bot.account.email,
            type: 'eggs',
            eggs: result.eggsGiven
        });
    }

    if (result.itemIds && result.itemIds.length) {
        const givenItem = findItemById(result.itemIds[0]).name;

        logger[result.rewardTier > 4 ? 'orange' : 'cyan']('[cw]', `[T${result.rewardTier}] ${givenItem}`);

        parentPort.postMessage({
            email: bot.account.email,
            type: 'item',
            tier: result.rewardTier,
            item: givenItem,
        });
    }

    parentPort.postMessage({
        type: 'update',
        email: bot.account.email,
        canPlayAgain: bot.account.cw.canPlayAgain
    })
}

parentPort && parentPort.on('message', async (account) => {
    const bot = new Bot({ proxy: process.env.PROXY_URL, instance: 'egg.dance' });

    // @ts-expect-error these props are supposed to always exist, but we do GC
    delete bot.game && delete bot.me;

    await bot.login(account.email, account.password);

    const runAndWait = async () => {
        await runOn(bot);

        const timeToWait = bot.account.cw.canPlayAgain - Date.now();
        setTimeout(runAndWait, Math.max(timeToWait, 0));
    };

    runAndWait();
});