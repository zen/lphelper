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

var urlRe = /(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*))/g;

var urlify = function(str) {
    return str.replace(urlRe, function(s) {
        // Remove endings that usually break urls
        var badEndings = ['.', ',', ';'],
            ending = '';

        if (badEndings.indexOf(s.slice(-1)) > -1) {
            ending = s.slice(-1);
            s = s.slice(0, -1);
        }

        return '<a href="' + s + '">' + s + '</a>' + ending;
    });
};

var cluetipOptions = function() {
    return {
        splitTitle: '|',
        showTitle: false,
        sticky: true,
        hoverIntent: false,
        mouseOutClose: true
    };
};

$(document).ready(function() {
    // Person info
    $(document).find('a.sprite.person')
        .each(function() {
            var $el = $(this),
                href = $el.attr('href'),
                username = href.replace('https://launchpad.net/~', ''),
                url = APIUrl + '~' + username + '/super_teams';

            $.ajax({
                method: "GET",
                url: url,
                headers: {'Content-Type': 'application/json'}
            }).done(function(response) {
                var teams = [];

                response.entries.sort(function(e1, e2) {
                    return e1.display_name.localeCompare(e2.name);
                });
                teams = $.map(response.entries, function(entry) {
                    return '<a href="' + entry.web_link + '">' + entry.display_name + '</a>';
                });
                $el.attr('title', teams.join('<br />'));
                $el.cluetip(cluetipOptions());
            }).fail(function(r) {
                console.log('error', r.status, r.statusText);
            });
        });

    // Bug info
    $(document).find('.buglisting-row .buginfo')
        .each(function() {
            var $el = $(this),
                $ela = $el.find('a'),
                bugnumber = $el.find('.bugnumber').text().replace('#', ''),
                url = APIUrl + 'bugs/' + bugnumber;

            $.ajax({
                method: 'GET',
                url: url,
                headers: {'Content-Type': 'application/json'}
            }).done(function(response) {
                var opts = cluetipOptions();
                opts.width = 600;

                var description = response.description.replace(/\n/g, '<br />');
                description = urlify(description);

                $ela.attr('title', description);
                $ela.cluetip(opts);
            });
        });
});
