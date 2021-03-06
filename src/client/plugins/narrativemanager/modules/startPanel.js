/*global define*/
/*jslint white:true*/
define([
    'bluebird',
    'kb_common_html',
    'kb_common_dom',
    'kb_narrativeManager_narrativeManagerService'

], function (Promise, html, dom, NarrativeManagerService) {
    'use strict';

    function factory(config) {
        var mount, container, runtime = config.runtime,
            narrativeManager = NarrativeManagerService({runtime: runtime});

        function makeNarrativePath(wsId, objId) {
            return runtime.getConfig('services.narrative.url') + '/narrative/ws.' + wsId + '.obj.' + objId;
        }
        function createNewNarrative(params) {
            return Promise.try(function () {
                params = params || {};
                if (params.app && params.method) {
                    throw "Must provide no more than one of the app or method params";
                }
                var importData, appData, tmp, i, cells;
                if (params.copydata) {
                    importData = params.copydata.split(';');
                }
                if (params.appparam) {
                    /* TODO: convert to forEach */
                    tmp = params.appparam.split(';');
                    appData = [];
                    for (i = 0; i < tmp.length; i += 1) {
                        appData[i] = tmp[i].split(',');
                        if (appData[i].length !== 3) {
                            throw "Illegal app parameter set, expected 3 parameters separated by commas: " + tmp[i];
                        }
                        /* TODO: use standard lib for math and string->number conversions) */
                        appData[i][0] = parseInt(appData[i][0], 10);
                        if (isNaN(appData[i][0]) || appData[i][0] < 1) {
                            throw "Illegal app parameter set, first item in set must be an integer > 0: " + tmp[i];
                        }
                    }
                }
                if (params.app) {
                    cells = [{app: params.app}];
                } else if (params.method) {
                    cells = [{method: params.method}];
                }
                return narrativeManager.createTempNarrative({
                    cells: cells,
                    parameters: appData,
                    importData: importData
                })
                    .then(function (info) {
                        var wsId = info.nar_info[6],
                            objId = info.nar_info[0],
                            path = makeNarrativePath(wsId, objId);
                        return {
                            redirect: {
                                url: path,
                                newWindow: false
                            }
                        };
                    });
            });
        }


        function startOrCreateEmptyNarrative() {
            return new Promise(function (resolve, reject) {
                narrativeManager.detectStartSettings()
                    .then(function (result) {
                        if (result.last_narrative) {
                            // we have a last_narrative, so go there
                            var wsId = result.last_narrative.ws_info[0],
                                objId = result.last_narrative.nar_info[0],
                                path = makeNarrativePath(wsId, objId);
                            resolve({
                                redirect: {
                                    url: path,
                                    new_window: false
                                }
                            });
                        } else {
                            //we need to construct a new narrative- we have a first timer
                            narrativeManager.createTempNarrative({
                                cells: [],
                                parameters: [],
                                importData: []
                            })
                                .then(function (info) {
                                    var wsId = info.nar_info[6],
                                        objId = info.nar_info[0],
                                        path = makeNarrativePath(wsId, objId);
                                    resolve({
                                        redirect: {
                                            url: path,
                                            new_window: false
                                        }
                                    });
                                })
                                .catch(function (err) {
                                    reject(err);
                                });
                        }
                    });
            });
        }

        function attach(node) {
            mount = node;
            container = dom.createElement('div');
            mount.appendChild(container);
        }

        function start(params) {
            var div = html.tag('div'),
                a = html.tag('a'),
                p = html.tag('p');
            container.innerHTML = html.loading('Starting or Creating a Narrative for you...');
            return new Promise(function (resolve, reject) {
                startOrCreateEmptyNarrative(params)
                    .then(function (result) {
                        container.innerHTML = div([
                            p('Should have opened your narrative.'),
                            p('If it did not happen, use this link:'),
                            p(a({href: result.redirect.url, target: '_blank'}, [
                                'Open Your New Narrative: ',
                                result.redirect.url
                            ]))
                        ]);
                        runtime.send('app', 'redirect', {
                            url: result.redirect.url,
                            new_window: false
                        });
                        resolve();
                    })
                    .catch(function (err) {
                        container.innerHTML = 'ERROR creating and opening a new narrative';
                        console.log('ERROR creating and opening a new narrative');
                        console.log(err);
                        reject(err);
                    });
            });
        }

        function stop() {
            // nothing to do?
        }

        function detach() {
            mount.removeChild(container);
            container.innerHTML = '';
            container = null;
        }

        return {
            attach: attach,
            start: start,
            stop: stop,
            detach: detach
        };
    }

    return {
        make: function (config) {
            return factory(config);
        }
    };

});