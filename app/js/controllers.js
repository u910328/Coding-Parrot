'use strict';

/* Controllers */

angular.module('myApp.controllers', ['firebase.utils', 'simpleLogin'])
    .controller('HomeCtrl', ['$scope', 'fbutil', 'user', 'FBURL', function ($scope, fbutil, user, FBURL) {
        $scope.syncedValue = fbutil.syncObject('syncedValue');
        $scope.user = user;
        $scope.FBURL = FBURL;
    }])
    .controller('ContactCtrl', ['$scope', 'fbutil', 'user', function ($scope, fbutil, user) {
        $scope.syncedValue = fbutil.syncObject('syncedValue');
        $scope.user = user;
    }])
    .controller('ChatCtrl', ['$scope', 'user', function ($scope, user) {
        $scope.user = user;
        //$scope.contacts = contacts;
    }])
    .controller('ProjectCreatorCtrl', ['$scope', 'fbutil', 'user', '$location', 'project',
        function ($scope, fbutil, user, $location, project) {
            $scope.user = user;
            $scope.createProject2 = function () {
                var pjListData = {
                    Name: $scope.pj.Name,
                    Brief: $scope.pj.Brief,
                    Requirements: $scope.pj.Requirements
                };
                project.Create(user.uid, $scope.pj, pjListData);
                $location.path('/projectManager');
            };
        }
    ])
    .controller('ProjectEditorCtrl', ['$scope', 'fbutil', '$routeParams', 'user', 'project',
        function ($scope, fbutil, $routeParams, user, project) {
            $scope.pj = fbutil.syncObject(['projects', $routeParams.projectId]);
            $scope.id = $routeParams.projectId;
            $scope.updateProject2 = function () {
                var listData = {
                    Name: $scope.pj.Name,
                    Brief: $scope.pj.Brief,
                    Requirements: $scope.pj.Requirements
                };
                project.Update($scope.pj, user.uid, listData)
            };
        }
    ])
    .controller('ProjectDetailCtrl', ['$scope', 'fbutil', '$routeParams', 'linkify', '$sce', 'user', 'propose',
        function ($scope, fbutil, $routeParams, linkify, $sce, user, propose) {
            $scope.linkify = linkify;
            $scope.pj = fbutil.syncObject(['projects', $routeParams.projectId]);
            $scope.id = $routeParams.projectId;
            $scope.propose = fbutil.syncObject(['projects', $scope.id, 'waitingList', user.uid]) || {};
            fbutil.ref(['projects', $scope.id, 'waitingList', user.uid, 'price'])
                .once('value', function (snap) {
                    if (snap.val() == null) {
                        $scope.proposeExists = false
                    }
                    else {
                        $scope.proposeExists = true
                    }
                });

            $scope.proposeSend = function (whom, price, message, name) {
                var messages = {price: price, message: message},
                    data = {status: 'waiting', pjName: name};
                propose.Send($scope.id, user.uid, whom, messages, data);
                $scope.proposeExists = true
            };
            $scope.proposeRemove = function (whom) {
                propose.Remove($scope.id, user.uid, whom);
                $scope.proposeExists = false
            }
        }
    ])
    .controller('ProjectListCtrl', ['$scope', '$firebase', 'fbutil',
        function ($scope, $firebase, fbutil) {
            $scope.pjList = fbutil.syncObject('projectList');
        }
    ])
    .controller('ProjectManagerCtrl', ['$scope', 'fbutil', 'user', 'propose',
        function ($scope, fbutil, user, propose) {
            $scope.pjList = fbutil.syncObject(['users', user.uid, 'projects']);
            $scope.remove = function (projectId) {
                fbutil.syncData(['projects', projectId]).$remove();
                fbutil.syncData(['projectList', projectId]).$remove();
                fbutil.syncData(['users', user.uid, 'projects', projectId]).$remove();
            };
            $scope.accept = function (projectId, whom) {
                propose.Accept(projectId, user.uid, whom);
            };
            $scope.reject = function (projectId, whom) {
                propose.Reject(projectId, user.uid, whom);
            }
        }
    ])
    .controller('JobManagerCtrl', ['$scope', 'fbutil', 'user',
        function ($scope, fbutil, user) {
            $scope.jbList = fbutil.syncObject(['users', user.uid, 'jobs'])
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
                        picture: $scope.userInfo.picture,
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
    .controller('UserDetailCtrl', ['$scope', '$firebase', 'fbutil', '$routeParams', 'linkify', '$sce',
        function ($scope, $firebase, fbutil, $routeParams, linkify, $sce) {
            $scope.linkify = linkify;
            $scope.userInfo = fbutil.syncObject(['users', $routeParams.userId, 'userInfo']);
        }
    ]);