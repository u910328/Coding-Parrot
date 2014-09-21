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
        $scope.review.rating = {};
        $scope.rating = {quality: 0, completeness: 0, speed: 0};
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
    .controller('ProjectCreatorCtrl',
    function ($scope, fbutil, user, $location, project, cateAndLang, bvOptn, dateUtil) {
        $scope.pj = {};
        $scope.user = user;
        $scope.categories = cateAndLang.categories;
        $scope.languages = cateAndLang.languages;
        var bvVldtr = bvOptn.fields;
        $scope.bvOptions = {
            // To use feedback icons, ensure that you use Bootstrap v3.1.0 or later
            fields: {
                projectName: bvVldtr.projectName,
                catePicker: bvVldtr.catePicker,
                datePicker: bvVldtr.datePicker,
                brief: bvVldtr.brief,
                description: bvVldtr.description,
                price: bvVldtr.price
            }
        };

        $scope.selectCate = function () {
            if ($scope.form.selectedCate != null) {
                $scope.pj.category = $scope.form.selectedCate.name;
            }
        };
        $scope.addLang = function () {
            cateAndLang.Add('language', $scope.form.selectedLang, $scope.pj);
            $scope.form.selectedLang = null
        };
        $scope.removeLang = function (lid) {
            cateAndLang.Remove('language', $scope.pj, lid);
        };

        $scope.createProject = function () {
            $scope.pj.due = Date.parse($scope.form.dt) || $scope.form.dt;
            var pjListData = {
                name: $scope.pj.name,
                brief: $scope.pj.brief,
                language: $scope.pj.language,
                category: $scope.pj.category,
                price:$scope.pj.price,
                requirements: $scope.pj.requirements || '',
                due: $scope.pj.due
            };
            project.Create(user.uid, $scope.pj, pjListData);
            $location.path('/projectManager');
        };
        $scope.minDate = dateUtil.afterNday(3);
        $scope.form = {};                 //for transclude scope
        $scope.open = function ($event) {
            $event.preventDefault();
            $event.stopPropagation();
            $scope.$emit('revalidateDate');
            $scope.form.opened = !$scope.form.opened;
        };

        $scope.dateOptions = {
            formatYear: 'yy',
            startingDay: 1
        };
    }
)
    .controller('ProjectEditorCtrl', function ($scope, fbutil, $routeParams, user, project, $location, cateAndLang, bvOptn, dateUtil) {
        var init = function () {
            $scope.minDate = dateUtil.afterNday(3);
            $scope.$watch('pj.due', function (nVal, oVal) {
                if ((oVal != undefined) && (!$scope.oldDueCount)) {                                 //locate and remove old due
                    $scope.oldDueCount = true;
                    $scope.oldDue = oVal;
                }
            });
            fbutil.ref(['projects', $routeParams.projectId, 'category']).once('value', function (snap) {
                for (var i = 0; i < cateAndLang.categories.length; i++) {
                    if (cateAndLang.categories[i].name == snap.val()) {
                        $scope.selectedCate = cateAndLang.categories[i];
                    }
                }
            })
        };
        init();
        var bvVldtr = bvOptn.fields;
        $scope.bvOptions = {
            fields: {
                projectName: bvVldtr.projectName,
                description: bvVldtr.description,
                catePicker: bvVldtr.catePicker,
                datePicker: bvVldtr.datePicker,
                brief: bvVldtr.brief,
                price: bvVldtr.price
            }
        };

        $scope.pj = fbutil.syncObject(['projects', $routeParams.projectId]);  //todo: combine this with loadCate
        $scope.id = $routeParams.projectId;

        $scope.categories = cateAndLang.categories;
        $scope.languages = cateAndLang.languages;

        $scope.form = {};
        $scope.validFormtype = true;

        $scope.addLang = function () {
            cateAndLang.Add('language', $scope.form.selectedLang, $scope.pj);
            $scope.form.selectedLang = null
        };
        $scope.removeLang = function (lid) {
            cateAndLang.Remove('language', $scope.pj, lid);
        };
        $scope.updateProject = function () {
            $scope.pj.due = Date.parse($scope.pj.due) || $scope.pj.due;
            var listData = {
                name: $scope.pj.name,
                brief: $scope.pj.brief,
                price:$scope.pj.price,
                language: $scope.pj.language,
                category: $scope.pj.category,
                requirements: $scope.pj.requirements || '',
                due: $scope.pj.due
            };
            project.Update($scope.pj, user.uid, listData);
            if ($scope.oldDue) {
                fbutil.syncData(['users', user.uid, 'due', $scope.id]).$remove($scope.oldDue)
            }
            $location.path('/projectManager');
        };

        $scope.open = function ($event) {
            $event.preventDefault();
            $event.stopPropagation();
            $scope.$emit('revalidateDate');
            $scope.form.opened = !$scope.form.opened;
        };

        $scope.dateOptions = {
            formatYear: 'yy',
            startingDay: 1
        };
    }
)
    .controller('ProjectDetailCtrl', function ($scope, fbutil, $routeParams, $sce, user, propose, bvOptn, dateUtil) {
        $scope.myUid = user.uid;
        $scope.pj = fbutil.syncObject(['projects', $routeParams.projectId]);
        $scope.id = $routeParams.projectId;
        $scope.bvOptions = {
            fields: {
                datePicker: bvOptn.fields.datePicker,
                proposePrice: bvOptn.fields.price
            }
        };
        $scope.propose = fbutil.syncObject(['projects', $scope.id, 'waitingList', user.uid]) || {};
        $scope.form = {};
        $scope.minDate = dateUtil.afterNday(3);
        $scope.open = function ($event) {
            $event.preventDefault();
            $event.stopPropagation();
            $scope.$emit('revalidateDate');
            $scope.form.opened = !$scope.form.opened;
        };
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
        $scope.proposeSend = function (prps, pj) {
            var data = {status: 'waiting', client: pj.clientUid, pjName: pj.name, price: prps.price, expectDue: prps.expectDue};
            $scope.propose.expectDue = Date.parse($scope.propose.expectDue) || $scope.propose.expectDue;
            propose.Send($scope.id, user.uid, pj.clientUid, prps, data);
            $scope.proposeExists = true
        };
        $scope.proposeRemove = function (whom) {
            propose.Remove($scope.id, user.uid, whom);
            $scope.proposeExists = false
        };
        $scope.dateOptions = {
            formatYear: 'yy',
            startingDay: 1
        };
    }
)
    .controller('ProjectListCtrl', ['$scope', '$firebase', 'fbutil', 'cateAndLang',
        function ($scope, $firebase, fbutil, cateAndLang) {
            $scope.pjList = fbutil.syncObject('projectList');
            $scope.categories = cateAndLang.categories;
            $scope.languages = cateAndLang.languages;
            $scope.predicate = '-createdTime';

            $scope.vnList = {};
            $scope.vnFontColor = {};
            $scope.vnIconBg = {};
            $scope.vnMover = function (color, index) {
                $scope.vnList[index] = {'background-color': color};
                $scope.vnFontColor[index] = {color: 'white'};
                $scope.vnIconBg[index] = {'background-color': 'white'}
            };

            $scope.vnMleave = function (color, index) {
                $scope.vnList[index] = {};
                $scope.vnFontColor[index] = {};
                $scope.vnIconBg[index] = {'background-color': color}
            };

            $scope.reverse = false;
            $scope.selCate = function (cate) {
                $scope.cate = cate;
                if (cate == 'all') {
                    $scope.cate = ""
                }
            };
            $scope.selLang = function (lang) {
                $scope.lang = lang;
                if (lang == 'all') {
                    $scope.lang = ""
                }
            }
        }
    ])
    .controller('ProjectManagerCtrl', ['$scope', 'fbutil', 'user', 'propose', 'project', 'cateAndLang',
        function ($scope, fbutil, user, propose, project, cateAndLang) {
            $scope.pjList = fbutil.syncObject(['users', user.uid, 'projects']);
            $scope.select = {};
            $scope.pjSelect = {};
            $scope.select.all = true;
            $scope.togglePj = function (ref) {
                $scope.select.all = true;
                $scope.select[ref] = $scope.select[ref] ? false : true;
                for (var key in $scope.select) {
                    if ($scope.select[key] && key != 'all') {
                        $scope.select.all = false
                    }
                }
            };
            $scope.proposeFilter = function () {
                return function (item) {
                    return $scope.select[item.ref] || $scope.select.all
                };
            };

            $scope.remove = function (projectId) {
                project.Remove(user.uid, projectId)
            };
            $scope.waitingList = [];
            $scope.$watch('pjList', function (nv) {
                $scope.waitingList = [];
                var patt = /\$/;
                angular.forEach(nv, function (pjData, pjRef) {
                    var res = patt.test(pjRef);
                    if (!res) {
                        if (pjData.waitingList) {
                            angular.forEach(pjData.waitingList, function (request, coder) {
                                $scope.waitingList.push({
                                    ref: pjRef,
                                    name: pjData.name,
                                    request: request,
                                    coder: coder})
                            })
                        }
                    }
                });
            }, true);
            $scope.categories = cateAndLang.categories;
            $scope.languages = cateAndLang.languages;
            $scope.selCate = function (cate) {
                $scope.cate = cate;
                if (cate == 'all') {
                    $scope.cate = ""
                }
            };
            $scope.selLang = function (lang) {
                $scope.lang = lang;
                if (lang == 'all') {
                    $scope.lang = ""
                }
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
        $scope.rememberMe = false;

        $scope.login = function (email, pass, rememberMe, provider) {
            $scope.err = null;

            simpleLogin.login(email, pass, rememberMe, provider)
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

    .controller('AccountCtrl', ['$scope', 'simpleLogin', 'fbutil', 'user', '$location', 'cateAndLang', 'bvOptn',
        function ($scope, simpleLogin, fbutil, user, $location, cateAndLang, bvOptn) {
            // create a 3-way binding with the user profile object in Firebase
            var userInfoPos = ['users', user.uid, 'userInfo'];                 //remember to change changeEmail and UserDetailCtrl if you change this (also in simpleLogin.js)
            var profile = fbutil.syncObject(userInfoPos);
            profile.$bindTo($scope, 'profile');

            var bvVldtr = bvOptn.fields;
            $scope.bvOptions = {
                fields: {
                    userName: bvVldtr.username,
                    email: bvVldtr.email
                }
            };

            // update user data in user list and Data.
            $scope.userInfo = fbutil.syncObject(userInfoPos);
            $scope.showPwdEml = user.provider == 'password';
            $scope.categories = cateAndLang.categories;
            $scope.languages = cateAndLang.languages;

            $scope.addCate = function () {
                cateAndLang.Add('categories', $scope.selectedCate, $scope.userInfo);
                $scope.selectedCate = null
            };
            $scope.removeCate = function (cid) {
                cateAndLang.Remove('categories', $scope.userInfo, cid);
            };
            $scope.addLang = function () {
                cateAndLang.Add('languages', $scope.selectedLang, $scope.userInfo);
                $scope.selectedLang = null
            };
            $scope.removeLang = function (lid) {
                cateAndLang.Remove('languages', $scope.userInfo, lid);
            };

            $scope.userInfoUpdate = function () {
                $scope.userInfo.$save().then(function () {
                    var ref = fbutil.ref(['userList', user.uid]);
                    ref.update({
                        name: $scope.userInfo.name,
                        email: $scope.userInfo.email || '',
                        picture: $scope.userInfo.picture || '',
                        uid: user.uid
                    });
                    fbutil.syncData(['emailService', user.uid]).$update({
                        name: $scope.userInfo.name,
                        email: $scope.userInfo.email || '',
                        isUpdated: true,
                        sendNoti: false,
                        sendRec: false
                    })

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
    .controller('UserDetailCtrl', ['$scope', '$firebase', 'fbutil', '$routeParams', '$sce', 'chatService', 'user',
        function ($scope, $firebase, fbutil, $routeParams, $sce, chatService, user) {
            $scope.userInfo = fbutil.syncObject(['users', $routeParams.userId, 'userInfo']);
            $scope.showAddContact = false;
            $scope.showTalkTo = $routeParams.userId != user.uid;
            var isContactExist = function () {
                fbutil.ref(['users', user.uid, 'contacts', $routeParams.userId, 'Blocked'])
                    .once('value', function (snap) {
                        if (snap.val() != false && user.uid != $routeParams.userId) {
                            $scope.showAddContact = true
                        }
                    })
            };
            $scope.talkTo = function () {
                chatService.Create1to1Ref(user.uid, $routeParams.userId, true);
                $scope.$parent.chatShow = true
            };
            isContactExist();
            $scope.addContact = function () {
                if ($scope.showAddContact = true) {
                    chatService.AddContact(user.uid, $routeParams.userId, true);
                    $scope.showAddContact = false;
                }
            };
        }
    ])
    .controller('CalendarCtrl', ['$scope', 'fbutil', 'user', 'getFbData', function ($scope, fbutil, user, getFbData) {
        $scope.dues = getFbData.Dues;
        $scope.pushEvent = function (title, time) {
            var date = new Date(Number(time)).toISOString();
            var url = '#!/projects/detail/' + title;
            $scope.calEventsExt.events.push({
                title: title,
                start: date,
                url: url
            })
        };
        /* event source that contains custom events on the scope */
        $scope.events = [];
        /* event source that calls a function on every view switch */
        $scope.calEventsExt = {
            color: '#f00',
            textColor: 'white',
            events: []
        };

        /* config object */
        $scope.uiConfig = {
            calendar: {
                header: {
                    left: 'title',
                    center: '',
                    right: 'today prev,next'
                }
            }
        };
        /* event sources array*/
        $scope.eventSources = [$scope.events, $scope.calEventsExt];
    }])
    .controller('SandboxCtrl', ['$scope', 'fbutil', 'user', 'getFbData', function ($scope, fbutil, user, getFbData) {
        $scope.message = 'Right click triggered';

        $scope.panels = [
            { name: 'Panel 1' },
            { name: 'Panel 2' },
            { name: 'Panel 3' }
        ];

        $scope.addPanel = function () {
            $scope.panels.push({ name: 'Panel ' + ($scope.panels.length + 1) });
        };

        $scope.onRightClick = function (msg) {
            console.log(msg);
        };

        $scope.recreatePanels = function () {
            $scope.panels = angular.copy($scope.panels);
            console.log($scope.panels);
        }
    }]);