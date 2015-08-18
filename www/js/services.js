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

            /**
             * Persist tags from remote server in local db
             */
            function persistTags(tags) {
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

            /**
             * Load tags from remote server
             */
            function loadTags() {
                var dfd = $q.defer();

                $http
                    .get(couac.generateUrl('tags'))
                    .success(function(tags) {
                        persistTags(tags).then(dfd.resolve, dfd.reject);
                    })
                    .error(function(data) {
                        dfd.reject(data);
                    });

                return dfd.promise;
            };

            /**
             * Get Tags. (From cache if available)
             */
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

            /**
             * Force reload from remote server
             */
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
            var indexes = [
                { name : 'archived', fields : ['is_archived'], ddoc: 'archived'},
                { name : 'id', fields : ['id'], ddoc: 'id'},
                { name : 'starred', fields : ['is_starred'], ddoc: 'starred'},
                { name : 'deleted', fields : ['_deleted'], ddoc: 'deleted'}
            ];
            var paginators = {
                unreads : {
                    selector : {
                        'is_archived' : false
                    }
                },
                archived : {
                    selector : {
                        'is_archived' : true
                    }
                },
                starred : {
                    selector : {
                        'is_starred' : true
                    }
                }
            };
            var articleManager = this;

            /**
             * Init Articles Database (Creates db and indexes)
             */
            function initDb() {
                var dfd = $q.defer();
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

            /**
             * Persist server articles in local database
             */
            function persistServerArticles(articles) {
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

            /**
             * Get all articles from remote server
             */
            function loadServerArticles(page) {
                var dfd = $q.defer();
                page = (page && typeof page != "Object")?page:1;
                var url = couac.generateUrl('entries', {perPage : 50, page : page});


                $http
                    .get(url)
                    .success(function(data) {
                        persistServerArticles(data['_embedded']['items']).then(function() {
                            if (page < data['pages']) {
                                loadServerArticles(++page).then(dfd.resolve, dfd.reject);
                            } else {
                                dfd.resolve();
                            }
                        }, dfd.reject);
                    })
                    .error(function(err) {
                        console.error("[ARTICLES] Load articles problem " + url + " " + angular.toJson(arguments));
                        dfd.reject(err);
                    });

                return dfd.promise;
            };

            //Init db as soon as application starts
            initDb();

            /**
             * Get Article
             */
            this.getArticle = function(articleId) {
                var dfd = $q.defer()

                db
                    .get(articleId)
                    .then(dfd.resolve, dfd.reject);

                return dfd.promise;
            }

            /**
             * Get A paginator (defined in paginators variable)
             */
            this.getPaginator = function(paginatorName) {
                if (typeof paginators[paginatorName] != "object") {
                    throw "The paginator " + paginatorName + " does not exist"
                }

                var dfd = $q.defer();
                var paginator = new DBPaginator(db, paginators[paginatorName]);
                dfd.resolve(paginator);

                return dfd.promise;
            };

            /**
             * Delete an article. If network is unavailable, add action to stack
             */
            this.deleteArticle = function(article) {
                var dfd = $q.defer();

                $http
                    .delete(couac.generateUrl('entries/{idEntry}', {idEntry : article.id}))
                    .then(null, function(){
                        userActionManager.insertAction('delete', article.id);
                    })
                    .finally(function(){
                        db.get(article._id).then(function(article) {
                            return db.remove(article).then(dfd.resolve, dfd.reject);
                        }, dfd.reject);
                    });

                return dfd.promise;
            };

            /**
             * Mark an article as favorite. If network is unavailable, add action to stack
             */
            this.markAsFavorite = function(article, asFavorite) {
                asFavorite = (asFavorite?true:false);
                var dfd = $q.defer();

                article.is_starred = asFavorite;
                this.saveArticle(article).then(dfd.resolve, dfd.reject);

                return dfd.promise;
            };

            /**
             * Mark an article as read. If network is unavailable, add action to stack
             */
            this.markAsRead = function(article) {
                var dfd = $q.defer();

                article.is_archived = true;
                this.saveArticle(article).then(dfd.resolve, dfd.reject);

                return dfd.promise;
            };

            /**
             * Update article on remote server. Add action to stack if network is unavailable
             */
            this.saveArticle = function(article) {
                var dfd = $q.defer();

                $http
                    .patch(couac.generateUrl('entries/{idEntry}', {idEntry : article.id}), article)
                    .then(dfd.resolve(),function(){
                        userActionManager.insertAction('update', article.id.toString());
                    })
                    .finally(function(){
                        db.put(article).then(dfd.resolve, dfd.reject);
                    });

                return dfd.promise;
            }

            /**
             * Synchronize local database with remote server
             */
            this.synchronize = function() {
                var dfd = $q.defer();

                function reject(err) {
                    console.error(err);
                    dfd.reject(err);
                }

                this
                    .synchronizeDeleted()
                    .then(this.synchronizeUpdates)
                    .then(this.reloadDatas, reject)
                    .finally(function() {
                        $rootScope.$broadcast("articlesSynchronizationEnded");
                        dfd.resolve();
                    });

                return dfd.promise;
            };

            /**
             * Re-synchronize deleted articles. Pending deletion are sent to remote server
             */
            this.synchronizeDeleted = function() {
                var dfd = $q.defer();

                function reject(err) {
                    throw err;
                    dfd.reject(err);
                }

                userActionManager.getAction('delete').then(function(data){
                    var actionsLeft = data.docs.length;
                    if (actionsLeft == 0) {
                        dfd.resolve();
                    }

                    data.docs.forEach(function(action) {
                        $http
                            .delete(couac.generateUrl('entries/{idEntry}', {idEntry : action.content}))
                            .finally(function(){
                                userActionManager.deleteAction(action).finally(
                                    function() {
                                        if (--actionsLeft == 0) {
                                            dfd.resolve();
                                        }
                                    },
                                    reject);
                            }, reject)
                    });
                }, reject);

                return dfd.promise;
            }

            /**
             * Re-synchronize patched articles. Pending updates are sent to remote server
             */
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

            /**
             * Destroy and reinit a database. Deletes all entries.
             */
            this.reinitDb = function() {
                var dfd = $q.defer();

                db
                    .destroy()
                    .then(initDb, dfd.reject)
                    .then(dfd.resolve, dfd.reject);

                return dfd.promise;
            }

            /**
             * Reload remote server articles.
             */
            this.reloadDatas = function() {
                var dfd = $q.defer();

                function reject(err){
                    console.error(err);
                    dfd.reject(err);
                }

                userActionManager.reinitDb()
                    .then(articleManager.reinitDb)
                    .then(loadServerArticles)
                    .then(dfd.resolve, reject);

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

            /**
             * Init Action Database (Creates db and indexes)
             */
            function initDb() {
                var dfd = $q.defer();

                db = pouchDB("actions");
                db.createIndex({
                    index: { name : 'action', fields : ['action'], ddoc: 'action'}
                }).then(dfd.resolve, dfd.reject);

                return dfd.promise;
            }

            initDb();

            /**
             * Destroy and reinit a database. Deletes all entries.
             */
            this.reinitDb = function() {
                var dfd = $q.defer();

                db
                    .destroy()
                    .then(initDb, dfd.reject)
                    .then(dfd.resolve, dfd.promise);

                return dfd.promise;
            }

            /**
             * Creates a pending action
             */
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

            /**
             * Get an action
             */
            this.getAction = function(action) {
                var dfd = $q.defer();

                db.find({
                    selector : {action: action},
                }).then(dfd.resolve, dfd.reject);

                return dfd.promise;
            };

            /**
             * Remove an action
             */
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