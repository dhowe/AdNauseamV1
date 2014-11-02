/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

// adapted from: https://github.com/mozilla/addon-sdk/blob/master/lib/sdk/page-worker.js
// change on line 104: (added public reference to 'this.view')
module.metadata = {
  "stability": "stable"
};

const { Class } = require('sdk/core/heritage');
const { on, emit, off, setListeners } = require('sdk/event/core');
const { filter, pipe, map, merge: streamMerge, stripListeners } = require('sdk/event/utils');
const { detach, attach, destroy, WorkerHost } = require('sdk/content/utils');
const { Worker } = require('sdk/content/worker');
const { Disposable } = require('sdk/core/disposable');
const { EventTarget } = require('sdk/event/target');
const { unload } = require('sdk/system/unload');
const { events, streamEventsFrom } = require('sdk/content/events');
const { getAttachEventType } = require('sdk/content/utils');
const { window } = require('sdk/addon/window');
const { getParentWindow } = require('sdk/window/utils');
const { create: makeFrame, getDocShell } = require('sdk/frame/utils');
const { contract } = require('sdk/util/contract');
const { contract: loaderContract } = require('sdk/content/loader');
const { has } = require('sdk/util/array');
const { Rules } = require('sdk/util/rules');
const { merge } = require('sdk/util/object');

const views = WeakMap();
const workers = WeakMap();
const pages = WeakMap();

const readyEventNames = [
  'DOMContentLoaded',
  'document-element-inserted',
  'load'
];

function workerFor(page) workers.get(page)
function pageFor(view) pages.get(view)
function viewFor(page) views.get(page)
function isDisposed (page) !views.get(page, false)

let pageContract = contract(merge({
  allow: {
    is: ['object', 'undefined', 'null'],
    map: function (allow) { return { script: !allow || allow.script !== false }}
  },
  onMessage: {
    is: ['function', 'undefined']
  },
  include: {
    is: ['string', 'array', 'undefined']
  },
  contentScriptWhen: {
    is: ['string', 'undefined']
  }
}, loaderContract.rules));

function enableScript (page) {
  getDocShell(viewFor(page)).allowJavascript = true;
}

function disableScript (page) {
  getDocShell(viewFor(page)).allowJavascript = false;
}

function Allow (page) {
  return {
    get script() { return getDocShell(viewFor(page)).allowJavascript; },
    set script(value) { return value ? enableScript(page) : disableScript(page); }
  };
}

function injectWorker ({page}) {
  let worker = workerFor(page);
  let view = viewFor(page);
  if (isValidURL(page, view.contentDocument.URL))
    attach(worker, view.contentWindow);
}

function isValidURL(page, url) !page.rules || page.rules.matchesAny(url)

const Page = Class({
  implements: [
    EventTarget,
    Disposable
  ],
  extends: WorkerHost(workerFor),
  setup: function Page(options) {
  	
  	console.log('PageWorker: allowJavascript='+ options.allow.script
  		+ ' allowPlugins=false allowDialogs=false');  // DCH
  		
    let page = this;
    options = pageContract(options);
    let view = makeFrame(window.document, {
      nodeName: 'iframe',
      type: 'content',
      uri: options.contentURL,
      allowJavascript: options.allow.script,
      allowPlugins: false, // DCH: changed to false
      allowAuth: false   // DCH: changed to false
    });
	
	this.view = view; // DCH: added public reference to view
	
    ['contentScriptFile', 'contentScript', 'contentScriptWhen']
      .forEach(prop => page[prop] = options[prop]);

    views.set(this, view);
    pages.set(view, this);

    // Set listeners on the {Page} object itself, not the underlying worker,
    // like `onMessage`, as it gets piped
    setListeners(this, options);
    let worker = new Worker(stripListeners(options));
    workers.set(this, worker);
    pipe(worker, this);

    if (this.include || options.include) {
      this.rules = Rules();
      this.rules.add.apply(this.rules, [].concat(this.include || options.include));
    }
  },
  get allow() { return Allow(this); },
  set allow(value) {
    let allowJavascript = pageContract({ allow: value }).allow.script;
    return allowJavascript ? enableScript(this) : disableScript(this);
  },
  get contentURL() { return viewFor(this).getAttribute('src'); },
  set contentURL(value) {
    if (!isValidURL(this, value)) return;
    let view = viewFor(this);
    let contentURL = pageContract({ contentURL: value }).contentURL;
    view.setAttribute('src', contentURL);
  },
  dispose: function () {
    if (isDisposed(this)) return;
    let view = viewFor(this);
    if (view.parentNode) view.parentNode.removeChild(view);
    views.delete(this);
    destroy(workers.get(this));
  },
  toString: function () { return '[object Page]' }
});

exports.Page = Page;

let pageEvents = streamMerge([events, streamEventsFrom(window)]);
let readyEvents = filter(pageEvents, isReadyEvent);
let formattedEvents = map(readyEvents, function({target, type}) {
  return { type: type, page: pageFromDoc(target) };
});
let pageReadyEvents = filter(formattedEvents, function({page, type}) {
  return getAttachEventType(page) === type});
on(pageReadyEvents, 'data', injectWorker);

function isReadyEvent ({type}) {
  return has(readyEventNames, type);
}

/*
 * Takes a document, finds its doc shell tree root and returns the
 * matching Page instance if found
 */
function pageFromDoc(doc) {
  let parentWindow = getParentWindow(doc.defaultView), page;
  if (!parentWindow) return;

  let frames = parentWindow.document.getElementsByTagName('iframe');
  for (let i = frames.length; i--;)
    if (frames[i].contentDocument === doc && (page = pageFor(frames[i])))
      return page;
  return null;
}
