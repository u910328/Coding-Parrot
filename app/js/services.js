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
                                clientUid: uid,
                                clientName: usrName.val()
                            };
                            for (var property in clientData) {
                                pjListData[property] = clientData[property]
                            }
                            pjListData.status = 'Published';
                            fbutil.syncData(pjsPos).$update(pjRef.name(), clientData);
                            fbutil.syncData(pjListPos).$set(pjRef.name(), pjListData);
                            fbutil.syncData(userPjPos).$set(pjRef.name(), pjListData);
                        });
                    });
                }
            }
        }])
        .service('propose', ['fbutil', function (fbutil) {
            var partialRemove = function (pid, uid, whom) {
                fbutil.syncData(['users', whom, 'notifications']).$remove(pid);
                fbutil.syncData(['projects', pid, 'waitingList']).$remove(uid);
                fbutil.syncData(['projectList', pid, 'waitingList']).$remove(uid);
                fbutil.syncData(['users', whom, 'projects', pid, 'waitingList']).$remove(uid);
            };
            return {
                Send: function (pid, uid, whom, message, data) {
                    fbutil.syncData(['users', whom, 'notifications', pid]).$update(
                        {
                            type: 'propose', price: message.price, message: message.message,
                            pjName: data.pjName,
                            coder: uid
                        });
                    fbutil.syncData(['projects', pid, 'waitingList', uid]).$update(message);
                    fbutil.syncData(['projectList', pid, 'waitingList', uid]).$update(message);
                    fbutil.syncData(['users', whom, 'projects', pid, 'waitingList', uid]).$update(message);
                    fbutil.syncData(['users', uid, 'jobs', pid]).$update(data);

                },
                Remove: function (pid, uid, whom) {
                    partialRemove(pid, uid, whom);
                    fbutil.syncData(['users', uid, 'jobs']).$remove(pid);
                },
                Accept: function (pid, uid, whom, info) {
                    var update = {
                        status: 'In progress', assignedTo: whom, price: info.price, waitingList: null
                    };
                    fbutil.syncData(['users', uid, 'projects', pid]).$update(update);
                    fbutil.syncData(['projects', pid, 'waitingList', whom]).$update({price: 'accepted'});
                    fbutil.syncData(['users', whom, 'notifications', pid]).$update(info);
                    fbutil.syncData(['users', whom, 'jobs', pid]).$update({status: 'Accepted'});
                    //fbutil.syncData(['users', uid, 'projects', pid, 'waitingList']).$remove();
                    fbutil.syncData(['projectList', pid]).$remove();
                    //= this.Remove(pid, null, uid) ??
                    //info must have property price
                },
                Reject: function (pid, uid, whom, info) {
                    fbutil.syncData(['users', whom, 'notifications', pid]).$update(info);
                    partialRemove(pid, whom, uid);
                    fbutil.syncData(['users', whom, 'jobs', pid]).$update({status: 'Rejected'})
                }
            }
        }])
        .factory("getFbData", ["fbutil", function (fbutil) {
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
                    that.Conversations[conv] = fbutil.syncObject(pos)
                },
                NotiData: {},
                getNotiData: function (ref, type) {
                    var that = this;
                    this.NotiData[ref] = {};
                    if (type=='1to1' || type=='1toN') {
                        that.NotiData[ref].lastMessage = fbutil.syncArray(['conversations', ref, 'messages'], {limit: 1, endAt: null})
                    } else {
                        //that.NotiData[ref].lastMessage = fbutil.syncArray(['projects',ref,])
                    }
                }
            };
        }
        ]);
})();

