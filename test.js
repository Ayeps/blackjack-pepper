/**
 * Created by Softmasters on 8/10/2016.
 */
//var Client = require('node-rest-client').Client;
//var client = new Client();
var dateFormat = require('dateformat')
var is = require('is2')

var now = new Date();
//var date = dateFormat(now, "dddd, mmmm dS, yyyy");
var date2 = dateFormat(now, "dddd, mmmm dS, yyyy");


console.log(new Date(dateFormat("2016-08-23", "yyyy-mm-d")));
console.log(new Date("2016-08-23"));
if (new Date("2016-08-23") == new Date("2016-08-23")) {
    var date = dateFormat(now, "dddd, mmmm dS, yyyy, h:MM:ss TT");
    console.log("true " + date);
}
else {
    console.log("false " + date2);
}

console.log(is.matching(new Date("2016-08-23"), new Date("2016-08-23")))

//client.get("https://api.chucknorris.io/jokes/random", function (data, response) {
//
//    console.log(data);
//});
