// Main Firefox entry point

// Import the page-mod API
var self = require("sdk/self"),
    pageMod = require("sdk/page-mod");

// Create a page mod
// It will run a script whenever a ".org" URL is loaded
// The script replaces the page contents with a message
pageMod.PageMod({
    include: "*.launchpad.net",
    contentScriptFile: [
        self.data.url("contrib/jquery-2.1.1.min.js"),
        self.data.url("contrib/jquery.cluetip.min.js"),
        self.data.url("contrib/moment.js"),
        self.data.url("lphelper.js")
    ],
    contentStyleFile: [
        self.data.url("contrib/jquery.cluetip.css"),
        self.data.url("style.css")
    ]
});
