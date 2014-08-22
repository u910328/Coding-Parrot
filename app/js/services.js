(function () {
    'use strict';

    /* Services */

    angular.module('myApp.services', [])

        // put your services here!
        // .service('serviceName', ['dependency', function(dependency) {}]);

        .service('messageList', ['fbutil', function (fbutil) {
            return fbutil.syncArray('messages', {limit: 10, endAt: null});
        }])
        .service('propose', ['fbutil', function (fbutil) {
            return {
                Send: function (pid, uid, whom, message, data) {
                    fbutil.syncData(['projects', pid, 'waitingList', uid]).$update( message);
                    fbutil.syncData(['projectList', pid, 'waitingList', uid]).$update(message);
                    fbutil.syncData(['users', whom, 'projects', pid, 'waitingList', uid]).$update(message);

                    fbutil.syncData(['users', uid, 'jobs', pid]).$update(data);
                },
                Remove: function (pid, uid, whom) {
                    fbutil.syncData(['projects', pid, 'waitingList']).$remove(uid);
                    fbutil.syncData(['projectList', pid, 'waitingList']).$remove(uid);
                    fbutil.syncData(['users', whom, 'projects', pid, 'waitingList']).$remove(uid);
                },
                Reject: function (pid, uid, whom) {
                    this.Remove(pid, whom, uid);
                    fbutil.syncData(['users', whom, 'jobs', pid]).$update({status: 'rejected'});
                },
                Accept: function (pid, uid, whom) {
                    fbutil.syncData(['projects', pid, 'waitingList']).$remove();
                    fbutil.syncData(['projectList', pid, 'waitingList']).$remove();
                    fbutil.syncData(['users', uid, 'projects', pid, 'waitingList']).$remove();
                    //= this.Remove(pid, null, uid) ??

                    fbutil.syncData(['users', whom, 'jobs', pid]).$update({status: 'Accept'});
                    fbutil.syncData(['projectList', pid]).$remove();
                    fbutil.syncData(['users', uid, 'projects', pid]).$update({
                        Status: 'In progress', AssignedTo: whom
                    })
                }
            }
        }])
        .factory('linkify', [ function () {
            //copied from http://stackoverflow.com/questions/37684/how-to-replace-plain-urls-with-links
            return function (inputText) {
                if (inputText) {
                    var replacedText, replacePattern1, replacePattern2, replacePattern3;

                    //URLs starting with http://, https://, or ftp://
                    replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
                    replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

                    //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
                    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
                    replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

                    //Change email addresses to mailto:: links.
                    replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
                    replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

                    return replacedText;
                } else {
                    return ''
                }
            }
        }]);

})();

