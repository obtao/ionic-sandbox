'use strict;'

angular
    .module('wallabag', ['ionic', 'wallabag.controllers', 'wallabag.services', 'wallabag.factories', 'couac', 'pouchdb', 'ngCordova', 'angularMoment'])

    .run([
        '$ionicPlatform',
        '$http',
        '$rootScope',
        'wsse',
        function($ionicPlatform, $http, $rootScope, wsse) {
            $ionicPlatform.ready(function() {});
            $rootScope.user = {
                username : AppSettings.username,
            };
            var encryptedPassword = wsse.sha1(AppSettings.password + AppSettings.username + AppSettings.salt);

            $http.defaults.headers.common['x-wsse'] = function() {
                return wsse.getHeaderValue(AppSettings.username, encryptedPassword);
            };
            $http.defaults.headers.common.Authorization = 'profile=UsernameToken';
        }
    ])


    .constant('angularMomentConfig', {
        preprocess: 'utc',
        timezone: 'Europe/Berlin'
    })


    .config(function($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('article', {
                url: "/article",
                abstract: true,
                templateUrl: "templates/main.html",
                controller: 'abstractArticleCtrl'
            })

            .state('article.unread', {
                url: "/unread",
                cache: false,
                views: {
                    'articleContent': {
                        templateUrl: 'templates/articleList.html',
                        controller: 'articleListCtrl',
                        resolve : {
                            title : function() {return "Unread"; },
                            paginatorName : function() {return "unreads"; }
                        }
                    }
                }
            })

            .state('article.archived', {
                url: "/archive",
                cache: false,
                views: {
                    'articleContent': {
                        templateUrl: 'templates/articleList.html',
                        controller: 'articleListCtrl',
                        resolve : {
                            title : function() {return "Archived"; },
                            paginatorName : function() {return "archived"; }
                        }
                    }
                }
            })

            .state('article.starred', {
                url: "/favorites",
                cache: false,
                views: {
                    'articleContent': {
                        templateUrl: 'templates/articleList.html',
                        controller: 'articleListCtrl',
                        resolve : {
                            title : function() {return "Favorites"; },
                            paginatorName : function() {return "starred"; }
                        }
                    }
                }
            })

            .state('article.tags', {
                url: "/tags",
                cache: false,
                views: {
                    'articleContent': {
                        templateUrl: 'templates/article.tagList.html',
                        controller: 'articleTagListCtrl'
                    }
                }
            })

            .state('article.view', {
                url: '/view/:articleId',
                cache: false,
                views: {
                    'articleContent': {
                        templateUrl: 'templates/articleView.html',
                        controller: 'articleViewCtrl'
                    }
                }
            })

        $urlRouterProvider.otherwise('/article/unread');
    })

    .filter('trustAsHtml', function ($sce) {
        return function (value) {
            return $sce.trustAsHtml(value);
        };
    })

    .filter('stripTags', function() {
        return function(text) {
            var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
            var embeddedContent = /\[embedded content\]/gi;
            var comments = /<!--[\s\S]*?-->/gi;

            return text
                .replace(comments, '')
                .replace(embeddedContent, '')
                .replace(tags, '');
        }
    })
    ;