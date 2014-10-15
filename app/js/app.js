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
    'myApp.debug',
    'ngSanitize',
    'myApp.timeAgo',
    'ui.bootstrap',
    'ui.calendar',
    'ng-context-menu'
])

    .run(['simpleLogin', 'FBURL', function (simpleLogin, FBURL) {
        console.log('run'); //debug
    }]);
