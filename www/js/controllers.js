'use strict;'

angular
    .module('rest-ionic-demo.controllers', [])
    .controller('leftMenuCtrl', [
        "$scope",
        "$rootScope",
        "categoryManager",
        function($scope, $rootScope, categoryManager) {
            var update = function(event, categories) {
                $scope.categories = categories;
            }

            $rootScope.$on('categoriesUpdated', update);
            categoryManager.getCategories();
        }
    ])
    .controller('abstractArticleCtrl', function($scope) {})
    .controller('articleListByCategoryCtrl', [
        "$scope",
        "$rootScope",
        "$stateParams",
        "categoryManager",
        function($scope, $rootScope, $stateParams, categoryManager) {
            var categoryId = $stateParams.categoryId;
            var update = function(event, category) {
                if (category.id == categoryId) {
                    $scope.title = category.name;
                    $scope.articles = category.articles;
                }
            }

            $rootScope.$on('categoryUpdated', update);
            categoryManager.getCategory(categoryId);
        }
    ])
    .controller('articleListLatestCtrl', [
        "$scope",
        "$stateParams",
        function($scope, $stateParams, Article) {
            $scope.title = "Latest";
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
