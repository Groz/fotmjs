var bnet = require('battlenet-api');

/*
    Task: watch armory updates as close as possible

    Workflow: 
        - Workflow for each (region, bracket, apikey - per region):
            [ ] On start load latest entry from cloud storage -> Decompress(unBase64 -> unZip)
            [ ] Fetch updates from blizzard API continously
            [ ] Log raw request, duration and success/failure to Analytics
            [ ] Reorder by (-rating, name, realmslug), take top N (~4000)
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
            - Analytics, should have log(event) method
            - EventBus, should have fire(event) method
*/

function Monitor(settings, fetch, storage, analytics, eventBus) {
    var self = this;

    self.start = function() {

    }
}

module.exports = Monitor;
