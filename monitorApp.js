var Monitor = require('./Monitor');
var secrets = require('./fotmsecrets');

var fs = require('fs')

var settings = {
    apikey: secrets.usapikey,
    region: 'us',
    bracket: '3v3',
    locale: 'en_US'
};

function loadTestData() {
    var zero = fs.readFileSync('test_data/0.json', 'utf8');
    return [JSON.parse(zero)];
}

var testData = loadTestData();

var fetch = function(settings, callback) {
    console.log('fetch()');
    callback(null, testData[0]); // TODO: change to 1?
    //bnet.wow.pvp.leaderboards({origin: settings.region, bracket: settings.bracket}, callback);
};

var storage = { // configured for settings
    save: function(ladderSnapshot) {
        console.log('storage.save()');
    },

    loadLatest: function(callback) { 
        console.log('storage.loadLatest()');
        callback(testData[0]);
    }
};

var analytics = {
    log: function(e1, e2, e3, e4) {
        console.log('analytics.log(', e1, ', ', e2, ', ', e3, ', ', e4, ')');
    }
};

var eventBus = {
    fire: function(e) {
        console.log('eventBus.fire()');
    }
};

var monitor = new Monitor(settings, fetch, storage, analytics, eventBus);

monitor.start();

