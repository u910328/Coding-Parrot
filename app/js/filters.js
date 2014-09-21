'use strict';

/* Filters */

angular.module('myApp.filters', [])
    .filter('interpolate', ['version', function (version) {
        return function (text) {
            return String(text).replace(/\%VERSION\%/mg, version);
        }
    }])
    .filter('contactFilter', function () {
        return function (contactList) {
            var filteredList = {};
            for (var uid in contactList) {
                console.log(uid);
                if (!contactList[uid].Blocked) {
                    filteredList[uid] = contactList[uid]
                }
            }
            return filteredList
        }
    })

    .filter('reverse', function () {
        return function (items) {
            return items.slice().reverse();
        };
    })
    .filter('linkify', function () {
        return function (inputText) {
            if (inputText) {
                var replacedText, replacePattern1, replacePattern2, replacePattern3;

                //URLs starting with http://, https://, or ftp://
                replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
                replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

                //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
                replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
                replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

                //Change email addresses to mailto:: links.
                replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
                replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

                return replacedText;
            } else {
                return ''
            }
        }
    })
    .filter('uidToName', function (fbutil) {
        return function (uid) {
            return fbutil.syncObject(['users', uid, 'userInfo', 'name'])
        };
    })
    .filter('with', function () {
        return function (items, field) {
            var result = {};
            for (var key in items) {
                if (items[key].hasOwnProperty(field)) {
                    result[key] = items[key];
                }
            }
            return result;
        };
    })
    .filter('categorizeObj', function () {
        return function (items, cate, lang) {
            var result = {};
            var patt = /\$/;
            for (var key in items) {
                var res = patt.test(key);
                if (res) {
                    continue
                }
                var sLang = items[key].language;
                for (var key2 in sLang) {
                    if (sLang[key2].name == lang) {
                        var langMatch = true;
                        break
                    }
                }
                var cateMatch = items[key].category == cate;
                if ((cateMatch && langMatch)
                    || (langMatch && !cate)
                    || (cateMatch && !lang)) {
                    result[key] = items[key]
                }
                else if (!cate && !lang) {
                    result = items
                }
            }
            return result;
        };
    })
    .filter('categorize', function () {
        return function (items, cate, lang) {
            var result = [];
            for (var i = 0; i < items.length; i++) {
                var langMatch = false;
                var sLang = items[i].language;
                for (var key2 in sLang) {
                    if (sLang[key2].name == lang) {
                        langMatch = true;
                        break
                    }
                }
                var cateMatch = items[i].category == cate;
                if ((cateMatch && langMatch)
                    || (langMatch && !cate)
                    || (cateMatch && !lang)) {
                    result.push(items[i])
                }
                else if (!cate && !lang) {
                    result = items
                }
            }
            return result;
        };
    })
    .filter('objFilter', function ($filter) {
        return function (map, expression, comparator) {
            if (!expression) return map;
            var result = {};
            var patt = /\$/;
            for (var key in map) {
                var res = patt.test(key);
                if (res) {
                    continue
                }
                if ($filter('filter')([map[key]], expression, comparator).length)
                    result[key] = map[key];
            }
            return result;
        }
    })
    .filter('pjToArray', function () {
        return function (map) {
            var result = [];
            var obj = map;
            var patt = /\$/;
            for (var key in map) {
                var res = patt.test(key);
                if (res) {
                    continue
                }
                obj[key].ref = key;
                result.push(obj[key]);
            }
            return result;
        }
    })
    .filter('capitalize', function () {
        return function (input, all) {
            return (!!input) ? input.replace(/([^\W_]+[^\s-]*) */g, function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            }) : '';
        }
    });
