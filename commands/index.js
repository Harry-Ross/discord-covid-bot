const help = require('./help');
const config = require('./config');
const cases = require('./cases')

class Commands {
    help = help;
    config = config;
    cases = cases;
}

module.exports = new Commands();