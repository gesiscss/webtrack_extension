import EventEmitter from 'eventemitter3';
const EVENT_NAMES = {
  'event': 'onEvent',
  'focusTabCallback': 'onFocusTabCallback',
  'onFocusTab': 'onFocusTab',
  'tabContent': 'onTabContent',
  'tabRemove': 'onTabRemove',
  'tab': 'onTab',
  'tabUpdate': 'onTabUpdate',
}

class Tab {

  constructor() {
    this.allow = true;
    this.disabled = false;
  }

  setState(name, boolean){
    this[name] = boolean;
  }

  getState(name){
    return this[name];
  }

}


export default class Extension {

  /**
   * [constructor]
   * @param {Object}  urlFilter       [instance of URLFilter]
   * @param {Boolean} privateMode     [default: false]
   * @param {Boolean} changeIcon      [default: true]
   * @param {Array}   extensionfilter [default: []]
   */
  constructor(urlFilter, privateMode=false, changeIcon=true, extensionfilter=[]){
    this.urlFilter = urlFilter;
    this.changeIcon = changeIcon;
    this.tabs = {};
    this.privateMode = privateMode;
    this.extensionfilter = extensionfilter;
    this.activWindowId = 0;
    this.event = new EventEmitter();

    this._onTabContent = this._onTabContent.bind(this);
    this._onTabUpdate = this._onTabUpdate.bind(this);
    this._onTabRemove = this._onTabRemove.bind(this);
    this._onActivWindows = this._onActivWindows.bind(this);
    this._onActivatedTab = this._onActivatedTab.bind(this);
    this._onTab = this._onTab.bind(this);

    this.getAllTabsIds = this.getAllTabsIds.bind(this);
    this.DEFAULT_TAB_CONTENT = {allow: true, disabled: false}

  }

  /**
   * [_onActivWindows listenen the active windowId for check the active tab]
   */
  _onActivWindows(windowId){
      this.event.emit(EVENT_NAMES.onFocusTab, null, false);
      if(windowId>0) this.activWindowId = windowId;
  }

  /**
   * [getAllTabsIds return all tabs]
   * @param  {Object}  query    [default: {}]
   * @param  {Boolean} onlyId   [default: true]
   * @return {Promise}
   */
  getAllTabsIds(query={}, onlyId=true){
    return new Promise((resolve, reject)=>{
      xbrowser.tabs.query(query, tabs => {
        if(onlyId){
          resolve(tabs.map(v => v.id))
        }else{
          resolve(tabs)
        }
      });
    });
  }

  /**
   * [setPrivateMode disable // enable privateMode]
   * @param {Boolean} b
   */
  setPrivateMode(b){
    this.privateMode = b;
    this.setImage();
  }

  /**
   * [setImage set black or full color image]
   * @param {Boolean} b [default: false]
   */
  setImage(b=false){
    if(this.privateMode) b = !this.privateMode;
    else if(!this.privateMode && !this.changeIcon) b = true;
    xbrowser.browserAction.setIcon({path: b? 'images/on.png':  'images/off.png'});
  }

  /**
   * [getActiveTabIds return list of active tabs]
   * @return {Promise} Array
   */
  getActiveTabIds(){
    return new Promise(async (resolve, reject)=>{
      try {
        let tabs = (await this.getAllTabsIds({}, false))
        if(this.activWindowId>=1) tabs = tabs.filter(e => e.windowId == this.activWindowId && e.highlighted == true);
        resolve(tabs.map(v => v.id));
      } catch (e) {
        reject(e)
      }
    });
  }

   /**
    * [_onActivatedTab
    *  run eventlistener EVENT_NAMES.tab if activated new Tab
    *  parameter:
    *   tabId: Number
    * ]
    */
  _onActivatedTab(activeInfo){
    //on switch the active tabs between one window



        this.event.emit(EVENT_NAMES.focusTabCallback, activeInfo.tabId, false);
        if(!this.tabs.hasOwnProperty(activeInfo.tabId)){
          this.event.emit(EVENT_NAMES.focusTabCallback, null, false);
          this.setImage(false);
        }else{
          this.setImage(this.tabs[activeInfo.tabId].getState('allow') && !this.tabs[activeInfo.tabId].getState('disabled'));
        }
  }

  /**
   * [_onTab
   *  run eventlistener EVENT_NAMES.tab if create new Tab
   *  parameter:
   *   tabId: Number
   * ]
   */
  _onTab(tab){
    this.tabs[tab.id] = new Tab()
    this.event.emit(EVENT_NAMES.tab, tab.id, false);
  }

  /**
   * [_onTabRemove
   *  run eventlistener EVENT_NAMES.tabRemove for new content
   *  parameter:
   *   tabId: Number
   * ]
   */
  _onTabRemove(tabId){
    if(!this.privateMode && this.tabs.hasOwnProperty(tabId))
      this.event.emit(EVENT_NAMES.tabRemove, tabId, false);
  }

  /**
   * [_onTabUpdate
   *  run eventlistener EVENT_NAMES.tabUpdate for new content
   *  parameter:
   *   tabId: Number
   *   openerTabId: Number
   * ]
   */
  _onTabUpdate(tabId, info, tab){
    // console.log('Info', info, tab);
    if(!this.privateMode && this.tabs.hasOwnProperty(tabId) && info.hasOwnProperty('status') && info.status == 'complete' && tab.hasOwnProperty('title') && tab.hasOwnProperty('url')){
      this.event.emit(EVENT_NAMES.tabUpdate, {tabId: tabId, openerTabId: tab.hasOwnProperty('openerTabId')? tab.openerTabId: null, tab: tab}, false);
    }//if
  }

  /**
   * [_onTabContent
   *
   * run eventlistener EVENT_NAMES.tabContent for new content
   * parameter:
   *   tabId: Number
   *   url: String
   *   title: String
   *   html: String
   *   source: Array
   *   links: Array
   *   meta: String
   *   count: Number
   *
   * run eventlistener EVENT_NAMES.event for new event
   *   tabId: Number
   *   event: Array
   *  ]
   */
  _onTabContent(msg, sender, sendResponse){
      if(this.tabs.hasOwnProperty(sender.tab.id)) this.tabs[sender.tab.id].setState('allow', this.urlFilter.isAllow(sender.tab.url))
      if(msg==='ontracking'){
        sendResponse({allow: (!this.privateMode && !this.tabs[sender.tab.id].getState('disabled')), extensionfilter: this.extensionfilter});
      }else if(!this.tabs.hasOwnProperty(sender.tab.id) || !this.tabs[sender.tab.id].getState('allow') || this.tabs[sender.tab.id].getState('disabled')){
        this.setImage(false);
      }else if((!this.privateMode && !this.tabs[sender.tab.id].getState('disabled')) && this.tabs.hasOwnProperty(sender.tab.id)){
        // console.log(msg);

        // if(typeof msg.html == 'boolean' && msg.html == false){
        // console.log(msg.content[0]);
        if(typeof msg.content[0].html == 'boolean' && msg.content[0].html == false){

          console.log('DISABLE TRACKING');
          this.setImage(false);
          sendResponse(false);
        }else{
          this.setImage(true);
          // if(msg.count == 1){
             msg = Object.assign(msg, {
               url: sender.tab.url,
               title: sender.tab.title
             })
          // }
          // console.log(msg);
          msg.tabId = sender.tab.id;
          this.event.emit(EVENT_NAMES.tabContent, msg, false);
          sendResponse(true);
        }
        
        // return true;
      }else{
        sendResponse(false);
      }
  }

  /**
   * [setTabPrivate set tab disabled]
   * @param {Boolean} boolean [default: false]
   * @param {Promise}
   */
  setTabPrivate(boolean=false){
    return new Promise(async (resolve, reject) =>{
        try {
          let tabId = (await this.getAllTabsIds({}, false)).filter(e => e.windowId == this.activWindowId && e.highlighted == true)[0].id;
          this.tabs[tabId].setState('disabled', boolean);
          if(boolean){
            this.event.emit(EVENT_NAMES.focusTabCallback, null, false);
            this.setImage(false);
          }
          resolve()
        } catch (e) {
          reject(e)
        }
    });
  }

  /**
   * [isTabPrivate return state disable of active tab]
   * @return {Promise} Boolean
   */
  isTabPrivate(){
    return new Promise(async (resolve, reject) =>{
        try {
          let tabId = (await this.getAllTabsIds({}, false)).filter(e => e.windowId == this.activWindowId && e.highlighted == true)[0].id;
          resolve(this.tabs[tabId].getState('disabled'))
        } catch (e) {
          reject(e)
        }
    });
  }

  /**
   * [start load content]
   * @return {Promise}
   */
  start(){
    return new Promise((resolve, reject) => {
      xbrowser.tabs.onCreated.addListener(this._onTab);
      xbrowser.windows.onFocusChanged.addListener(this._onActivWindows);
      xbrowser.tabs.onRemoved.addListener(this._onTabRemove);
      xbrowser.tabs.onUpdated.addListener(this._onTabUpdate);
      xbrowser.runtime.onMessage.addListener(this._onTabContent);
      xbrowser.tabs.onActivated.addListener(this._onActivatedTab);

      // function logURL(requestDetails) {
      //   console.log("Loading: " + requestDetails.url);
      // }
      // console.log('!!!!!!!!!!!!start!!');
      // xbrowser.webRequest.onBeforeRequest.addListener(logURL, {
      //   urls: ["https://api.twitter.com/*"]
      // });

      // function logResponse(responseDetails) { 
      //   console.log('responseDetails');
      //   console.log(responseDetails);
      // }
      // xbrowser.webRequest.onCompleted.addListener(
      //   logResponse,
      //   {urls: ["https://api.twitter.com/*"]}
      // );

      xbrowser.windows.getLastFocused({}, window => {
        if(window.id>0) this._onActivWindows(window.id)
        // if(window.id>0) console.log('Change activWindowId %s', window.id);
      })
      xbrowser.tabs.onHighlighted.addListener(function(highlightInfo) {
        this.event.emit(EVENT_NAMES.onFocusTab, null, false);
      }.bind(this));

      this.getAllTabsIds().then(tabIds => {
        for (let id of tabIds){
          this.tabs[id] = new Tab()
        }
      });

      resolve();
    });
  }

  /**
   * [remove all listener from eventemitter3 instance]
   */
  stop(){
    this.tabs = {};
    xbrowser.tabs.onCreated.removeListener(this._onTab);
    xbrowser.windows.onFocusChanged.removeListener(this._onActivWindows);
    xbrowser.tabs.onRemoved.removeListener(this._onTabRemove);
    xbrowser.tabs.onUpdated.removeListener(this._onTabUpdate);
    xbrowser.runtime.onMessage.removeListener(this._onTabContent);
    xbrowser.tabs.onActivated.removeListener(this._onActivatedTab);

    console.log('CLOSE Extension');
    this.setImage(false);
    delete this
  }

  /**
   * [create browser notification]
   * @param  {String} [title='title']
   * @param  {String} [message='mycontent']
   * @param  {function} [onClose=()=>{}]
   */
  createNotification(title='title', message='mycontent', onClose=()=>{}){
    chrome.notifications.create(
      'name-for-notification',
      {
        type: 'basic',
        iconUrl: 'images/on.png',
        title: title,
        message: message
      },
      onClose
    )
  }

}//()
