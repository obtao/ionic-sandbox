'use strict;'

angular
    .module('rest-ionic-demo.controllers', [])
    .controller('abstractArticleCtrl', function($scope) {
    })
    .controller('articleListUnreadCtrl', [
        "$rootScope",
        "$scope",
        "$stateParams",
        "articleManager",
        function($rootScope, $scope, $stateParams, articleManager) {
            $scope.title = "Unread";
            var articlesList = articleManager.getUnreads();

            $scope.loadMore = function() {
                articlesList.loadMore(function() {
                    $scope.$broadcast('scroll.infiniteScrollComplete');
                }, function() {
                    $scope.$broadcast('scroll.infiniteScrollComplete');
                });
            };

            $scope.hasMore = function() {
                return articlesList.hasMore();
            }

            var update = function(event, articles) {
                $scope.articles = articles;
            }

            $rootScope.$on('unreadArticlesUpdated', update);

        }
    ])
    .controller('articleListArchivedCtrl', [
        "$rootScope",
        "$scope",
        "$stateParams",
        "articleManager",
        function($rootScope, $scope, $stateParams, articleManager) {
            $scope.title = "Archive";
            articleManager.getArchived();

            var update = function(event, articles) {
                $scope.articles = articles;
            }

            $rootScope.$on('archiveArticlesUpdated', update);

        }
    ])
    .controller('articleListStarredCtrl', [
        "$rootScope",
        "$scope",
        "$stateParams",
        "articleManager",
        function($rootScope, $scope, $stateParams, articleManager) {
            $scope.title = "Favorite";
            articleManager.getStarred();

            var update = function(event, articles) {
                $scope.articles = articles;
            }

            $rootScope.$on('starredArticlesUpdated', update);

        }
    ])
    .controller('articleTagListCtrl', [
        "$rootScope",
        "$scope",
        "$stateParams",
        "tagManager",
        function($rootScope, $scope, $stateParams, tagManager) {
            $scope.title = "Tags";

            var updateTags = function(tags) {
                $scope.tags = tags;
            }

            tagManager.getTags(updateTags);

            $scope.doRefresh = function() {
                var reloadEnded = function(){
                    $scope.$broadcast('scroll.refreshComplete');
                };
                tagManager.reloadTags().then(reloadEnded, reloadEnded);
            };

            $rootScope.$on('tagsUpdated', function(event, tags){
                console.log("UPDATE");
                updateTags(tags);
            });

        }
    ])
    .controller('articleViewCtrl', [
        "$scope",
        "$rootScope",
        "$stateParams",
        "articleManager",
        function($scope, $rootScope, $stateParams, articleManager) {
            var articleId = $stateParams.articleId;
            var update = function(event, article) {
                if (article.id == articleId) {
                    $scope.article = article;
                }
            }

            $rootScope.$on('articleUpdated', update);
            articleManager.getArticle(articleId);
        }
    ])
