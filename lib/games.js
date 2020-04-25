import {
  Mongo
} from 'meteor/mongo';
import {
  check
} from 'meteor/check';
import {
  Promise
} from 'meteor/promise';
import {
  gameLogic
} from './gameLogic.js';


Games = new Mongo.Collection("games");

Meteor.methods({
  "games.play"() {
    const game = Games.findOne({
      status: "waiting"
    });

    if (game === undefined) {
      gameLogic.newGame();
    } else if (game !== undefined && game.player1 !== this.userId && game.player2 === "") {
      gameLogic.joinGame(game);
    }
  },

  "games.makeMove"(position) {
    check(position, String);

    gameLogic.validatePosition(position);

    let game = Games.findOne({
      status: this.userId
    });

    if (game !== undefined) {
      gameLogic.addNewMove(position);

      if (gameLogic.checkIfGameWasWon()) {
        gameLogic.setGameResult(game._id, this.userId);
      } else {
        if (game.moves.length === 8) {
          gameLogic.setGameResult(game._id, "tie");
        } else {
          gameLogic.updateTurn(game);
        }
      }
    }
  },

  async "games.makeMancalaMove"(pos) {
    let position = parseInt(pos.replace(/[^0-9]/g, ''));

    let game = Games.findOne({
      status: this.userId
    });

    if (game !== undefined) {
      num = game.pods[position].beads;
      if (num == 0) {
        return false; //no beads so return now and stop other user getting next go
      }
      if (!gameLogic.podBelongsToMe(game, position)) {
        return false;
      }

      lastBeadPosition = gameLogic.mancalaMove(game, position, num);
      if ([6, 13].includes(lastBeadPosition)) {
        //if the last bead lands in the store then don't switch players
        gameLogic.setFeedback(game._id, 'extra-turn');
        console.log('the feedback is now ' + game.feedback);
        console.log(game);
        return false;
      }

      // console.log('number beads is ' +num + ' for player ' + game.status + ' ' + game.player1 + ' ' + this.userId)
      // console.log(' the position of the last bead is ' + lastBeadPosition)
      if (gameLogic.checkIfMancalaGameWasWon()) {
        gameLogic.setGameResult(game._id, this.userId);
      } else {
        gameLogic.setFeedback(game._id, 'your-turn');
        gameLogic.updateTurn(game);
      }
    }

  }

});
