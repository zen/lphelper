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
var LaunchpadUrl = 'https://launchpad.net/';
var currentBugNumber;
var markerClass = 'lphelper-marked';

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
    statusClass: function(status) {
        if (status) {
            return 'status' + status.toUpperCase();
        }
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
    },
    formatTooltip: function(title, content) {
        return '<div class="tooltip-title">' + title + '</div>' + '<div class="tooltip-content">' + content + '</div>';
    }
};

var URLHelpers = {
    launchpad: {
        project: function(name) {
            return LaunchpadUrl + name;
        },
        user: function(username) {
            return LaunchpadUrl + '~' + username;
        }
    },
    bugNumberFromURL: function (url) {
        var match = (url || '').match(/^.*\+bug\/(\d+).*/);

        return match && match[1];
    },
    isPersonPage: function() {
        return window.location.href.indexOf(LaunchpadUrl + '~') === 0;
    },
    makeUserURL: function (username) {
        return '<a href="' + URLHelpers.launchpad.user(username) + '">' + username + '</a>';
    },
    usernameFromURL: function (url) {
        return (url || '').replace(LaunchpadUrl + '~', '')
            .replace(LaunchpadUrl + '1.0/~', '');
    }
};

var LaunchpadHelpers = {
    formatBugTaskTitle: function(bugTask) {
         return bugTask.title.replace(/Bug.*?: /, '').replace(/"/g, '');
    }
};

var tooltipsterOptions = function() {
    return {
        contentAsHTML: true,
        interactive: true,
        interactiveTolerance: 1000,
        maxWidth: 600,
        onlyOne: true,
        position: 'right',
        theme: 'tooltipster-light',
        updateAnimation: false
    }
};

var TooltipFunctions = {
    bugTitle: function(bugnumber, owner, assignees) {
        return '<b>Bug:</b> ' + bugnumber +
            '<br /><b>Owner</b>: ' + URLHelpers.makeUserURL(owner) +
            '<br /><b>Assignees</b>: ' + assignees.join(', ');
    },
    formatAssignee: function(entry) {
        var assignee = URLHelpers.usernameFromURL(entry.assignee_link);
        if (assignee) {
            assignee = URLHelpers.makeUserURL(assignee);
        } else {
            assignee = 'None';
        }

        return assignee + ' ' + HTMLHelpers.importanceSpan('[' + entry.bug_target_name + ']', entry.importance);
    },
    bug: function () {
        var $el = $(this),
            $ela = $el.attr('href') ? $el : $el.find('a'),
            bugnumber = URLHelpers.bugNumberFromURL($ela.attr('href')),
            url = APIUrl + 'bugs/' + bugnumber;

        if ((bugnumber === null) || (bugnumber == currentBugNumber) || ($el.hasClass(markerClass))) {
            return;
        }

        $el.addClass(markerClass);

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
                    var opts = tooltipsterOptions();

                    var assignees = $.map(responseBugTasks.entries, TooltipFunctions.formatAssignee);
                    var owner = URLHelpers.usernameFromURL(response.owner_link);
                    var title = TooltipFunctions.bugTitle(bugnumber, owner, assignees);
                    var description = response.description.replace(/\n/g, '<br />');
                    description = HTMLHelpers.urlify(description);

                    $ela.tooltipster(opts);
                    $ela.tooltipster('content', HTMLHelpers.formatTooltip(title, description));
                    $ela.tooltipster('show');
                });
            });
        });
    },

    person: function () {
        var $el = $(this),
            href = $el.attr('href'),
            username = URLHelpers.usernameFromURL(href),
            url = APIUrl + '~' + username + '/super_teams';

        if($el.hasClass(markerClass)) {
            return;
        }

        $el.addClass(markerClass);

        $.ajax({
            method: "GET",
            url: url,
            headers: {'Content-Type': 'application/json'},
            cache: true
        }).done(function (response) {
            var teams, html;

            response.entries.sort(function (e1, e2) {
                return e1.display_name.localeCompare(e2.name);
            });
            teams = $.map(response.entries, function (entry) {
                return '<div><a href="' + entry.web_link + '">' + entry.display_name + '</a></div>';
            });
            html = '<h3>Teams</h3>';
            html += teams.join('');

            $.ajax({
                method: "GET",
                // TODO: urlify the assignee= link
                url: APIUrl + '~' + username + '?ws.op=searchTasks&assignee=https%3A%2F%2Fapi.launchpad.net%2F1.0%2F%7E' + username,
                headers: {'Content-Type': 'application/json'},
                cache: true
            }).done(function(personBugTasks) {
                var bugs = $.map(personBugTasks.entries, TooltipFunctions.personBugTask);
                $el.tooltipster(tooltipsterOptions());
                html += '<h3>Bugs [' + bugs.length + '] (<a href="' + URLHelpers.launchpad.user(username) + '">More details</a>)</h3>';
                html += bugs.join('');
                $el.tooltipster('content', HTMLHelpers.formatTooltip(username, html));
                $el.tooltipster('show');
            });
        }).fail(function (r) {
            console.log('error', r.status, r.statusText);
        });
    },
    personBugTask: function(bugTask) {
        return '<div><a href="' + bugTask.bug_link + '">' + LaunchpadHelpers.formatBugTaskTitle(bugTask) + '</a></div>';
    }
};


var PageHelpers = {
    person: function() {
        var username = URLHelpers.usernameFromURL(window.location.href);
        var $footer = $('#footer');

        return $.ajax({
            method: 'GET',
            url: APIUrl + '~' + username + '?ws.op=searchTasks&assignee=https%3A%2F%2Fapi.launchpad.net%2F1.0%2F%7E' + username,
            headers: {'Content-Type': 'application/json'},
            cache: true
        }).done(function(personBugTasks) {
            var $bugsHtml = $('<div id="bugs-table-listing"></div>');
            var $clientBugs = $('<div id="client-listing"></div>');
            var $listingClientBugs = $('<div id="client-listing"></div>');
            $.each(personBugTasks.entries, function(idx, bugEntry) {
                var bugnumber = URLHelpers.bugNumberFromURL(bugEntry.web_link);
                var $bugRow = $('<div class="buglisting-row"></div>');
                var $bugCol1 = $('<div class="buglisting-col1"></div>');
                var $bugCol2 = $('<div class="buglisting-col2"></div>');
                var $bugInfo = $('<div class="buginfo"></div>');
                var $bugInfoExtra = $('<div class="buginfo-extra"></div>');
                $bugCol1.append('<div class="importance ' + HTMLHelpers.importanceClass(bugEntry.importance) + '">' + bugEntry.importance + '</div>');
                $bugCol1.append('<div class="status ' + HTMLHelpers.statusClass(bugEntry.status) + '">' + bugEntry.status + '</div>');
                $bugCol1.append('<div class="buginfo-extra></div>');

                $bugInfo.append('<span class="bugnumber">#' + bugnumber + '</span> ');
                $bugInfo.append('<a href="' + bugEntry.web_link + '">' + LaunchpadHelpers.formatBugTaskTitle(bugEntry) + '</a>');
                $bugInfoExtra.append('<span class="sprite product field">' + bugEntry.bug_target_display_name + '</span>');
                $bugInfoExtra.append('<span class="bug-heat-icons"></span>');
                $bugInfoExtra.append('<span class="bug-related-icons"></span>');

                $bugCol2.append($bugInfo);
                $bugCol2.append($bugInfoExtra);

                $bugRow.append($bugCol1);
                $bugRow.append($bugCol2);

                $listingClientBugs.append($bugRow);
            });
            $clientBugs.append($listingClientBugs);
            $bugsHtml.append($clientBugs);
            $footer.before('<h2>Bugs [' + personBugTasks.entries.length + ']</h2> ' + $bugsHtml.html());
        });
    }
};


currentBugNumber = URLHelpers.bugNumberFromURL(window.location.href);

var noMarkerClassSelector = function() {
    return ':not(.' + markerClass + ')';
};


var generateTooltips = function() {
    // Person info
    $(document).find('a.sprite.person').filter(noMarkerClassSelector()).one('mouseenter', TooltipFunctions.person);
    $(document).find('a:has(.sprite.person)').filter(noMarkerClassSelector()).one('mouseenter', TooltipFunctions.person);

    // Bug info
    $('#bugs-table-listing').find('.buglisting-row .buginfo').filter(noMarkerClassSelector()).each(TooltipFunctions.bug);
    $(document).find('a[href*="bugs.launchpad.net"]').filter(noMarkerClassSelector()).each(TooltipFunctions.bug);

    setTimeout(generateTooltips, 1000);
};

$(document).ready(function() {
    if(URLHelpers.isPersonPage()) {
        PageHelpers.person().done(generateTooltips);
    } else {
        generateTooltips();
    }
});
