'use strict;'

angular.module('wallabag.factories', ['pouchdb'])
    .factory("DBPaginator",[
        '$q',
        'utils',
        function($q, utils) {
            var request, perPage, currentPage, items, db, initialized, options, loading, hasMore;

            function handleResponse(response) {
                var dfd = $q.defer();

                if (response.docs.length > 0) {
                    items = response.docs;

                    if(!initialized) {
                        initialized = true;
                        currentPage = 1;
                    } else {
                        ++currentPage;
                    }
                    options.skip = currentPage * perPage;
                } else {
                    hasMore = false;
                    items = [];
                }

                dfd.resolve(items);

                return dfd.promise;
            }

            function DBPaginator(pDb, pOptions, pPerPage) {
                request = request;
                options = pOptions?pOptions:{};
                perPage = perPage?perPage:15;
                db = pDb;
                items = [];
                hasMore = true;
                initialized = false;
                options.limit= perPage;
                options.skip = 0;
            }

            DBPaginator.prototype = {};

            DBPaginator.prototype.getNextItems = function() {
                var dfd = $q.defer();

                if(loading) {
                    dfd.reject("Already loading next page");
                }

                db
                    .find(options)
                    .then(handleResponse)
                    .then(dfd.resolve, dfd.reject)
                    .then(function(){
                        loading = false;
                    });

                return dfd.promise;
            }

            DBPaginator.prototype.hasMore = function() {
                return hasMore;
            }

            return (DBPaginator);
        }
    ]
);