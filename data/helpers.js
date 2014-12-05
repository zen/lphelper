var APIDomain = 'api.launchpad.net';
var LaunchpadAPIUrl = 'https://' + APIDomain + '/1.0/';
var LaunchpadUrl = 'https://launchpad.net/';

var HTMLHelpers = {
    importanceClass: function (importance) {
        if (importance) {
            return 'importance' + importance.toUpperCase();
        }

        return '';
    },
    importanceDiv: function (importance) {
        return '<div class="importance ' + HTMLHelpers.importanceClass(importance) + '">' + importance + '</div>';
    },
    importanceSpan: function (contents, importance) {
        return '<span class="' + HTMLHelpers.importanceClass(importance) + '">' + contents + '</span>';
    },
    statusDiv: function(status) {
        return '<div class="status ' + HTMLHelpers.statusClass(status) + '">' + status + '</div>';
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

            return HTMLHelpers.link(s, s) + ending;
        });
    },
    formatTooltip: function(title, content) {
        return '<div class="tooltip-title">' + title + '</div>' + '<div class="tooltip-content">' + content + '</div>';
    },
    formatBugRow: function(options) {
        var bugnumber = URLHelpers.bugNumberFromURL(options.link);

        return $('<div class="buglisting-row"></div>').append(
            $('<div class="buglisting-col1"></div>').append(
                HTMLHelpers.importanceDiv(options.importance, options.importance),
                HTMLHelpers.statusDiv(options.status),
                '<div class="buginfo-extra></div>'
            ),
            $('<div class="buglisting-col2"></div>').append(
                $('<div class="buginfo"></div>').append(
                    '<span class="bugnumber">#' + options.bugnumber + '</span> ',
                    HTMLHelpers.link(options.link, options.title)
                ),
                $('<div class="buginfo-extra"></div>').append(
                    '<span class="sprite product field">' + options.bug_target_display_name + '</span>',
                    '<span class="bug-heat-icons"></span>',
                    '<span class="bug-related-icons"></span>'
                )
            )
        );
    },
    link: function(href, content) {
        return '<a href="' + href + '">' + content + '</a>';
    },
    makeUserLink: function (username) {
        return HTMLHelpers.link(URLHelpers.launchpad.user(username), username);
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
    launchpadApi: {
        bug: function(bugnumber) {
            return LaunchpadAPIUrl + 'bugs/' + bugnumber;
        },
        user: function(username) {
            return LaunchpadAPIUrl + '~' + username;
        },
        userBugTasks: function(username) {
            var userLink = URLHelpers.launchpadApi.user(username);

            return userLink + '?ws.op=searchTasks&assignee=' + encodeURIComponent(userLink);
        },
        userSuperTeams: function(username) {
            return LaunchpadAPIUrl + '~' + username + '/super_teams';
        }
    },
    bugNumberFromURL: function (url) {
        var match = (url || '').match(/^.*\+bug\/(\d+).*/);

        return match && match[1];
    },
    isPersonPage: function() {
        return window.location.href.indexOf(LaunchpadUrl + '~') === 0;
    },
    usernameFromURL: function (url) {
        return (url || '').replace(LaunchpadAPIUrl + '~', '')
            .replace(LaunchpadAPIUrl + '1.0/~', '')
            .replace(LaunchpadUrl + '~', '')
            .replace(LaunchpadUrl + '1.0/~', '');
    }
};

var LaunchpadHelpers = {
    formatBugTaskTitle: function(bugTask) {
        return bugTask.title.replace(/Bug.*?: /, '').replace(/"/g, '');
    }
};

