'use strict;'

angular
    .module('rest-ionic-demo', ['ionic', 'rest-ionic-demo.controllers', 'rest-ionic-demo.services'])

    .run(function($ionicPlatform) {
        $ionicPlatform.ready(function() {});
    })

    .config(function($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('article', {
                url: "/article",
                abstract: true,
                templateUrl: "templates/main.html",
                controller: 'abstractArticleCtrl'
            })

            .state('article.listByDate', {
                url: "/latest",
                views: {
                    'articleContent': {
                        templateUrl: 'templates/articleList.html',
                        controller: 'articleListLatestCtrl'
                    }
                }
            })

            .state('article.listByCategory', {
                url: '/byCategory/:categoryId',
                views: {
                    'articleContent': {
                        templateUrl: 'templates/articleList.html',
                        controller: 'articleListByCategoryCtrl'
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

        $urlRouterProvider.otherwise('/article/latest');
    });