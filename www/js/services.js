'use strict;'

angular
    .module('rest-ionic-demo.services', ['pouchdb','couac'])
    .service('utils', function(){
        this.extractObjects = function(dbObjects) {
            var objects = [];
            if (Array.isArray(dbObjects)) {
                dbObjects.forEach(function(obj){
                    objects.push(obj.doc);
                });

                return objects;
            } else {
                return dbObjects.doc;
            }

        }
    })
    .service('tagManager',[
        '$rootScope',
        '$http',
        '$q',
        'couac',
        'utils',
        'pouchDB',
        function($rootScope, $http, $q, couac, utils, pouchDB){
            var db = pouchDB("tags");
            var tagManager = this;

            function saveTags(tags) {
                var dfd = $q.defer();

                dbTags = [];
                tags.forEach(function(tag){
                    tag['_id'] = tag.id.toString();
                    dbTags.push(tag);
                });

                db.bulkDocs(dbTags).then(function(){
                    tagManager.getTags().then(dfd.resolve, dfd.reject);
                }, function(err){
                    reject(err);
                });

                return dfd.promise;
            };

            //Load tags from a remote server
            function loadTags() {
                var dfd = $q.defer();

                console.debug("[TAGS] RELOAD FROM SERVER");
                $http
                    .get(couac.generateUrl('tags'))
                    .success(function(tags) {
                        saveTags(tags).then(dfd.resolve, dfd.reject);
                    })
                    .error(function(data) {
                        dfd.reject(data);
                    });

                return dfd.promise;
            };

            //Get tags from cache if any
            this.getTags = function() {
                var dfd = $q.defer();

                db
                    .allDocs({include_docs: true})
                    .then(
                        function(tags){
                            if (tags.total_rows.length != 0) {
                                console.debug("[TAGS] GET FROM POUCHDB");
                                tags = utils.extractObjects(tags.rows);
                                $rootScope.$broadcast('tagsUpdated', tags);
                                dfd.resolve(tags);
                            } else {
                                loadTags().then(dfd.resolve, dfd.reject);
                            }
                        },
                        function(err){
                            tagManager.reloadTags().then(dfd.resolve, dfd.reject);
                        }
                );

                return dfd.promise;
            };

            // Force cache reload
            this.reloadTags = function(){
                var dfd = $q.defer();

                console.debug("[TAGS] RELOAD TAGS FORCE");
                db
                    .destroy()
                    .then(
                        function(){
                            db = pouchDB("tags");
                            loadTags().then(dfd.resolve, dfd.reject);
                        }
                    );

                return dfd.promise;
            };
        }]
    )
    .service('articleManager',[
        '$rootScope',
        '$http',
        'couac',
        function($rootScope, $http, couac) {
            var unreadPaginatedList;
            this.getUnreads = function() {
                if (!unreadPaginatedList) {
                    unreadPaginatedList = function(){
                        var items = [], lastResponse;

                        return {
                            loadMore : function(s, f) {
                                var url;
                                if (!lastResponse) {
                                    url = couac.generateUrl('entries', {}, 'json');
                                } else {
                                    url = lastResponse._links.next.href;
                                }

                                $http
                                    .get(url)
                                    .success(function(data) {
                                        lastResponse = data;
                                        items = items.concat(data._embedded.items);
                                        $rootScope.$broadcast("unreadArticlesUpdated", items);
                                        if( typeof s === "function" ) {
                                            s(items);
                                        }
                                    })
                                    .error(function(data) {
                                        if( typeof f === "function" ) {
                                            f(data);
                                        } else {
                                            console.error(data);
                                        }
                                    });

                                return this;
                            },
                            hasMore : function() {
                                return lastResponse == undefined || lastResponse.page != lastResponse.pages;
                            }
                        }
                    }();


                }

                return unreadPaginatedList;
            };
        }]
    );