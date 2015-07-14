'use strict;'

angular
    .module('wallabag.controllers', [])
    .controller('abstractArticleCtrl', [
        function() {}
    ])
    .controller('articleListCtrl', [
        "$rootScope",
        "$scope",
        "$stateParams",
        "$state",
        "$ionicLoading",
        "articleManager",
        "title",
        "paginatorName",
        function($rootScope, $scope, $stateParams, $state, $ionicLoading, articleManager, title, paginatorName) {
            var paginator, loading;

            $scope.title = title;
            $scope.articles = [];
            $scope.data = {
                showDelete : false
            };

            $scope.loadMore = function() {
                if (!paginator || loading) {
                    return ;
                }
                loading = true;

                paginator
                    .getNextItems()
                    .then(function(items){
                        $scope.articles = $scope.articles.concat(items);
                    }, function(err){
                        console.error(err);
                    })
                    .finally(function(){
                        $scope.$broadcast('scroll.infiniteScrollComplete');
                        loading = false;
                    })
            };

            $scope.deleteArticle = function(article) {
                article.delete = true;
                articleManager.deleteArticle(article).then(function(){
                    $scope.articles.splice($scope.articles.indexOf(article), 1);
                    dfd.resolve();
                });
            }

            $scope.synchronize = function() {
                $ionicLoading.show({
                    template: 'Loading...'
                });

                articleManager.synchronize().then(function(data) {
                    $ionicLoading.hide();
                    $state.go($state.current, {}, {reload: true});
                });

            }

            $scope.hasMore = function() {
                if (!paginator) { return ;}

                return paginator.hasMore();
            }

            articleManager.getPaginator(paginatorName).then(function(articlePaginator){
                paginator = articlePaginator;
            });
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

            tagManager.getTags().then(updateTags);

            $scope.doRefresh = function() {
                var reloadEnded = function(){
                    $scope.$broadcast('scroll.refreshComplete');
                };
                tagManager.reloadTags().then(reloadEnded, reloadEnded);
            };

        }
    ])
    .controller('articleViewCtrl', [
        "$scope",
        "$state",
        "$rootScope",
        "$stateParams",
        "articleManager",
        function($scope, $state, $rootScope, $stateParams, articleManager) {
            var articleId = $stateParams.articleId;
            var update = function(article) {
                $scope.article = article;
            }

            $scope.deleteArticle = function() {
                articleManager.deleteArticle($scope.article).then(function(){
                    $state.go("article.unread", {}, {reload: true});
                });
            }

            $scope.markAsRead = function() {
                articleManager.markAsRead($scope.article).then(function(){
                    $scope.article.is_archived = true;
                });
            }

            $scope.markAsFavorite = function() {
                articleManager.markAsFavorite($scope.article).then(function(){
                    $scope.article.is_starred = true;
                });
            }

            articleManager.getArticle(articleId).then(update);
        }
    ])
