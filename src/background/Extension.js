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
}

class Tab {

  constructor() {
    this.allow = true;
    this.disabled = false;
    this.content_blocked = false;
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

    this._onContentMessage = this._onContentMessage.bind(this);
    this._onTabUpdate = this._onTabUpdate.bind(this);
    this._onTabRemove = this._onTabRemove.bind(this);
    this._onActivWindows = this._onActivWindows.bind(this);
    this._onActivatedTab = this._onActivatedTab.bind(this);
    this._onTab = this._onTab.bind(this);

    this.getAllTabsIds = this.getAllTabsIds.bind(this);
    this.pending_private_time_answer = false;

    this.debug = true;
  }

  /**
   * [_onActivWindows listenen the active windowId for check the active tab]
   */
  _onActivWindows(windowId){
    this.event.emit(EVENT_NAMES.focusTab, null, false);
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
    this.setImage(!this.privateMode);
  }


  /**
   * [sendPrivateTimeIsOverMsg send a message indicating that the private time is over]
   * @param {Boolean} 
   */
  sendPrivateTimeIsOverMsg(){
    this.pending_private_time_answer = true;
    // send a messate
    xbrowser.tabs.query({active: true, currentWindow: true}, function(tabs){
      if (tabs.length > 0) {
        try{
          xbrowser.tabs.sendMessage(tabs[0].id, {action: "private_time_is_over"}, 
            function(response) {
              if(xbrowser.runtime.lastError) {
                if (this.debug) console.log('No front end tab is listening.');
              }
            }.bind(this));
        } catch (e){
          console.log('caught');
        }
      }
    }.bind(this));
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
        this.setImage(this.tabs[id].getState('allow') 
          && !this.tabs[id].getState('disabled')
          && !this.tabs[id].getState('content_blocked'));
        //this.setPrivateMode(false);
        //component.setTooglePrivateMode(false);
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
    
    if (this.pending_private_time_answer){
      this.sendPrivateTimeIsOverMsg();
    }
    
    this.event.emit(EVENT_NAMES.focusTabCallback, activeInfo.tabId, false);
    if(!this.tabs.hasOwnProperty(activeInfo.tabId)){
      this.event.emit(EVENT_NAMES.focusTabCallback, null, false);
      this.setImage(false);
    }else{
      this.resetPublicImage();
      // this.setImage(this.tabs[activeInfo.tabId].getState('allow') 
      //   && !this.tabs[activeInfo.tabId].getState('disabled')
      //   && !this.tabs[activeInfo.tabId].getState('content_blocked'));
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
      this.event.emit(EVENT_NAMES.tabUpdate, {tabId: tabId, openerTabId: tab.hasOwnProperty('openerTabId')? tab.openerTabId: null, tab: tab}, false);
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
      if(this.tabs.hasOwnProperty(sender.tab.id)) {
        this.tabs[sender.tab.id].setState('allow', this.urlFilter.isAllow(sender.tab.url))
      }

      if(msg==='ontracking'){
        if (this.debug) console.log('# ontracking');
        sendResponse({
          allow: (!this.privateMode && !this.tabs[sender.tab.id].getState('disabled')), 
          extensionfilter: this.extensionfilter, 
          pending_private_time_answer: this.pending_private_time_answer
        });
      } else if (msg.hasOwnProperty('private_time')){
        console.log('The user has requested more private time: ', msg.private_time);
        this.event.emit(EVENT_NAMES.extendPrivateMode, msg.private_time);
        this.pending_private_time_answer = false;
      } else if(!this.tabs.hasOwnProperty(sender.tab.id) || !this.tabs[sender.tab.id].getState('allow') || this.tabs[sender.tab.id].getState('disabled')){
        this.setImage(false);
        sendResponse(false);

      // background controls
      }else if((!this.privateMode 
        && !this.tabs[sender.tab.id].getState('disabled')) 
        && this.tabs.hasOwnProperty(sender.tab.id)){

        // if(typeof msg.html == 'boolean' && msg.html == false){
        if(typeof msg.content[0].html == 'boolean' && msg.content[0].html == false){
          this.setImage(false);
          sendResponse(false);
        }else {

          // if the property indicated that is allow to not trach the content
          // then update the indicator, otherwise assume that it is allowed
          if (msg.content[0].hasOwnProperty('is_track_allow')){
            this.tabs[sender.tab.id].setState('content_blocked', !msg.content[0].is_track_allow);
            this.setImage(msg.content[0].is_track_allow);
            //sendResponse(false);
          } else {
            this.tabs[sender.tab.id].setState('content_blocked', false);
            this.setImage(true);
          }


          // even if the content is block, the metainformation is sent in order to
          // keep track of the precursors
          // TODO: This is probably unnecessary. If the content is blocked, nothing is uploaded
          // unless the block is due to a social media tracker. 
          // Note: Special attention to the departing_url as it is not added anywhere else.
          msg = Object.assign(msg, {
            departing_url: sender.tab.url,
            unhashed_url: msg.unhashed_url,
            title: sender.tab.title
          })
          msg.tabId = sender.tab.id;
          if (this.debug) console.log('==== Emit Event: onTabContent ====');
          this.event.emit(EVENT_NAMES.tabContent, msg, false);
          sendResponse(true);

        }
        
        // return true;
      }else{
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
      xbrowser.runtime.onMessage.addListener(this._onContentMessage);
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
        this.event.emit(EVENT_NAMES.focusTab, null, false);
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
    xbrowser.runtime.onMessage.removeListener(this._onContentMessage);
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
