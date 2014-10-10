'use strict';

/* Directives */


angular.module('myApp.directives', ['firebase.utils', 'simpleLogin'])

    .directive('appVersion', ['version', function (version) {
        return function (scope, elm) {
            elm.text(version);
        };
    }])
    .directive('checkOverDue', [function () {
        return {
            restrict: 'E',
            scope: {},
            controller: function ($scope, $rootScope, simpleLogin, fbutil, $timeout, nowTime, notification, getFbData) {
                $rootScope.$on('$firebaseSimpleLogin:login', function () {
                    simpleLogin.getUser().then(function (user) {
                        $scope.dt = fbutil.syncObject(['users', user.uid, 'due']);
                        getFbData.getDue(fbutil.syncObject(['users', user.uid, 'due']));
                        $scope.isNoted = {};
                        var checkDue = function () {
                            $timeout(function () {
                                for (var pjRef in $scope.dt) {
                                    var patt = /\$/;
                                    var res = patt.test(pjRef);
                                    if (!res) {
                                        for (var due in $scope.dt[pjRef]) {
                                            var dif = nowTime() - due;
                                            if (dif < 0 && dif > -3 * 24 * 60 * 60 * 1000 && !$scope.isNoted[pjRef + due]) {
                                                var obj = {type: 'reminder', due: due};
                                                notification.Push(user.uid, pjRef, obj);
                                                $scope.isNoted[pjRef + due] = true
                                            } else if (dif > 0 && !$scope.isNoted[pjRef + due]) {
                                                fbutil.syncData(['users', user.uid, 'due', pjRef]).$remove(due);
                                                fbutil.ref(['projects', pjRef, 'assignedTo']).once('value', function (snap) {
                                                    var obj = {type: 'review', due: due, coder: snap.val()};
                                                    notification.Push(user.uid, pjRef, obj);
                                                    if (user.uid == snap.val()) {
                                                        return
                                                    }
                                                    fbutil.syncData(['projects', pjRef, 'review', snap.val()]).$update({isReviewed: false})
                                                });
                                                $scope.isNoted[pjRef + due] = true
                                            }
                                        }
                                    }
                                }
                                checkDue()
                            }, 10000)
                        };
                        checkDue()
                    })
                })
            }
        }
    }])
    .directive('communication', function () {

        var Ctrl = function ($scope, fbutil, $sce, getFbData, $q, myUid, propose, chatService, visualCtrl) {
            //utilities
            var grpConPos = ['users', myUid, 'conversations', 'group'];
            $scope.myUid = myUid;
            $scope.Users = getFbData.Users;
            $scope.getUserName = function (uid) {
                getFbData.getUserName(uid, myUid);
            };
            $scope.getUnread = function (conv) {
                var pos1 = ['conversations', conv, 'members', myUid];
                getFbData.getUnread(pos1, conv)
            };
            //visual
            $scope.visibility=visualCtrl.visibility;


            //notification
            $scope.notifications = fbutil.syncObject(['users', myUid, 'notifications']);
            $scope.getNotiData = getFbData.getNotiData;
            $scope.NotiData = getFbData.NotiData;
            $scope.notificationClear = function (ref) {
                chatService.NotificationClear(myUid, ref)
            };
            $scope.accept = function (projectId, whom, pjName, price) {
                var info = {
                    type: 'proposeAccepted',
                    price: price,
                    pjName: pjName,
                    client: myUid
                };
                propose.Accept(projectId, myUid, whom, info);
            };
            $scope.reject = function (projectId, whom, pjName) {
                var info = {
                    type: 'proposeRejected',
                    pjName: pjName
                };
                propose.Reject(projectId, myUid, whom, info);
            };
            $scope.start = function (pid, whom) {
                propose.Start(pid, myUid, whom);
                fbutil.ref(['projects', pid, 'due']).once('value', function (snap) {
                    fbutil.syncData(['users', myUid, 'due', pid]).$update(snap.val(), {data: 'success'})
                });
            };
            $scope.acceptRejection = function (pid) {
                propose.AcceptRejection(pid, myUid)
            };

            //conversations
            $scope.conversations = fbutil.syncObject(['users', myUid, 'conversations', 'group']);
            $scope.Conversations = getFbData.Conversations;
            $scope.selConv = function (conv) {
                chatService.SelConv(myUid, conv)
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

            //contacts
            $scope.contacts = fbutil.syncObject(['users', myUid, 'contacts']);
            $scope.addContact = function (whom, sendNoti) {
                chatService.AddContact(myUid, whom, sendNoti);
            };
            $scope.blockContact = function (contact) {
                chatService.BlockContact(myUid, contact);
            };
            $scope.removeContact = function (contact) {
                chatService.RemoveContact(myUid, contact)
            };
            $scope.blockedList = {};
            $scope.findBlocked = function (contactRef, isBlocked) {
                if (isBlocked) {
                    $scope.blockedList[contactRef] = true
                }
            };

            //messenger
            $scope.cserv = chatService.cserv;
            $scope.closeWindow = function () {
                if ($scope.cserv.convRef) {
                    fbutil.syncData(['conversations', $scope.cserv.convRef, 'members', myUid]).$update({unread: 0});
                    $scope.cserv.convRef = false
                }
            };
            $scope.addMessage = function (newMessage) {
                chatService.AddMessage(myUid, $scope.cserv.convRef, newMessage);
            };
            $scope.talkTo = function (whom) {
                chatService.Create1to1Ref(myUid, whom, true)
            };

            //user list
            $scope.usrList = fbutil.syncObject('userList');
        };
        return {
            restrict: 'E',
            transclude: true,
            templateUrl: 'partials/directiveTemplates/communication.html',
            controller: function ($scope, $rootScope, simpleLogin, fbutil, $sce, getFbData, $q, propose, chatService,visualCtrl) {
                $rootScope.$on('$firebaseSimpleLogin:login', function () {
                    simpleLogin.getUser().then(function (user) {
                        Ctrl($scope, fbutil, $sce, getFbData, $q, user.uid, propose, chatService,visualCtrl)
                    });
                });
                $rootScope.$on('$firebaseSimpleLogin:logout', function () {
                    $scope.chatShow = false;
                })
            }
        };
    })
/**
 * A directive that shows elements only when user is logged in.
 */
    .directive('notification', [function () {
        return {
            restrict: 'E',
            require: '^communication',
            scope: true,
            templateUrl: 'partials/directiveTemplates/notification.html'
        }
    }])
    .directive('userlist', [function () {
        return {
            restrict: 'E',
            require: '^communication',
            scope: true,
            templateUrl: 'partials/directiveTemplates/userlist.html'
        }
    }])
    .directive('contacts', [function () {
        return {
            restrict: 'E',
            require: '^communication',
            scope: true,
            templateUrl: 'partials/directiveTemplates/contacts.html'
        }
    }])
    .directive('conversation', [function () {
        return {
            restrict: 'E',
            require: '^communication',
            scope: true,
            templateUrl: 'partials/directiveTemplates/conversation.html'
        }
    }])
    .directive('messenger', [function () {
        return {
            restrict: 'E',
            require: '^communication',
            scope: true,
            templateUrl: 'partials/directiveTemplates/messenger.html'
        }
    }])
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
    }])
    .directive('jRating', function ($timeout, fbutil) {                   // see http://stackoverflow.com/questions/19864007/angularjs-event-for-when-model-binding-or-ng-repeat-is-complete
        return {
            scope: true,
            link: function (scope) {
                if (scope.$last) {
                    $timeout(function () {
                        $(".basic").jRating({
                            onClick: scope.rate
                        })
                    }, 0);
                }
            }
        }
    })
    .directive('validForm', function (bvOptn, $timeout) {
        return {
            restrict: 'E',
            scope: false,
            transclude: true,
            templateUrl: 'partials/directiveTemplates/validForm.html',
            link: function (scope, element, attrs) {
                var bvId = attrs.id;
                scope.form={};
                var initBV = function () {
                    $("#" + bvId)
                        // on('init.form.bv') must be declared
                        // before calling .bootstrapValidator(options)
                        .on('init.form.bv', function (e,data) {
                        })
                        .bootstrapValidator(scope.bvOptions)
                        .on('error.field.bv', function (e, data) {
                            scope.form.isFormValid=false;
                            scope.isFormValid = false;
                            scope.$digest();
                            //data.bv.disableSubmitButtons(true);
                        })
                        .on('success.field.bv', function (e, data) {
                            var isValid = data.bv.isValid();
                            scope.form.isFormValid = isValid;
                            scope.isFormValid = isValid;
                            if (scope.validFormtype) {
                                scope.form.isFormValid = true;
                                scope.isFormValid = true
                            }
                            $timeout(function () {                //prevent digest while digesting
                                scope.$digest();
                            }, 0);

                            //data.bv.disableSubmitButtons(!isValid);
                        });
                    scope.$on('revalidateDate', function () {
                            $timeout(function () {                //prevent digest while digesting
                                $("#" + bvId).bootstrapValidator('revalidateField', 'datePicker')
                            }, 0);

                        }
                    );
                };
                    $timeout(initBV,0);
                //angular.element(document).ready()
            }
        }
    });

