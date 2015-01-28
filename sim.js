var fs = require('fs');
var _ = require('lodash');

module.exports = {
  avg: avg,
  splitIntoTeams: splitIntoTeams,
  fixOrdering: fixOrdering,
  teamRating: teamRating,
  beat: beat,
  calcPR: calcPR,
  fScore: fScore,
  run: run,
  teamEq: teamEq
};

function fixOrdering(ladder) {
  ladder.rows.sort(function(p1, p2) {
    if (p1.rating < p2.rating)
      return 1;
    else if (p1.rating > p2.rating)
      return -1;
    else
      return 0;
  });

  _.each(ladder.rows, function(player, num) {
    player.ranking = 1 + num;
  });
}

function splitIntoTeams(ladder, teamSize) {
  var teams = _.chunk(ladder.rows, teamSize);

  if (teams[teams.length-1].length < teamSize)
    teams.pop();

  return teams;
}

function avg(arr, selector) {
  var m = _.map(arr, function(e) {
    return selector && selector(e) || e;
  });

  var sum = _.reduce(m, function(s, next) {
    return s + next;
  });

  return sum / arr.length;
}

function teamRating(team) {
  return avg(team, function(p) { return p.rating; });
}

function beat(left, right) {
  function game(team, ratingChange) {
    _.each(team, function(player) {
      if (ratingChange > 0) {
        player.weeklyWins += 1;
        player.seasonWins += 1;
      } else {
        player.weeklyLosses += 1;
        player.seasonLosses += 1;
      }
      player.rating += Math.floor(ratingChange);
    });
  }

  var leftRating = teamRating(left);
  var rightRating = teamRating(right);

  var leftChance = 1 / (1 + Math.pow(10, (rightRating - leftRating)/400));
  var rightChance = 1 / (1 + Math.pow(10, (leftRating - rightRating)/400));

  var k = 32;

  game(left, k * (1 - leftChance));
  game(right, k * (0 - rightChance));
}

function play(inTeams, N) {
  var teams = _.shuffle(inTeams);

  for (var i = 0; i < N; i += 2) {
    var left = teams[i];
    var right = teams[i + 1];
    beat(left, right);
  }
}

function calcPR(actual, predicted, eq) {
  var nCorrectlyPredicted = _.reduce(predicted, function(s, x) {
    return s + (_.some(actual, _.curry(eq)(x)) ? 1 : 0);
  }, 0);

  return {
    precision: nCorrectlyPredicted / predicted.length,
    recall: nCorrectlyPredicted / actual.length
  };
}

function fScore(beta, precision, recall) {
  if (precision === 0 && recall === 0) return 0;
  return (1 + beta * beta) * precision * recall / (beta * beta * precision + recall);
}

function sim(ladder, predictor) {
  _.each(ladder, function(player) {
    player.seasonWins = 0;
    player.seasonLosses = 0;
    player.weeklyWins = 0;
    player.weeklyLosses = 0;
    player.rating = 1500;
  });

  fixOrdering(ladder);

  var teams = splitIntoTeams(ladder, 3);

  // setup
  for (var i = 0; i < 500; ++i)
    play(teams, 500);

  fixOrdering(ladder);

  // actual
  predictor(ladder); // seed

  var nTurns = 1000;
  var nTeamsPerTurn = 20;
  var prs = [];

  for (var i = 0; i < nTurns; ++i) {
    play(teams, nTeamsPerTurn);
    fixOrdering(ladder);

    var predictedTeams = predictor(ladder);
    var actualTeams = teams.slice(0, nTeamsPerTurn);
    var pr = calcPR(actualTeams, predictedTeams, teamEq);
    prs.push(pr);
  }

  var p = avg(pr, function(x) { return x.precision; });
  var r = avg(pr, function(x) { return x.recall; });
  return fScore(0.5, p, r);
}

function teamEq(teamA, teamB) {
  function teamKey(t) {
    return _.map(t, function(p) { return p.name; }).sort().join();
  }
  return teamKey(teamA) === teamKey(teamB);
}

function run(predictor, teamSize) {
  fs.readFile('test/raw_ladder.json', 'utf8', function dataLoaded(error, data) {
    if (error)
      return console.error(error);

    var ladder = JSON.parse(data);
    ladder.teamSize = teamSize;

    var score = sim(ladder, predictor);
    console.log("F(0.5) score:", score);
  });
}

//run();
