require('dotenv').config({ path: '.env' });

const axios = require('axios');

const mapbox_token = process.env.MAPBOX_TOKEN;

const center = 2092;
const radius = 15;
const days = 5;

module.exports = (message) => {
    const args = message.content.slice("!").split(/ +/);
    getCases(center).then((val) => {
        message.channel.send(val)
    })
}

async function getCases(postcode) {
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
            if (inRadius(res.data.features[0].center[1], res.data.features[0].center[0], center_coords[1], center_coords[0])) {
                results.push({postcode: item[2], date: item[1]});
            }
        }
    }))
    return results;
}


function inRadius (lat1, long1, lat2, long2) {
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