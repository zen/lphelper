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

var calculateImportanceFromLastUpdated = function(last_updated) {
    var now = moment(),
        diff = now.diff(moment(last_updated)) / 1000;

    for(var i = 0; i < bugLastUpdatedImportanceClasses.length; i++) {
        var obj = bugLastUpdatedImportanceClasses[i];
        if (diff >= obj.olderThan.asSeconds()) {
            return obj.importance;
        }
    }
};

var importanceClass = function(importance) {
    if (importance) {
        return 'importance' + importance.toUpperCase();
    }

    return '';
};
var importanceSpan = function(contents, importance) {
    return '<span class="' + importanceClass(importance) + '">' + contents + '</span>';
};
var clearLastUpdatedSpan = function($el) {
    $el.find('.js-lphelper-last-updated').remove();
};
var lastUpdatedSpan = function(response) {
    var importance = importanceClass(calculateImportanceFromLastUpdated(response.date_last_updated)),
        $innerSpan = $('<span class="js-lphelper-inner ' + importance + '">[Last updated: ' + moment(response.date_last_updated).fromNow() + ']</span>'),
        $el = $('<span class="js-lphelper-last-updated"></span>');
    $el.append($innerSpan);
    $el.append('<span>&nbsp;&nbsp;&nbsp;</span>');

    return $el;
};

var bugNumberFromLink = function(url) {
    var match = (url || '').match(/^.*\+bug\/(\d+).*/);

    return match && match[1];
};
var makeUserLink = function(username) {
    return '<a href="http://launchpad.net/~' + username + '">' + username + '</a>';
};
var usernameFromLink = function(url) {
    return (url || '').replace('https://launchpad.net/~', '')
        .replace('https://api.launchpad.net/1.0/~', '');
};

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

var bugCluetip = function() {
    var $el = $(this),
        $ela = $el.attr('href') ? $el : $el.find('a'),
        bugnumber = bugNumberFromLink($ela.attr('href')),
        url = APIUrl + 'bugs/' + bugnumber;

    if ((bugnumber === null) || (bugnumber == currentBugNumber)) {
        return;
    }

    $.ajax({
        method: 'GET',
        url: url,
        headers: {'Content-Type': 'application/json'},
        cache: true
    }).done(function(response) {
        $.ajax({
            method: 'GET',
            url: response.bug_tasks_collection_link,
            headers: {'Content-Type': 'application/json'},
            cache: true
        }).done(function(responseBugTasks) {
            var opts = cluetipOptions();
            opts.width = 600;
            opts.showTitle = true;

            var assignees = $.map(responseBugTasks.entries, function(entry) {
                var assignee = usernameFromLink(entry.assignee_link);
                if (assignee) {
                    assignee = makeUserLink(assignee);
                } else {
                    assignee = 'None';
                }

                return assignee + ' ' + importanceSpan('[' + entry.bug_target_name + ']', entry.importance);
            });
            var owner = usernameFromLink(response.owner_link);
            var title = 'Bug ' + bugnumber + '<br /> Owner: ' + makeUserLink(owner) + '<br /> Assignees: ' + assignees.join(', ');
            var description = response.description.replace(/\n/g, '<br />');
            description = urlify(description);

            $ela.attr('title', title + '|' + description);
            $ela.cluetip(opts);

            clearLastUpdatedSpan($ela);
            var $lastUpdatedSpan = lastUpdatedSpan(response);
            $ela.prepend($lastUpdatedSpan);
        });
    });
};

var personCluetip = function() {
    var $el = $(this),
        href = $el.attr('href'),
        username = usernameFromLink(href),
        url = APIUrl + '~' + username + '/super_teams';

    $.ajax({
        method: "GET",
        url: url,
        headers: {'Content-Type': 'application/json'},
        cache: true
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
        $el.trigger('showCluetip');
    }).fail(function(r) {
        console.log('error', r.status, r.statusText);
    });
};


currentBugNumber = bugNumberFromLink(window.location.href);


$(document).ready(function() {
    var subscribersPollNum = 0;

    // Person info
    $(document).find('a.sprite.person').one('mouseenter', personCluetip);

    // Persons are also fetched later (for example: subscribers on the bug page)
    // So we poll for them a couple of times
    var findSubscribers = function() {
        var $elems = $(document).find('a:has(.sprite.person)');

        if($elems.length > 0) {
            $elems.one('mouseenter', personCluetip);
        } else {
            subscribersPollNum++;
            if (subscribersPollNum < 10) {
                setTimeout(findSubscribers, 1000);
            }
        }
    };
    findSubscribers();


    // Bug info
    $(document).find('.buglisting-row .buginfo').each(bugCluetip);
    $(document).find('a[href*="bugs.launchpad.net"]').each(bugCluetip);
});
