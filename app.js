/**
 * Created by Softmasters on 6/1/2016.
 */
var Botkit = require('botkit');
var client = require('./src/client');
var Cards = require('./src/cards');
var Client = require('node-rest-client').Client;
var api = new Client();
var assert = require('assert');
var Promise = require('promise');
var is = require('is2');
var _ = require('lodash');
var Step = require('./lib/step');
var fs = require('fs');
var player = require('./src/player')
var dateFormat = require('dateformat')
var playerId = 1;
var tables;
var nick;
var score;
var gameprogress = false;
var gamestate = "non";
var amt = 0;
var mongoStorage = require('botkit-storage-mongo')({mongoUri: process.env.mongo_uri});

var apidevtoken = "20f1a277983f4f86ad5f81008ba67e89";
var apiclienttoken = "37d8680f3e2e4455af44072ea029659e";
var controller = Botkit.facebookbot({
    access_token: process.env.access_token,
    verify_token: process.env.verify_token,
    storage: mongoStorage
})

var apiai = require('botkit-middleware-apiai')({
    token: apiclienttoken
});
var bot = controller.spawn({});
controller.setupWebserver(process.env.PORT || 5000, function (err, webserver) {
    controller.createWebhookEndpoints(controller.webserver, bot, function () {
        console.log('This bot is online!!!');
    });
    console.log(apiai.receive);
    controller.middleware.receive.use(apiai.receive);
});

displayHand = function (txt, hand, message, bot, _) {
    assert.ok(is.str(txt));
    assert.ok(is.nonEmptyArray(hand));
    console.log(hand);

    var display = txt;
    _.forEach(hand, function (c) {
        if (is.str(c)) {
            //printf('    %s\n', c);
            //bot.reply(message, c);
        } else if (is.int(c) && c > -1) {
            var card = Cards.getCard(c);
            //printf('%s of %s\n', card.rank, card.suit);
            display += "\n" + card.rank + " " + card.suit + " " + card.code + "";
        } else {
            assert.ok(false);
        }
    });
    bot.reply(message, display);
}


gamecontrol = function (bot, message, gameprogress) {

    if (gameprogress) {
        continuegame(bot, message);
    }
    else {

        gamepromt(bot, message);
    }
}
gamepromt = function (bot, message) {

    bot.reply(message,
        {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [
                        {
                            title: "Would you like to play another round?",
                            buttons: [
                                {
                                    type: "postback",
                                    title: "YES",
                                    payload: "yes"
                                },
                                {
                                    type: "postback",
                                    title: "NO",
                                    payload: "no"
                                }
                            ]
                        }
                    ]
                }
            }
        }
    );
}
continuegame = function (bot, message) {
    bot.reply(message,
        {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [
                        {
                            title: "Do you want to hit or Stand?",
                            buttons: [
                                {
                                    type: "postback",
                                    title: "HIT",
                                    payload: "hit"
                                },
                                {
                                    type: "postback",
                                    title: "STAND",
                                    payload: "stand"
                                }
                            ]
                        }
                    ]
                }
            }
        }
    );
}
sendmessage = function (bot, message, text) {
    bot.reply(message, text);
}
displayHands = function (response, message, bot, playerId, _) {
    console.log(playerId + " is the player id");
    var table = response.table;
    var player = response.player;
    assert.ok(is.nonEmptyObj(table));
    var dealerHand = table.dealer.hand;
    var yourHand;
    var playoption = null;
    displayHand('Dealers hand:', dealerHand, message, bot, _);
    if (is.positiveInt(player.bet)) {
        yourHand = table.players[playerId].hand;
        displayHand('Your hand:', yourHand, message, bot, _);
        playoption = 'continue';
    } else if (player.bet === -1 && is.obj(player.result)) {
        yourHand = player.result.players[playerId].hand;
        displayHand('Your hand:', yourHand, message, bot, _);
        playoption = 'playeagain';
        if (player.result.players[playerId].push) {
            bot.reply(message, 'Push. You have' + player.credits + 'credits.');
            playoption = 'playagain';
        } else {
            bot.reply(message, 'You ' + (player.result.players[playerId].win ? 'won' : 'lost') + ' ' + player.result.players[playerId].bet + ' and currently have ' + player.credits + ' credits.');
            playoption = 'playagain';
        }

    }
    return playoption;
}

controller.hears(['.*'], 'message_received', function (bot, message) {
    controller.storage.users.get(message.user, function (err, user) {
            if (user && user.name) {
                if (!is.str(nick)) {
                    bot.reply(message, 'Welcome back ' + user.name + ' , Would you like to play a game?');
                    nick = user.name;
                }
                else {
                    nick = user.name;
                }
            } else {
                bot.reply(message, 'Hi, my name is Pepper and I am your Black Jack Dealer.!');
                bot.startConversation(message, function (err, convo) {
                    if (!err) {
                        convo.ask('What should I call you?', function (response, convo) {
                            convo.next();

                        }, {
                            'key': 'nickname'
                        }); // store the results in a field called nickname

                        convo.on('end', function (convo) {
                            if (convo.status == 'completed') {
                                controller.storage.users.get(message.user, function (err, user) {
                                    if (!user) {
                                        user = {
                                            id: message.user,
                                        };
                                    }
                                    var history = [];
                                    user.name = convo.extractResponse('nickname');
                                    user.money = 0;
                                    user.history = history;
                                    user.lastdate = "";
                                    controller.storage.users.save(user, function (err, id) {
                                        bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
                                    });
                                });
                            } else {
                                // this happens if the conversation ended prematurely for some reason
                                bot.reply(message, 'OK, nevermind!');

                            }
                        });
                    }
                });
            }
            console.log(JSON.stringify(message));
            var cmd = message.intent;
            console.log(cmd);
            switch (cmd) {
                case "help":
                    var text = "Available commands: help, rules, join, leave, start, bet, hand, surrender, hit, stand, split, doubleDown" + "\nThe game is a 3-2 payout soft bet and stand till 17";
                    sendmessage(bot, message, text);
                    break;
                case "rules":
                    bot.reply(message, {
                        attachment: {
                            'type': 'template',
                            'payload': {
                                'template_type': 'generic',
                                'elements': [
                                    {
                                        'title': 'Rules',
                                        'buttons': [
                                            {
                                                'type': 'web_url',
                                                'url': 'http://wizardofodds.com/games/blackjack/basics/',
                                                'title': 'View Rules'
                                            },

                                        ]
                                    }
                                ]
                            }
                        }
                    });
                    if (gameprogress) {
                        if (gamestate === "hit") {
                            bot.reply(message, "you need to go back to the game,");
                            continuegame(bot, message);
                        } else if (gamestate === "stand") {
                            bot.reply(message, "you need to go back to the game,");
                            continuegame(bot, message);
                        }
                        else if (gamestate == "bet") {
                            bot.reply(message, "you need to go back to the game, How much do you want to bet?");
                        }
                    } else {

                        bot.reply(message, "enter start to play a game of blackjack?");
                        //gameprogress = true;
                        //controller.storage.users.get(message.user, function (err, user) {
                        //    if (!user) {
                        //        user = {
                        //            id: message.user,
                        //        };
                        //    }
                        //    console.log(user.name);
                        //    client.login(user.name, function (response) {
                        //        //tables = response;
                        //        console.log(response);
                        //        console.log("login resposne");
                        //        console.log("player id" + response.playerId);
                        //        user.playerId = response.playerId;
                        //        //user.money = response.playerId;
                        //        playerId = response.playerId;
                        //        controller.storage.users.save(user, function (err, id) {
                        //        })
                        //        tables = response.tables;
                        //        client.joinTable(user.playerId, 1, function (response) {
                        //            console.log(response);
                        //            if (is.nonEmptyObject(response.player)) {
                        //                bot.reply(message, "Great " + user.name + " this will be awesome. You have" + response.player.credits + ". How much do you want to bet?");
                        //            }
                        //            else {
                        //                bot.reply(message, 'type start to play a game of Blackjack');
                        //                client.leaveTable(user.playerId, function (response) {
                        //                    console.log(response)
                        //                })
                        //                client.logout(user.playerId, function (response) {
                        //                    console.log(response)
                        //                })
                        //            }
                        //        });
                        //        gamestate = "bet";
                        //    })
                        //});
                    }
                    break;
                case "debug":
                    break;
                case "hit":

                    client.hit(user.playerId, function (response) {
                        if (!is.nullOrUndefined(response.player)) {
                            gameprogress = true;
                            gamestate = "hit";
                            console.log("hit" + response.player)
                            var option = displayHands(response, message, bot, user.playerId, _);
                            //save mount player has
                            if (option === 'playagain') {
                                user.money = (parseInt(user.money) + parseInt(response.player.credits));
                                var now = new Date();
                                var date = dateFormat(now, "yyyy-mm-d");
                                user.lastdate = date;
                                var history = user.history;

                                var historydata = {
                                    time: date,
                                    money: parseInt(response.player.credits) - 1000
                                };
                                history.push(historydata);
                                console.log(history);
                                user.history = history;

                                console.log("amount paid" + (parseInt(user.money) + parseInt(response.player.credits)));
                                //playerId = response.playerId;
                                controller.storage.users.save(user, function (err, id) {
                                })
                                console.log(playerId);
                                client.leaveTable(user.playerId, function (response) {

                                    console.log("left table");
                                })

                                gameprogress = false;
                                gamepromt(bot, message)
                            }
                            else {
                                continuegame(bot, message);
                            }
                        } else {
                            if (gameprogress) {
                                if (gamestate == "bet") {
                                    bot.reply(message, "you need to go back to the game, How much do you want to bet?");
                                } else if (gamestate === "hit") {
                                    bot.reply(message, "you need to go back to the game");
                                    continuegame(bot, message);
                                } else if (gamestate === "stand") {
                                    bot.reply(message, "you need to go back to the game");
                                    continuegame(bot, message);
                                }
                            }
                            else {
                                bot.reply(message, "you need to go back to the game");
                                gamepromt(bot, message);
                            }
                        }
                    })

                    break;
                case "doubleDown":
                    break;
                case "stand":
                    client.stand(user.playerId, function (response) {
                        if (!is.nullOrUndefined(response.player)) {
                            gameprogress = true;
                            gamestate = "stand";
                            console.log("stand" + response.player)
                            var option = displayHands(response, message, bot, user.playerId, _);
                            if (option === 'playagain') {
                                user.money = (parseInt(user.money) + parseInt(response.player.credits));

                                console.log(response.player.credits);
                                console.log("amount paid" + (parseInt(user.money) + parseInt(response.player.credits)));
                                var now = new Date();
                                var date = dateFormat(now, "yyyy-mm-d");
                                user.lastdate = date;
                                var history = user.history;
                                var historydata = {
                                    time: date,
                                    money: parseInt(response.player.credits) - 1000
                                };
                                history.push(historydata);
                                console.log(history);
                                user.history = history;
                                //playerId = response.playerId;
                                controller.storage.users.save(user, function (err, id) {
                                })
                                console.log(playerId);
                                client.leaveTable(user.playerId, function (response) {
                                    console.log(playerId + "left table");
                                })
                                gameprogress = false;
                                gamepromt(bot, message)
                            }
                            else {
                                continuegame(bot, message);
                            }
                        } else {
                            if (gameprogress) {
                                if (gamestate == "bet") {
                                    bot.reply(message, "you need to go back to the game, How much do you want to bet?");
                                } else if (gamestate === "hit") {
                                    bot.reply(message, "you need to go back to the game");
                                    continuegame(bot, message);
                                } else if (gamestate === "stand") {
                                    bot.reply(message, "you need to go back to the game");
                                    continuegame(bot, message);
                                }
                            }
                            else {
                                bot.reply(message, "you need to go back to the game");
                                gamepromt(bot, message);
                            }

                        }
                    })
                    break;
                case "split":


                    break;
                case "hand":


                    break;
                case "surrender":

                    break;
                case "bet":
                    console.log("we are in bet");
                    console.log(message.entities.number);
                    var amount = message.entities.number;
                    var amt = parseInt(amount);
                    console.log("true for number" + is.number(amount));
                    message.money -= amount;
                    client.bet(user.playerId, amt, function (response) {
                        console.log(response);
                        if (response.success === true) {
                            displayHands(response, message, bot, user.playerId, _);
                            bot.reply(message,
                                {
                                    attachment: {
                                        type: "template",
                                        payload: {
                                            template_type: "generic",
                                            elements: [
                                                {
                                                    title: "Do you want to hit or Stand",
                                                    buttons: [
                                                        {
                                                            type: "postback",
                                                            title: "HIT",
                                                            payload: "hit"
                                                        },
                                                        {
                                                            type: "postback",
                                                            title: "STAND",
                                                            payload: "stand"
                                                        }

                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                });
                        } else {
                            console.log(response);
                            if (response.error === 'false == true') {
                                bot.reply(message, "You have join a game first, enter start to play a game");
                            }
                            else {
                                bot.reply(message, response.error);
                            }

                        }
                    });
                    break;
                case
                "leave"
                :
                    console.log(playerId);
                    client.leaveTable(user.playerId, function (response) {
                        bot.reply(message, "Thanks for playing the game with us");
                    })
                    break;
                case
                "start"
                :
                    client.login(user.name, function (response) {
                        console.log(response);
                        //console.log("login resposne");
                        console.log("player id" + response.playerId);
                        user.playerId = response.playerId;
                        playerId = response.playerId;
                        controller.storage.users.save(user, function (err, id) {
                        })

                        //display tables and users in the table
                        tables = response.tables;

                        if (tables[1].numPlayers < 1) {
                            client.joinTable(user.playerId, 1, function (response) {
                                console.log(response);
                                if (is.nonEmptyObject(response.player)) {


                                    if (response.player.credits === 0) {
                                        bot.reply(message, "You don't have money in your account");
                                    }
                                    else {
                                        bot.reply(message, "Great " + user.name + " this will be awesome. You have " + response.player.credits + ". How much do you want to bet?");

                                    }
                                }
                                else {
                                    bot.reply(message, 'You have join a game first, enter start to play a game blackjack');
                                    client.leaveTable(user.playerId, function (response) {
                                        console.log(user.playerId + "left table")
                                    })
                                    client.logout(user.playerId, function (response) {
                                        console.log(user.playerId + "left  game " + response);
                                    })
                                }
                                gameprogress = true;
                                gamestate = "bet";
                            });
                        } else if (tables[2].numPlayers < 1) {
                            client.joinTable(user.playerId, 2, function (response) {
                                console.log(response);
                                if (is.nonEmptyObject(response.player)) {
                                    if (response.player.credits === 0) {
                                        bot.reply(message, "You don't have money in your account");
                                    }
                                    else {
                                        bot.reply(message, "Great " + user.name + " this will be awesome. You have " + response.player.credits + ". How much do you want to bet?");

                                    }
                                }
                                else {
                                    bot.reply(message, 'You have to log in first');
                                    client.leaveTable(user.playerId, function (response) {
                                        console.log(response)
                                    })
                                    client.logout(user.playerId, function (response) {
                                        console.log(response)
                                    })
                                }
                                gameprogress = true;
                                gamestate = "bet";
                            });
                        } else if (tables[3].numPlayers < 1) {
                            client.joinTable(user.playerId, 3, function (response) {
                                console.log(response);
                                if (is.nonEmptyObject(response.player)) {
                                    if (response.player.credits === 0) {
                                        bot.reply(message, "You don't have money in your account");
                                    }
                                    else {
                                        bot.reply(message, "Great " + user.name + " this will be awesome. You have " + response.player.credits + ". How much do you want to bet?");

                                    }
                                }
                                else {
                                    bot.reply(message, 'You have to log in first');
                                    client.leaveTable(user.playerId, function (response) {
                                        console.log(response)
                                    })
                                    client.logout(user.playerId, function (response) {
                                        console.log(response)
                                    })
                                }
                                gameprogress = true;
                                gamestate = "bet";
                            });
                        } else if (tables[4].numPlayers < 1) {
                            client.joinTable(user.playerId, 4, function (response) {
                                console.log(response);
                                if (is.nonEmptyObject(response.player)) {
                                    if (response.player.credits === 0) {
                                        bot.reply(message, "You don't have money in your account");
                                    }
                                    else {
                                        bot.reply(message, "Great " + user.name + " this will be awesome. You have " + response.player.credits + ". How much do you want to bet?");
                                    }
                                }
                                else {
                                    bot.reply(message, 'You have to log in first');
                                    client.leaveTable(user.playerId, function (response) {
                                        console.log(response)
                                    })
                                    client.logout(user.playerId, function (response) {
                                        console.log(response)
                                    })
                                }
                                gameprogress = true;
                                gamestate = "bet";
                            });
                        } else if (tables[5].numPlayers < 1) {
                            client.joinTable(user.playerId, 5, function (response) {
                                console.log(response);
                                if (is.nonEmptyObject(response.player)) {
                                    if (response.player.credits === 0) {
                                        bot.reply(message, "You don't have money in your account");
                                    }
                                    else {
                                        bot.reply(message, "Great " + user.name + " this will be awesome. You have " + response.player.credits + ". How much do you want to bet?");

                                    }
                                }
                                else {
                                    bot.reply(message, 'You have to log in first');
                                    client.leaveTable(user.playerId, function (response) {
                                        console.log(response)
                                    })
                                    client.logout(user.playerId, function (response) {
                                        console.log(response)
                                    })
                                }
                                gameprogress = true;
                                gamestate = "bet";
                            });
                        } else if (tables[6].numPlayers < 1) {
                            client.joinTable(user.playerId, 6, function (response) {
                                console.log(response);
                                if (is.nonEmptyObject(response.player)) {
                                    if (response.player.credits === 0) {
                                        bot.reply(message, "You don't have money in your account");
                                    }
                                    else {
                                        bot.reply(message, "Great " + user.name + " this will be awesome. You have " + response.player.credits + ". How much do you want to bet?");
                                    }
                                }
                                else {
                                    bot.reply(message, 'You have to log in first');
                                    client.leaveTable(user.playerId, function (response) {
                                        console.log(response)
                                    })
                                    client.logout(user.playerId, function (response) {
                                        console.log(response)
                                    })
                                }
                                gameprogress = true;
                                gamestate = "bet";
                            });
                        }
                    });

                    break;
                case
                "score"
                :
                    var displayscore = "Date     |     Score \n";
                    var text = user.history;

                    var array = _.slice(text, 0, 5);
                    //console.log("Date :" + message.entities.date)
                    //if (!is.nullOrUndefined(message.entities.date)) {
                    //_.forEach(array, function (c) {
                    //    if (is.matching(new Date(message.entities.date), new Date(c.time))) {
                    //        displayscore += "\n" + c.time + "      |      " + c.money + "";
                    //    }
                    //});
                    console.log(displayscore);
                    //}

                    //bot.reply(message, "Total amount of money you have is " + user.money);
                    //bot.reply(message, "The last time you played the game was " + user.lastdate);
                    //bot.reply(message, "You have played the game " + text.length + " times");
                    _.forEach(array, function (c) {
                        displayscore += "\n" + c.time + "  |  " + c.money + "";
                    });

                    bot.reply(message, displayscore);
                    if (gameprogress) {
                        if (gamestate === "hit") {
                            bot.reply(message, "you need to go back to the game,");
                            continuegame(bot, message);
                        }
                        else if (gamestate == "bet") {
                            bot.reply(message, "you need to go back to the game, How much do you want to bet?");
                        }
                    }


                    break;
                case
                "shutDown"
                :
                    break;

                //case
                //"hel-am lo"
                //:
                //    if (!is.str(nick)) {
                //        nick = user.name;
                //        bot.reply(message, 'Welcome back ' + user.name + ' , Would you like to play a game?');
                //    } else {
                //        bot.reply(message, "Hi " + user.name + ' , Would you like to play a game?');
                //    }
                //
                //    break;
                case
                "joke"
                :
                    api.get("https://api.chucknorris.io/jokes/random", function (data, response) {

                        bot.reply(message, {
                            attachment: {
                                type: 'image',
                                payload: {
                                    url: data.icon_url
                                }
                            }
                        });
                        bot.reply(message, data.value);
                    });

                    break;
                default:
                    if (message.fulfillment.speech == "") {
                        console.log(message.fulfillment.speech);
                        bot.reply(message, "So, I’m good at playing Blackjack . Other stuff, not so good." +
                            " If you need help just enter “help.” \n Or choose a command below.");
                        gamecontrol(bot, message, gameprogress)

                    } else {
                        console.log(message.fulfillment.speech);
                        bot.reply(message, message.fulfillment.speech);
                    }
                    if (gameprogress) {
                        if (gamestate == "bet") {
                            bot.reply(message, "you need to go back to the game, How much do you want to bet?");

                        } else if (gamestate === "hit") {
                            bot.reply(message, "you need to go back to the game,");
                            continuegame(bot, message);
                        } else if (gamestate === "stand") {
                            bot.reply(message, "you need to go back to the game,");
                            continuegame(bot, message);
                        }
                    }
                    //} else if (gameprogress==false) {
                    //
                    //    bot.reply(message,
                    //        {
                    //            attachment: {
                    //                type: "template",
                    //                payload: {
                    //                    template_type: "generic",
                    //                    elements: [
                    //                        {
                    //                            title: "Want to play some black Jack?",
                    //                            buttons: [
                    //                                {
                    //                                    type: "postback",
                    //                                    title: "YES",
                    //                                    payload: "yes"
                    //                                },
                    //                                {
                    //                                    type: "postback",
                    //                                    title: "NO",
                    //                                    payload: "no"
                    //                                }
                    //                            ]
                    //                        }
                    //                    ]
                    //                }
                    //            }
                    //        }
                    //    );
                    //}
                    break;
            }
        }
    );
})
;
//
//controller.on('facebook_postback', function (bot, message) {
//    switch (message.payload) {
//        //case 'yes':
//        //    gameprogress = false;
//        //    controller.storage.users.get(message.user, function (err, user) {
//        //        if (!user) {
//        //            user = {
//        //                id: message.user,
//        //            };
//        //        }
//        //        console.log(user.name);
//        //        client.login(user.name, function (response) {
//        //            //tables = response;
//        //            console.log(response);
//        //
//        //            //console.log("player id" + response.playerId);
//        //            user.playerId = response.playerId;
//        //            //user.money = response.playerId;
//        //            playerId = response.playerId;
//        //            controller.storage.users.save(user, function (err, id) {
//        //            })
//        //            tables = response.tables;
//        //            if (tables[1].numPlayers < 1) {
//        //                client.joinTable(user.playerId, 1, function (response) {
//        //                    console.log(response);
//        //                    if (is.nonEmptyObject(response.player)) {
//        //                        bot.reply(message, "Great " + user.name + " this will be awesome. You have" + response.player.credits + ". How much do you want to bet?");
//        //                    }
//        //                    else {
//        //                        bot.reply(message, 'You have join a game first, enter start to play a game blackjack');
//        //                        client.leaveTable(user.playerId, function (response) {
//        //                            console.log(response)
//        //                        })
//        //                        client.logout(user.playerId, function (response) {
//        //                            console.log(response)
//        //                        })
//        //                    }
//        //                    gameprogress = true;
//        //                    gamestate = "bet";
//        //                });
//        //            } else if (tables[2].numPlayers < 1) {
//        //                client.joinTable(user.playerId, 2, function (response) {
//        //                    console.log(response);
//        //                    if (is.nonEmptyObject(response.player)) {
//        //                        bot.reply(message, "Great " + user.name + " this will be awesome. You have" + response.player.credits + ". How much do you want to bet?");
//        //                    }
//        //                    else {
//        //                        bot.reply(message, 'You have to log in first');
//        //                        client.leaveTable(user.playerId, function (response) {
//        //                            console.log(response)
//        //                        })
//        //                        client.logout(user.playerId, function (response) {
//        //                            console.log(response)
//        //                        })
//        //                    }
//        //                    gameprogress = true;
//        //                    gamestate = "bet";
//        //                });
//        //            } else if (tables[3].numPlayers < 1) {
//        //                client.joinTable(user.playerId, 3, function (response) {
//        //                    console.log(response);
//        //                    if (is.nonEmptyObject(response.player)) {
//        //                        bot.reply(message, "Great " + user.name + " this will be awesome. You have" + response.player.credits + ". How much do you want to bet?");
//        //                    }
//        //                    else {
//        //                        bot.reply(message, 'You have to log in first');
//        //                        client.leaveTable(user.playerId, function (response) {
//        //                            console.log(response)
//        //                        })
//        //                        client.logout(user.playerId, function (response) {
//        //                            console.log(response)
//        //                        })
//        //                    }
//        //                    gameprogress = true;
//        //                    gamestate = "bet";
//        //                });
//        //            } else if (tables[4].numPlayers < 1) {
//        //                client.joinTable(user.playerId, 4, function (response) {
//        //                    console.log(response);
//        //                    if (is.nonEmptyObject(response.player)) {
//        //                        bot.reply(message, "Great " + user.name + " this will be awesome. You have" + response.player.credits + ". How much do you want to bet?");
//        //                    }
//        //                    else {
//        //                        bot.reply(message, 'You have to log in first');
//        //                        client.leaveTable(user.playerId, function (response) {
//        //                            console.log(response)
//        //                        })
//        //                        client.logout(user.playerId, function (response) {
//        //                            console.log(response)
//        //                        })
//        //                    }
//        //                    gameprogress = true;
//        //                    gamestate = "bet";
//        //                });
//        //            } else if (tables[5].numPlayers < 1) {
//        //                client.joinTable(user.playerId, 5, function (response) {
//        //                    console.log(response);
//        //                    if (is.nonEmptyObject(response.player)) {
//        //                        bot.reply(message, "Great " + user.name + " this will be awesome. You have" + response.player.credits + ". How much do you want to bet?");
//        //                    }
//        //                    else {
//        //                        bot.reply(message, 'You have to log in first');
//        //                        client.leaveTable(user.playerId, function (response) {
//        //                            console.log(response)
//        //                        })
//        //                        client.logout(user.playerId, function (response) {
//        //                            console.log(response)
//        //                        })
//        //                    }
//        //                    gameprogress = true;
//        //                    gamestate = "bet";
//        //                });
//        //            } else if (tables[6].numPlayers < 1) {
//        //                client.joinTable(user.playerId, 6, function (response) {
//        //                    console.log(response);
//        //                    if (is.nonEmptyObject(response.player)) {
//        //                        bot.reply(message, "Great " + user.name + " this will be awesome. You have" + response.player.credits + ". How much do you want to bet?");
//        //                    }
//        //                    else {
//        //                        bot.reply(message, 'You have to log in first');
//        //                        client.leaveTable(user.playerId, function (response) {
//        //                            console.log(response)
//        //                        })
//        //                        client.logout(user.playerId, function (response) {
//        //                            console.log(response)
//        //                        })
//        //                    }
//        //                    gameprogress = true;
//        //                    gamestate = "bet";
//        //                });
//        //            }
//        //            gamestate = "bet";
//        //        })
//        //    });
//        //    break
//        case 'no':
//            controller.storage.users.get(message.user, function (err, user) {
//                if (!user) {
//                    user = {
//                        id: message.user,
//                    };
//                }
//                console.log(playerId);
//                client.leaveTable(user.playerId, function (response) {
//                    //response.
//                })
//
//            });
//            bot.reply(message, "Thanks for playing the game with us")
//            break
//    }
//});

//
//
//controller.on('facebook_postback', function (bot, message) {
//    switch (message.payload) {
//        case 'yes':
//            //login
//            controller.storage.users.get(message.user, function (err, user) {
//                if (!user) {
//                    user = {
//                        id: message.user,
//                    };
//                }
//                console.log(user.name);
//                client.login(user.name, function (response) {
//                    //tables = response;
//                    console.log(response);
//                    console.log("login resposne");
//                    console.log("player id" + response.playerId);
//                    user.playerId = response.playerId;
//                    //user.money = response.playerId;
//                    playerId = response.playerId;
//                    controller.storage.users.save(user, function (err, id) {
//                    })
//                    bot.reply(message, "your Player Id :" + user.playerId)
//                    //display tables and users in the table
//                    tables = response.tables;
//                    bot.reply(message,
//                        {
//                            attachment: {
//                                type: "template",
//                                payload: {
//                                    template_type: "generic",
//                                    elements: [
//                                        {
//                                            title: "Table 1",
//                                            image_url: "http://i.imgur.com/dmkDnSb.jpg",
//                                            subtitle: tables[1].numPlayers + " players, State: " + tables[1].state,
//                                            buttons: [
//                                                {
//                                                    type: "postback",
//                                                    title: "Join",
//                                                    payload: "1"
//                                                }
//                                            ]
//                                        }
//                                        , {
//                                            title: "Table 2",
//                                            image_url: "http://i.imgur.com/dmkDnSb.jpg",
//                                            subtitle: tables[2].numPlayers + " players , State: " + tables[2].state,
//                                            buttons: [
//                                                {
//                                                    type: "postback",
//                                                    title: "Join",
//                                                    payload: "2"
//                                                }
//                                            ]
//                                        },
//                                        {
//                                            title: "Table 3",
//                                            image_url: "http://i.imgur.com/dmkDnSb.jpg",
//                                            subtitle: tables[3].numPlayers + " players , State: " + tables[3].state,
//                                            buttons: [
//                                                {
//                                                    type: "postback",
//                                                    title: "Join",
//                                                    payload: "3"
//                                                }
//                                            ]
//                                        },
//                                        {
//                                            title: "Table 4",
//                                            image_url: "http://i.imgur.com/dmkDnSb.jpg",
//                                            subtitle: tables[4].numPlayers + " players , State: " + tables[4].state,
//                                            buttons: [
//                                                {
//                                                    type: "postback",
//                                                    title: "Join",
//                                                    payload: "4"
//                                                }
//
//                                            ]
//                                        }, {
//                                            title: "Table 5",
//                                            image_url: "http://i.imgur.com/dmkDnSb.jpg",
//                                            subtitle: tables[5].numPlayers + " players , State: " + tables[5].state,
//                                            buttons: [
//                                                {
//                                                    type: "postback",
//                                                    title: "Join",
//                                                    payload: "5"
//                                                }
//
//                                            ]
//                                        }, {
//                                            title: "Table 6",
//                                            image_url: "http://i.imgur.com/dmkDnSb.jpg",
//                                            subtitle: tables[6].numPlayers + " players , State: " + tables[6].state,
//                                            buttons: [
//                                                {
//                                                    type: "postback",
//                                                    title: "Join",
//                                                    payload: "6"
//                                                }
//
//                                            ]
//                                        }
//                                    ]
//                                }
//                            }
//                        }
//                    );
//                })
//            });
//            break
//        case 'no':
//            controller.storage.users.get(message.user, function (err, user) {
//                if (!user) {
//                    user = {
//                        id: message.user,
//                    };
//                }
//                console.log(playerId);
//                client.leaveTable(user.playerId, function (response) {
//                    //response.
//                })
//
//            });
//            bot.reply(message, "Thanks for playing the game with us")
//            break
//        case 'hit':
//            //call function to perform hit operation
//            controller.storage.users.get(message.user, function (err, user) {
//                if (!user) {
//                    user = {
//                        id: message.user,
//                    };
//                }
//                client.hit(user.playerId, function (response) {
//                    var option = displayHands(response, message, bot, user.playerId, _);
//                    //save mount player has
//                    if (option === 'playagain') {
//                        user.money = (parseInt(user.money) + parseInt(response.player.credits));
//                        var now = new Date();
//                        var date = dateFormat(now, "dddd, mmmm dS, yyyy, h:MM:ss TT");
//                        user.lastdate = date;
//                        var history = user.history;
//                        var historydata = {
//                            time: date,
//                            money: parseInt(response.player.credits) - 1000
//                        };
//                        history.push(historydata);
//                        console.log(history);
//                        user.history = history;
//
//                        console.log("amount paid" + (parseInt(user.money) + parseInt(response.player.credits)));
//                        //playerId = response.playerId;
//                        controller.storage.users.save(user, function (err, id) {
//                        })
//                        console.log(playerId);
//                        client.leaveTable(user.playerId, function (response) {
//                            //response.
//                        })
//                        gamepromt(bot, message)
//                    }
//                    else {
//                        continuegame(bot, message);
//                    }
//
//                })
//            });
//            break
//        case 'stand':
//            controller.storage.users.get(message.user, function (err, user) {
//                if (!user) {
//                    user = {
//                        id: message.user,
//                    };
//                }
//
//                client.stand(user.playerId, function (response) {
//                    var option = displayHands(response, message, bot, user.playerId, _);
//                    //where to save player money
//                    if (option === 'playagain') {
//                        user.money = (parseInt(user.money) + parseInt(response.player.credits));
//
//                        console.log(response.player.credits);
//                        console.log("amount paid" + (parseInt(user.money) + parseInt(response.player.credits)));
//
//
//                        var now = new Date();
//                        var date = dateFormat(now, "dddd, mmmm dS, yyyy, h:MM:ss TT");
//                        user.lastdate = date;
//                        var history = user.history;
//                        var historydata = {
//                            time: date,
//                            money: parseInt(response.player.credits) - 1000
//                        };
//                        history.push(historydata);
//                        console.log(history);
//                        user.history = history;
//                        //playerId = response.playerId;
//                        controller.storage.users.save(user, function (err, id) {
//                        })
//                        console.log(playerId);
//                        client.leaveTable(user.playerId, function (response) {
//                            //response.
//                        })
//                        gamepromt(bot, message)
//                    }
//                    else {
//                        continuegame(bot, message);
//                    }
//                })
//            });
//            break
//        case '1':
//            controller.storage.users.get(message.user, function (err, user) {
//                if (!user) {
//                    user = {
//                        id: message.user,
//                    };
//                }
//                console.log("before join" + user.playerId);
//                client.joinTable(user.playerId, 1, function (response) {
//                    if (response.player.busted == false) {
//                        bot.reply(message, "You are  on Table 1 with id" + playerId)
//                        bot.reply(message, "You have credit of " + response.player.credits + "$")
//                        bot.startConversation(message, function (err, convo) {
//                            if (!err) {
//                                convo.ask('How much do want to bet?', function (response, convo) {
//
//                                    console.log(response.text);
//                                    var text = response.text;
//                                    amt = text.replace(/\D+/g, '');
//                                    console.log("amount bet ==>" + amt);
//                                    convo.ask('You want me to call you ' + response.text + '? (yes/no)', [{
//
//                                        pattern: 'yes',
//                                        callback: function (response, convo) {
//
//                                            // since no further messages are queued after this,
//                                            // the conversation will end naturally with status == 'completed'
//                                            convo.next();
//                                        }
//                                    }, {
//                                        pattern: 'no',
//                                        callback: function (response, convo) {
//                                            // stop the conversation. this will cause it to end with status == 'stopped'
//                                            convo.repeat();
//                                            convo.next();
//                                        }
//                                    }, {
//                                        default: true,
//                                        callback: function (response, convo) {
//                                            convo.repeat();
//                                            convo.next();
//                                        }
//                                    }]);
//                                    convo.next();
//                                }); // store the results in a field called nickname
//                                convo.on('end', function (convo) {
//                                    if (convo.status == 'completed') {
//
//                                        console.log("amount is ok" + amt);
//                                        message.money -= 100;
//                                        controller.storage.users.save(user, function (err, id) {
//                                        });
//                                        client.bet(user.playerId, parseInt(amt), function (response) {
//                                            if (response.success === true) {
//                                                displayHands(response, message, bot, user.playerId, _);
//                                                bot.reply(message,
//                                                    {
//                                                        attachment: {
//                                                            type: "template",
//                                                            payload: {
//                                                                template_type: "generic",
//                                                                elements: [
//                                                                    {
//                                                                        title: "Do you want to hit or Stand",
//                                                                        buttons: [
//                                                                            {
//                                                                                type: "postback",
//                                                                                title: "HIT",
//                                                                                payload: "hit"
//                                                                            },
//                                                                            {
//                                                                                type: "postback",
//                                                                                title: "STAND",
//                                                                                payload: "stand"
//                                                                            }
//
//                                                                        ]
//                                                                    }
//                                                                ]
//                                                            }
//                                                        }
//                                                    });
//                                            } else {
//                                                console.log(response);
//                                                bot.reply(message, "Please type play to join a table");
//                                            }
//                                        });
//
//                                    }
//                                });
//                            }
//                        });
//
//                    }
//                });
//            });
//            break
//        case '2':
//            //call function to perform stand operation
//            controller.storage.users.get(message.user, function (err, user) {
//                if (!user) {
//                    user = {
//                        id: message.user,
//                    };
//                }
//                console.log(playerId);
//                client.joinTable(user.playerId, 2, function (response) {
//                    if (response.player.busted == false) {
//                        bot.reply(message, "You are  on Table 2 with id" + playerId)
//                        bot.reply(message, "You have credit of " + response.player.credits + "$")
//                        bot.startConversation(message, function (err, convo) {
//                            if (!err) {
//                                convo.ask('How much do want to bet?', function (response, convo) {
//                                    convo.ask('You want me to call you ' + response.text + '? (yes/no)', [{
//                                        pattern: 'yes',
//                                        callback: function (response, convo) {
//                                            console.log(response.text);
//                                            var text = response.text;
//                                            var amt = text.replace(/\D+/g, '');
//                                            console.log("amount bet ==>" + amt);
//                                            // since no further messages are queued after this,
//                                            // the conversation will end naturally with status == 'completed'
//                                            convo.next();
//                                        }
//                                    }, {
//                                        pattern: 'no',
//                                        callback: function (response, convo) {
//                                            // stop the conversation. this will cause it to end with status == 'stopped'
//                                            convo.repeat();
//                                            convo.next();
//                                        }
//                                    }, {
//                                        default: true,
//                                        callback: function (response, convo) {
//                                            convo.repeat();
//                                            convo.next();
//                                        }
//                                    }]);
//                                    convo.next();
//                                }); // store the results in a field called nickname
//
//                                convo.on('end', function (convo) {
//                                    if (convo.status == 'completed') {
//                                        controller.storage.users.get(message.user, function (err, user) {
//                                            if (!user) {
//                                                user = {
//                                                    id: message.user,
//                                                };
//                                            }
//                                            message.money -= 100;
//                                            controller.storage.users.save(user, function (err, id) {
//                                                client.bet(user.playerId, 100, function (response) {
//                                                    if (response.success === true) {
//                                                        displayHands(response, message, bot, user.playerId, _);
//                                                        bot.reply(message,
//                                                            {
//                                                                attachment: {
//                                                                    type: "template",
//                                                                    payload: {
//                                                                        template_type: "generic",
//                                                                        elements: [
//                                                                            {
//                                                                                title: "Do you want to hit or Stand",
//                                                                                buttons: [
//                                                                                    {
//                                                                                        type: "postback",
//                                                                                        title: "HIT",
//                                                                                        payload: "hit"
//                                                                                    },
//                                                                                    {
//                                                                                        type: "postback",
//                                                                                        title: "STAND",
//                                                                                        payload: "stand"
//                                                                                    }
//                                                                                    , {
//                                                                                        type: "postback",
//                                                                                        title: "Insurance",
//                                                                                        payload: "insure"
//                                                                                    }
//                                                                                ]
//                                                                            }
//                                                                        ]
//                                                                    }
//                                                                }
//                                                            });
//                                                    } else {
//                                                        console.log(response);
//                                                        bot.reply(message, "Please type play to join a table");
//                                                    }
//                                                });
//                                            });
//                                        });
//                                    }
//                                });
//                            }
//                        });
//
//                    }
//                });
//            });
//            break
//        case '3':
//            //call function to perform stand operation
//            controller.storage.users.get(message.user, function (err, user) {
//                if (!user) {
//                    user = {
//                        id: message.user,
//                    };
//                }
//                console.log(playerId);
//                client.joinTable(user.playerId, 3, function (response) {
//                    if (response.player.busted == false) {
//                        bot.reply(message, "You are  on Table 3 with id" + playerId)
//                        bot.reply(message, "You have credit of " + response.player.credits + "$")
//                        bot.startConversation(message, function (err, convo) {
//                            if (!err) {
//                                convo.ask('How much do want to bet?', function (response, convo) {
//                                    convo.ask('You want me to call you ' + response.text + '? (yes/no)', [{
//                                        pattern: 'yes',
//                                        callback: function (response, convo) {
//                                            console.log(response.text);
//                                            var text = response.text;
//                                            var amt = text.replace(/\D+/g, '');
//                                            console.log("amount bet ==>" + amt);
//                                            // since no further messages are queued after this,
//                                            // the conversation will end naturally with status == 'completed'
//                                            convo.next();
//                                        }
//                                    }, {
//                                        pattern: 'no',
//                                        callback: function (response, convo) {
//                                            // stop the conversation. this will cause it to end with status == 'stopped'
//                                            convo.repeat();
//                                            convo.next();
//                                        }
//                                    }, {
//                                        default: true,
//                                        callback: function (response, convo) {
//                                            convo.repeat();
//                                            convo.next();
//                                        }
//                                    }]);
//                                    convo.next();
//                                }); // store the results in a field called nickname
//
//                                convo.on('end', function (convo) {
//                                    if (convo.status == 'completed') {
//                                        controller.storage.users.get(message.user, function (err, user) {
//                                            if (!user) {
//                                                user = {
//                                                    id: message.user,
//                                                };
//                                            }
//                                            message.money -= 100;
//                                            controller.storage.users.save(user, function (err, id) {
//                                                client.bet(user.playerId, 100, function (response) {
//                                                    if (response.success === true) {
//                                                        displayHands(response, message, bot, user.playerId, _);
//                                                        bot.reply(message,
//                                                            {
//                                                                attachment: {
//                                                                    type: "template",
//                                                                    payload: {
//                                                                        template_type: "generic",
//                                                                        elements: [
//                                                                            {
//                                                                                title: "Do you want to hit or Stand",
//                                                                                buttons: [
//                                                                                    {
//                                                                                        type: "postback",
//                                                                                        title: "HIT",
//                                                                                        payload: "hit"
//                                                                                    },
//                                                                                    {
//                                                                                        type: "postback",
//                                                                                        title: "STAND",
//                                                                                        payload: "stand"
//                                                                                    }
//                                                                                    , {
//                                                                                        type: "postback",
//                                                                                        title: "Insurance",
//                                                                                        payload: "insure"
//                                                                                    }
//                                                                                ]
//                                                                            }
//                                                                        ]
//                                                                    }
//                                                                }
//                                                            });
//                                                    } else {
//                                                        console.log(response);
//                                                        bot.reply(message, "Please type play to join a table");
//                                                    }
//                                                });
//                                            });
//                                        });
//                                    }
//                                });
//                            }
//                        });
//
//                    }
//                });
//
//            });
//            break
//        case '4':
//            //call function to perform stand operation
//            controller.storage.users.get(message.user, function (err, user) {
//                if (!user) {
//                    user = {
//                        id: message.user,
//                    };
//                }
//                console.log(playerId);
//                client.joinTable(user.playerId, 4, function (response) {
//                    if (response.player.busted == false) {
//                        bot.reply(message, "You are  on Table 4 with id" + playerId)
//                        bot.reply(message, "You have credit of " + response.player.credits + "$")
//                        bot.startConversation(message, function (err, convo) {
//                            if (!err) {
//                                convo.ask('How much do want to bet?', function (response, convo) {
//                                    convo.ask('You want me to call you ' + response.text + '? (yes/no)', [{
//                                        pattern: 'yes',
//                                        callback: function (response, convo) {
//                                            console.log(response.text);
//                                            var text = response.text;
//                                            var amt = text.replace(/\D+/g, '');
//                                            console.log("amount bet ==>" + amt);
//                                            // since no further messages are queued after this,
//                                            // the conversation will end naturally with status == 'completed'
//                                            convo.next();
//                                        }
//                                    }, {
//                                        pattern: 'no',
//                                        callback: function (response, convo) {
//                                            // stop the conversation. this will cause it to end with status == 'stopped'
//                                            convo.repeat();
//                                            convo.next();
//                                        }
//                                    }, {
//                                        default: true,
//                                        callback: function (response, convo) {
//                                            convo.repeat();
//                                            convo.next();
//                                        }
//                                    }]);
//                                    convo.next();
//                                }); // store the results in a field called nickname
//
//                                convo.on('end', function (convo) {
//                                    if (convo.status == 'completed') {
//                                        controller.storage.users.get(message.user, function (err, user) {
//                                            if (!user) {
//                                                user = {
//                                                    id: message.user,
//                                                };
//                                            }
//                                            message.money -= 100;
//                                            controller.storage.users.save(user, function (err, id) {
//                                                client.bet(user.playerId, 100, function (response) {
//                                                    if (response.success === true) {
//                                                        displayHands(response, message, bot, user.playerId, _);
//                                                        bot.reply(message,
//                                                            {
//                                                                attachment: {
//                                                                    type: "template",
//                                                                    payload: {
//                                                                        template_type: "generic",
//                                                                        elements: [
//                                                                            {
//                                                                                title: "Do you want to hit or Stand",
//                                                                                buttons: [
//                                                                                    {
//                                                                                        type: "postback",
//                                                                                        title: "HIT",
//                                                                                        payload: "hit"
//                                                                                    },
//                                                                                    {
//                                                                                        type: "postback",
//                                                                                        title: "STAND",
//                                                                                        payload: "stand"
//                                                                                    }
//                                                                                    , {
//                                                                                        type: "postback",
//                                                                                        title: "Insurance",
//                                                                                        payload: "insure"
//                                                                                    }
//                                                                                ]
//                                                                            }
//                                                                        ]
//                                                                    }
//                                                                }
//                                                            });
//                                                    } else {
//                                                        console.log(response);
//                                                        bot.reply(message, "Please type play to join a table");
//                                                    }
//                                                });
//                                            });
//                                        });
//                                    }
//                                });
//                            }
//                        });
//
//                    }
//                });
//
//            });
//            break
//        case '5':
//            //call function to perform stand operation
//            controller.storage.users.get(message.user, function (err, user) {
//                if (!user) {
//                    user = {
//                        id: message.user,
//                    };
//                }
//                console.log(playerId);
//                client.joinTable(user.playerId, 5, function (response) {
//                    if (response.player.busted == false) {
//                        bot.reply(message, "You are  on Table 5 with id" + playerId)
//                        bot.reply(message, "You have credit of " + response.player.credits + "$")
//                        bot.startConversation(message, function (err, convo) {
//                            if (!err) {
//                                convo.ask('How much do want to bet?', function (response, convo) {
//                                    convo.ask('You want me to call you ' + response.text + '? (yes/no)', [{
//                                        pattern: 'yes',
//                                        callback: function (response, convo) {
//                                            console.log(response.text);
//                                            var text = response.text;
//                                            var amt = text.replace(/\D+/g, '');
//                                            console.log("amount bet ==>" + amt);
//                                            // since no further messages are queued after this,
//                                            // the conversation will end naturally with status == 'completed'
//                                            convo.next();
//                                        }
//                                    }, {
//                                        pattern: 'no',
//                                        callback: function (response, convo) {
//                                            // stop the conversation. this will cause it to end with status == 'stopped'
//                                            convo.repeat();
//                                            convo.next();
//                                        }
//                                    }, {
//                                        default: true,
//                                        callback: function (response, convo) {
//                                            convo.repeat();
//                                            convo.next();
//                                        }
//                                    }]);
//                                    convo.next();
//                                }); // store the results in a field called nickname
//
//                                convo.on('end', function (convo) {
//                                    if (convo.status == 'completed') {
//                                        controller.storage.users.get(message.user, function (err, user) {
//                                            if (!user) {
//                                                user = {
//                                                    id: message.user,
//                                                };
//                                            }
//                                            message.money -= 100;
//                                            controller.storage.users.save(user, function (err, id) {
//                                                client.bet(user.playerId, 100, function (response) {
//                                                    if (response.success === true) {
//                                                        displayHands(response, message, bot, user.playerId, _);
//                                                        bot.reply(message,
//                                                            {
//                                                                attachment: {
//                                                                    type: "template",
//                                                                    payload: {
//                                                                        template_type: "generic",
//                                                                        elements: [
//                                                                            {
//                                                                                title: "Do you want to hit or Stand",
//                                                                                buttons: [
//                                                                                    {
//                                                                                        type: "postback",
//                                                                                        title: "HIT",
//                                                                                        payload: "hit"
//                                                                                    },
//                                                                                    {
//                                                                                        type: "postback",
//                                                                                        title: "STAND",
//                                                                                        payload: "stand"
//                                                                                    }
//                                                                                    , {
//                                                                                        type: "postback",
//                                                                                        title: "Insurance",
//                                                                                        payload: "insure"
//                                                                                    }
//                                                                                ]
//                                                                            }
//                                                                        ]
//                                                                    }
//                                                                }
//                                                            });
//                                                    } else {
//                                                        console.log(response);
//                                                        bot.reply(message, "Please type play to join a table");
//                                                    }
//                                                });
//                                            });
//                                        });
//                                    }
//                                });
//                            }
//                        });
//
//                    }
//                });
//
//            });
//            break
//        case '6':
//            //call function to perform stand operation
//            controller.storage.users.get(message.user, function (err, user) {
//                if (!user) {
//                    user = {
//                        id: message.user,
//                    };
//                }
//                console.log(playerId);
//                client.joinTable(user.playerId, 6, function (response) {
//                    if (response.player.busted == false) {
//                        bot.reply(message, "You are  on Table 6 with id" + playerId)
//                        bot.reply(message, "You have credit of " + response.player.credits + "$")
//                        bot.startConversation(message, function (err, convo) {
//                            if (!err) {
//                                convo.ask('How much do want to bet?', function (response, convo) {
//                                    convo.ask('You want me to call you ' + response.text + '? (yes/no)', [{
//                                        pattern: 'yes',
//                                        callback: function (response, convo) {
//                                            console.log(response.text);
//                                            var text = response.text;
//                                            var amt = text.replace(/\D+/g, '');
//                                            console.log("amount bet ==>" + amt);
//                                            // since no further messages are queued after this,
//                                            // the conversation will end naturally with status == 'completed'
//                                            convo.next();
//                                        }
//                                    }, {
//                                        pattern: 'no',
//                                        callback: function (response, convo) {
//                                            // stop the conversation. this will cause it to end with status == 'stopped'
//                                            convo.repeat();
//                                            convo.next();
//                                        }
//                                    }, {
//                                        default: true,
//                                        callback: function (response, convo) {
//                                            convo.repeat();
//                                            convo.next();
//                                        }
//                                    }]);
//                                    convo.next();
//                                }); // store the results in a field called nickname
//
//                                convo.on('end', function (convo) {
//                                    if (convo.status == 'completed') {
//                                        controller.storage.users.get(message.user, function (err, user) {
//                                            if (!user) {
//                                                user = {
//                                                    id: message.user,
//                                                };
//                                            }
//                                            message.money -= 100;
//                                            controller.storage.users.save(user, function (err, id) {
//                                                client.bet(user.playerId, 100, function (response) {
//                                                    if (response.success === true) {
//                                                        displayHands(response, message, bot, user.playerId, _);
//                                                        bot.reply(message,
//                                                            {
//                                                                attachment: {
//                                                                    type: "template",
//                                                                    payload: {
//                                                                        template_type: "generic",
//                                                                        elements: [
//                                                                            {
//                                                                                title: "Do you want to hit or Stand",
//                                                                                buttons: [
//                                                                                    {
//                                                                                        type: "postback",
//                                                                                        title: "HIT",
//                                                                                        payload: "hit"
//                                                                                    },
//                                                                                    {
//                                                                                        type: "postback",
//                                                                                        title: "STAND",
//                                                                                        payload: "stand"
//                                                                                    }
//                                                                                    , {
//                                                                                        type: "postback",
//                                                                                        title: "Insurance",
//                                                                                        payload: "insure"
//                                                                                    }
//                                                                                ]
//                                                                            }
//                                                                        ]
//                                                                    }
//                                                                }
//                                                            });
//                                                    } else {
//                                                        console.log(response);
//                                                        bot.reply(message, "You do not have enough credit or table did not accept you bet");
//                                                        bot.reply(message, "Please type play to join a table");
//                                                    }
//                                                });
//                                            });
//                                        });
//                                    }
//                                });
//                            }
//                        });
//                    }
//                });
//
//            });
//            break
//    }
//});


//controller.hears(['(.*)play(.*)', 'start', 'can we start?', 'Hallo', 'Give me a card', 'new game', 'hello'], 'message_received', function (bot, message) {
//    controller.storage.users.get(message.user, function (err, user) {
//        if (user && user.name) {
//            bot.reply(message, 'Hello ' + user.name + '!!');
//            bot.reply(message, 'Welcome back');
//            bot.reply(message, 'You have ' + user.money + '$');
//            bot.reply(message,
//                {
//                    attachment: {
//                        type: "template",
//                        payload: {
//                            template_type: "generic",
//                            elements: [
//                                {
//                                    title: "Would you like to play a round?",
//                                    buttons: [
//                                        {
//                                            type: "postback",
//                                            title: "YES",
//                                            payload: "yes"
//                                        },
//                                        {
//                                            type: "postback",
//                                            title: "NO",
//                                            payload: "no"
//                                        }
//                                    ]
//                                }
//                            ]
//                        }
//                    }
//                }
//            );
//        } else {
//            bot.reply(message, 'Hi, my name is Pepper and I am your Black Jack Dealer.!');
//            bot.startConversation(message, function (err, convo) {
//                if (!err) {
//                    convo.ask('What should I call you?', function (response, convo) {
//                        convo.ask('You want me to call you ' + response.text + '? (yes/no)', [{
//                            pattern: 'yes',
//                            callback: function (response, convo) {
//                                // since no further messages are queued after this,
//                                // the conversation will end naturally with status == 'completed'
//                                convo.next();
//                            }
//                        }, {
//                            pattern: 'no',
//                            callback: function (response, convo) {
//                                // stop the conversation. this will cause it to end with status == 'stopped'
//                                convo.stop();
//                            }
//                        }, {
//                            default: true,
//                            callback: function (response, convo) {
//                                convo.repeat();
//                                convo.next();
//                            }
//                        }]);
//
//                        convo.next();
//
//                    }, {
//                        'key': 'nickname'
//                    }); // store the results in a field called nickname
//
//                    convo.on('end', function (convo) {
//                        if (convo.status == 'completed') {
//                            controller.storage.users.get(message.user, function (err, user) {
//                                if (!user) {
//                                    user = {
//                                        id: message.user,
//                                    };
//                                }
//                                var history = [];
//                                user.name = convo.extractResponse('nickname');
//                                user.money = 0;
//                                user.history = history;
//                                user.lastdate = "";
//
//                                controller.storage.users.save(user, function (err, id) {
//                                    bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
//                                    bot.reply(message,
//                                        {
//                                            attachment: {
//                                                type: "template",
//                                                payload: {
//                                                    template_type: "generic",
//                                                    elements: [
//                                                        {
//                                                            title: "Would you like to play a round?",
//                                                            buttons: [
//                                                                {
//                                                                    type: "postback",
//                                                                    title: "YES",
//                                                                    payload: "yes"
//                                                                },
//                                                                {
//                                                                    type: "postback",
//                                                                    title: "NO",
//                                                                    payload: "no"
//                                                                }
//                                                            ]
//                                                        }
//                                                    ]
//                                                }
//                                            }
//                                        }
//                                    );
//                                });
//                            });
//                        } else {
//                            // this happens if the conversation ended prematurely for some reason
//                            bot.reply(message, 'OK, nevermind!');
//
//                        }
//                    });
//                }
//            });
//
//        }
//    });
//})

//controller.on('facebook_optin', function (bot, message) {
//    bot.reply(message, "Welcome to Blackjack ...");
//    bot.reply(message, 'Hi, my name is Pepper and I am your Black Jack Dealer.!');
//});
//controller.hears(['(.*)(Lets) (.*)go(.*)'], 'message_received', function (bot, message) {
//    bot.reply(message, "Great, there you are – do you remember where we left off? – Just scroll" +
//        " above to check or type ,new game“…");
//    return false;
//});
//controller.hears(['With how many card games do we play'], 'message_received', function (bot, message) {
//    bot.reply(message, "We play with 2 decks of cards. That is less than in the typical casino" +
//        " and means your chances to win are higher!");
//    return false;
//});
//controller.hears(['are you hot?'], 'message_received', function (bot, message) {
//    bot.reply(message, "Definitely this is a picture of me , but i'm hear to play blackjack with you");
//    bot.reply(message, {
//        attachment: {
//            type: 'image',
//            payload: {
//                title: 'hi',
//                url: 'http://i.imgur.com/1WuDC6y.jpg'
//            }
//        }
//    })
//
//
//    return false;
//});
//controller.hears(['rules', '(.*)talk(.*)'], 'message_received', function (bot, message) {
//    var text = "BlackJackBot  :You always play again  not against other players. At the beginning of the game each player
// gets two cards face up, while " + botName + " gets one card face up and one card face down. In order to win you have to get a higher hand
// than, but not exceeding 21. Number cards count for their face value while face cards all count for 10. An ace can count as either 1 or 11.
// If a players total is below 21 he can choose to  hit. If a player has a total of 21 he wins, unless   also has 21. If a player has a total of
// more than 21 he busts and loses, same goes for " + botName + ". After each player has finished their hand " + botName + " will turn over his
// face down card and either hit or stand.Additionally, if a players first two cards are a pair he can  split them and expand them to two separate
// hands.";
//    sendmessage(bot, message, text);
//});
//controller.hears(['data'], 'message_received', function (bot, message) {
//    var text = "BlackJackBot available  commands: help, rules, join, leave, start, bet, hand, surrender, hit, stand, split, doubleDown The game is a 3-2 payout soft bet and stand till 17";
//
//    controller.storage.users.get(message.user, function (err, user) {
//        if (!user) {
//            user = {
//                id: message.user,
//            };
//        }
//        user.playerId = 5;
//        user.name = "Testing";
//        //user.money = response.playerId;
//
//        var now = new Date();
//        var date = dateFormat(now, "dddd, mmmm dS, yyyy, h:MM:ss TT");
//        user.lastdate = date;
//        var history = user.history;
//        var historydata = {
//            time: date,
//            money: 356
//        };
//        history.push(historydata);
//        console.log(history);
//        user.history = history;
//        controller.storage.users.save(user, function (err, id) {
//        })
//    });
//
//
//    sendmessage(bot, message, text);
//});
//controller.hears(['(.*)score(.*)'], 'message_received', function (bot, message) {
//    controller.storage.users.get(message.user, function (err, user) {
//        if (!user) {
//            user = {
//                id: message.user,
//            };
//        }
//        var text = user.history;
//
//        //
//        //Step(
//        //    function (bot, message) {
//        //        bot.reply(message, "Total amount of money you have is " + text.money)
//        //    },
//        //    function (bot, message) {
//        //        bot.reply(message, "You have played the game " + text.length + " times")
//        //    }
//        //    ,
//        //    function (bot, message) {
//        //        bot.reply(message, "and below is your score history:")
//        //
//        //    },
//        //    function (bot, message, _, text) {
//        //        _.forEach(text, function (c) {
//        //            bot.reply(message, "Date:" + c.time + " Credit won :" + c.money);
//        //        })
//        //    }
//        //)
//
//        bot.reply(message, "Total amount of money you have is " + user.money);
//        bot.reply(message, "The last time you played the game was " + user.lastdate);
//        bot.reply(message, "You have played the game " + text.length + " times");
//        bot.reply(message, "and below is your score history:");
//        _.forEach(text, function (c) {
//            bot.reply(message, "Date:" + c.time + " Credit won :" + c.money);
//        });
//        //sendmessage(bot, message, text);
//
//    });
//});