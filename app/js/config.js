'use strict';

// Declare app level module which depends on filters, and services
angular.module('myApp.config', ['ngDisqus'])
    .config(['$disqusProvider', function ($disqusProvider) {
        $disqusProvider.setShortname('codingparrotbeta');  // Configure the disqus shortname
    }])

    // version of this seed app is compatible with angularFire 0.6
    // see tags for other versions: https://github.com/firebase/angularFire-seed/tags
    .constant('version', '0.8.0')

    // where to redirect Data if they need to authenticate (see routeSecurity.js)
    .constant('loginRedirectPath', '/home')

    // your Firebase URL goes here
    .constant('FBURL', 'https://codingparrot.firebaseio.com/')
    .constant('validFormOptions', {
        // To use feedback icons, ensure that you use Bootstrap v3.1.0 or later
        feedbackIcons: {
            valid: null /*'glyphicon glyphicon-ok'*/,
            invalid: null /*'glyphicon glyphicon-remove'*/,
            validating: null /*'glyphicon glyphicon-refresh'
*/        },
        submitButtons: 'button[type="bvSubmit"]',
        fields: {
            username: {
                message: 'The username is not valid',
                validators: {
                    notEmpty: {
                        message: 'The username is required'
                    },
                    stringLength: {
                        min: 6,
                        max: 30,
                        message: 'The username must be 6-30 characters long'
                    },
                    regexp: {
                        regexp: /^[a-zA-Z0-9]+$/,
                        message: 'The username can only consist of alphabetical and number'
                    },
                    different: {
                        field: 'password',
                        message: 'The username and password cannot be the same as each other'
                    }
                }
            },
            projectName: {
                message: 'The project name is not valid',
                validators: {
                    notEmpty: {
                        message: 'The project name is required'
                    },
                    stringLength: {
                        min: 6,
                        max: 30,
                        message: 'The project name must be 6-30 characters long'
                    }
                }
            },
            proposePrice: {
                message: 'The value is not valid',
                validators: {
                    notEmpty: {
                        message: 'required'
                    },
                    integer: {
                        message: 'The value is not an integer'
                    }
                }
            },
            email: {
                validators: {
                    notEmpty: {
                        message: 'The email address is required'
                    },
                    emailAddress: {
                        message: 'The email address is not valid'
                    }
                }
            },
            password: {
                validators: {
                    notEmpty: {
                        message: 'The password is required'
                    },
                    different: {
                        field: 'username',
                        message: 'The password cannot be the same as username'
                    },
                    stringLength: {
                        min: 8,
                        message: 'The password must have at least 8 characters'
                    }
                }
            },
            select: {
                validators: {
                    notEmpty: {
                        message: 'Please select one'
                    }
                }
            },
            datePicker: {
                validators: {
                    notEmpty: {
                        message: 'Please select a date'
                    },
                    date: {
                        format: 'YYYY/MM/DD'
                    }
                }
            },
            birthday: {
                validators: {
                    notEmpty: {
                        message: 'The date of birth is required'
                    },
                    date: {
                        format: 'YYYY/MM/DD',
                        message: 'The date of birth is not valid'
                    }
                }
            },
            requirements: {
                validators: {
                    notEmpty: {
                        message: 'required'
                    }
                }
            }
        }
    })

    // double check that the app has been configured before running it and blowing up space and time
    .run(['FBURL', '$timeout', function (FBURL, $timeout) {
        if (FBURL === 'https://INSTANCE.firebaseio.com') {
            angular.element(document.body).html('<h1>Please configure app/js/config.js before running!</h1>');
            $timeout(function () {
                angular.element(document.body).removeClass('hide');
            }, 250);
        }
    }]);


/*********************
 * !!FOR E2E TESTING!!
 *
 * Must enable email/password logins and manually create
 * the test user before the e2e tests will pass
 *
 * user: test@test.com
 * pass: test123
 */
