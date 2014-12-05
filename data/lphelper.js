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
            url = URLHelpers.launchpadApi.bug(bugnumber);

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
            url = URLHelpers.launchpadApi.userSuperTeams(username);

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
                url: URLHelpers.launchpadApi.userBugTasks(username),
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
            url: URLHelpers.launchpadApi.userBugTasks(username),
            headers: {'Content-Type': 'application/json'},
            cache: true
        }).done(function(personBugTasks) {
            var $bugsHtml = $('<div id="bugs-table-listing"></div>');
            var $clientBugs = $('<div id="client-listing"></div>');
            var $listingClientBugs = $('<div id="client-listing"></div>');
            $.each(personBugTasks.entries, function(idx, bugEntry) {
                $listingClientBugs.append(
                    HTMLHelpers.formatBugRow({
                        bug_target_display_name: bugEntry.bug_target_display_name,
                        importance: bugEntry.importance,
                        link: bugEntry.web_link,
                        status: bugEntry.status,
                        title: LaunchpadHelpers.formatBugTaskTitle(bugEntry)
                    })
                );
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
