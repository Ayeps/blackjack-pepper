/**
 * Created by Softmasters on 7/10/2016.
 */


var player = {
    playerId: 0,
    get getId() {
        return this.playerId;
    },
    set setId(x) {
        this.playerId = x;
    }
}

module.exports = {
    Player: player
}