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
                return $q(
                    function(resolve, reject){
                        dbTags = [];
                        tags.forEach(function(tag){
                            tag['_id'] = tag.id.toString();
                            dbTags.push(tag);
                        });

                        db.bulkDocs(dbTags).then(function(){
                            tagManager.getTags().then(resolve, reject);
                        }, function(err){
                            reject(err);
                        });
                    }
                )
            };

            //Load tags from a remote server
            function loadTags() {
                return $q(
                    function(resolve, reject){
                        console.debug("[TAGS] RELOAD FROM SERVER");
                        $http
                            .get(couac.generateUrl('tags'))
                            .success(function(tags) {
                                saveTags(tags).then(resolve, reject);
                            })
                            .error(function(data) {
                                reject(data);
                            });
                    }
                )
            };

            //Get tags from cache if any
            this.getTags = function() {
                return $q(
                    function(resolve, reject) {
                        db
                            .allDocs({include_docs: true})
                            .then(
                                function(tags){
                                    if (tags.total_rows.length != 0) {
                                        console.debug("[TAGS] GET FROM POUCHDB");
                                        tags = utils.extractObjects(tags.rows);
                                        $rootScope.$broadcast('tagsUpdated', tags);
                                        resolve(tags);
                                    } else {
                                        loadTags().then(resolve, reject);
                                    }
                                },
                                function(err){
                                    tagManager.reloadTags().then(resolve, reject);
                                }
                        );
                    }
                );
            };

            // Force cache reload
            this.reloadTags = function(){
                return $q(
                    function(resolve, reject) {
                        console.debug("[TAGS] RELOAD TAGS FORCE");
                        db
                            .destroy()
                            .then(
                                function(){
                                    db = pouchDB("tags");
                                    loadTags().then(resolve, reject);
                                }
                            );
                    }
                );
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