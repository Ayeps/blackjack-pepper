/**
 * @fileOverview
 * Holds the constructor for the Shoe object and contains the ordered deck of
 * cards as well as some other card-related functions.
 */
'use strict';

var is = require('is2');
var _ = require('lodash');
var assert = require('assert');
var MersenneTwister = require('mersenne-twister');
var inspect = require('util').inspect;

// MersenneTwister uses Date().getTime() as a default seed - good enough
var generator = new MersenneTwister();

// an ordered deck of all cards use to create shuffled decks to be dealt from.
var DECK = [
    {suit: 'clubs', rank: 'Ace', value: [1, 10], code: '♣', image: 'http://deckofcardsapi.com/static/img/AC.png'},
    {suit: 'clubs', rank: '2', value: 2, code: '♣', image: 'http://deckofcardsapi.com/static/img/2C.png'},
    {suit: 'clubs', rank: '3', value: 3, code: '♣', image: 'http://deckofcardsapi.com/static/img/3C.png'},
    {suit: 'clubs', rank: '4', value: 4, code: '♣', image: 'http://deckofcardsapi.com/static/img/4C.png'},
    {suit: 'clubs', rank: '5', value: 5, code: '♣', image: 'http://deckofcardsapi.com/static/img/5C.png'},
    {suit: 'clubs', rank: '6', value: 6, code: '♣', image: 'http://deckofcardsapi.com/static/img/6C.png'},
    {suit: 'clubs', rank: '7', value: 7, code: '♣', image: 'http://deckofcardsapi.com/static/img/7C.png'},
    {suit: 'clubs', rank: '8', value: 8, code: '♣', image: 'http://deckofcardsapi.com/static/img/8C.png'},
    {suit: 'clubs', rank: '9', value: 9, code: '♣', image: 'http://deckofcardsapi.com/static/img/9C.png'},
    {suit: 'clubs', rank: '10', value: 10, code: '♣', image: 'http://deckofcardsapi.com/static/img/0C.png'},
    {suit: 'clubs', rank: 'Jack', value: 10, code: '♣', image: 'http://deckofcardsapi.com/static/img/JC.png'},
    {suit: 'clubs', rank: 'Queen', value: 10, code: '♣', image: 'http://deckofcardsapi.com/static/img/QC.png'},
    {suit: 'clubs', rank: 'King', value: 10, code: '♣', image: 'http://deckofcardsapi.com/static/img/KC.png'},

    {suit: 'diamonds', rank: 'Ace', value: [1, 10], code: '♦', image: 'http://deckofcardsapi.com/static/img/AD.png'},
    {suit: 'diamonds', rank: '2', value: 2, code: '♦', image: 'http://deckofcardsapi.com/static/img/2D.png'},
    {suit: 'diamonds', rank: '3', value: 3, code: '♦', image: 'http://deckofcardsapi.com/static/img/3D.png'},
    {suit: 'diamonds', rank: '4', value: 4, code: '♦', image: 'http://deckofcardsapi.com/static/img/4D.png'},
    {suit: 'diamonds', rank: '5', value: 5, code: '♦', image: 'http://deckofcardsapi.com/static/img/5D.png'},
    {suit: 'diamonds', rank: '6', value: 6, code: '♦', image: 'http://deckofcardsapi.com/static/img/6D.png'},
    {suit: 'diamonds', rank: '7', value: 7, code: '♦', image: 'http://deckofcardsapi.com/static/img/7D.png'},
    {suit: 'diamonds', rank: '8', value: 8, code: '♦', image: 'http://deckofcardsapi.com/static/img/8D.png'},
    {suit: 'diamonds', rank: '9', value: 9, code: '♦', image: 'http://deckofcardsapi.com/static/img/9D.png'},
    {suit: 'diamonds', rank: '10', value: 10, code: '♦', image: 'http://deckofcardsapi.com/static/img/0D.png'},
    {suit: 'diamonds', rank: 'Jack', value: 10, code: '♦', image: 'http://deckofcardsapi.com/static/img/JD.png'},
    {suit: 'diamonds', rank: 'Queen', value: 10, code: '♦', image: 'http://deckofcardsapi.com/static/img/QD.png'},
    {suit: 'diamonds', rank: 'King', value: 10, code: '♦', image: 'http://deckofcardsapi.com/static/img/KD.png'},

    {suit: 'hearts', rank: 'Ace', value: [1, 10], code: '♥', image: 'http://deckofcardsapi.com/static/img/HA.png'},
    {suit: 'hearts', rank: '2', value: 2, code: '♥', image: 'http://deckofcardsapi.com/static/img/2H.png'},
    {suit: 'hearts', rank: '3', value: 3, code: '♥', image: 'http://deckofcardsapi.com/static/img/3H.png'},
    {suit: 'hearts', rank: '4', value: 4, code: '♥', image: 'http://deckofcardsapi.com/static/img/4H.png'},
    {suit: 'hearts', rank: '5', value: 5, code: '♥', image: 'http://deckofcardsapi.com/static/img/5H.png'},
    {suit: 'hearts', rank: '6', value: 6, code: '♥', image: 'http://deckofcardsapi.com/static/img/6H.png'},
    {suit: 'hearts', rank: '7', value: 7, code: '♥', image: 'http://deckofcardsapi.com/static/img/7H.png'},
    {suit: 'hearts', rank: '8', value: 8, code: '♥', image: 'http://deckofcardsapi.com/static/img/8H.png'},
    {suit: 'hearts', rank: '9', value: 9, code: '♥', image: 'http://deckofcardsapi.com/static/img/9H.png'},
    {suit: 'hearts', rank: '10', value: 10, code: '♥', image: 'http://deckofcardsapi.com/static/img/0H.png'},
    {suit: 'hearts', rank: 'Jack', value: 10, code: '♥', image: 'http://deckofcardsapi.com/static/img/JH.png'},
    {suit: 'hearts', rank: 'Queen', value: 10, code: '♥', image: 'http://deckofcardsapi.com/static/img/QH.png'},
    {suit: 'hearts', rank: 'King', value: 10, code: '♥', image: 'http://deckofcardsapi.com/static/img/KH.png'},

    {suit: 'spades', rank: 'Ace', value: [1, 10], code: '♠', image: 'http://deckofcardsapi.com/static/img/AS.png'},
    {suit: 'spades', rank: '2', value: 2, code: '♠', image: 'http://deckofcardsapi.com/static/img/2S.png'},
    {suit: 'spades', rank: '3', value: 3, code: '♠', image: 'http://deckofcardsapi.com/static/img/3S.png'},
    {suit: 'spades', rank: '4', value: 4, code: '♠', image: 'http://deckofcardsapi.com/static/img/4S.png'},
    {suit: 'spades', rank: '5', value: 5, code: '♠', image: 'http://deckofcardsapi.com/static/img/5S.png'},
    {suit: 'spades', rank: '6', value: 6, code: '♠', image: 'http://deckofcardsapi.com/static/img/6S.png'},
    {suit: 'spades', rank: '7', value: 7, code: '♠', image: 'http://deckofcardsapi.com/static/img/7S.png'},
    {suit: 'spades', rank: '8', value: 8, code: '♠', image: 'http://deckofcardsapi.com/static/img/8S.png'},
    {suit: 'spades', rank: '9', value: 9, code: '♠', image: 'http://deckofcardsapi.com/static/img/9S.png'},
    {suit: 'spades', rank: '10', value: 10, code: '♠', image: 'http://deckofcardsapi.com/static/img/0S.png'},
    {suit: 'spades', rank: 'Jack', value: 10, code: '♠', image: 'http://deckofcardsapi.com/static/img/JS.png'},
    {suit: 'spades', rank: 'Queen', value: 10, code: '♠', image: 'http://deckofcardsapi.com/static/img/QS.png'},
    {suit: 'spades', rank: 'King', value: 10, code: '♠', image: 'http://deckofcardsapi.com/static/img/KS.png'}
];

// ensure the ordered deck is as expected
assert.ok(is.array(DECK));
assert.ok(DECK.length === 52);

/**
 * Constructor for Shoe, which holds numDecks of shuffled cards for dealing
 * to players and the dealer.
 * @constructor
 * @param {Number} numDecks The number of shuffled decks to place into the shoe.
 */
function Shoe(numDecks) {
    var self = this;
    if (!is.positiveInt(numDecks)) {
        throw new Error('Shoe expects positive int for numDecks, received: ' +
            JSON.stringify(numDecks));
    }

    self.cards = [];     // holds all the cards
    self.maxSize = 0;
    var i;
    for (i = 0; i < numDecks; i++) {
        self.addShuffledDeck();
    }

    // shuffle all the decks
    for (i = 0; i < DECK.length; i++) {
        var target = Math.floor(generator.random() * self.cards.length);
        swap(self.cards, i, target);
    }
}

/**
 * Create a new deck of cards from DECK, then shuffle the new deck and
 * place the newly shuffled cards onto the shoe.
 */
Shoe.prototype.addShuffledDeck = function () {
    var self = this;
    assert.ok(is.array(self.cards));
    assert.ok(is.array(DECK));

    // Create a new deck, with new card objects we want new card objects, in
    // case we decide to alter the cards later.
    var newDeck = new Array(DECK.length);
    var i;
    for (i = 0; i < DECK.length; i++) {
        newDeck[i] = i;
    }

    // shuffle the new deck and place on the shoe
    for (i = 0; i < newDeck.length; i++) {
        var target = Math.floor(generator.random() * newDeck.length);
        swap(newDeck, i, target);
    }

    for (i = 0; i < newDeck.length; i++) {
        self.cards.push(newDeck[i]);
    }

    // increase max size of deck
    self.maxSize += DECK.length;
};

/**
 * Deal a card or cards from the shoe. The card should no longer be in the shoe.
 * @param {Number} [num] Optional number of cards to deal, if not present,
 *     deals 1.
 * @return {NUmber|Number[]} Index into deck or an array of indicies
 */
Shoe.prototype.deal = function (num) {
    var self = this;
    if (is.undefined(num))
        num = 1;

    if (!is.positiveInt(num)) {
        throw new Error('deal expected positiveInt for num, received: ' +
            JSON.stringify(num));
    }

    if (self.cards.length < num)
        throw new Error('Not enough cards to deal');

    if (num === 1)
        return self.cards.shift();

    // case where num > 1
    var cards = [];
    for (var i = 0; i < num; i++)
        cards.push(self.cards.shift());

    return cards;
};

/**
 * True if dealt over 75% of the cards in the deck
 * @return {Boolean} true if past cut point and false otherwise
 */
Shoe.prototype.pastCutPoint = function () {
    var self = this;
    assert.ok(is.array(self.cards));
    var percentLeft = Math.floor((self.cards.length / self.maxSize) * 100);
    if (percentLeft < 25)
        return true;
    return false;
};

/**
 * Convenience function to swap 2 cards in a deck.
 * @param {Object[]} deck The deck in which to swap two cards.
 * @param {Number} card1Idx Index of the first card to be swapped.
 * @param {Number} card2Idx Index of the second card to be swapped.
 */
function swap(deck, card1Idx, card2Idx) {
    assert.ok(is.nonEmptyArray(deck));
    assert.ok(is.int(card1Idx) && card1Idx > -1);
    assert.ok(is.int(card2Idx) && card2Idx > -1);
    assert.ok(deck.length > card1Idx);
    assert.ok(deck.length > card2Idx);

    var tmp = deck[card1Idx];
    deck[card1Idx] = deck[card2Idx];
    deck[card2Idx] = tmp;
}

/**
 * evalHand evaluates a hand, returning numeric values.
 * @param {Object[]} hand set of cards making a hand to evaluate
 * @return {Number} The value for the hand.
 */
function evalHand(hand) {
    assert.ok(is.nonEmptyArray(hand));
    var numAces = _.reduce(hand, function (sum, cardIdx) {
        assert.ok(is.int(cardIdx) && cardIdx > -1);
        var card = getCard(cardIdx);
        assert.ok(is.obj(card));
        assert.ok(is.nonEmptyStr(card.rank));
        if (card.rank.toLowerCase() === 'ace')
            return sum + 1;
        return sum;
    }, 0);

    logger.debug('evalHand: numAces: ' + numAces);
    var score = _.reduce(hand, function (sum, cardIdx) {
        assert.ok(is.int(cardIdx) && cardIdx > -1);
        var card = getCard(cardIdx);
        if (!is.obj(card))
            return sum + 0;
        assert.ok(is.nonEmptyStr(card.rank));
        if (card.rank.toLowerCase() === 'ace')
            return sum + 11;
        return sum + card.value;
    }, 0);
    logger.debug('evalHand: score: ' + score);

    while (score > 21 && numAces) {
        score -= 10;
        numAces--;
    }

    logger.debug('evalHand: return: ' + score);
    return score;
}

/**
 * true if a hand's value is over 21, false otherwise.
 * @param {Object[]} hand An array of cards.
 * @return {Boolean} true if the hand has a value of over 21, false otherwise
 */
function isBusted(hand) {
    assert.ok(is.nonEmptyArray(hand));
    var val = evalHand(hand);
    assert.ok(is.num(val));
    return val > 21 ? true : false;
}

/**
 * true if a dealer's hand is below a hard 17, false otherwise.
 * @param {Object[]} hand An array of cards.
 * @return {Boolean} true, if the hand is below a hard 17, false otherwise
 */
function belowHard17(hand) {
    assert.ok(is.nonEmptyArray(hand));
    logger.debug('belowHard17 hand: ' + inspect(hand));
    var val = evalHand(hand);
    logger.debug('belowHard17 hand val: ' + inspect(val));
    assert.ok(is.num(val));
    return val < 17 ? true : false;
}

/**
 * Determine the score for a hand.
 * @param {Object[]} hand An array of cards.
 * @return {Number} The ineteger value of the hand.
 */
function scoreHand(hand) {
    assert.ok(is.nonEmptyArray(hand));
    var val = evalHand(hand);
    assert.ok(is.num(val));
    return val;
}

/**
 * Get the card object using an index.
 * @param idx The idex of the card in DECK should be 0-51 includive.
 * @return {Object} The card object.
 */
function getCard(idx) {
    if (!is.int(idx) && (idx > 51 || idx < 0)) {
        throw new Error('getCard expected an integer between 0-51, received: ' +
            JSON.stringify(idx));
    }
    assert.ok(DECK.length > idx);
    return DECK[idx];
}

/**
 * Module exports. The interface for this module.
 */
module.exports = {
    belowHard17: belowHard17,
    evalHand: evalHand,
    isBusted: isBusted,
    getCard: getCard,
    scoreHand: scoreHand,
    Shoe: Shoe
};
