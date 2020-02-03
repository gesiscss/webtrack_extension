import EventEmitter from 'eventemitter3';
const EVENT_NAMES = {
  'event': 'onEvent',
  'focusTabCallback': 'onFocusTabCallback',
  'focusTab': 'onFocusTab',
  'extendPrivateMode': 'onExtendPrivateMode',
  'tabContent': 'onTabContent',
  'tabRemove': 'onTabRemove',
  'tab': 'onTab',
  'tabUpdate': 'onTabUpdate',
  'disconnectPopup': 'onDisconnectPopup',
  'connectedPopup': 'onConnectedPopup'
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
    this.default_private_time_ms = 15*60*1000;

    this.prev_active_tab = -1;
    this.active_tab = -1;

    this._onContentMessage = this._onContentMessage.bind(this);
    this._onTabUpdate = this._onTabUpdate.bind(this);
    this._onTabRemove = this._onTabRemove.bind(this);
    this._onActiveWindows = this._onActiveWindows.bind(this);
    this._onActivatedTab = this._onActivatedTab.bind(this);
    this._onTab = this._onTab.bind(this);
    this._onHighlightedWindows = this._onHighlightedWindows.bind(this);
    this._onDisconnectPopup = this._onDisconnectPopup.bind(this);
    this._onConnectPopup = this._onConnectPopup.bind(this);

    this.getAllTabsIds = this.getAllTabsIds.bind(this);
    this.pending_private_time_answer = false;

    this.debug = false;
  }

  /**
   * [_onActiveWindows listenen the active windowId for check the active tab]
   */
  _onActiveWindows(windowId){
    if (this.debug) console.log('-> _onActiveWindows');
    this.event.emit(EVENT_NAMES.focusTab, null, false);
    if(windowId>0) this.activWindowId = windowId;
  }


  /**
   * [_onConnectedPopup listen when the extension popup is open]
   */
  _onConnectPopup(externalPort){
    if (this.debug) console.log('-->_onConnectPopup:', externalPort);
    if (externalPort.name == "extension_popup"){
      externalPort.onDisconnect.addListener(this._onDisconnectPopup);
      this.event.emit(EVENT_NAMES.connectedPopup);
    }
    if (this.debug) console.log('<--_onConnectPopup:');
  }

  /**
   * [_onDisconnectPopup listen when the extension popup is closed]
   */
  _onDisconnectPopup(externalPort){
    if (this.debug) console.log('-->_onDisconnectPopup:', externalPort);
    if (externalPort.name == "extension_popup"){
      externalPort.onDisconnect.removeListener(this._onDisconnectPopup);
      this.event.emit(EVENT_NAMES.disconnectPopup);
    }
    if (this.debug) console.log('<--_onDisconnectPopup');
  }


  /**
   * _onHighlightedWindows listen when a tab is highlighed
   * @param  {[type]} highlightInfo [description]
   * @return {[type]}               [description]
   */
  _onHighlightedWindows(highlightInfo){
    if (this.debug) console.log('_onHighlightedWindows');
    this.event.emit(EVENT_NAMES.focusTab, null, false);
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
    if (this.privateMode != b) {
      this.notifyPrivateMode();
    }
    this.privateMode = b;
    this.resetPublicImage();
    //this.setImage(!this.privateMode);
  }


  /**
   * displayPrivateTimePopup send a message indicating that a popup should appear
   * @param {Boolean} 
   */
  async displayPrivateTimePopup(){
    this.pending_private_time_answer = true;
    // send a messate
    xbrowser.tabs.query({active: true}, function(tabs){
      for (let tab of tabs) {
        try{
          xbrowser.tabs.sendMessage(tab.id, { 
              action: "popup_private_time", 
              display: true
            }, 
            function(response) {
              if(xbrowser.runtime.lastError) {
                if (this.debug) console.log('displayPrivateTimePopup: No front end tab is listening.');
              }
            }.bind(this));
        } catch (e){
          console.log('caught');
        }
      }
    }.bind(this));
  }


  /**
   * removePrivateTimePopup send a message indicating that the popup should be hidden
   * @param {Boolean} 
   */
  async removePrivateTimePopup(){
    this.pending_private_time_answer = false;
    // send a message to all tabs
    let tabs = await this.getAllTabsIds({}, false);
    if(tabs.length>0){
      for (let tab of tabs) {
        try{
          xbrowser.tabs.sendMessage(tab.id, {action: "popup_private_time", display: false}, 
            function(response) {
              if(xbrowser.runtime.lastError) {
                if (this.debug) console.log('removePrivateTimePopup: No front end tab is listening.');
              }
            }.bind(this));
        } catch (e){
          console.log('caught');
        }
      }
    }
  }


  /**
   * initFrontent send a message asking to initialize the frontend tracking
   * @param {Boolean} 
   */
  async initAllTabs(){
    if (this.debug) console.log('-> initAllTabs()');
    // send a message to all tabs
    let tabs = await this.getAllTabsIds({}, false);
    if(tabs.length>0){
      for (let tab of tabs) {
        try{
          xbrowser.tabs.sendMessage(
            tab.id, {
              action: "init"
            }, 
            function(response) {
              if(xbrowser.runtime.lastError) {
                if (this.debug) console.log('OnInit: No front end tab is listening.');
              }
            }.bind(this));
        } catch (e){
          console.log('caught');
        }
      }
    }
  }

  /**
   * removePrivateTimePopup send a message indicating that the popup should be hidden
   * @param {Boolean} 
   */
  async notifyPrivateMode(){
    // send a message to all tabs
    let tabs = await this.getAllTabsIds({}, false);
    if(tabs.length>0){
      for (let tab of tabs) {
        try{
          xbrowser.tabs.sendMessage(tab.id, {
            action: "private_mode", 
            private_mode: this.privateMode, 
            tab_disabled: this.tabs[tab.id].getState('disabled')
          }, 
            function(response) {
              if(xbrowser.runtime.lastError) {
                if (this.debug) console.log('notifyPrivateMode: No front end tab is listening.');
              }
            }.bind(this));
        } catch (e){
          console.log('caught');
        }
      }
    }
  }

  /**
   * [setImage set black or full color image]
   * @param {Boolean} b [default: false]
   */
  setImage(b=false){
    // console.log('before', b);
    // console.log(this.privateMode);
    if(this.privateMode) b = false;
    else if(!this.privateMode && !this.changeIcon) b = true;
    // console.log('after', b);
    xbrowser.browserAction.setIcon({path: b? 'images/on.png':  'images/off.png'});
  }


  /**
     * [resetPublicMode apropiately reset to public image]
     * @param {Boolean} b
     */
  async resetPublicImage(){   
    let activeTabIds = await this.getActiveTabIds();
    if(activeTabIds.length>0){
      for (let id of activeTabIds) {
        //this.resetImage(tabs[0].id);
        if (this.tabs.hasOwnProperty(id)) {

          // console.log('allow:', this.tabs[id].getState('allow'))
          // console.log('disabled:', this.tabs[id].getState('disabled'))
          // console.log('is_sm_path_allowed:', this.tabs[id].getState('is_sm_path_allowed'))
          // console.log('is_content_allowed:', this.tabs[id].getState('is_content_allowed'))
          // console.log('only_domain:', this.tabs[id].getState('only_domain'))
          // console.log('only_url:', this.tabs[id].getState('only_url'))
          // console.log('private_mode:', this.privateMode)

          this.setImage(this.tabs[id].getState('allow') 
              && !this.tabs[id].getState('disabled')
              && this.tabs[id].getState('is_sm_path_allowed')
              && this.tabs[id].getState('is_content_allowed')
              && !this.tabs[id].getState('only_domain')
              && !this.tabs[id].getState('only_url')
              && !this.privateMode);
          
        } else {
          this.setImage(this.privateMode);

        }

      }
    }
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
    if (this.debug) console.log('_onActivatedTab');

    this.prev_active_tab = this.active_tab;
    this.active_tab = activeInfo.tabId;
    
    if (this.pending_private_time_answer){
      this.displayPrivateTimePopup();
    }
    
    this.event.emit(EVENT_NAMES.focusTabCallback, activeInfo.tabId, false);
    if(!this.tabs.hasOwnProperty(activeInfo.tabId)){
      this.event.emit(EVENT_NAMES.focusTabCallback, null, false);
      this.setImage(false);
    }else{
      this.resetPublicImage();
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
    //if (this.debug) console.log('-> Extension._onTabUpdate');
    if(!this.privateMode && this.tabs.hasOwnProperty(tabId) && info.hasOwnProperty('status') 
      && info.status == 'complete' && tab.hasOwnProperty('title') && tab.hasOwnProperty('url')){
      if (this.debug) console.log('==== Emit Event: onTabUpdate ====');
      this.event.emit(EVENT_NAMES.tabUpdate, {
        tabId: tabId, 
        openerTabId: tab.hasOwnProperty('openerTabId')? tab.openerTabId: this.prev_active_tab, 
        tab: tab}, false);
    }//if
    //if (this.debug) console.log('<- Extension._onTabUpdate');
  }

  /**
   * [_onContentMessage
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
  _onContentMessage(msg, sender, sendResponse){
      if (this.debug) console.log('-> _onContentMessage');

      if(msg==='ontracking'){
        if (this.debug) console.log('# ontracking');
        let domain = this.urlFilter.get_location(sender.tab.url).hostname;
        this.tabs[sender.tab.id].setState('allow', this.urlFilter.isAllow(domain));
        this.tabs[sender.tab.id].setState('only_domain', this.urlFilter.only_domain(domain));
        this.tabs[sender.tab.id].setState('only_url', this.urlFilter.only_url(domain));

        //assume it is allowed
        this.tabs[sender.tab.id].setState('is_sm_path_allowed', true);
        this.tabs[sender.tab.id].setState('is_content_allowed', true);

        let r = {
          extensionfilter: this.extensionfilter, 
          pending_private_time_answer: this.pending_private_time_answer,
          default_private_time_ms: this.default_private_time_ms,
          privacy: {
              only_domain: this.tabs[sender.tab.id].getState('only_domain'),
              only_url: this.tabs[sender.tab.id].getState('only_url'),
              blacklisted: !this.tabs[sender.tab.id].getState('allow'),
              private_mode: this.privateMode,
              tab_disabled: this.tabs[sender.tab.id].getState('disabled')
          }
        }
        sendResponse(r);
      } else if (msg.hasOwnProperty('private_time')){
        if (this.debug) console.log('The user has requested more private time: ', msg.private_time);
        this.event.emit(EVENT_NAMES.extendPrivateMode, msg.private_time);
        this.removePrivateTimePopup();
        this.pending_private_time_answer = false;
        sendResponse(false);
      } else if(!this.tabs.hasOwnProperty(sender.tab.id) || 
          this.tabs[sender.tab.id].getState('disabled')){
        if (this.debug) console.log('# tab disabled');
        if (sender.tab.id == this.active_tab){
          this.setImage(false);
        }
        sendResponse(false);
      // background controls
      }else if(!this.tabs[sender.tab.id].getState('disabled') && this.tabs.hasOwnProperty(sender.tab.id)){
        if(typeof msg.content[0].html == 'boolean' && msg.content[0].html == false && sender.tab.id == this.active_tab){
          this.setImage(false);
          sendResponse(false);
        }else {        
          // if the property indicated that is allow to not track the content
          // then update the indicator, otherwise assume that it is allowed
          let is_sm_path_allowed = true;
          if (msg.content[0].hasOwnProperty('is_sm_path_allowed')){
            is_sm_path_allowed = msg.content[0].is_sm_path_allowed;
          }
          this.tabs[sender.tab.id].setState('is_sm_path_allowed', is_sm_path_allowed);

          let is_content_allowed = true;
          if (msg.content[0].hasOwnProperty('is_content_allowed')){
            is_content_allowed = msg.content[0].is_content_allowed;
          }
          this.tabs[sender.tab.id].setState('is_content_allowed', is_content_allowed);

          // update the indicator if this the active tab is the one sending the content
          // the DOM of a non active tab could be changing in the background
          if (sender.tab.id == this.active_tab){
            //this.setImage(is_sm_path_allowed && is_content_allowed);
            this.resetPublicImage();
          }
         
          // even if the content is blocked, the metainformation is sent in order to
          // keep track of the precursors
          msg = Object.assign(msg, {
            departing_url: sender.tab.url,
            unhashed_url: msg.unhashed_url,
            title: sender.tab.title
          })
          msg.tabId = sender.tab.id;
          if (this.debug) console.log('==== Emit Event: onTabContent ====');
          this.event.emit(EVENT_NAMES.tabContent, msg, false);
          sendResponse(true);
          if (this.debug) console.log('==== Event emitted: onTabContent ====');

        }
        
        // return true;
      }else{
        debugger;
        if (this.debug) console.log('Private mode: ', this.privateMode);
        sendResponse(false);
      }
      
      if (this.debug) console.log('<- _onContentMessage');
      return true;
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
          if (tabId && this.tabs[tabId]) {
            if (this.debug) console.log(tabId);
            resolve(this.tabs[tabId].getState('disabled'))
          }else{
            resolve(false);
          }
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
      xbrowser.windows.onFocusChanged.addListener(this._onActiveWindows);
      xbrowser.tabs.onRemoved.addListener(this._onTabRemove);
      xbrowser.tabs.onUpdated.addListener(this._onTabUpdate);
      xbrowser.runtime.onMessage.addListener(this._onContentMessage);
      xbrowser.tabs.onActivated.addListener(this._onActivatedTab);
      xbrowser.runtime.onConnect.addListener(this._onConnectPopup);


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
        if(window.id>0) this._onActiveWindows(window.id)
        // if(window.id>0) console.log('Change activWindowId %s', window.id);
      })
      xbrowser.tabs.onHighlighted.addListener(this._onHighlightedWindows);

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
    if (this.debug) console.log('-> Extension.stop()');

    this.tabs = {};
    xbrowser.tabs.onCreated.removeListener(this._onTab);
    xbrowser.windows.onFocusChanged.removeListener(this._onActiveWindows);
    xbrowser.tabs.onRemoved.removeListener(this._onTabRemove);
    xbrowser.tabs.onUpdated.removeListener(this._onTabUpdate);
    xbrowser.runtime.onMessage.removeListener(this._onContentMessage);
    xbrowser.tabs.onActivated.removeListener(this._onActivatedTab);
    // xbrowser.runtime.onConnect.removeListener(this._onConnectPopup);
    // xbrowser.runtime.onConnect.removeListener(this._onDisconnectPopup);
    // xbrowser.tabs.onHighlighted.removeListener(this._onHighlightedWindows);
    
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


  /**
   * [create browser notification (it does not smoothly in firefox)]
   * @param  {String} [title='title']
   * @param  {String} [message='mycontent']
   * @param  {function} [onClose=()=>{}]
   */
  notifyUser(){
    chrome.notifications.create(
      'name-for-notification',
      {
        type: 'basic',
        iconUrl: 'images/on.png',
        title:   "Webtrack reminder",
        message: "15 minutes have passed!"
        // ,
        // contextMessage: "It's about time...",
        // eventTime: Date.now() + 10000,
        // buttons: [{
        //     title: "Yes, get me there",
        //     iconUrl: "images/on.png"
        // }, {
        //     title: "Get out of my way",
        //     iconUrl: "images/off.png"
        // }
        // ]
      }, function(id) {
        let myNotificationID = id;
        console.log(myNotificationID);
    });
  }

}//()
