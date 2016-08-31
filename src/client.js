/**
 * Created by Softmasters on 6/7/2016.
 */
/**
 * This file drives the client.
 */
'use strict';

var assert = require('assert');
var is = require('is2');
var _ = require('lodash');
var async = require('async');
var Cards = require('./cards');
var Client = require('node-rest-client').Client;
var clientCall = require('./clientRestCalls');
var stillPlaying = true;
var playerId = false;
var tableId = false;
var tableState = false;
var result = false;
var URL = "https://rocky-basin-58768.herokuapp.com/"
var client = new Client();
/**
 * get the user name so we can login.
 * @param {Function} cb The callback of for fn(err, obj) where obj is the
 *      prompt result with the name.
 */

function displayHand(txt, hand, message, bot, _) {
    assert.ok(is.str(txt));
    assert.ok(is.nonEmptyArray(hand));
    console.log(hand);

    _.forEach(hand, function (c) {
        if (is.str(c)) {
            //printf('    %s\n', c);
            bot.reply(message, c);
        } else if (is.int(c) && c > -1) {
            var card = Cards.getCard(c);
            //printf('%s of %s\n', card.rank, card.suit);
            bot.reply(message, card.rank + " " + card.suit);

        } else {
            assert.ok(false);
        }
    });
}

function displayHands(response, message, bot, _) {

    var table = response.table;
    var player = response.player;
    assert.ok(is.nonEmptyObj(table));
    var dealerHand = table.dealer.hand;
    var yourHand;
    displayHand('Dealers hand:', dealerHand, bot, _);
    if (is.positiveInt(player.bet)) {
        yourHand = table.players[playerId].hand;
        displayHand('Your hand:', yourHand, bot, _);
    } else if (player.bet === -1 && is.obj(player.result)) {
        yourHand = player.result.players[playerId].hand;
        displayHand('Your hand:', yourHand, bot, _);
        if (player.result.players[playerId].push) {
            //console.log('Push. You have %s credits.', player.credits);
            bot.reply(message, 'Push. You have %s credits.', player.credits)
        } else {

            //console.log('You %s %s and currently have %s credits.',
            //    (player.result.players[playerId].win ? 'won' : 'lost'),
            //    player.result.players[playerId].bet,
            //    player.credits);
            bot.reply(message, 'You %s %s and currently have %s credits.',
                (player.result.players[playerId].win ? 'won' : 'lost'),
                player.result.players[playerId].bet,
                player.credits)

        }
    }
}


////////////////////////////////////////////////////////////////////////////////
// commands

//login
function login(username, cb) {
    var args = {
        data: {"playerName": username}, // data passed to REST method (only useful in POST, PUT or PATCH methods)
        headers: {"Content-Type": "application/json"}
    }
    client.registerMethod("postMethod", URL + "login", "POST");
    client.methods.postMethod(args, function (data, response) {
        //playerId = data.player.id;
        //console.log("Player Id is equal to :" + playerId);
        return cb(data);
    });
}

/**
 * Return an object of all the tables from the server.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response from the server.
 */
function viewTables(cb) {
    assert.ok(is.func(cb));
    client.get(URL + "viewTables", function (data, response) {
        assert.ok(is.nonEmptyObj(data));
        assert.ok(is.nonEmptyObj(data.tables));
        result = data.tables;
        return cb(result);
    });
}

/**
 * Join a table to play a game.
 * @param {Number} tabl The id of the tabl to join.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response from the server.
 */
function joinTable(playerId, table, cb) {
    assert.ok(is.func(cb));
    var joinargs = {
        data: {"playerId": playerId, "tableId": table}, // data passed to REST method (only useful in POST, PUT or PATCH methods)
        headers: {"Content-Type": "application/json"}
    }
    client.registerMethod("postMethod", URL + "joinTable", "POST");
    client.methods.postMethod(joinargs, function (data, response) {
        return cb(data);
    });
}

/**
 * Leaves a table and puts the player in the lobby.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response from the server.
 */
function leaveTable(playerId, cb) {
    assert.ok(is.func(cb));
    var args = {
        data: {playerId: playerId}, // data passed to REST method (only useful in POST, PUT or PATCH methods)
        headers: {"Content-Type": "application/json"}
    }
    client.registerMethod("postMethod", URL + "leaveTable", "POST");
    client.methods.postMethod(args, function (data, response) {
        return cb(data);
    });
}

/**
 * Set a bet amount for the hand.
 * @param {Number} amt The amount of credits to bet.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response from the server.
 */
function bet(playerId, amt, cb) {
    assert.ok(is.func(cb));
    var bet = {
        data: {"playerId": playerId, "bet": amt}, // data passed to REST method (only useful in POST, PUT or PATCH methods)
        headers: {"Content-Type": "application/json"}
    }
    client.registerMethod("postMethod", URL + "bet", "POST");
    client.methods.postMethod(bet, function (data, response) {
        return cb(data);
    });
}


/**
 * Request a nother card from the dealer.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response from the server.
 */
function hit(playerId, cb) {
    assert.ok(is.func(cb));
    var hit = {
        data: {"playerId": playerId}, // data passed to REST method (only useful in POST, PUT or PATCH methods)
        headers: {"Content-Type": "application/json"}
    }
    client.registerMethod("postMethod", URL + "hit", "POST");
    client.methods.postMethod(hit, function (data, response) {
        return cb(data);
    });

}

/**
 * Players wants no more cards and risks the bet on the current hand.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response from the server.
 */
function stand(playerId, cb) {
    assert.ok(is.func(cb));
    var stand = {
        data: {"playerId": playerId}, // data passed to REST method (only useful in POST, PUT or PATCH methods)
        headers: {"Content-Type": "application/json"}
    }
    client.registerMethod("postMethod", URL + "stand", "POST");
    client.methods.postMethod(stand, function (data, response) {
        return cb(data);
    });
}

/**
 * quits the game
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response from the server.
 */
function logout(playerId, cb) {
    assert.ok(is.func(cb));
    var stand = {
        data: {"playerId": playerId}, // data passed to REST method (only useful in POST, PUT or PATCH methods)
        headers: {"Content-Type": "application/json"}
    }
    client.registerMethod("postMethod", URL + "logout", "POST");
    client.methods.postMethod(stand, function (data, response) {
        return cb(data);
    });
}


////////////////////////////////////////////////////////////////////////////////
// this is where it starts                                                   //
///////////////////////////////////////////////////////////////////////////////


module.exports = {
    bet: bet,
    viewTables: viewTables,
    login: login,
    stand: stand,
    logout: logout,
    hit: hit,
    leaveTable: leaveTable,
    joinTable: joinTable,
    displayHands: displayHands,
    displayHand: displayHand

}