'use strict';

/* Directives */


angular.module('myApp.directives', ['firebase.utils', 'simpleLogin'])

    .directive('appVersion', ['version', function (version) {
        return function (scope, elm) {
            elm.text(version);
        };
    }])
    .directive('chat', ['getFbData', function (getFbData) {
        return {
            restrict: 'E',
            scope: {user: '='},
            link: function (scope) {
                scope.Conversations = getFbData.Conversations;
                scope.Users = getFbData.Users;
                scope.NotiData = getFbData.NotiData
            },
            templateUrl: 'partials/directiveTemplates/chat.html',
            controller: function ($scope, fbutil, $sce, getFbData) {
                var myUid = $scope.user.uid;
                var grpConPos = ['users', myUid, 'conversations', 'group'];

                $scope.notiShow=false;
                $scope.showNoti = function () {$scope.notiShow=true};

                $scope.getUserName = function (uid) {
                    getFbData.getUserName(uid, myUid);
                };
                $scope.getUnread =function (whomOrConv, type) {
                    var pos1 = ['conversations', whomOrConv, 'members', myUid];
                    if (type != '1to1') {
                        getFbData.getUnread(pos1, whomOrConv)
                    } else {
                        fbutil.ref(['users', myUid, 'conversations', '1to1', whomOrConv, 'Ref'])
                            .once('value', function (ref) {
                                var pos2 = ['conversations', ref.val(), 'members', myUid];
                                var exists = (ref.val() != null);
                                if (exists) {
                                    getFbData.getUnread(pos2, whomOrConv);
                                }
                            });
                    }
                };
                $scope.getNotiData = getFbData.getNotiData;

                $scope.messages = [];
                $scope.notifications = fbutil.syncObject(['users', myUid, 'notifications']);
                $scope.notificationClear = function (key) {
                    fbutil.ref(['conversations', key, 'members', myUid, 'unread']).off('value');
                    fbutil.syncData(['users', myUid, 'notifications']).$remove(key)
                };
                $scope.usrList = fbutil.syncObject('userList');

                $scope.contacts = fbutil.syncObject(['users', myUid, 'contacts']);
                $scope.addContact = function (contact) {
                    fbutil.syncData(['users', myUid, 'contacts', contact]).$update({Data: 'success'});
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
                                    fbutil.syncData(['conversations', conRef, 'members', whom]).$update({Data: 'success'});
                                    fbutil.syncData(['users', whom, 'conversations', '1to1', myUid]).$update({Data: 'success', Ref: conRef});
                                    fbutil.syncData(['users', myUid, 'conversations', '1to1', whom]).$update({Data: 'success', Ref: conRef})
                                })
                            }
                        })
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
                            var is1to1 = (Object.keys(members.val()).length==2);
                            for (var key in temp) {
                                if ((key != myUid) && (temp[key].unread != 'watching')) {
                                    var unread = temp[key].unread + 1;
                                    if (temp[key].unread == null) {unread = 1}
                                    fbutil.syncData(['conversations', convRef, 'members', key])
                                        .$update({unread: unread});
                                    var type = '1toN';
                                    if (is1to1) {type = '1to1'}
                                    fbutil.syncData(['users', key, 'notifications', convRef])
                                        .$update({type: type});
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
