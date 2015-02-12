'use strict;'

angular
    .module('rest-ionic-demo.services', [])

    .service('couac',[
        '$http',
        function($http){
            var baseUrl = AppSettings.baseApiUrl;

            this.generateUrl = function(restEndPoint, params) {
                params = params?params:{};

                var url = baseUrl;
                url    += restEndPoint;

                for (key in params) {
                    var regExp = new RegExp("{" + key + "}");
                    var value = encodeURIComponent(params[key]);
                    if (url.match(regExp)) {
                        url = url.replace(regExp, value);
                    } else {
                        url += "&" + key + "=" + value;
                    }
                }

                return url;
            }

        }]
    )

    .service('categoryManager',[
        '$rootScope',
        '$http',
        'couac',
        function($rootScope, $http, couac){
            var categories = [];
            this.getCategories = function( s , f) {
                var url = couac.generateUrl('categories');
                $http
                    .get(url)
                    .success(function(categories) {
                        $rootScope.$broadcast("categoriesUpdated", categories);
                        if( typeof s === "function" ) {
                            s(categories);
                        }
                    })
                    .error(function(data) {
                        if( typeof f === "function" ) {
                            f(data);
                        } else {
                            console.error(data);
                        }
                    });
            };

            this.getCategory = function( categoryId , s , f) {
                var url = couac.generateUrl('categories/{categoryId}/articles', {'categoryId' : categoryId});
                $http
                    .get(url)
                    .success(function(category) {
                        console.log(category);
                        $rootScope.$broadcast("categoryUpdated", category);
                        if( typeof s === "function" ) {
                            s(category);
                        }
                    })
                    .error(function(data) {
                        if( typeof f === "function" ) {
                            f(data);
                        } else {
                            console.error(data);
                        }
                    });
            };
        }]
    )
    .service('articleManager',[
        '$rootScope',
        '$http',
        'couac',
        function($rootScope, $http, couac){
            this.getArticle = function( articleId , s , f) {
                var url = couac.generateUrl('articles/{articleId}', {'articleId' : articleId});
                $http
                    .get(url)
                    .success(function(article) {
                        $rootScope.$broadcast("articleUpdated", article);
                        if( typeof s === "function" ) {
                            s(article);
                        }
                    })
                    .error(function(data) {
                        if( typeof f === "function" ) {
                            f(data);
                        } else {
                            console.error(data);
                        }
                    });
            };
        }]
    );