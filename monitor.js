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
    var delay = 1000; // 1000 ms = 1 second
    var nRequests = 0;
    var topN = 3000;

    function processFetchedData(data) {
        var processedData = reorderLadder(data);
        processedData.rows = processedData.rows.slice(0, topN);
        console.log(processedData.rows);

        analytics.log('Fetched entries', data.rows.length);
    };

    function monitorInterval() {
        var requestNumber = nRequests += 1;
        var requestTime = new Date();

        analytics.log('Fetch request');

        fetch(settings, function fetchComplete(err, data) {
            console.log('Fetch completed for request', requestNumber, '...');
            var timeTaken = new Date() - requestTime;

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
