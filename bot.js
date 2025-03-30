require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { CronJob } = require('cron');
const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = process.env.GROUP_ID || -123456789;
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new Telegraf(BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 5000;

let usedAyats = new Set();

async function loadAyats() {
    try {
        const data = await fs.readFile(path.join(__dirname, 'ayats.json'), 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Ошибка загрузки аятов:', error);
        if (ADMIN_ID) {
            bot.telegram.sendMessage(ADMIN_ID, `Ошибка загрузки аятов: ${error.message}`);
        }
        return [];
    }
}

async function getRandomAyat() {
    const ayats = await loadAyats();
    if (ayats.length === 0) {
        return { reference: 'Ошибка', text: 'Не удалось загрузить аяты' };
    }
    
    if (usedAyats.size >= ayats.length) {
        usedAyats.clear();
    }
    
    let ayat;
    do {
        ayat = ayats[Math.floor(Math.random() * ayats.length)];
    } while (usedAyats.has(ayat.reference));
    
    usedAyats.add(ayat.reference);
    return ayat;
}

async function sendDailyAyat() {
    const ayat = await getRandomAyat();
    const message = `📖 *${ayat.reference}*\n\n_${ayat.text}_`;
    try {
        await bot.telegram.sendMessage(GROUP_ID, message, { parse_mode: 'Markdown' });
        console.log(`Аят отправлен в ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })} (Алматы)`);
    } catch (error) {
        console.error('Ошибка отправки:', error);
        if (ADMIN_ID) {
            bot.telegram.sendMessage(ADMIN_ID, `Ошибка отправки аята: ${error.message}`);
        }
    }
}

bot.start((ctx) => {
    const welcomeMessage = `
    Ассаламу алейкум ва рахматулахи ва баракатух!  
    Я Басир — ваш спутник на пути к духовному свету.  
    Мои возможности:  
    /ayat - получить случайный аят  
    /dua - получить дуа на день  
    Ежедневно в 19:55 по времени Алматы я отправляю аяты в группу.
    `;
    ctx.reply(welcomeMessage.trim(), { parse_mode: 'Markdown' });
});

bot.command('ayat', async (ctx) => {
    const ayat = await getRandomAyat();
    const message = `📖 *${ayat.reference}*\n\n_${ayat.text}_`;
    ctx.reply(message, { parse_mode: 'Markdown' });
});

bot.command('dua', async (ctx) => {
    const duas = [
        { text: 'Аллахумма инни асъалюка аль-‘афийя фи д-дунья ва-ль-ахира', translation: 'О Аллах, я прошу у Тебя благополучия в этом мире и в будущем' },
        { text: 'Раббана атина фи д-дунья хасанатан ва фи ль-ахирати хасанатан ва кина ‘азаба н-нар', translation: 'Господь наш! Даруй нам в этом мире благо и в мире будущем благо, и защити нас от мучений Огня' },
        { text: 'Аллахумма инни асъалюка аль-джанна ва а‘узу бика мин ан-нар', translation: 'О Аллах, я прошу у Тебя Рая и прибегаю к Твоей защите от Огня' },
        { text: 'Аллахумма игфир ли занби кулляху, диккаху ва джилляху, ва авваляху ва ахираху', translation: 'О Аллах, прости мне все мои грехи: малые и великие, первые и последние' },
        { text: 'Субханаллахи ва бихамдихи, субханаллахиль-‘азым', translation: 'Слава Аллаху и хвала Ему, слава Аллаху Великому' },
        { text: 'Аллахумма антас-салям ва минкас-салям, табаракта йа заль-джаляли валь-икрам', translation: 'О Аллах, Ты — Мир, и от Тебя исходит мир, благословен Ты, о Обладатель величия и щедрости' },
        { text: 'Ля иляха илля Анта, субханакя, инни кунту мин аз-залимин', translation: 'Нет божества, кроме Тебя, слава Тебе, поистине, я был из числа несправедливых' }
    ];
    const dua = duas[Math.floor(Math.random() * duas.length)];
    const message = `🤲 *Дуа дня*\n\n_${dua.text}_\n\nПеревод: ${dua.translation}`;
    ctx.reply(message, { parse_mode: 'Markdown' });
});

// Добавим команду для теста
bot.command('test', async (ctx) => {
    await sendDailyAyat();
    ctx.reply('Тестовая отправка выполнена');
});

// Расписание с учетом часового пояса Алматы
const job = new CronJob(
    '01 20 * * *', // 19:55 по Алматы
    () => {
        console.log(`Задача запущена в ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })} (Алматы)`);
        sendDailyAyat();
    },
    null,
    true,
    'Asia/Almaty' // Часовой пояс Алматы
);

app.get('/', (req, res) => {
    res.json({ status: 'Бот работает', uptime: process.uptime() });
});

bot.catch((err, ctx) => {
    console.error(`Ошибка для ${ctx.updateType}:`, err);
    if (ADMIN_ID) {
        bot.telegram.sendMessage(ADMIN_ID, `Ошибка бота: ${err.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Часовой пояс сервера: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
});

bot.launch().then(() => console.log('Бот запущен'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));