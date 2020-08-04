require('dotenv').config({ path: '.env' });

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
        days = 14;
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
        message.channel.send(content)
    })
}

async function getCases(postcode, days, radius) {
    let results = [];

    let res = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${postcode}.json?access_token=${mapbox_token}&country=au&types=postcode`);
    const center_coords = res.data.features[0].center;

    res = await axios.get('https://data.nsw.gov.au/data/datastore/dump/2776dbb8-f807-4fb2-b1ed-184a6fc2c8aa?format=json');
    let data = res.data.records.reverse();
    let sortedData = data.sort((a, b) => new Date(b[1]) - new Date(a[1]) );
    await Promise.all(sortedData.map(async (item) => {
        let date = Date.parse(item[1]);
        if (date >= (Date.now() - (days*24*60*60*1000))) {
            res = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${item[2]}.json?access_token=${mapbox_token}&country=au&types=postcode`);
            if (inRadius(radius, res.data.features[0].center[1], res.data.features[0].center[0], center_coords[1], center_coords[0])) {
                let insertDate = `${new Date(date).getDate()}/${new Date(date).getMonth()+1}`;
                results.push({postcode: item[2], date: insertDate, transmission: item[3], suburb: res.data.features[0].context[0].text });
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