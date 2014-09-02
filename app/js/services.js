(function () {
    'use strict';

    /* Services */

    angular.module('myApp.services', [])

        // put your services here!
        // .service('serviceName', ['dependency', function(dependency) {}]);

        .service('messageList', ['fbutil', function (fbutil) {
            return fbutil.syncArray('messages', {limit: 10, endAt: null});
        }])
        .factory('chatService', ['fbutil', 'getFbData', '$q', function (fbutil, getFbData, $q) {
            return{
                cserv: {},
                SelConv: function (myUid, conv) {
                    this.cserv.convRef = conv;
                    this.cserv.messages = fbutil.syncArray(['conversations', conv, 'messages'], {limit: 10, endAt: null});
                    fbutil.syncData(['conversations', conv, 'members', myUid]).$update({unread: 'watching'});
                    fbutil.ref(['conversations', conv, 'members', myUid]).onDisconnect().update({unread: 0})
                },
                Create1to1Ref: function (myUid, whom, select) {
                    var def = $q.defer(),
                        pos = ['users', myUid, 'conversations', '1to1', whom, 'Ref'],
                        that = this;

                    fbutil.ref(pos)
                        .once('value', function (snapshot) {
                            var exists = (snapshot.val() != null);
                            if (exists) {
                                var whomRef = snapshot.val();
                                def.resolve(snapshot.val());
                                if (select) {
                                    that.SelConv(myUid, whomRef)
                                }
                            } else {
                                fbutil.syncData(pos).$push({Data: 'success'}).then(function (Ref) {
                                    var conRef = Ref.name();
                                    def.resolve(conRef);
                                    if (select) {
                                        that.SelConv(myUid, conRef)
                                    }
                                    fbutil.syncData(['conversations', conRef, 'members', whom]).$update({Data: 'success'});
                                    fbutil.syncData(['users', whom, 'conversations', '1to1', myUid]).$update({Data: 'success', Ref: conRef});
                                    fbutil.syncData(['users', myUid, 'conversations', '1to1', whom]).$update({Data: 'success', Ref: conRef});
                                })
                            }
                        });
                    return def.promise;
                },
                NotificationClear: function (myUid, ref) {
                    fbutil.ref(['conversations', ref, 'members', myUid, 'unread']).off('value');
                    fbutil.syncData(['users', myUid, 'notifications']).$remove(ref)
                },
                AddContact: function (myUid, whom, sendNoti) {
                    this.Create1to1Ref(myUid, whom, false).then(function (ref) {
                        fbutil.syncData(['users', myUid, 'contacts', whom]).$update({Blocked: false, Ref: ref});
                        if (sendNoti) {
                            fbutil.syncData(['users', whom, 'notifications', myUid]).$update({type: 'addContact'})
                        }
                    });
                },
                BlockContact: function (myUid, contact) {
                    this.Create1to1Ref(myUid, contact, false).then(function (ref) {
                        fbutil.syncData(['users', myUid, 'contacts', contact]).$update({Blocked: true, Ref: ref});
                    });
                },
                RemoveContact: function (myUid, contact) {
                    fbutil.syncData(['users', myUid, 'contacts']).$remove(contact);
                },

                AddMessage: function (myUid, convRef, newMessage) {
                    if (newMessage) {
                        fbutil.syncData(['conversations', convRef, 'messages'])
                            .$push({
                                addresser: myUid,
                                text: newMessage,
                                timeStamp: Firebase.ServerValue.TIMESTAMP
                            });
                        var memPos = ['conversations', convRef, 'members'];
                        fbutil.ref(memPos).once('value', function (members) {
                            var temp = members.val();
                            var is1to1 = (Object.keys(members.val()).length == 2);
                            for (var key in temp) {
                                if ((key != myUid) && (temp[key].unread != 'watching')) {
                                    var unread = temp[key].unread + 1;
                                    if (temp[key].unread == null) {
                                        unread = 1
                                    }
                                    fbutil.syncData(['conversations', convRef, 'members', key])
                                        .$update({unread: unread});
                                    var type = '1toN';
                                    if (is1to1) {
                                        type = '1to1'
                                    }
                                    fbutil.syncData(['users', key, 'notifications', convRef])
                                        .$update({type: type});
                                }
                            }
                        })
                    }
                },
                Confirm: function (myUid, list) {
                    var data = {members: list};
                    fbutil.syncData(['users', myUid, 'conversations', 'group']).$push(data).then(function (Ref) {
                        var conRef = Ref.name();
                        this.SelConv(myUid, conRef);  //switch messages to current ref
                        for (var i = 0; i < list.length; i++) {
                            if (i != 0) {
                                var position = ['users', list[i], 'conversations', 'group'];
                                fbutil.syncData(position).$update(conRef, data);
                            }
                            fbutil.syncData(['conversations', conRef, 'members', list[i]])
                                .$update({unread: 0});          //messages pos in conversations
                        }
                    });
                }

            }
        }])
        .service('project', ['fbutil', function (fbutil) {
            return {
                Update: function (syncObj, uid, pjListData) {
                    syncObj.$save().then(function (pjRef) {
                        fbutil.syncData(['projectList', pjRef.name()]).$update(pjListData);
                        fbutil.syncData(['users', uid, 'projects', pjRef.name()]).$update(pjListData);
                        fbutil.syncData(['users', uid, 'due', pjRef.name()]).$update(pjListData.due, {data: 'success'});
                    });
                },
                Create: function (uid, pjData, pjListData) {
                    var pjsPos = 'projects';
                    var pjListPos = 'projectList';
                    var userPjPos = ['users', uid, 'projects'];
                    fbutil.syncData(pjsPos).$push(pjData).then(function (pjRef) {
                        fbutil.ref(['users', uid, 'userInfo', 'name']).once('value', function (usrName) {
                            var clientData = {
                                clientUid: uid,
                                clientName: usrName.val(),
                                createdTime: Firebase.ServerValue.TIMESTAMP
                            };
                            for (var property in clientData) {
                                pjListData[property] = clientData[property]
                            }
                            pjListData.status = 'Published';
                            fbutil.syncData(pjsPos).$update(pjRef.name(), clientData);
                            fbutil.syncData(pjListPos).$set(pjRef.name(), pjListData);
                            fbutil.syncData(userPjPos).$set(pjRef.name(), pjListData);
                            fbutil.syncData(['users', uid, 'due', pjRef.name()]).$update(pjData.due, {data: 'success'});
                        });
                    });
                }
            }
        }])
        .service('notification', ['fbutil', function (fbutil) {
            return {
                Clear: function (uid, ref) {
                    fbutil.syncData(['users', uid, 'notifications']).$remove(ref)
                },
                Push: function (uid, ref, obj) {
                    fbutil.syncData(['users', uid, 'notifications', ref]).$update(obj)
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
                Start: function (pid, uid, whom) {
                    fbutil.syncData(['users', uid, 'jobs', pid]).$update({status: 'In progress'});
                    fbutil.syncData(['users', whom, 'projects', pid]).$update({status: 'In progress'});
                },
                Accept: function (pid, uid, whom, info) {
                    var update = {
                        status: 'Waiting for response', assignedTo: whom, price: info.price
                    };
                    fbutil.syncData(['users', uid, 'projects', pid]).$update(update);
                    fbutil.syncData(['projects', pid]).$update(update);
                    fbutil.syncData(['users', whom, 'notifications', pid]).$update(info);
                    fbutil.syncData(['users', whom, 'jobs', pid]).$update({status: 'Accepted'});
                    fbutil.syncData(['users', uid, 'projects', pid, 'waitingList']).$remove();
                    fbutil.syncData(['projectList', pid]).$remove();

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
                getUserRating: function (uid) {
                    var that = this;
                    this.Users[uid] = {};
                    fbutil.ref(['userList', uid, 'rating'])
                        .once('value', function (snap) {
                            that.Users[uid].rating = snap.val();
                            return that.Users[uid].rating
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
                    if (type == '1to1' || type == '1toN') {
                        that.NotiData[ref].lastMessage = fbutil.syncArray(['conversations', ref, 'messages'], {limit: 1, endAt: null})
                    } else {
                        //that.NotiData[ref].lastMessage = fbutil.syncArray(['projects',ref,])
                    }
                }
            };
        }
        ]);
})();

