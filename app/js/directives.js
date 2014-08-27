'use strict';

/* Directives */


angular.module('myApp.directives', ['firebase.utils', 'simpleLogin'])

    .directive('appVersion', ['version', function (version) {
        return function (scope, elm) {
            elm.text(version);
        };
    }])
    .directive('chat', ['getFbData', function (getFbData) {
        var Ctrl = function ($scope, fbutil, $sce, getFbData, $q, user) {
            var myUid = user.uid;
            var grpConPos = ['users', myUid, 'conversations', 'group'];
            var create1to1Ref = function (whom, select) {
                var def = $q.defer();
                var pos = ['users', myUid, 'conversations', '1to1', whom, 'Ref'];
                fbutil.ref(pos)
                    .once('value', function (snapshot) {
                        var exists = (snapshot.val() != null);
                        if (exists) {
                            var whomRef = snapshot.val();
                            def.resolve(snapshot.val());
                            if (select) {
                                $scope.selConv(whomRef)
                            }
                        } else {
                            fbutil.syncData(pos).$push({Data: 'success'}).then(function (Ref) {
                                var conRef = Ref.name();
                                def.resolve(conRef);
                                if (select) {
                                    $scope.selConv(conRef)
                                }
                                fbutil.syncData(['conversations', conRef, 'members', whom]).$update({Data: 'success'});
                                fbutil.syncData(['users', whom, 'conversations', '1to1', myUid]).$update({Data: 'success', Ref: conRef});
                                fbutil.syncData(['users', myUid, 'conversations', '1to1', whom]).$update({Data: 'success', Ref: conRef});
                            })
                        }
                    });
                return def.promise;
            };

            $scope.notiShow = false;
            $scope.showNoti = function () {
                $scope.notiShow = true
            };

            $scope.getUserName = function (uid) {
                getFbData.getUserName(uid, myUid);
            };
            $scope.getUnread = function (conv) {
                var pos1 = ['conversations', conv, 'members', myUid];
                getFbData.getUnread(pos1, conv)
            };
            $scope.getNotiData = getFbData.getNotiData;

            $scope.messages = [];

            $scope.notifications = fbutil.syncObject(['users', myUid, 'notifications']); //todo: make it a service
            $scope.notificationClear = function (key) {
                fbutil.ref(['conversations', key, 'members', myUid, 'unread']).off('value');
                fbutil.syncData(['users', myUid, 'notifications']).$remove(key)
            };

            $scope.usrList = fbutil.syncObject('userList');

            $scope.contacts = fbutil.syncObject(['users', myUid, 'contacts']);
            $scope.addContact = function (whom, sendNoti) {
                create1to1Ref(whom, false).then(function (ref) {
                    fbutil.syncData(['users', myUid, 'contacts', whom]).$update({Blocked: false, Ref: ref});
                    if (sendNoti) {
                        fbutil.syncData(['users', whom, 'notifications', myUid]).$update({type: 'addContact'})
                    }
                });
            };
            $scope.blockContact = function (contact) {
                create1to1Ref(contact, false).then(function (ref) {
                    fbutil.syncData(['users', myUid, 'contacts', contact]).$update({Blocked: true, Ref: ref});
                });
            };
            $scope.removeContact = function (contact) {
                fbutil.syncData(['users', myUid, 'contacts']).$remove(contact);
            };

            $scope.conversations = fbutil.syncObject(grpConPos);
            $scope.selConv = function (conv) {                //select conversation
                $scope.conversationRef = conv;
                $scope.messages = fbutil.syncArray(['conversations', conv, 'messages'], {limit: 10, endAt: null});       //messages pos in conversations
                fbutil.syncData(['conversations', conv, 'members', myUid]).$update({unread: 'watching'});
                fbutil.ref(['conversations', conv, 'members', myUid]).onDisconnect().update({unread: 0})
            };
            $scope.closeWindow = function () {
                if ($scope.conversationRef) {
                    fbutil.syncData(['conversations', $scope.conversationRef, 'members', myUid]).$update({unread: 0});
                    $scope.conversationRef = false
                }
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
                create1to1Ref(whom, true)
            };

            $scope.addMessage = function (newMessage) {
                var convRef = $scope.conversationRef;
                if (newMessage) {
                    //fbutil.ref(['Data', myUid, 'userInfo', 'name']).once('value', function (usrName) {});
                    //messages pos in conversations
                    fbutil.syncData(['conversations', convRef, 'messages'])
                        .$push({
                            addresser: myUid,
                            text: newMessage,
                            timeStamp: Firebase.ServerValue.TIMESTAMP
                        });
                    var memPos = ['conversations', convRef, 'members'];
                    fbutil.ref(memPos).once('value', function (members) {
                        var temp = members.val();
                        var is1to1 = (Object.keys(members.val()).length == 2);
                        for (var key in temp) {
                            if ((key != myUid) && (temp[key].unread != 'watching')) {
                                var unread = temp[key].unread + 1;
                                if (temp[key].unread == null) {
                                    unread = 1
                                }
                                fbutil.syncData(['conversations', convRef, 'members', key])
                                    .$update({unread: unread});
                                var type = '1toN';
                                if (is1to1) {
                                    type = '1to1'
                                }
                                fbutil.syncData(['users', key, 'notifications', convRef])
                                    .$update({type: type});
                            }
                        }
                    })
                }
            };
        };
        return {
            restrict: 'E',
            link: function (scope) {
                scope.Conversations = getFbData.Conversations;
                scope.Users = getFbData.Users;
                scope.NotiData = getFbData.NotiData
            },
            templateUrl: 'partials/directiveTemplates/chat.html',
            controller: function ($scope, fbutil, $sce, getFbData, $q, simpleLogin) {
                simpleLogin.getUser().then(function(user) {Ctrl($scope, fbutil, $sce, getFbData, $q, user)})
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
