require('dotenv').config({ path: '.env' });

const Discord = require('discord.js');

const axios = require('axios');
const mapbox_token = process.env.MAPBOX_TOKEN;

module.exports = (message) => {
    const args = message.content.slice(1).split(/ +/);

    let postcode = args[1];
    let days = args[2];
    let radius = args[3];

    if (!postcode) {
        message.channel.send("Please enter a postcode")
        return;
    }
    if (!days) {
        days = 7;
    }
    if (!radius) {
        radius = 15;
    }
    getCases(postcode, days, radius).then((val) => {
        
        let content = "";
        let overLimit = false;
        let sortedVal = val.sort((a, b) => new Date(b.date) - new Date(a.date))
        sortedVal.map(item => {
            if (content.length < 1900) {
                content = content + `${item.suburb} (${item.postcode}) - ${item.date} - ${convertToAcronym(item.transmission)}\n`;
            } else {
                overLimit = true;
            }
        })

        if (overLimit) {
            content = content + "+ More";
        }
        if (content.length == 0) {
            message.channel.send("No cases, either an error or this is all over...")
            return;
        }

        let dataByDate = sortedVal.reduce(function(r,a) {
            r[a.date] = r[a.date] || [];
            r[a.date].push(a);
            return r;
        }, Object.create(null))

        let fields = [];

        for (var element in dataByDate) {
            let sortedContent = "";
            dataByDate[element].map((item) => {
                sortedContent = sortedContent + `${item.suburb} (${item.postcode}) - ${convertToAcronym(item.transmission)}\n`
            })
            let dateData = new Date(parseInt(element));
            fields.push({ name: `${dateData.getDate()}/${dateData.getMonth()}/${dateData.getFullYear()}`, value: sortedContent, inline: true })
        }

        let casesEmbed = new Discord.MessageEmbed()
            .setColor("#eb4034")
            .setAuthor("NSW COVID-19 Cases")
            .setTitle(`COVID cases within ${radius}km of ${postcode} within the last ${days} days`)
            .addFields(fields)
        message.channel.send(casesEmbed)
    }).catch(e => {
        console.error(e)
        message.channel.send(`Error: (${e}) - Contact the admin for more information`)
    })
}

async function getCases(postcode, days, radius) {
    let results = [];

    let res = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${postcode}.json?access_token=${mapbox_token}&country=au&types=postcode`);
    const center_coords = res.data.features[0].center;

    let suburbs = require('../postcodes.json')

    res = await axios.get('https://data.nsw.gov.au/data/datastore/dump/2776dbb8-f807-4fb2-b1ed-184a6fc2c8aa?format=json');
    let data = res.data.records.reverse();
    let sortedData = data.sort((a, b) => new Date(b[1]) - new Date(a[1]) );
    await Promise.all(sortedData.map(async (item) => {
        let date = Date.parse(item[1]);
        if (date >= (Date.now() - (days*24*60*60*1000))) {
            const suburb = suburbs.filter((suburb) => { return (suburb.postcode == item[2]) })[0]
            if (suburb && inRadius(radius, suburb.latitude, suburb.longitude, center_coords[1], center_coords[0])) {
                results.push({ postcode: item[2], date, transmission: item[3], suburb: suburb.place_name });
            }
        }
    }))
    return results;
}


function inRadius (radius, lat1, long1, lat2, long2) {
    const r = 6371;

    let lat = degToRad(lat2 - lat1);
    let long = degToRad(long2 - long1);

    let a = Math.pow(Math.sin(lat/2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(long/2), 2);
    let b = 2 * Math.asin(Math.sqrt(a));

    const distance = (b * r);
    if (distance <= radius) {
        return true;
    }
    return false;
}

function degToRad(deg) {
    return deg * (Math.PI / 180)
}

function convertToAcronym(input) {
    if (input.includes("Locally acquired")) {
        return "LA"
    }
    else if (input.includes("Overseas")) {
        return "O";
    }
    else {
        return "N/A"
    }
}