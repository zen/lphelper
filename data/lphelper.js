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
var currentBugNumber;

var bugLastUpdatedImportanceClasses = [
    {olderThan: moment.duration(1, 'month'), importance: 'critical'},
    {olderThan: moment.duration(2, 'weeks'), importance: 'high'},
    {olderThan: moment.duration(1, 'week'), importance: 'medium'}
];

var calculateImportanceFromLastUpdated = function (last_updated) {
    var now = moment(),
        diff = now.diff(moment(last_updated)) / 1000;

    for (var i = 0; i < bugLastUpdatedImportanceClasses.length; i++) {
        var obj = bugLastUpdatedImportanceClasses[i];
        if (diff >= obj.olderThan.asSeconds()) {
            return obj.importance;
        }
    }
};

var HTMLHelpers = {
    importanceClass: function (importance) {
        if (importance) {
            return 'importance' + importance.toUpperCase();
        }

        return '';
    },
    importanceSpan: function (contents, importance) {
        return '<span class="' + HTMLHelpers.importanceClass(importance) + '">' + contents + '</span>';
    },
    clearLastUpdatedSpan: function ($el) {
        $el.find('.js-lphelper-last-updated').remove();
    },
    lastUpdatedSpan: function (response) {
        var importance = HTMLHelpers.importanceClass(calculateImportanceFromLastUpdated(response.date_last_updated)),
            $innerSpan = $('<span class="js-lphelper-inner ' + importance + '">[Last updated: ' + moment(response.date_last_updated).fromNow() + ']</span>'),
            $el = $('<span class="js-lphelper-last-updated"></span>');
        $el.append($innerSpan);
        $el.append('<span>&nbsp;&nbsp;&nbsp;</span>');

        return $el;
    },

    urlRe: /(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*))/g,
    urlify: function (str) {
        return str.replace(HTMLHelpers.urlRe, function (s) {
            // Remove endings that usually break urls
            var badEndings = ['.', ',', ';'],
                ending = '';

            if (badEndings.indexOf(s.slice(-1)) > -1) {
                ending = s.slice(-1);
                s = s.slice(0, -1);
            }

            return '<a href="' + s + '">' + s + '</a>' + ending;
        });
    }
};

var URLHelpers = {
    bugNumberFromURL: function (url) {
        var match = (url || '').match(/^.*\+bug\/(\d+).*/);

        return match && match[1];
    },
    makeUserURL: function (username) {
        return '<a href="http://launchpad.net/~' + username + '">' + username + '</a>';
    },
    usernameFromURL: function (url) {
        return (url || '').replace('https://launchpad.net/~', '')
            .replace('https://api.launchpad.net/1.0/~', '');
    }
};

var cluetipOptions = function () {
    return {
        splitTitle: '|',
        showTitle: true,
        sticky: true,
        hoverIntent: false,
        mouseOutClose: true
    };
};

var CluetipFunctions = {
    bug: function () {
        var $el = $(this),
            $ela = $el.attr('href') ? $el : $el.find('a'),
            bugnumber = URLHelpers.bugNumberFromURL($ela.attr('href')),
            url = APIUrl + 'bugs/' + bugnumber;

        if ((bugnumber === null) || (bugnumber == currentBugNumber)) {
            return;
        }

        $.ajax({
            method: 'GET',
            url: url,
            headers: {'Content-Type': 'application/json'},
            cache: true
        }).done(function (response) {
            HTMLHelpers.clearLastUpdatedSpan($ela);
            var $lastUpdatedSpan = HTMLHelpers.lastUpdatedSpan(response);
            $ela.prepend($lastUpdatedSpan);

            // Save on requests, fetch tasks lazily
            $ela.one('mouseenter', function () {
                $.ajax({
                    method: 'GET',
                    url: response.bug_tasks_collection_link,
                    headers: {'Content-Type': 'application/json'},
                    cache: true
                }).done(function (responseBugTasks) {
                    var opts = cluetipOptions();
                    opts.width = 600;

                    var assignees = $.map(responseBugTasks.entries, function (entry) {
                        var assignee = URLHelpers.usernameFromURL(entry.assignee_link);
                        if (assignee) {
                            assignee = URLHelpers.makeUserURL(assignee);
                        } else {
                            assignee = 'None';
                        }

                        return assignee + ' ' + HTMLHelpers.importanceSpan('[' + entry.bug_target_name + ']', entry.importance);
                    });
                    var owner = URLHelpers.usernameFromURL(response.owner_link);
                    var title = 'Bug ' + bugnumber + '<br /> Owner: ' + URLHelpers.makeUserURL(owner) + '<br /> Assignees: ' + assignees.join(', ');
                    var description = response.description.replace(/\n/g, '<br />');
                    description = HTMLHelpers.urlify(description);

                    $ela.attr('title', title + '|' + description);
                    $ela.cluetip(opts);
                    $ela.trigger('showCluetip');
                });
            });
        });
    },

    person: function () {
        var $el = $(this),
            href = $el.attr('href'),
            username = URLHelpers.usernameFromURL(href),
            url = APIUrl + '~' + username + '/super_teams';

        $.ajax({
            method: "GET",
            url: url,
            headers: {'Content-Type': 'application/json'},
            cache: true
        }).done(function (response) {
            var teams = [];

            response.entries.sort(function (e1, e2) {
                return e1.display_name.localeCompare(e2.name);
            });
            teams = $.map(response.entries, function (entry) {
                return '<a href="' + entry.web_link + '">' + entry.display_name + '</a>';
            });
            $el.attr('title', username + '|' + teams.join('<br />'));
            $el.cluetip(cluetipOptions());
            $el.trigger('showCluetip');
        }).fail(function (r) {
            console.log('error', r.status, r.statusText);
        });
    }
};


currentBugNumber = URLHelpers.bugNumberFromURL(window.location.href);


$(document).ready(function () {
    var subscribersPollNum = 0;

    // Person info
    $(document).find('a.sprite.person').one('mouseenter', CluetipFunctions.person);

    // Persons are also fetched later (for example: subscribers on the bug page)
    // So we poll for them a couple of times
    var findSubscribers = function () {
        var $elems = $(document).find('a:has(.sprite.person)');

        if ($elems.length > 0) {
            $elems.one('mouseenter', CluetipFunctions.person);
        } else {
            subscribersPollNum++;
            if (subscribersPollNum < 10) {
                setTimeout(findSubscribers, 1000);
            }
        }
    };
    findSubscribers();


    // Bug info
    $(document).find('.buglisting-row .buginfo').each(CluetipFunctions.bug);
    $(document).find('a[href*="bugs.launchpad.net"]').each(CluetipFunctions.bug);
});
