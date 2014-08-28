angular.module('simpleLogin', ['firebase', 'firebase.utils', 'changeEmail'])

    // a simple wrapper on simpleLogin.getUser() that rejects the promise
    // if the user does not exists (i.e. makes user required)
    .factory('requireUser', ['simpleLogin', '$q', function (simpleLogin, $q) {
        return function () {
            return simpleLogin.getUser().then(function (user) {
                return user ? user : $q.reject({ authRequired: true });
            });
        }
    }])

    .factory('simpleLogin', ['$firebaseSimpleLogin', 'fbutil', 'createProfile', 'changeEmail', '$q', '$rootScope', 'FBURL',
        function ($firebaseSimpleLogin, fbutil, createProfile, changeEmail, $q, $rootScope, FBURL) {
            var auth = $firebaseSimpleLogin(fbutil.ref());
            var listeners = [];

            function statusChange() {
                fns.getUser().then(function (user) {
                    fns.user = user || null;
                    angular.forEach(listeners, function (fn) {
                        fn(user || null);
                    });
                });
            }

            var fns = {
                user: null,

                getUser: function () {
                    return auth.$getCurrentUser();
                },
                /**
                 * @param {string} provider
                 * @param {string} email
                 * @param {string} pass
                 * @returns {*}
                 */
                login: function (provider, email, pass) {
                    var presenceCheck =function (user) {
                        presenceMonitor (FBURL, user.uid);
                    };
                    if (provider == 'password') {
                        return auth.$login('password', {
                            email: email,
                            password: pass,
                            rememberMe: true
                        }).then(presenceCheck);
                    } else {
                        return auth.$login(provider)
                            .then(function (user) {
                                presenceCheck(user);
                                fbutil.ref(['users', user.uid, 'userInfo', 'name'])
                                    .once('value', function (snapshot) {
                                        var isNew = (snapshot.val() == null);
                                        if (isNew) {
                                            if (provider == 'google') {
                                                var providedEmail = user.email
                                            }
                                            else {
                                                providedEmail = null
                                            }
                                            var displayName = user.displayName || user.username;
                                            return createProfile(provider, providedEmail, displayName, user)
                                                .then(function () {
                                                    return user;
                                                })
                                        }
                                    }
                                )
                            })
                    }

                },

                logout: function () {
                    auth.$logout();
                },

                createAccount: function (email, pass, name) {
                    return auth.$createUser(email, pass)
                        .then(function () {
                            // authenticate so we have permission to write to Firebase
                            return fns.login('password', email, pass);
                        })
                        .then(function (user) {
                            // store user data in Firebase after creating account
                            return createProfile('password', email, name, user).then(function () {
                                return user;
                            })
                        });
                },

                changePassword: function (email, oldpass, newpass) {
                    return auth.$changePassword(email, oldpass, newpass);
                },

                changeEmail: function (password, newEmail) {
                    return changeEmail(password, fns.user.email, newEmail, this);
                },

                removeUser: function (email, pass) {
                    return auth.$removeUser(email, pass);
                },

                watch: function (cb, $scope) {
                    fns.getUser().then(function (user) {
                        cb(user);
                    });
                    listeners.push(cb);
                    var unbind = function () {
                        var i = listeners.indexOf(cb);
                        if (i > -1) {
                            listeners.splice(i, 1);
                        }
                    };
                    if ($scope) {
                        $scope.$on('$destroy', unbind);
                    }
                    return unbind;
                }
            };

            $rootScope.$on('$firebaseSimpleLogin:login', statusChange);
            $rootScope.$on('$firebaseSimpleLogin:logout', statusChange);
            $rootScope.$on('$firebaseSimpleLogin:error', statusChange);
            statusChange();

            return fns;
        }])

    .factory('createProfile', ['fbutil', '$q', '$timeout', function (fbutil, $q, $timeout) {
        return function (provider, email, name, user) {
            var ref = fbutil.ref('users', user.uid, 'userInfo'), def = $q.defer();
            var onComplete = function (err) {
                $timeout(function () {
                    if (err) {
                        def.reject(err);
                    }
                    else {
                        if (provider != 'password') {
                            getExtraData(provider).then(
                                function (ExtraData) {
                                    ref.update(ExtraData)
                                }
                            );
                        }
                        def.resolve(ref);
                    }
                })
            };
            ref.set({
                email: email,
                name: name || firstPartOfEmail(email)
            }, onComplete);

            function getExtraData(provider) {
                var picture, locale, email, link;
                var err = 'Error 404';
                var userData = user.thirdPartyUserData, def = $q.defer();
                switch (provider) {
                    case 'google':
                        picture = userData.picture || err;
                        locale = userData.locale || err;
                        email = userData.email || err;
                        link = userData.link || err;
                        break;
                    case 'facebook':
                        picture = userData.picture.data.url || err;
                        locale = userData.locale || err;
                        email = null;
                        link = userData.link || err;
                        break;
                    case 'gitHub':
                        picture = userData.avatar_url || err;
                        locale = null;
                        email = userData.emails[0].email || err;
                        link = userData.html_url || err;
                        break;
                    case 'twitter':
                        picture = userData.profile_image_url || err;
                        locale = userData.lang || err;
                        email = null;
                        link = null;
                        break;
                    case 'default':
                        console.log('unknown provider');
                }
                var thirdPartyUserData = {
                    picture: picture,
                    locale: locale,
                    email: email,
                    link: link
                };
                def.resolve(thirdPartyUserData);

                return def.promise;
            }

            function firstPartOfEmail(email) {
                return ucfirst(email.substr(0, email.indexOf('@')) || '');
            }

            function ucfirst(str) {
                // credits: http://kevin.vanzonneveld.net
                str += '';
                var f = str.charAt(0).toUpperCase();
                return f + str.substr(1);
            }

            return def.promise;
        }
    }]);
