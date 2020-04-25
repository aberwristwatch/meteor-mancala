import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.board.helpers({
  sideLength: () => {
    let side = new Array(3);
    side.fill(0);

    return side;
  },

  isMarked: (x, y) => {
    if(Session.get("inGame")) {
      let myGame = Games.findOne();

      if(myGame !== undefined && myGame.status !== "waiting") {
        for(let i = 0; i < myGame.moves.length; i++) {
          if(myGame.moves[i].move === x + '' + y) {
            if(myGame.moves[i].playerID === Meteor.userId())
              return "<p class='mark'>X</p>";
            else
              return "<p class='mark'>O</p>";
          }
        }
        if(myGame.status === Meteor.userId())
          return "<div class='selectableField' id='"+x+y+"'></div>";
      }
    }
  },

  displayPod: (n) => {
    if (Session.get("inGame")) {
      let myGame = Games.findOne();
      if (myGame !== undefined && myGame.status !== "waiting") {
        return myGame.pods[n].beads;
      }
    }
  }
});

Template.board.events({
  "click .js-mupdate": (event, template) => {
    Meteor.call("games.makeMancalaMove", event.target.id);
  }
});
