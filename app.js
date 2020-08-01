require('dotenv').config({ path: '.env' });
const chalk = require('chalk');
global.chalk = chalk;

const Discord = require('discord.js');
const client = new Discord.Client();

const axios = require('axios');

client.once('ready', () => {
    console.log(chalk.blue("Logged into discord"));
})

const prefix = '!';
const commands = require('./commands/index')

client.on('message', (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === "help") {
        commands.help(message);
    } 
    if (command === "config") {
        commands.config(message);
    }
    if (command === "cases") {
        commands.cases(message)
    }
})

client.login(process.env.DISCORD_TOKEN);