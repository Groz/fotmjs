var fs = require('fs');
var _ = require('lodash');

function reorder(ladder) {
  ladder.sort(function(p1, p2) { return p1.rating < p2.rating; });

  _.each(ladder, function(player, num) {
    player.ranking = 1 + num;
  });
}

function getTeams(ladder, N) {
  var teams = [];

  var nTeams = Math.floor(ladder.length/N);

  for (var i = 0; i < nTeams; ++i) {
    teams.push([]);

    for (var j = 0; j < N; ++j)
      teams[i].push(ladder[i * N + j]);
  }

  return teams;
}

function play(inTeams, N) {
  var teams = _.shuffle(inTeams);

  function win(team, rating) {
    _.each(team, function(player) {
      player.weeklyWins += 1;
      player.seasonWins += 1;
      player.rating += rating;
    });
  }

  function lose(team, rating) {
    _.each(team, function(player) {
      player.weeklyLosses += 1;
      player.seasonLosses += 1;
      player.rating -= rating;
    });
  }

  for (var i = 0; i < N; i += 2) {
    var left = teams[i];
    var right = teams[i + 1];
    var rc = 15;
    win(left, rc);
    lose(right, rc);
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

  reorder(ladder);

  var teams = getTeams(ladder, 3);

  for (var i = 0; i < 100; ++i)
    play(teams, 100);

  reorder(ladder);
  console.log(ladder);
}

fs.readFile('test/raw_ladder.json', 'utf8', dataLoaded);


