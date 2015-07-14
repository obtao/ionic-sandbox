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

                db
                    .bulkDocs(dbTags)
                    .then(tagManager.getTags, dfd.reject)
                    .then(dfd.resolve, dfd.reject);

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
        'userActionManager',
        function($rootScope, $http, $q, couac, utils, pouchDB, DBPaginator, userActionManager){
            var db;
            var articleManager = this;

            function initDb() {
                var dfd = $q.defer();
                var indexes = [
                    { name : 'archived', fields : ['is_archived'], ddoc: 'archived'},
                    { name : 'id', fields : ['id'], ddoc: 'id'},
                    { name : 'starred', fields : ['is_starred'], ddoc: 'starred'},
                    { name : 'deleted', fields : ['_deleted'], ddoc: 'deleted'}
                ];
                var indexesLeft = indexes.length;
                db = pouchDB("articles");

                function createIndex(index) {
                    db.createIndex({
                        index: index
                    }).then(function() {
                        if (--indexesLeft == 0) {
                            dfd.resolve();
                        }
                    }, dfd.reject);
                }

                indexes.forEach(createIndex);

                return dfd.promise;
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
                var dfd = $q.defer();
                page = (page && typeof page != "Object")?page:1;

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
                    .error(function(err) {
                        console.error("[ARTICLES] Load articles problem", err);
                        dfd.reject(err);
                    });

                return dfd.promise;
            };

            initDb();

            this.getArticle = function(articleId) {
                var dfd = $q.defer()

                db
                    .get(articleId)
                    .then(dfd.resolve, dfd.reject);

                return dfd.promise;
            }

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

            this.deleteArticle = function(article) {
                var dfd = $q.defer();

                $http
                    .delete(couac.generateUrl('entrievcxvcxs/{idEntry}', {idEntry : article.id}))
                    .then(null, function(){
                        userActionManager.insertAction('delete', article.id);
                    })
                    .finally(function(){
                        db.remove(article).then(dfd.resolve, dfd.reject);
                    });

                return dfd.promise;
            };

            this.markAsFavorite = function(article) {
                var dfd = $q.defer();

                article.is_starred = true;

                $http
                    .patch(couac.generateUrl('entriesfsdfds/{idEntry}', {idEntry : article.id}), article)
                    .then(dfd.resolve(),function(){
                        userActionManager.insertAction('update', article.id.toString());
                    })
                    .finally(function(){
                        db.put(article).then(dfd.resolve, dfd.reject);
                    });

                return dfd.promise;
            };

            this.markAsRead = function(article) {
                var dfd = $q.defer();

                article.is_archived = true;

                $http
                    .patch(couac.generateUrl('entriesfsdfds/{idEntry}', {idEntry : article.id}), article)
                    .then(dfd.resolve(),function(){
                        userActionManager.insertAction('update', article.id.toString());
                    })
                    .finally(function(){
                        db.put(article).then(dfd.resolve, dfd.reject);
                    });

                return dfd.promise;
            };

            //Synchronize articles with server
            this.synchronize = function() {
                var dfd = $q.defer();

                this
                    .synchronizeDeleted()
                    .then(this.synchronizeUpdates, dfd.reject)
                    .then(this.reloadDatas, dfd.reject)
                    .finally(function() {
                        $rootScope.$broadcast("articlesSynchronizationEnded");
                        dfd.resolve();
                    });

                return dfd.promise;
            };

            this.synchronizeDeleted = function() {
                var dfd = $q.defer();

                userActionManager.getAction('delete').then(function(data){
                    var actionsLeft = data.docs.length;
                    if (actionsLeft == 0) {
                        dfd.resolve();
                    }
                    data.docs.forEach(function(action) {
                        db.get(action.content).then(function() {

                        });
                        $http
                            .delete(couac.generateUrl('entries/{idEntry}', {idEntry : action.content}))
                            .then(function(){
                                userActionManager.deleteAction(action).then(
                                    function() {
                                        if (--actionsLeft == 0) {
                                            dfd.resolve();
                                        }
                                    },
                                    dfd.reject);
                            }, dfd.reject)
                    });
                }, function(err){
                    console.error(err);
                    dfd.reject();
                });

                return dfd.promise;
            }

            this.synchronizeUpdates = function() {
                var dfd = $q.defer();

                function error(err){
                    console.error(err);
                    dfd.reject();
                }

                userActionManager.getAction('update').then(function(data){
                    var actionsLeft = data.docs.length;
                    if (actionsLeft == 0) {
                        dfd.resolve();
                    }
                    data.docs.forEach(function(action) {
                        db.get(action.content).then(function (article) {
                            console.log(article);
                            $http
                                .patch(couac.generateUrl('entries/{idEntry}', {idEntry : action.content}), article)
                                .then(function(){
                                    userActionManager.deleteAction(action).finally(
                                        function() {
                                            if (--actionsLeft == 0) {
                                                dfd.resolve();
                                            }
                                        });
                                });
                        })
                    });
                }, error);

                return dfd.promise;
            }

            this.reinitDb = function() {
                var dfd = $q.defer();

                db
                    .destroy()
                    .then(initDb, dfd.reject)
                    .then(dfd.resolve, dfd.reject);

                return dfd.promise;
            }

            this.reloadDatas = function() {
                var dfd = $q.defer();

                userActionManager.reinitDb()
                    .then(articleManager.reinitDb, dfd.reject)
                    .then(loadServerArticles, dfd.reject)
                    .then(dfd.resolve, dfd.reject);

                return dfd.promise;
            }
        }]
    )
    .service('userActionManager',[
        '$q',
        'pouchDB',
        function($q, pouchDB){
            var db;
            var userActionManager = this;

            function initDb() {
                var dfd = $q.defer();

                db = pouchDB("actions");
                db.createIndex({
                    index: { name : 'action', fields : ['action'], ddoc: 'action'}
                }).then(dfd.resolve, dfd.reject);

                return dfd.promise;
            }

            initDb();

            this.reinitDb = function() {
                var dfd = $q.defer();

                db
                    .destroy()
                    .then(initDb, dfd.reject)
                    .then(dfd.resolve, dfd.promise);

                return dfd.promise;
            }

            this.insertAction = function(action, content) {
                var dfd = $q.defer();

                db.post({
                    action: action,
                    content: content
                }).then(function (response) {
                    dfd.resolve();
                }).catch(function (err) {
                    dfd.reject()
                });

                return dfd.promise;
            };

            this.getAction = function(action) {
                var dfd = $q.defer();

                db.find({
                    selector : {action: action},
                }).then(dfd.resolve, dfd.reject);

                return dfd.promise;
            };

            this.deleteAction = function(action) {
                var dfd = $q.defer();

                db
                    .remove(action._id)
                    .then(dfd.resolve, dfd.reject);

                return dfd.promise;
            };
        }]
    )
;