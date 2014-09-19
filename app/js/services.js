(function () {
    'use strict';

    /* Services */

    angular.module('myApp.services', [])

        // put your services here!
        // .service('serviceName', ['dependency', function(dependency) {}]);

        .service('messageList', ['fbutil', function (fbutil) {
            return fbutil.syncArray('messages', {limit: 10, endAt: null});
        }])
        .factory('cateAndLang', [function () {
            return {
                categories: [
                    {id:'gen', name: 'General', color: 'red',
                        lang: [
                            'C++',
                            'Python',
                            'Javascript']},
                    {id:'wa', name: 'Web/App', color: 'yellow',
                        lang: [
                            'Python',
                            'Javascript',
                            'Ruby']},
                    {id:'gam', name: 'Games', color: 'blue',
                        lang: ['C++']},
                    {id:'aca', name: 'Academic', color: 'green',
                        lang: [
                            'C++',
                            'Python',
                            'Fortran']},
                    {id:'oth', name: 'Others', color: 'black',
                        lang: [
                            'C++',
                            'Python',
                            'Javascript',
                            'Ruby']}
                ],
                languages: [
                    {id:'cpp', name: 'C++'},
                    {id:'pyt',name: 'Python'},
                    {id:'js', name: 'Javascript'},
                    {id:'rb', name: 'Ruby'},
                    {id:'ft', name: 'Fortran'}
                ],
                Add: function (type, selected, items) {
                    if (!selected) {return}
                    if (!items[type]) {items[type]={}}
                    items[type][selected.id]= {name:selected.name};
                },
                Remove: function (type, items, id) {
                    delete items[type][id];
                    if (JSON.stringify(items[type])=='{}') {delete items[type]}
                }
            }
        }])
        .factory('chatService', ['fbutil', 'getFbData', '$q', 'notification', function (fbutil, getFbData, $q, notification) {
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
                    notification.Clear(myUid, ref)
                },
                AddContact: function (myUid, whom, sendNoti) {
                    this.Create1to1Ref(myUid, whom, false).then(function (ref) {
                        fbutil.syncData(['users', myUid, 'contacts', whom]).$update({Blocked: false, Ref: ref});
                        if (sendNoti) {
                            var obj = {type: 'addContact'};
                            notification.Push(whom, myUid, obj);
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
                                    var obj = {type: type};
                                    notification.Push(key, convRef, obj);
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
        .service('project', ['fbutil', 'notification', function (fbutil, notification) {
            return {
                Update: function (syncObj, uid, pjListData) {
                    syncObj.$save().then(function (pjRef) {
                        fbutil.syncData(['projectList', pjRef.name()]).$update(pjListData);
                        fbutil.syncData(['users', uid, 'projects', pjRef.name()]).$update(pjListData);
                        fbutil.syncData(['users', uid, 'due', pjRef.name()]).$update(pjListData.due, {data: 'success'});
                    });
                },
                Remove: function (uid, projectId) {
                    fbutil.ref([['projects', projectId, 'waitingList']]).once('value',function(snap){
                        var patt = /\$/;
                        var obj = {type:'projectRemoved'};
                        if(snap.val!=null){
                            for(var key in snap.val()) {
                                var res = patt.test(key);
                                if (res) {continue}
                                notification.Push(key, projectId, obj, uid);
                            }
                        }
                        fbutil.syncData(['projects', projectId]).$remove();
                    });

                    fbutil.syncData(['projectList', projectId]).$remove();
                    fbutil.syncData(['users', uid, 'projects', projectId]).$remove();
                    fbutil.syncData(['users', uid, 'due', projectId]).$remove();
                    notification.Clear(uid, projectId);
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
                Clear: function (uid, ref, whom) {
                    if(whom) {
                        fbutil.syncData(['users', uid, 'notifications', ref]).$remove(whom)
                    } else {
                        fbutil.syncData(['users', uid, 'notifications']).$remove(ref)
                    }
                },
                Push: function (uid, ref, obj, whom) {
                    if(whom) {
                        fbutil.syncData(['users', uid, 'notifications', ref, whom]).$update(obj)
                    } else {
                        fbutil.syncData(['users', uid, 'notifications', ref]).$update(obj)
                    }
                }
            }
        }])
        .service('propose', ['fbutil', 'notification', function (fbutil, notification) {
            var partialRemove = function (pid, uid, whom) {
                notification.Clear(whom, pid, uid);
                fbutil.syncData(['projects', pid, 'waitingList']).$remove(uid);
                fbutil.syncData(['projectList', pid, 'waitingList']).$remove(uid);
                fbutil.syncData(['users', whom, 'projects', pid, 'waitingList']).$remove(uid);
            };
            return {
                Send: function (pid, uid, whom, prps, data) {
                    var obj = {
                        type: 'propose',
                        pjName: data.pjName,
                        coder: uid
                    };
                    var propose={};
                    var patt = /\$/;
                    for(var key in prps) {
                        var res = patt.test(key);
                        if (res) {continue}
                        obj[key]=prps[key];
                        propose[key]=prps[key];
                    }
                    notification.Push(whom, pid, obj, uid);
                    fbutil.syncData(['projects', pid, 'waitingList', uid]).$update(propose);
                    fbutil.syncData(['projectList', pid, 'waitingList', uid]).$update(propose);
                    fbutil.syncData(['users', whom, 'projects', pid, 'waitingList', uid]).$update(propose);
                    fbutil.syncData(['users', uid, 'jobs', pid]).$update(data);
                },
                Remove: function (pid, uid, whom) {
                    partialRemove(pid, uid, whom);
                    fbutil.syncData(['users', uid, 'jobs']).$remove(pid);
                },
                Start: function (pid, uid, whom) {
                    fbutil.syncData(['users', uid, 'jobs', pid]).$update({status: 'In progress'});
                    fbutil.syncData(['users', whom, 'projects', pid]).$update({status: 'In progress'});
                    notification.Clear(uid, pid, whom);
                },
                AcceptRejection: function (pid, uid) {
                    notification.Clear(uid, pid);
                    fbutil.syncData(['users', uid, 'jobs', pid]).$remove();
                },
                Accept: function (pid, uid, whom, info) {
                    var update = {
                        status: 'Waiting for response', assignedTo: whom, price: info.price
                    };
                    fbutil.syncData(['users', uid, 'projects', pid]).$update(update);
                    fbutil.syncData(['projects', pid]).$update(update);
                    notification.Push(whom, pid, info, uid);
                    notification.Clear(uid, pid, whom);
                    fbutil.syncData(['users', whom, 'jobs', pid]).$update({status: 'Accepted'});
                    fbutil.syncData(['users', uid, 'projects', pid, 'waitingList']).$remove();
                    fbutil.syncData(['projectList', pid]).$remove();

                    //info must have property price
                },
                Reject: function (pid, uid, whom, info) {
                    notification.Push(whom, pid, info, uid);
                    notification.Clear(uid, pid, whom);
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
                    this.Conversations[conv] = {};
                    this.Conversations[conv] = fbutil.syncObject(pos)
                },
                Dues: {},
                getDue: function (fbObj) {
                    this.Dues = fbObj
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

