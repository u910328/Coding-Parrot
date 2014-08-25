(function () {
    'use strict';

    /* Services */

    angular.module('myApp.services', [])

        // put your services here!
        // .service('serviceName', ['dependency', function(dependency) {}]);

        .service('messageList', ['fbutil', function (fbutil) {
            return fbutil.syncArray('messages', {limit: 10, endAt: null});
        }])
        .service('project', ['fbutil', function (fbutil) {
            return {
                Update: function (syncObj, uid, pjListData) {
                    syncObj.$save().then(function (pjRef) {
                        fbutil.syncData(['projectList', pjRef.name()]).$update(pjListData);
                        fbutil.syncData(['users', uid, 'projects', pjRef.name()]).$update(pjListData);
                    });
                },
                Create: function (uid, pjData, pjListData) {
                    var pjsPos = 'projects';
                    var pjListPos = 'projectList';
                    var userPjPos = ['users', uid, 'projects'];
                    fbutil.syncData(pjsPos).$push(pjData).then(function (pjRef) {
                        fbutil.ref(['users', uid, 'userInfo', 'name']).on('value', function (usrName) {
                            var clientData = {
                                ClientUid: uid,
                                ClientName: usrName.val()
                            };
                            for (var attr in clientData) {
                                pjListData[attr] = clientData[attr]
                            }
                            pjListData.Status = 'Published';
                            fbutil.syncData(pjsPos).$update(pjRef.name(), clientData);
                            fbutil.syncData(pjListPos).$set(pjRef.name(), pjListData);
                            fbutil.syncData(userPjPos).$set(pjRef.name(), pjListData);
                        });
                    });
                }
            }
        }])
        .service('propose', ['fbutil', function (fbutil) {
            return {
                Send: function (pid, uid, whom, message, data) {
                    fbutil.syncData(['projects', pid, 'waitingList', uid]).$update(message);
                    fbutil.syncData(['projectList', pid, 'waitingList', uid]).$update(message);
                    fbutil.syncData(['users', whom, 'projects', pid, 'waitingList', uid]).$update(message);

                    fbutil.syncData(['users', uid, 'jobs', pid]).$update(data);
                },
                Remove: function (pid, uid, whom) {
                    fbutil.syncData(['projects', pid, 'waitingList']).$remove(uid);
                    fbutil.syncData(['projectList', pid, 'waitingList']).$remove(uid);
                    fbutil.syncData(['users', whom, 'projects', pid, 'waitingList']).$remove(uid);
                },
                Reject: function (pid, uid, whom) {
                    this.Remove(pid, whom, uid);
                    fbutil.syncData(['users', whom, 'jobs', pid]).$update({status: 'rejected'});
                },
                Accept: function (pid, uid, whom) {
                    fbutil.syncData(['projects', pid, 'waitingList']).$remove();
                    fbutil.syncData(['projectList', pid, 'waitingList']).$remove();
                    fbutil.syncData(['users', uid, 'projects', pid, 'waitingList']).$remove();
                    //= this.Remove(pid, null, uid) ??

                    fbutil.syncData(['users', whom, 'jobs', pid]).$update({status: 'Accept'});
                    fbutil.syncData(['projectList', pid]).$remove();
                    fbutil.syncData(['users', uid, 'projects', pid]).$update({
                        Status: 'In progress', AssignedTo: whom
                    })
                }
            }
        }])
        .factory("getFbData", ["fbutil", '$firebase', 'FBURL', function (fbutil, $firebase, FBURL) {
            return {
                Users: {},
                getUserName: function (uid) {
                    var that = this;
                    this.Users[uid] = {};
                    fbutil.ref(['users', uid, 'userInfo', 'name'])
                        .once('value', function (snap) {
                            that.Users[uid].name = snap.val();
                            return that.Users[uid].name
                        });
                },
                Conversations: {},
                getUnread: function (pos, conv) {
                    var that = this;
                    this.Conversations[conv] = {};
                    that.Conversations[conv]=fbutil.syncObject(pos)
                },
                NotiData: {},
                getNotiData: function (ref, type) {
                    var that = this;
                    this.NotiData[ref] = {};
                    if (type!='project') {
                        that.NotiData[ref].lastMessage = fbutil.syncArray(['conversations', ref, 'messages'], {limit: 1, endAt: null})
                    }
                }
            };
        }
        ]);
})();

