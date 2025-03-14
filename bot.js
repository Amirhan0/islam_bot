require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = process.env.GROUP_ID || -1002281200730; 

const bot = new Telegraf(BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 5000;

const getPrayerTimes = async () => {
    try {
        const response = await axios.get('http://api.aladhan.com/v1/timingsByCity', {
            params: {
                city: 'Almaty',
                country: 'Kazakhstan',
                method: 8
            }
        });
<<<<<<< HEAD
=======
        console.log('API response:', response.data.data.meta);
>>>>>>> 40ef1ec7b6abc1cdaee1e546f97279bb5d05534a
        return response.data.data.timings;
    } catch (error) {
        console.error('Ошибка при получении времени намаза:', error.message);
        return {
            Fajr: "05:30",
            Dhuhr: "12:30",
            Asr: "15:45",
            Maghrib: "18:15",
            Isha: "19:45"
        };
    }
};

const getRandomAyat = () => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'ayats.json'), 'utf-8');
        const ayats = JSON.parse(data);
        console.log('Ayats loaded:', ayats.length);
        return ayats[Math.floor(Math.random() * ayats.length)];
    } catch (error) {
        console.error('Ошибка при чтении ayats.json:', error.message);
        return { reference: 'Ошибка', text: 'Не удалось загрузить аят' };
    }
};

bot.start((ctx) => {
    ctx.reply(
        'Ассаламу алейкум ва рахматулахи ва баракатух! \n\n' +
        'Я Басир — ваш спутник на пути к духовному свету.\n' +
        'Каждый день в 12:00 я буду приносить вам аяты из Священного Корана,\n' +
        'и буду уведомлять о наступлении времени каждого намаза по Алматы.'
    );
});

bot.command('ayat', (ctx) => {
    const ayat = getRandomAyat();
    ctx.reply(`📖 *${ayat.reference}*\n\n_${ayat.text}_`, { parse_mode: 'Markdown' });
});

bot.command('prayer', async (ctx) => {
    const times = await getPrayerTimes();
    const today = new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty' });

    const message = `📅 *${today}* \n\n🕌 Время намаза в Алматы:\n\n` +
        `Фаджр: ${times.Fajr}\n` +
        `Зухр: ${times.Dhuhr}\n` +
        `Аср: ${times.Asr}\n` +
        `Магриб: ${times.Maghrib}\n` +
        `Иша: ${times.Isha}`;

    ctx.reply(message, { parse_mode: 'Markdown' });
});

const sendDailyAyat = async () => {
    const ayat = getRandomAyat();
    const today = new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty' });
    const text = `📅 *${today}*\n📖 *${ayat.reference}*\n\n_${ayat.text}_`;

    try {
        await bot.telegram.sendMessage(GROUP_ID, text, { parse_mode: 'Markdown' });
        console.log(`Аят успешно отправлен в группу ${GROUP_ID}`);
    } catch (error) {
        console.error('Ошибка при отправке аята:', error.message);
    }
};

<<<<<<< HEAD
// const sendPrayerNotification = async (prayerName, time) => {
//     const today = new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty' });
//     const message = `📅 *${today}* \n\n🕌 Наступило время намаза *${prayerName}* в Алматы: ${time}`;
=======
const sendPrayerNotification = async (prayerName, time) => {
    const today = new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty' });
    const message = `📅 *${today}* \n\n🕌 Наступает время намаза *${prayerName}* в Алматы: ${time}`;
>>>>>>> 40ef1ec7b6abc1cdaee1e546f97279bb5d05534a

//     try {
//         await bot.telegram.sendMessage(GROUP_ID, message, { parse_mode: 'Markdown' });
//         console.log(`Уведомление о ${prayerName} отправлено в группу ${GROUP_ID}`);
//     } catch (error) {
//         console.error(`Ошибка при отправке уведомления о ${prayerName}:`, error.message);
//     }
// };

const schedulePrayerNotifications = async () => {
    // console.log('Запуск планирования уведомлений о намазе');
    // const times = await getPrayerTimes();
    // const prayerNames = {
        // Fajr: 'Фаджр',
        // Dhuhr: 'Зухр',
        // Asr: 'Аср',
        // Maghrib: 'Магриб',
        // Isha: 'Иша'
    // };


    // const requiredPrayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];


    
    // Object.entries(times)
    //     .filter(([prayer]) => requiredPrayers.includes(prayer))
    //     .forEach(([prayer, time]) => {
    //         const [hours, minutes] = time.split(':');
    //         const rule = new schedule.RecurrenceRule();
    //         rule.hour = parseInt(hours);
    //         rule.minute = parseInt(minutes);
    //         rule.tz = 'Asia/Almaty';

    //         schedule.scheduleJob(rule, () => {
    //             sendPrayerNotification(prayerNames[prayer], time);
    //         });

    //         console.log(`Запланировано уведомление для ${prayerNames[prayer]} на ${time} (Алматы)`);
    //     });

    schedule.scheduleJob({ hour: 12, minute: 0, tz: 'Asia/Almaty' }, sendDailyAyat);
    schedule.scheduleJob({ hour: 18, minute: 0, tz: 'Asia/Almaty' }, sendDailyAyat);
    console.log('Ежедневный аят запланирован на 12:00 (Алматы)');
};


app.get('/', (req, res) => {
    res.send('Бот работает!');
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

bot.launch()
    .then(() => {
        console.log('Бот успешно запущен');
        schedulePrayerNotifications();
    })
    .catch((error) => {
        console.error('Ошибка при запуске бота:', error.message);
    });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
