var assert = require("assert")
var sim = require("../sim.js")
var _ = require("lodash")

describe('sim', function() {

  function createLadder() {
    return {
      rows: [
        { name: "third", rating: 300, ranking: 1 },
        { name: "first", rating: 500, ranking: 2 },
        { name: "second", rating: 400, ranking: 5, seasonWins: 0, seasonLosses: 0, weeklyWins: 0, weeklyLosses: 0 },
        { name: "fourth", rating: 200, ranking: 6 },
        { name: "fifth", rating: 100, ranking: 10, seasonWins: 0, seasonLosses: 0, weeklyWins: 0, weeklyLosses: 0 },
      ],
      teamSize: 2
    };
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

      for (var i = 0; i < ladder.length-1; ++i) {
        assert.equal(true, ladder.rows[i].rating > ladder.rows[i+1].rating);
      }
    })

    it('should fix ranking numbers for players', function() {
      var ladder = createLadder();
      sim.fixOrdering(ladder);
      assert.equal(1, ladder.rows[0].ranking);
      assert.equal(2, ladder.rows[1].ranking);
      assert.equal(3, ladder.rows[2].ranking);
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
      var team = [ladder.rows[0], ladder.rows[1]];
      assert.equal(400, sim.teamRating(team));
    })
  })

  describe('#beat', function() {
    it('should change player ratings by 16 for both teams with equal ratings', function() {
      var ladder = createLadder();
      var teamA = [ladder.rows[2], ladder.rows[3]];
      var teamB = [ladder.rows[1], ladder.rows[4]];
      sim.beat(teamA, teamB);

      var oldLadder = createLadder();
      assert.equal(oldLadder.rows[2].rating + 16, ladder.rows[2].rating);
      assert.equal(oldLadder.rows[3].rating + 16, ladder.rows[3].rating);
      assert.equal(oldLadder.rows[1].rating - 16, ladder.rows[1].rating);
      assert.equal(oldLadder.rows[4].rating - 16, ladder.rows[4].rating);
    })

    it('should increase season and weekly win number for winners and losses for losers', function() {
      var ladder = createLadder();
      var teamA = [ladder.rows[2], ladder.rows[3]];
      var teamB = [ladder.rows[1], ladder.rows[4]];
      sim.beat(teamA, teamB);

      var oldLadder = createLadder();
      assert.equal(oldLadder.rows[2].seasonWins + 1, ladder.rows[2].seasonWins);
      assert.equal(oldLadder.rows[2].weeklyWins + 1, ladder.rows[2].weeklyWins);
      assert.equal(oldLadder.rows[2].seasonLosses, ladder.rows[2].seasonLosses);
      assert.equal(oldLadder.rows[2].weeklyLosses, ladder.rows[2].weeklyLosses);


      assert.equal(oldLadder.rows[4].seasonLosses + 1, ladder.rows[4].seasonLosses);
      assert.equal(oldLadder.rows[4].weeklyLosses + 1, ladder.rows[4].weeklyLosses);
      assert.equal(oldLadder.rows[4].seasonWins, ladder.rows[4].seasonWins);
      assert.equal(oldLadder.rows[4].weeklyWins, ladder.rows[4].weeklyWins);
    })
  })

  describe('#calcPR', function() {
    it('generate correct results for wiki example with cats and dogs', function() {
      function eq(a, b) { return a === b; }
      var pr = sim.calcPR([1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 15, 16, 17], eq);
      assert.equal(4/7, pr.precision);
      assert.equal(4/9, pr.recall);
    })
  })

  describe('#fScore', function() {
    it('equals 1 for correct prediction', function() {
      function eq(a, b) { return a === b; }
      var pr = sim.calcPR([1, 2, 3], [1, 2, 3], eq);
      assert.equal(1, sim.fScore(1, pr.precision, pr.recall));
    })

    it('equals 0 for incorrect prediction', function() {
      function eq(a, b) { return a === b; }
      var pr = sim.calcPR([11, 22, 33], [1, 2, 3], eq);
      assert.equal(0, sim.fScore(1, pr.precision, pr.recall));
    })

    it('equals 0.5 for beta = 2 and 50% success', function() {
      function eq(a, b) { return a === b; }
      var pr = sim.calcPR([1, 2, 3, 4], [1, 2, 33, 44], eq);
      assert.equal(0.5, sim.fScore(2, pr.precision, pr.recall));
    })

    it('equals 0.5 for beta = 0.5 and 50% success', function() {
      function eq(a, b) { return a === b; }
      var pr = sim.calcPR([1, 2, 3, 4], [1, 2, 33, 44], eq);
      assert.equal(0.5, sim.fScore(0.5, pr.precision, pr.recall));
    })

    it('equals 10/36 for beta = 2 and 25% success', function() {
      function eq(a, b) { return a === b; }
      var pr = sim.calcPR([1, 2, 3, 4], [1, 22], eq);
      assert.equal(10/36, sim.fScore(2, pr.precision, pr.recall));
    })

    it('equals 10/24 for beta = 0.5 and 25% success', function() {
      function eq(a, b) { return a === b; }
      var pr = sim.calcPR([1, 2, 3, 4], [1, 22], eq);
      assert.equal(10/24, sim.fScore(0.5, pr.precision, pr.recall));
    })
  })

  describe('#teamEq', function() {
    var l = createLadder();

    it("should equal true for same teams", function() {
      var result = sim.teamEq([l.rows[0], l.rows[1]], [l.rows[0], l.rows[1]]);
      assert.equal(true, result);
    })

    it("should equal true for same teams in different order", function() {
      var result = sim.teamEq([l.rows[0], l.rows[1]], [l.rows[1], l.rows[0]]);
      assert.equal(true, result);
    })

    it("should equal false for different teams", function() {
      var result = sim.teamEq([l.rows[0], l.rows[1]], [l.rows[0], l.rows[2]]);
      assert.equal(false, result);
    })
  })


})
