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

var APIDomain = 'api.launchpad.net';
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
                obj = {$dialog: $dialog, pos: {}, size: {}, open: false};

            $.ajax({
                method: "GET",
                url: url,
                headers: {'Content-Type': 'application/json'}
            })
            .done(function(response) {
                var teams = [];

                response.entries.sort(function(e1, e2) {
                    return e1.display_name.localeCompare(e2.name);
                });
                teams = $.map(response.entries, function(entry) {
                    return '<a href="' + entry.web_link + '">' + entry.display_name + '</a>';
                });
                $el.attr('title', teams.join('<br />'));
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
