'use strict';

/* Directives */


angular.module('myApp.directives', ['firebase.utils', 'simpleLogin'])

    .directive('appVersion', ['version', function (version) {
        return function (scope, elm) {
            elm.text(version);
        };
    }])
    .directive('chat', [function () {
        return {
            restrict: 'E',
            transclude: false,
            scope: {user: '='},
            templateUrl: 'partials/directiveTemplates/chat.html',
            controller: function ($scope, $firebase, fbutil, linkify, $sce, $q) {
                var myUid = $scope.user.uid
                var grpConPos = ['users', myUid, 'conversations', 'group'],
                    resetUnread = function (posArray) {
                        $scope.$on('$routeChangeStart', function () {       // need to destroy listener?
                            fbutil.ref(posArray).off('value')
                        });
                    };

                $scope.messages = [];
                $scope.usrList = fbutil.syncObject('userList');

                $scope.contacts = fbutil.syncObject(['users', myUid, 'contacts']);
                $scope.addContact = function (contact) {
                    fbutil.syncData(['users', myUid, 'contacts', contact]).$update({Data: 'success'});
                };
                $scope.removeContact = function (contact) {
                    fbutil.syncData(['users', myUid, 'contacts']).$remove(contact);
                };

                $scope.getUnread = function (conv) {
                    fbutil.ref(['conversations', conv, 'members', myUid, 'unread'])
                        .on('value', function (snap) {
                            document.getElementById(conv).innerHTML = snap.val() || 0;
                            resetUnread(['conversations', conv, 'members', myUid, 'unread'])
                        });
                };
                $scope.getUnread1to1 = function (whom) {
                    var pos = ['users', myUid, 'conversations', '1to1', whom, 'Ref'];
                    fbutil.ref(pos)
                        .once('value', function (ref) {
                            var exists = (ref.val() != null);
                            if (exists) {
                                fbutil.ref(['conversations', ref.val(), 'members', myUid, 'unread'])
                                    .on('value', function (snap) {
                                        document.getElementById(whom).innerHTML = snap.val() || 0;
                                        resetUnread(['conversations', ref.val(), 'members', myUid, 'unread']);
                                    });
                            }
                        });
                };

                $scope.conversations = fbutil.syncObject(grpConPos);
                $scope.selConv = function (conv) {                //select conversation
                    $scope.conversationRef = conv;
                    $scope.messages = fbutil.syncArray(['conversations', conv, 'messages'], {limit: 10, endAt: null});        //messages pos in conversations
                    fbutil.syncData(['conversations', conv, 'members', myUid])
                        .$update({unread: 0});
                };
                $scope.usrInCon = [myUid];
                $scope.invite = function (addedUser) {
                    var doubleCount = false;
                    for (var i = 0; i < $scope.usrInCon.length; i++) {
                        if ($scope.usrInCon[i] == addedUser) {
                            doubleCount = true
                        }
                    }
                    if (!doubleCount) {
                        $scope.usrInCon.push(addedUser)
                    }
                };
                $scope.Confirm = function () {
                    var list = $scope.usrInCon;
                    var data = {data: 'test', members: list};
                    fbutil.syncData(grpConPos).$push(data).then(function (conversationRef) {
                        var conRef = conversationRef.name();
                        $scope.selConv(conRef);  //switch messages to current ref
                        for (var i = 0; i < list.length; i++) {
                            if (i != 0) {
                                var position = ['users', list[i], 'conversations', 'group'];
                                fbutil.syncData(position).$update(conRef, data);
                            }
                            fbutil.syncData(['conversations', conRef, 'members', list[i]])
                                .$update({unread: 0});          //messages pos in conversations
                        }
                    });
                };

                $scope.talkTo = function (whom) {
                    var pos = ['users', myUid, 'conversations', '1to1', whom, 'Ref'];
                    fbutil.ref(pos)
                        .once('value', function (snapshot) {
                            var exists = (snapshot.val() != null);
                            if (exists) {
                                var whomRef = snapshot.val();
                                $scope.selConv(whomRef);
                            } else {
                                fbutil.syncData(pos).$push({Data: 'success'}).then(function (conversationRef) {
                                    var conRef = conversationRef.name();
                                    $scope.selConv(conRef);
                                    fbutil.syncData(['users', whom, 'conversations', '1to1', myUid]).$update({Data: 'success', Ref: conRef});
                                    fbutil.syncData(['users', myUid, 'conversations', '1to1', whom]).$update({Data: 'success', Ref: conRef})
                                })
                            }

                        })
                };

                $scope.addMessage = function (newMessage) {
                    if (newMessage) {
                        var linkifiedMsg = linkify(newMessage);
                        fbutil.ref(['users', myUid, 'name']).once('value', function (usrName) {
                            fbutil.syncData(['conversations', $scope.conversationRef, 'messages']).$push({addresser: usrName.val(), text: linkifiedMsg});
                        });           //messages pos in conversations
                        var memPos = ['conversations', $scope.conversationRef, 'members'];
                        fbutil.ref(memPos).once('value', function (members) {
                            var temp = members.val();
                            for (var key in temp) {
                                if (key != myUid) {
                                    var unread = temp[key].unread + 1;
                                    fbutil.syncData(['conversations', $scope.conversationRef, 'members', key])
                                        .$update({unread: unread});
                                }
                            }
                        })
                    }
                };
            }
        };
    }])
/**
 * A directive that shows elements only when user is logged in.
 */
    .directive('ngShowAuth', ['simpleLogin', '$timeout', function (simpleLogin, $timeout) {
        var isLoggedIn;
        simpleLogin.watch(function (user) {
            isLoggedIn = !!user;
        });

        return {
            restrict: 'A',
            link: function (scope, el) {
                el.addClass('ng-cloak'); // hide until we process it

                function update() {
                    // sometimes if ngCloak exists on same element, they argue, so make sure that
                    // this one always runs last for reliability
                    $timeout(function () {
                        el.toggleClass('ng-cloak', !isLoggedIn);
                    }, 0);
                }

                update();
                simpleLogin.watch(update, scope);
            }
        };
    }])

/**
 * A directive that shows elements only when user is logged out.
 */
    .directive('ngHideAuth', ['simpleLogin', '$timeout', function (simpleLogin, $timeout) {
        var isLoggedIn;
        simpleLogin.watch(function (user) {
            isLoggedIn = !!user;
        });

        return {
            restrict: 'A',
            link: function (scope, el) {
                function update() {
                    el.addClass('ng-cloak'); // hide until we process it

                    // sometimes if ngCloak exists on same element, they argue, so make sure that
                    // this one always runs last for reliability
                    $timeout(function () {
                        el.toggleClass('ng-cloak', isLoggedIn !== false);
                    }, 0);
                }

                update();
                simpleLogin.watch(update, scope);
            }
        };
    }]);
