'use strict;'

angular
    .module('wallabag.services', [])
    .service('utils',function($cordovaNetwork){
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
        };

        this.hasNetwork = function() {
            return $cordovaNetwork.isOnline();
        };
    })
    .service('tagManager',[
        '$rootScope',
        '$http',
        '$q',
        'couac',
        'utils',
        'pouchDB',
        'DBPaginator',
        function($rootScope, $http, $q, couac, utils, pouchDB, DBPaginator){
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
                            if (tags.total_rows != 0) {
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
        '$q',
        'couac',
        'utils',
        'pouchDB',
        'DBPaginator',
        function($rootScope, $http, $q, couac, utils, pouchDB, DBPaginator){
            var db = initDb();
            var articleManager = this;

            function initDb() {
                var db = pouchDB("articles");
                db.createIndex({
                    index: {
                      fields: ['is_archived'],
                      name: "archived"
                    }
                });
                db.createIndex({
                    index: {
                      fields: ['id'],
                      name: "id"
                    }
                });
                db.createIndex({
                    index: {
                      fields: ['is_starred'],
                      name: "starred"
                    }
                });

                return db;
            }

            function saveServerArticles(articles) {
                var dfd = $q.defer();

                dbArticles = [];
                articles.forEach(function(article){
                    article['_id'] = article.id.toString();
                    article.href = article['_links'].self.href;
                    //"_" attributes generates a pouchDB error
                    delete article['_links'];

                    dbArticles.push(article);
                });

                db.bulkDocs(dbArticles).then(function(){
                    dfd.resolve();
                }, function(err){
                    console.error("[ARTICLES] Save articles problem", err);
                    dfd.reject(err);
                });

                return dfd.promise;
            };

            //Load articles from a remote server
            function loadServerArticles(page) {
                page = page?page:1;
                var dfd = $q.defer();

                $http
                    .get(couac.generateUrl('entries', {perPage : 50, page : page}))
                    .success(function(data) {
                        saveServerArticles(data['_embedded']['items']).then(function() {
                            if (page < data['pages']) {
                                loadServerArticles(++page).then(dfd.resolve, dfd.reject);
                            } else {
                                dfd.resolve();
                            }
                        }, dfd.reject);
                    })
                    .error(function(data) {
                        console.error("[ARTICLES] Load articles problem", err);
                        dfd.reject(data);
                    });

                return dfd.promise;
            };

            //Synchronize articles with server
            this.synchronize = function() {
                var dfd = $q.defer();

                console.error("Supprimer ceux qui doivent être supprimés");

                var dfd = $q.defer();

                db
                    .destroy()
                    .then(
                        function(){
                            db = initDb();
                            loadServerArticles().then(dfd.resolve, dfd.reject).finally(function() {
                                $rootScope.$broadcast("articlesSynchronizationEnded");
                            });
                        }
                    );

                return dfd.promise;
            };

            this.deleteArticle = function(article) {
                var dfd = $q.defer();

                $http
                    .delete(couac.generateUrl('entries/{idEntry}', {idEntry : article.id}))
                    .finally(function(){
                        db.remove(article).then(dfd.resolve, dfd.reject);
                    });

                return dfd.promise;
            };

            this.getPaginator = function(paginatorName) {
                paginatorName = paginatorName.charAt(0).toUpperCase() + paginatorName.slice(1);
                var methodName = "get" + paginatorName + "Paginator";
                if (typeof this[methodName] != "function") {
                    throw "The paginator " + paginatorName + " does not exist"
                }

                var dfd = $q.defer();

                this[methodName]().then(dfd.resolve, dfd.reject);

                return dfd.promise;
            };

            this.getUnreadsPaginator = function() {
                var dfd = $q.defer();

                var query = {
                    selector : {
                        'is_archived' : false
                    }
                };
                var paginator = new DBPaginator(db, query);

                dfd.resolve(paginator);

                return dfd.promise;
            };

            this.getArchivedPaginator = function() {
                var dfd = $q.defer();

                var query = {
                    selector : {
                        'is_archived' : true
                    }
                };
                var paginator = new DBPaginator(db, query);

                dfd.resolve(paginator);

                return dfd.promise;
            };

            this.getStarredPaginator = function() {
                var dfd = $q.defer();

                var query = {
                    selector : {
                        'is_starred' : true
                    }
                };
                var paginator = new DBPaginator(db, query);

                dfd.resolve(paginator);

                return dfd.promise;
            };
        }]
    )
;