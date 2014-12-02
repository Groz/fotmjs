var Monitor = require('./Monitor');
var secrets = require('./fotmsecrets');

var settings = {
    apikey: secrets.usapikey,
    region: 'us',
    bracket: '3v3',
    locale: 'en_US'
};

var fetch = function(settings, callback) {
    callback(null, testData);
    //bnet.wow.pvp.leaderboards({origin: settings.region, bracket: settings.bracket}, callback);
};

var storage = { // configured for settings
    save: function(ladderSnapshot) {
    },

    loadLatest: function() { 
        return testData;
    }
};

var analytics = {
    log: function(e) {
        console.log("Analytics: event", e, "logged to Analytics.");
    }
};

var eventBus = {

    fire: function(e) {
        console.log("EventBus: event", e, "passed to EventBus.");
    }
};

var monitor = new Monitor(settings, fetch, storage, analytics, eventBus);

monitor.start();
