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
    .controller('ReviewCtrl', ['$scope', 'user', 'fbutil', '$routeParams', 'notification', function ($scope, user, fbutil, $routeParams, notification) {
        $scope.review = fbutil.syncObject(['projects', $routeParams.projectId, 'review', $routeParams.userId]);
        $scope.review.rating= {};
        $scope.rating = {quality: 0, completeness: 0, speed:0};
        $scope.rate = function (element, rate) {
            var key = $(element).attr("data-id");
            $scope.review.rating[key] = rate;
        };
        $scope.send = function () {
            notification.Clear(user.uid, $routeParams.projectId);
            //calculate average ratings
            //update the average rating in user list
            $scope.review.$save()
        }
    }])
    .controller('ProjectCreatorCtrl', ['$scope', 'fbutil', 'user', '$location', 'project',
        function ($scope, fbutil, user, $location, project) {
            $scope.user = user;
            $scope.createProject = function () {
                $scope.pj.due = Date.parse($scope.dt)||$scope.dt;
                var pjListData = {
                    name: $scope.pj.name,
                    brief: $scope.pj.brief,
                    requirements: $scope.pj.requirements,
                    due: $scope.pj.due
                };
                project.Create(user.uid, $scope.pj, pjListData);
                $location.path('/projectManager');
            };

            $scope.afterNday = function () {
                var today = new Date();
                var md = new Date();
                $scope.pj= {};
                $scope.minDate = md.setDate(today.getDate() + 3);
                $scope.dt = md.setDate(today.getDate() + 30);
            };
            $scope.afterNday();

            $scope.open = function ($event) {
                $event.preventDefault();
                $event.stopPropagation();
                $scope.opened = !$scope.opened;
            };

            $scope.dateOptions = {
                formatYear: 'yy',
                startingDay: 1
            };
        }
    ])
    .controller('ProjectEditorCtrl', ['$scope', 'fbutil', '$routeParams', 'user', 'project', '$location',
        function ($scope, fbutil, $routeParams, user, project, $location) {
            $scope.pj = fbutil.syncObject(['projects', $routeParams.projectId]);
            $scope.id = $routeParams.projectId;
            $scope.updateProject = function () {
                $scope.pj.due = Date.parse($scope.pj.due) || $scope.pj.due;
                var listData = {
                    name: $scope.pj.name,
                    brief: $scope.pj.brief,
                    requirements: $scope.pj.requirements,
                    due: $scope.pj.due
                };
                project.Update($scope.pj, user.uid, listData);
                if($scope.oldDue){fbutil.syncData(['users', user.uid, 'due', $scope.id]).$remove($scope.oldDue)}
                $location.path('/projectManager');
            };
            $scope.afterNday = function () {
                var today = new Date();
                var threeDLater = new Date();
                $scope.minDate = threeDLater.setDate(today.getDate() + 3);
                $scope.$watch('pj.due', function (nVal, oVal) {
                    if ((oVal!= undefined)&&(!$scope.oldDueCount)) {                                 //locate and remove old due
                        $scope.oldDueCount= true;
                        $scope.oldDue=oVal;
                    }

                });
            };
            $scope.afterNday();

            $scope.open = function ($event) {
                $event.preventDefault();
                $event.stopPropagation();
                $scope.opened = !$scope.opened;
            };

            $scope.dateOptions = {
                formatYear: 'yy',
                startingDay: 1
            };
        }
    ])
    .controller('ProjectDetailCtrl', ['$scope', 'fbutil', '$routeParams', '$sce', 'user', 'propose',
        function ($scope, fbutil, $routeParams, $sce, user, propose) {
            $scope.myUid = user.uid;
            $scope.pj = fbutil.syncObject(['projects', $routeParams.projectId]);
            $scope.id = $routeParams.projectId;
            $scope.propose = fbutil.syncObject(['projects', $scope.id, 'waitingList', user.uid]) || {};
            fbutil.ref(['projects', $scope.id, 'waitingList', user.uid, 'price'])
                .once('value', function (snap) {
                    if (snap.val() == null) {
                        $scope.proposeExists = false
                    } else if (snap.val() == 'accepted') {
                        $scope.proposeAccepted = true
                    }
                    else {
                        $scope.proposeExists = true
                    }
                });

            $scope.proposeSend = function (whom, price, message, name) {
                var messages = {price: price, message: message},
                    data = {status: 'waiting', pjName: name, price: price, client: whom};
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
            $scope.accept = function (projectId, whom, pjData, price) {
                var info = {
                    type: 'proposeAccepted',
                    price: price,
                    pjName: pjData.name,
                    client: user.uid
                };
                propose.Accept(projectId, user.uid, whom, info);
            };
            $scope.reject = function (projectId, whom, pjData) {
                var info = {
                    type: 'proposeRejected',
                    pjName: pjData.name
                };
                propose.Reject(projectId, user.uid, whom, info);
            }
        }
    ])
    .controller('JobManagerCtrl', ['$scope', 'fbutil', 'user', 'propose',
        function ($scope, fbutil, user, propose) {
            $scope.jbList = fbutil.syncObject(['users', user.uid, 'jobs']);
            $scope.proposeRemove = function (pid, whom) {
                propose.Remove(pid, user.uid, whom)
            };
            $scope.start = function (pid, whom) {
                propose.Start(pid, user.uid, whom);
                fbutil.ref(['projects', pid, 'due']).once('value', function (snap) {
                    fbutil.syncData(['users', user.uid, 'due', pid]).$update(snap.val(), {data: 'success'})
                });
            };
            $scope.acceptRejection = function (pid) {
                propose.AcceptRejection(pid, user.uid)
            }
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

            // update user data in user list and Data.
            $scope.userInfo = fbutil.syncObject(userInfoPos);
            $scope.userInfoUpdate = function () {
                $scope.userInfo.$save().then(function () {
                    var ref = fbutil.ref(['userList', user.uid]);
                    ref.update({
                        name: $scope.userInfo.name,
                        picture: $scope.userInfo.picture || '',
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
    .controller('UserListCtrl', ['$scope', 'fbutil',
        function ($scope, fbutil) {
            $scope.usrList = fbutil.syncObject('userList');
            $scope.rate = function (element, rate) {
                var uid = $(element).attr("data-id");
                fbutil.syncData(['userList', uid]).$update({rating: rate});
            }
        }
    ])
    .controller('UserDetailCtrl', ['$scope', '$firebase', 'fbutil', '$routeParams', '$sce',
        function ($scope, $firebase, fbutil, $routeParams, $sce) {
            $scope.userInfo = fbutil.syncObject(['users', $routeParams.userId, 'userInfo']);
        }
    ]);