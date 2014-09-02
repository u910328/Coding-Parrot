'use strict';

// Declare app level module which depends on filters, and services
angular.module('myApp', [
    'myApp.config',
    'myApp.controllers',
    'myApp.decorators',
    'myApp.directives',
    'myApp.filters',
    'myApp.routes',
    'myApp.services',
    'ngSanitize',
    'myApp.timeAgo',
    'ui.bootstrap'
])

    .run(['simpleLogin', 'FBURL', function (simpleLogin, FBURL) {
        console.log('run'); //debug
    }]);