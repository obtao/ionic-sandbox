'use strict;'

angular
    .module('rest-ionic-demo', ['ionic', 'rest-ionic-demo.controllers', 'rest-ionic-demo.services', 'couac', 'pouchdb'])

    .run([
        '$ionicPlatform',
        '$http',
        'wsse',
        function($ionicPlatform, $http, wsse) {
            $ionicPlatform.ready(function() {});
            var username="admin";
            var password = wsse.sha1("mypassword" + "admin" + "722e74f446a6d25f0e2e438e77c13c8f");

            $http.defaults.headers.common['x-wsse'] = function() {
                return wsse.getHeaderValue(username, password);
            };
            $http.defaults.headers.common.Authorization = 'profile=UsernameToken';
        }
    ])

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
                views: {
                    'articleContent': {
                        templateUrl: 'templates/articleList.html',
                        controller: 'articleListUnreadCtrl'
                    }
                }
            })

            .state('article.archived', {
                url: "/archive",
                views: {
                    'articleContent': {
                        templateUrl: 'templates/articleList.html',
                        controller: 'articleListArchivedCtrl'
                    }
                }
            })

            .state('article.starred', {
                url: "/favorites",
                views: {
                    'articleContent': {
                        templateUrl: 'templates/articleList.html',
                        controller: 'articleListStarredCtrl'
                    }
                }
            })

            .state('article.tags', {
                url: "/tags",
                views: {
                    'articleContent': {
                        templateUrl: 'templates/article.tagList.html',
                        controller: 'articleTagListCtrl'
                    }
                }
            })

            .state('article.view', {
                url: '/view/:articleId',
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