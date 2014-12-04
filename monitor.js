var bnet = require('battlenet-api');
var _ = require('underscore');

/*
    Task: watch armory updates as close as possible

    Workflow: 
        - Workflow for each (region, bracket, apikey - per region):
            [v] On start load latest entry from cloud storage -> Decompress(unBase64 -> unZip)
            [v] Fetch updates from blizzard API continously
            [v] Log raw request, duration and success/failure to Analytics
            [v] Reorder by (-rating, name, realmslug) and reset ranking field for new ordering
            [v] Add timestamp 
            [v] Discard duplicates
            [v] Log that real update to Analytics
            [v] Compress(Zip -> Base64) -> cloud storage
            [v] Push "new update (region, bracket)" message to a queue

        - 36 000 requests per hour limit for api key = 10 rps
        total of 4 (2, 3, 5, rbg) brackets x 4 regions (5 when CN is added)
        4 x 5 = 20 calls, maximum of 0.5 rps for each (region, bracket)
        NB! can get separate apikey for each region and not worry
        let's schedule a call every 5 seconds for now

        - Injected dependencies?
            - Settings: { apikey, region, bracket, locale }
            - Fetch function, loads raw ladder json for given Settings
            - Storage configured for those Settings, should have
                * id save(ladderSnapshot), saves update and returns storage id for location
                * loadLatest() method, loads latest update
                and should handle compressing/decompressing
            - Analytics, should have log(event) method, configured for given Settings
            - EventBus, should have fire(id) method passing id of storage entity
*/

function Monitor(settings, fetch, storage, analytics, eventBus) {
    var self = this;
    var delay = 500; // 1000 ms = 1 second
    var nRequests = 0;
    var nCurrentFetches = 0;
    var nMaxConcurrentFetches = 5;
    var startTime = new Date();
    var nServed = 0;
    var historyWindowCapacity = 10;
    var historyWindow = []; // buffer for unique responses, when capacity reached flush it
    var nUniqueUpdates = 0;

    // TODO: !!!! Resolve update ordering problem using 'If-Modified-Since' header !!!!!

    function isSeen(update) { // TODO: name doesn't reflect mutable behavior, fix it
        if ( _.find(historyWindow, lbEquals(update)) )
            return true;

        if (historyWindow.length == 0)
            historyWindow.push(update);

        return false;
    }

    function addToHistory(update) {
        while (historyWindow.length >= historyWindowCapacity) { 
            historyWindow.shift(); // should only happen once
        }

        historyWindow.push(update);
    }

    function processUniqueUpdate(update) {
        // Log it
        nUniqueUpdates += 1;
        var uups = nUniqueUpdates / elapsed(startTime) * 1000;
        analytics.log('unique update');
        console.log('***** UNIQUE UPDATE:', nUniqueUpdates, 'per second:', uups);

        // Store it and fire update message in event bus for further processors
        var id = storage.save(update);
        eventBus.fire(id);
    }

    function resetTimer() {
        startTime = new Date();
    }

    function elapsed(date) {
        return Date.now() - date.getTime();
    }

    function logRPS() { // requests per second
        var totalSeconds = elapsed(startTime) * 1e-3;
        var rps = nServed / totalSeconds;
        analytics.log("Fetches per second", rps);
    }

    function processFetchedData(data) {
        analytics.log('Fetched entries', data.rows.length);
        var update = preprocessRawData(data);

        if (isSeen(update))
            return;

        addToHistory(update);
        processUniqueUpdate(update);
    };

    function monitorInterval() {
        if (nCurrentFetches >= nMaxConcurrentFetches) {
            console.warn('Max number of concurrent fetches reached. Skipping interval.');
            return;
        }

        logRPS();

        nCurrentFetches += 1;
        var requestNumber = nRequests += 1; // TODO: reset it sometimes?

        var requestTime = new Date();

        console.log('Request #', requestNumber, 'initiated',
            '(concurrent:', nCurrentFetches, '/', nMaxConcurrentFetches, ')...');

        analytics.log('Fetch request');

        fetch(settings, function fetchComplete(err, data) {
            nServed += 1;
            nCurrentFetches -= 1;
            console.log('Fetch completed for request #', requestNumber, '...');
            var timeTaken = elapsed(requestTime);

            if (err) {
                analytics.log('Fetch error', timeTaken);
                return console.error(err);
            }
            
            analytics.log('Fetch success', timeTaken);
            processFetchedData(data);
        });
    };

    function monitorStart() {
        var interval = setInterval(monitorInterval, delay);
    };

    self.start = function monitorInit() {
        startTime = new Date();
        storage.loadLatest(monitorStart);
    };
}

module.exports = Monitor;

function preprocessRawData(data) {

    var sortedRows = _(data.rows).chain().
        sortBy('name').
        sortBy('realmId').
        sortBy(function(e) { return -e.rating; }).
        value();

    // renumerate
    for (var i = 0; i < sortedRows.length; i++) {
        sortedRows[i].ranking = i+1;
    }

    return { 
        rows: sortedRows,
        timestamp: Date.now()
    };
};

function rowToKey(r) {
    return { 
        id: r.name + ' | ' + r.realmSlug, 
        totalGames: parseInt(r.seasonWins) + parseInt(r.seasonLosses)
    }
};

// lbEquals :: a => a -> a -> Boolean
function lbEquals(right) {
    var rightKeys = _.map(right.rows, rowToKey);

    return function (left) {
        var leftKeys = _.map(left.rows, rowToKey);
        for (var i = 0; i < leftKeys.length; ++i) {
            if (rightKeys[i].id !== leftKeys[i].id)
                return false;
        }
        return true;
    };
};
