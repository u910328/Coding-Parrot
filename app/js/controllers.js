'use strict';

/* Controllers */

angular.module('myApp.controllers', ['firebase.utils', 'simpleLogin'])
    .controller('HomeCtrl', ['$scope', 'fbutil', 'user', 'FBURL', function ($scope, fbutil, user, FBURL) {
        $scope.syncedValue = fbutil.syncObject('syncedValue');
        $scope.user = user;
        $scope.FBURL = FBURL;
    }])

    .controller('ChatCtrl', ['$scope', '$firebase', 'user', 'fbutil', 'linkify', '$sce', '$q', function ($scope, $firebase, user, fbutil, linkify, $sce, $q) {
        var position0 = ['users', user.uid, 'conversations', 'group'],
            resetUnread = function (posArray) {$scope.$on('$routeChangeStart', function () {       // need to destroy listener?
                fbutil.ref(posArray).off('value')
            });};

        $scope.messages = [];
        $scope.syncedValue = fbutil.syncObject('syncedValue');

        $scope.getUnread = function (conv) {
            fbutil.ref(['conversations', conv, 'members', user.uid, 'unread'])
                .on('value', function (snap) {
                    document.getElementById(conv).innerHTML = snap.val();
                    resetUnread(['conversations', conv, 'members', user.uid, 'unread'])
                });
        };

        $scope.getUnread1to1 = function (whom) {
            var pos = ['users', user.uid, 'conversations', '1to1', whom, 'Ref'];
            fbutil.ref(pos)
                .once('value', function (ref) {
                    var exists = (ref.val() != null);
                    if (exists) {
                        fbutil.ref(['conversations', ref.val(), 'members', user.uid, 'unread'])
                            .on('value', function (snap) {
                                document.getElementById(whom).innerHTML = snap.val() || 0;
                                resetUnread(['conversations', ref.val(), 'members', user.uid, 'unread']);
                            });
                    }
                });
        };

        $scope.conversations = fbutil.syncObject(position0);
        $scope.selConv = function (conv) {                //select conversation
            $scope.conversationRef = conv;
            $scope.messages = fbutil.syncArray(['conversations', conv, 'messages'], {limit: 10, endAt: null});        //messages pos in conversations
            fbutil.syncData(['conversations', conv, 'members', user.uid])
                .$update({unread: 0});
        };
        $scope.usrList = fbutil.syncObject('userList');
        $scope.usrInCon = [user.uid];
        $scope.invite = function (addedUser) {
            var doubleCount = false;
            for (var i = 0; i < $scope.usrInCon.length; i++) {
                if ($scope.usrInCon[i] == addedUser ) {
                    doubleCount = true
            }}
            if (!doubleCount) {$scope.usrInCon.push(addedUser)}
        };

        $scope.Confirm = function () {
            var list = $scope.usrInCon;
            var data = {data: 'test', members: list};
            fbutil.syncData(position0).$push(data).then(function (conversationRef) {
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

            var pos = ['users', user.uid, 'conversations', '1to1', whom, 'Ref'];
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
                            fbutil.syncData(['users', whom, 'conversations', '1to1', user.uid]).$update({Data: 'success', Ref: conRef});
                            fbutil.syncData(['users', user.uid, 'conversations', '1to1', whom]).$update({Data: 'success', Ref: conRef})
                        })
                    }

                })
        };
        $scope.addMessage = function (newMessage) {
            if (newMessage) {
                var linkifiedMsg = linkify(newMessage);
                fbutil.ref(['users', user.uid, 'name']).once('value', function (usrName) {
                    fbutil.syncData(['conversations', $scope.conversationRef, 'messages']).$push({addresser: usrName.val(), text: linkifiedMsg});
                });           //messages pos in conversations
                var memPos = ['conversations', $scope.conversationRef, 'members'];
                fbutil.ref(memPos).once('value', function (members) {
                    var temp = members.val();
                    for (var key in temp) {
                        if (key != user.uid) {
                            var unread = temp[key].unread + 1;
                            fbutil.syncData(['conversations', $scope.conversationRef, 'members', key])
                                .$update({unread: unread});
                        }
                    }
                })
            }
        };
    }])
    .controller('ProjectCreatorCtrl', ['$scope', '$firebase', 'fbutil', 'user',
        function ($scope, $firebase, fbutil, user) {
            var pjsRef = fbutil.ref('projects');
            var pjListRef = fbutil.ref('projectList');
            var userPjRef = fbutil.ref(['users', user.uid, 'projects']);
            $scope.createProject = function () {

                $firebase(pjsRef).$push($scope.pj).then(function (pjRef) {
                    fbutil.ref(['users', user.uid, 'userInfo', 'name']).on('value', function (usrName) {
                        var name = usrName.val();
                        $firebase(pjRef).$update({
                            ClientUid: user.uid,
                            ClientName: name             
                        });
//codes above get the user ref back. codes below set the pjList data and store pjListRef back to the project data.
                        $firebase(pjListRef).$set(pjRef.name(), {
                            Name: $scope.pj.Name,
                            Brief: $scope.pj.Brief,
                            Expertise: $scope.pj.Expertise,     // TODO: change it to Requirement.
                            ClientUid: user.uid,
                            ClientName: name
                        });
                        $firebase(userPjRef).$set(pjRef.name(), {
                            Name: $scope.pj.Name,
                            Brief: $scope.pj.Brief,
                            Expertise: $scope.pj.Expertise,     // TODO: change it to Requirement.
                            ClientUid: user.uid,
                            ClientName: name
                        });
                    })

                });
            };
        }
    ])
    .controller('ProjectEditorCtrl', ['$scope', '$firebase', 'fbutil', '$routeParams',
        function ($scope, $firebase, fbutil, $routeParams) {
            $scope.pj = fbutil.syncObject(['projects', $routeParams.projectId]);
            $scope.id = $routeParams.projectId;
            $scope.updateProject = function () {
                $scope.pj.$save().then(function () {
                    var ListRef = fbutil.ref(['projectList', $scope.pj.pjListRef]);
                    $firebase(ListRef).$update({
                        Name: $scope.pj.Name,
                        Brief: $scope.pj.Brief,
                        Expertise: $scope.pj.Expertise
                    });
                });

            };

        }
    ])
    .controller('ProjectDetailCtrl', ['$scope', '$firebase', 'fbutil', '$routeParams',
        function ($scope, $firebase, fbutil, $routeParams) {
            $scope.pj = fbutil.syncObject(['projects', $routeParams.projectId]);
            $scope.id = $routeParams.projectId;
        }
    ])
    .controller('ProjectListCtrl', ['$scope', '$firebase', 'fbutil',
        function ($scope, $firebase, fbutil) {
            $scope.pjList = fbutil.syncObject('projectList');
        }
    ])
    .controller('ProjectManagerCtrl', ['$scope', '$firebase', 'fbutil', 'user',
        function ($scope, $firebase, fbutil, user) {
            $scope.pjList = fbutil.syncObject(['users', user.uid, 'projects']);
        }
    ])

    .controller('LoginCtrl', ['$scope', 'simpleLogin', '$location', function ($scope, simpleLogin, $location) {
        $scope.email = null;
        $scope.pass = null;
        $scope.confirm = null;
        $scope.createMode = false;

        $scope.login = function (provider, email, pass) {
            $scope.err = null;

            simpleLogin.login(provider, email, pass)
                .then(function (/* user */) {
                    $location.path('/home');
                }, function (err) {
                    $scope.err = errMessage(err);
                });

        };

        $scope.createAccount = function () {
            $scope.err = null;
            if (assertValidAccountProps()) {
                simpleLogin.createAccount($scope.email, $scope.pass)
                    .then(function (/* user */) {
                        $location.path('/account');
                    }, function (err) {
                        $scope.err = errMessage(err);
                    });
            }
        };

        function assertValidAccountProps() {
            if (!$scope.email) {
                $scope.err = 'Please enter an email address';
            }
            else if (!$scope.pass || !$scope.confirm) {
                $scope.err = 'Please enter a password';
            }
            else if ($scope.createMode && $scope.pass !== $scope.confirm) {
                $scope.err = 'Passwords do not match';
            }
            return !$scope.err;
        }

        function errMessage(err) {
            return angular.isObject(err) && err.code ? err.code : err + '';
        }
    }])

    .controller('AccountCtrl', ['$scope', 'simpleLogin', 'fbutil', 'user', '$location',
        function ($scope, simpleLogin, fbutil, user, $location) {
            // create a 3-way binding with the user profile object in Firebase
            var userInfoPos = ['users', user.uid, 'userInfo'];                 //remember to change changeEmail and UserDetailCtrl if you change this (also in simpleLogin.js)
            var profile = fbutil.syncObject(userInfoPos);
            profile.$bindTo($scope, 'profile');

            // update user data in user list and users.
            $scope.userInfo = fbutil.syncObject(userInfoPos);
            $scope.userInfoUpdate = function () {
                $scope.userInfo.$save().then(function () {
                    var ref = fbutil.ref(['userList', user.uid]);
                    ref.update({
                        name: $scope.userInfo.name,
                        uid: user.uid
                    });
//user in user list data.
                });
            };

            // expose logout function to scope
            $scope.logout = function () {
                profile.$destroy();
                simpleLogin.logout();
                $location.path('/login');
            };

            $scope.changePassword = function (pass, confirm, newPass) {
                resetMessages();
                if (!pass || !confirm || !newPass) {
                    $scope.err = 'Please fill in all password fields';
                }
                else if (newPass !== confirm) {
                    $scope.err = 'New pass and confirm do not match';
                }
                else {
                    simpleLogin.changePassword(profile.email, pass, newPass)
                        .then(function () {
                            $scope.msg = 'Password changed';
                        }, function (err) {
                            $scope.err = err;
                        })
                }
            };

            $scope.clear = resetMessages;

            $scope.changeEmail = function (pass, newEmail) {
                resetMessages();
                profile.$destroy();
                simpleLogin.changeEmail(pass, newEmail)
                    .then(function (user) {
                        profile = fbutil.syncObject(['users', user.uid, 'userInfo']);
                        profile.$bindTo($scope, 'profile');
                        $scope.emailmsg = 'Email changed';
                    }, function (err) {
                        $scope.emailerr = err;
                    });
            };

            function resetMessages() {
                $scope.err = null;
                $scope.msg = null;
                $scope.emailerr = null;
                $scope.emailmsg = null;
            }
        }
    ])
    .controller('UserListCtrl', ['$scope', '$firebase', 'fbutil',
        function ($scope, $firebase, fbutil) {
            $scope.usrList = fbutil.syncObject('userList');
        }
    ])
    .controller('UserDetailCtrl', ['$scope', '$firebase', 'fbutil','$routeParams',
        function ($scope, $firebase, fbutil, $routeParams) {
            $scope.userInfo = fbutil.syncObject(['users', $routeParams.userId, 'userInfo']);
        }
    ]);