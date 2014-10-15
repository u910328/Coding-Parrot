/**
 * Created by 博彥 on 15/10/2014.
 */
angular.module('myApp.debug', [])
    .directive('debug', function () {
        return {
            restrict: 'E',
            scope: {},
            templateUrl: 'partials/directiveTemplates/debug.html',
            controller: function($scope, visualCtrl){
                $scope.visibility=visualCtrl.visibility;
            }
        }
    });