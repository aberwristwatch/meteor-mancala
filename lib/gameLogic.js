class GameLogic
{
  newGame() {
    if (!this.userIsAlreadyPlaying()) {
      var Pod = function(id) {
        this.id = id;
        if ([6, 13].includes(id)) {
          this.beads = 0;
        } else {
          this.beads = 4;
          //set which opponents pod is opposite on the board
          this.bonusPod = (12 - id)
        }
      }
      var startingPods = [];
      for (let i = 0; i < 14; i++) {
        p = new Pod(i);
        startingPods.push(p);
      }

      Games.insert({
        player1: Meteor.userId(),
        player2: "",
        feedback: "",
        lastBeadPosition:0,
        moves: [],
        pods: startingPods,
        result: "",
        status: "waiting",
      });
    }
  }


  userIsAlreadyPlaying() {
    const game = Games.findOne({$or:[
      {player1: Meteor.userId()},
      {player2: Meteor.userId()}]
    });

    if (game !== undefined)
      return true;

    return false;
  }

  joinGame(game) {
    if (game.player2 === "" && Meteor.userId() !== undefined) {
      Games.update(
        {_id: game._id},
        {$set: {
          "player2": Meteor.userId(),
          "status": game.player1
          }
        }
      );
    }
  }

  validatePosition(position) {
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        if (position === x + '' + y)
          return true;
      }
    }

    throw new Meteor.Error('invalid-position', "Selected position does not exist... please stop trying to hack the game!!");
  }

  addNewMove(position) {
    Games.update(
      {status: Meteor.userId()},
      {
        $push: {
          moves: {playerID: Meteor.userId(), move: position}
        }
      }
    );
  }

  // // to avoid this Error: Meteor code must always run within a Fiber. Try wrapping callbacks that you pass to non-Meteor libraries with Meteor.bindEnvironment
  // const bound = Meteor.bindEnvironment((callback) => {
  //   callback();
  // });

  updatePodContents = function (gid,position,num) {
    console.log( 'updating contents for pod ',position,' with ', num, ' beads ' )
    return Games.update({
      _id: gid,
      "pods.id": position
    }, {
      $set: {
        "pods.$.beads": num
      }
    });
  }


  mancalaMove(game, position, num, myCallback) {
    //find out how many beads are in the pod
    num = game.pods[position].beads;
    if (num == 0) {
      // nothing to do if the pod is empty
      //return false to stop other player getting next move
      return false;
    }
    //the pod at position is now empty so update the db to make it so
    let gid = game._id;
    Games.update({
      _id: gid,
      "pods.id": position
    }, {
      $set: {
        "pods.$.beads": 0
      }
    });

    //stop players from depositing beads in the opponents store
    let myStore = (game.status == game.player1) ? 13 : 6;
    let opponentStore = (game.status == game.player1) ? 6 : 13;

    let endPosition = position;
    let newVal = 0;
    let next = position + 1;

    let thisPod = position + 1;



    for (let i = num; i > 0; i--) {
      //we dont put beads in opponents store
      if (thisPod == opponentStore) {
        thisPod++;
      }
      thisPod = thisPod % 14;
      console.log("loop:" + thisPod + " " + i);
      endPosition = thisPod;
      if (typeof game.pods[thisPod] == 'undefined') {
        return console.log("the pod " + thisPod + " has undefined beads")
      }
      newVal = game.pods[thisPod].beads + 1;

      Games.update({
        _id: gid,
        "pods.id": thisPod
      }, {
        $set: {
          "pods.$.beads": newVal
        }
      });
      thisPod++;
    }


    //now take care of bonus beads if the lastpod is not a store
    if ((![6, 13].includes(endPosition)) && (this.podBelongsToMe(game, endPosition))) {
      let lastPod = game.pods[endPosition];

      if (newVal == 1) {
        console.log('checking for bonus here when the last pod is:')
        console.log(lastPod)
        if (game.pods[lastPod.bonusPod].beads > 0) {
          console.log('expecting a bonus here')
          newVal = 1 + game.pods[myStore].beads + game.pods[lastPod.bonusPod].beads;
          //update the pod that was "eaten" by the opponent
          Games.update({
            _id: gid,
            "pods.id": lastPod.bonusPod
          }, {
            $set: {
              "pods.$.beads": 0
            }
          });
          //empty the endposition pod as well
          Games.update({
            _id: gid,
            "pods.id": endPosition
          }, {
            $set: {
              "pods.$.beads": 0
            }
          });

          //update the store
          Games.update({
            _id: gid,
            "pods.id": myStore
          }, {
            $set: {
              "pods.$.beads": newVal
            }
          });
        }
      }
    }

    return endPosition;
  }

  podBelongsToMe(game, position) {
    if ((position > 6) && (game.status == game.player1)) {
      return true;
    }
    if ((position < 6) && (game.status == game.player2)) {
      return true;
    }
  }

  setGameResult(gameId, result) {
    Games.update(
      {_id: gameId},
      {
        $set: {
          "result": result,
          "status": "end"
        }
      }
    );
  }

  updateTurn(game) {
    let nextPlayer;

    if(game.player1 === Meteor.userId())
      nextPlayer = game.player2;
    else
      nextPlayer = game.player1;

    Games.update(
      {status: Meteor.userId()},
      {
        $set: {
          "status": nextPlayer
        }
      }
    );
  }

  setFeedback(gameId, feedback) {
    console.log('Some feedback is being set ' + feedback);
    let fb = feedback;
    Games.update({
      status: Meteor.userId()
    }, {
      $set: {
        "feedback": fb
      }
    });
  }


  checkIfGameWasWon() {
    const game = Games.findOne({status: Meteor.userId()});

    const wins = [
    ['00', '11', '22'],
    ['00', '01', '02'],
    ['10', '11', '12'],
    ['20', '21', '22'],
    ['00', '10', '20'],
    ['01', '11', '21'],
    ['02', '12', '22']
    ];

    let winCounts = [0,0,0,0,0,0,0];

    for(let i = 0; i < game.moves.length; i++) {
      if(game.moves[i].playerID === Meteor.userId()) {
        const move = game.moves[i].move;

        for(let j = 0; j < wins.length; j++) {
          if(wins[j][0] == move || wins[j][1] == move || wins[j][2] == move)
          winCounts[j] ++;
        }
      }
    }

    for(let i = 0; i < winCounts.length; i++) {
      if(winCounts[i] === 3)
        return true;
    }

    return false;
  }

  checkIfMancalaGameWasWon() {
    const game = Games.findOne({
      status: Meteor.userId()
    });
    var sum = 0,
      min = 0,
      max = 0;

    if (game.status == game.player2) {
      max = 6;
    } else {
      min = 7;
      max = 13
    }
    for (let i = min; i < max; i++) {
      sum += game.pods[i].beads;
    }
    console.log('there are ' + sum + 'beads in your pods');
    return sum == 0;
  }

  removeGame(gameId) {
    Games.remove({_id: gameId});
  }

  removePlayer(gameId, player) {
    Games.update({_id: gameId}, {$set:{[player]: ""}});
  }
}

export const gameLogic = new GameLogic();
