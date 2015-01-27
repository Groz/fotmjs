var assert = require("assert")
var sim = require("../sim.js")

describe('sim', function() {

  function createLadder() {
    return [
      { name: "third", rating: 300, ranking: 1 },
      { name: "first", rating: 500, ranking: 2 },
      { name: "second", rating: 400, ranking: 5, seasonWins: 0, seasonLosses: 0, weeklyWins: 0, weeklyLosses: 0 },
      { name: "fourth", rating: 200, ranking: 6 },
      { name: "fifth", rating: 100, ranking: 10, seasonWins: 0, seasonLosses: 0, weeklyWins: 0, weeklyLosses: 0 },
    ];
  }

  describe('#avg', function() {

    it('should return 3 for [2, 3, 4]', function(){
      assert.equal(3, sim.avg([2, 3, 4]));
    })

    it('should return 2.5 for [1, 2] and selector ^2', function(){
      assert.equal(2.5, sim.avg([1, 2], function(x) { return x * x; }));
    })

  })

  describe('#fixOrdering', function() {

    it('should order ladder by player rating', function() {
      var ladder = createLadder();
      sim.fixOrdering(ladder);
      assert.equal("first", ladder[0].name);
      assert.equal("second", ladder[1].name);
      assert.equal("third", ladder[2].name);
    })

    it('should fix ranking numbers for players', function() {
      var ladder = createLadder();
      sim.fixOrdering(ladder);
      assert.equal(1, ladder[0].ranking);
      assert.equal(2, ladder[1].ranking);
      assert.equal(3, ladder[2].ranking);
    })

  })

  describe('#splitIntoTeams', function() {

    it('should split 4 player ladder into pairs', function() {
      var ladder = createLadder();
      var teams = sim.splitIntoTeams(ladder, 2);
      assert.equal("third", teams[0][0].name);
      assert.equal("first", teams[0][1].name);
      assert.equal("second", teams[1][0].name);
      assert.equal("fourth", teams[1][1].name);
    })

    it('should discard incomplete teams', function() {
      var ladder = createLadder();
      var teams = sim.splitIntoTeams(ladder, 2);
      assert.equal(2, teams.length);
      assert.equal(2, teams[0].length);
      assert.equal(2, teams[1].length);
    })

  })

  describe('#teamRating', function() {
    it('should output 400 for 500 and 300 players', function() {
      var ladder = createLadder();
      var team = [ladder[0], ladder[1]];
      assert.equal(400, sim.teamRating(team));
    })
  })

  describe('#beat', function() {
    it('should change player ratings by 16 for both teams with equal ratings', function() {
      var ladder = createLadder();
      var teamA = [ladder[2], ladder[3]];
      var teamB = [ladder[1], ladder[4]];
      sim.beat(teamA, teamB);

      var oldLadder = createLadder();
      assert.equal(oldLadder[2].rating + 16, ladder[2].rating);
      assert.equal(oldLadder[3].rating + 16, ladder[3].rating);
      assert.equal(oldLadder[1].rating - 16, ladder[1].rating);
      assert.equal(oldLadder[4].rating - 16, ladder[4].rating);
    })

    it('should increase season and weekly win number for winners and losses for losers', function() {
      var ladder = createLadder();
      var teamA = [ladder[2], ladder[3]];
      var teamB = [ladder[1], ladder[4]];
      sim.beat(teamA, teamB);

      var oldLadder = createLadder();
      assert.equal(oldLadder[2].seasonWins + 1, ladder[2].seasonWins);
      assert.equal(oldLadder[2].weeklyWins + 1, ladder[2].weeklyWins);
      assert.equal(oldLadder[2].seasonLosses, ladder[2].seasonLosses);
      assert.equal(oldLadder[2].weeklyLosses, ladder[2].weeklyLosses);


      assert.equal(oldLadder[4].seasonLosses + 1, ladder[4].seasonLosses);
      assert.equal(oldLadder[4].weeklyLosses + 1, ladder[4].weeklyLosses);
      assert.equal(oldLadder[4].seasonWins, ladder[4].seasonWins);
      assert.equal(oldLadder[4].weeklyWins, ladder[4].weeklyWins);
    })
  })

})
