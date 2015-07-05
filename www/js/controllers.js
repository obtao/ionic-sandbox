'use strict;'

angular
    .module('wallabag.controllers', [])
    .controller('abstractArticleCtrl', [
        "$scope",
        "$state",
        "$ionicLoading",
        "articleManager",
        function($scope, $state, $ionicLoading, articleManager) {
            $scope.synchronize = function() {
                $ionicLoading.show({
                    template: 'Loading...'
                });

                articleManager.synchronize().then(function(data) {
                    $ionicLoading.hide();
                    $state.go($state.current, {}, {reload: true});
                });

            }
        }
    ])
    .controller('articleListCtrl', [
        "$rootScope",
        "$scope",
        "$stateParams",
        "articleManager",
        "title",
        "paginatorName",
        function($rootScope, $scope, $stateParams, articleManager, title, paginatorName) {
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
                }, function(){
                    article.delete = false;
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

            tagManager.getTags(updateTags);

            $scope.doRefresh = function() {
                var reloadEnded = function(){
                    $scope.$broadcast('scroll.refreshComplete');
                };
                tagManager.reloadTags().then(reloadEnded, reloadEnded);
            };

            $rootScope.$on('tagsUpdated', function(event, tags){
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
