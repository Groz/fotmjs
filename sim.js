var fs = require('fs');
var _ = require('lodash');

exports = module.exports = {};

function fixOrdering(ladder) {
  ladder.sort(function(p1, p2) { return p1.rating < p2.rating; });

  _.each(ladder, function(player, num) {
    player.ranking = 1 + num;
  });
}

function splitIntoTeams(ladder, teamSize) {
  var teams = _.chunk(ladder, teamSize);

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
      player.rating += ratingChange;
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

exports.avg = avg;
exports.splitIntoTeams = splitIntoTeams;
exports.fixOrdering = fixOrdering;
exports.teamRating = teamRating;
exports.beat = beat;

function play(inTeams, N) {
  var teams = _.shuffle(inTeams);

  for (var i = 0; i < N; i += 2) {
    var left = teams[i];
    var right = teams[i + 1];
    beat(left, right);
  }
}

function dataLoaded(error, data) {
  var ladder = JSON.parse(data).rows;

  _.each(ladder, function(player) {
    player.seasonWins = 0;
    player.seasonLosses = 0;
    player.weeklyWins = 0;
    player.weeklyLosses = 0;
    player.rating = 1500;
  });

  fixOrdering(ladder);

  var teams = splitIntoTeams(ladder, 3);

  for (var i = 0; i < 100; ++i)
    play(teams, 100);

  fixOrdering(ladder);
  console.log(ladder);
}

function run() {
  fs.readFile('test/raw_ladder.json', 'utf8', dataLoaded);
}



