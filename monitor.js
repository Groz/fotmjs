var bnet = require('battlenet-api');
var _ = require('underscore');

/*
    Task: watch armory updates as close as possible

    Workflow: 
        - Workflow for each (region, bracket, apikey - per region):
            [v] On start load latest entry from cloud storage -> Decompress(unBase64 -> unZip)
            [v] Fetch updates from blizzard API continously
            [v] Log raw request, duration and success/failure to Analytics
            [v] Reorder by (-rating, name, realmslug), take top N (~4000)
            [ ] Every N fetches perform a merge trying to order them by time
            [ ] Remove duplicates
            [ ] Discard batch if all updates are previous/equal to last update in previous batch
            [ ] For each update left in a batch
                [ ] Log that real update to Analytics
                [ ] Compress(Zip -> Base64) -> cloud storage
                [ ] Push "new update (region, bracket)" message to a queue

        - 36 000 requests per hour limit for api key = 10 rps
        total of 4 (2, 3, 5, rbg) brackets x 4 regions (5 when CN is added)
        4 x 5 = 20 calls, maximum of 0.5 rps for each (region, bracket)
        NB! can get separate apikey for each region and not worry
        let's schedule a call every 5 seconds for now

        - Injected dependencies?
            - Settings: { apikey, region, bracket, locale }
            - Fetch function, loads raw ladder json for given Settings
            - Storage configured for those Settings, should have
                * save(ladderSnapshot) method
                * loadLatest() method
                and should handle compressing/decompressing
            - Analytics, should have log(event) method, configured for given Settings
            - EventBus, should have fire(event) method, configured for given Settings
*/

function Monitor(settings, fetch, storage, analytics, eventBus) {
    var self = this;
    var delay = 100; // 1000 ms = 1 second
    var nRequests = 0;
    var topN = 3000;
    var nCurrentFetches = 0;
    var nMaxConcurrentFetches = 10;
    var startTime = new Date();
    var nServed = 0;

    function resetTimer() {
        startTime = new Date();
    }

    function elapsed(date) {
        return (new Date()).getTime() - date.getTime();
    }

    function logRPS() { // requests per second
        var totalSeconds = elapsed(startTime) / 1000;
        var rps = nServed / totalSeconds;
        analytics.log("Fetches per second", rps);
    }

    function processFetchedData(data) {
        analytics.log('Fetched entries', data.rows.length);

        var processedData = reorderLadder(data);
        processedData.rows = processedData.rows.slice(0, topN);
        //console.log(processedData.rows);
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

function reorderLadder(ladderSnapshot) {

    var sortedRows = _(ladderSnapshot.rows).chain().
        sortBy('name').
        sortBy('realmId').
        sortBy(function(e) { return -e.rating; }).
        value();

    // renumerate
    for (var i = 0; i < sortedRows.length; i++) {
        sortedRows[i].ranking = i+1;
    }

    return { rows: sortedRows };
};
