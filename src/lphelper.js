// ==UserScript==
// @name        lpPerson
// @namespace   lphelper
// @include     https://bugs.launchpad.net*
// @require     http://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js
// @require     http://ajax.googleapis.com/ajax/libs/jqueryui/1.11.2/jquery-ui.min.js
// @resource    jQueryUICSS   http://ajax.googleapis.com/ajax/libs/jqueryui/1.11.2/themes/smoothness/jquery-ui.css
// @version     1
// @grant       none
// ==/UserScript==

//var APIDomain = 'api.launchpad.net';
var APIDomain = 'lphelper.intrepidus.pl';
var APIUrl = 'https://' + APIDomain + '/1.0/';

var dialogs = [];

$(document).ready(function() {
    $(document).find('a.sprite.person')
        .each(function(idx) {
            var $el = $(this),
                $dialog = $('<span></span>'),
                href = $el.attr('href'),
                username = href.replace('https://launchpad.net/~', ''),
                url = APIUrl + '~' + username + '/super_teams',
                teams = [],
                obj = {$dialog: $dialog, pos: {}, size: {}, open: false};

            $.ajax({
                method: "GET",
                url: url,
                headers: {'Content-Type': 'application/json'}
            })
            .done(function(response) {
                teams = $.map(response.entries, function(entry) {
                    return entry.display_name;
                });
                $el.attr('title', teams.join('|'));
                console.log($el.attr('title'));
                $el.cluetip({
                    splitTitle: '|',
                    showTitle: false,
                    sticky: true,
                    hoverIntent: false,
                    mouseOutClose: true
                });
            })
            .fail(function(r) {
                console.log('error', r.status, r.statusText);
            });
        });
});
