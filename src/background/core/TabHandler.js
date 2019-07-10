import TabCache from './TabCache';
import Tab from './Tab';
import EventEmitter from 'eventemitter3';

const EVENT_NAMES = {
  'page': 'onPage'
}

export default class TabHandler {

  /**
   * [constructor
   * - create instance of TabCache
   * ]
   * @param {Number} projectId
   * @param {Extension} extension [instance of Extension-Class]
   */
  constructor(projectId, extension) {
    this.extension = extension;
    this.tab2precursor_id = {};
    this.closeTab = this.closeTab.bind(this);
    this._onFocus = this._onFocus.bind(this);
    this._updateDuration = this._updateDuration.bind(this);
    this.projectId = projectId;
    this.tabCache = new TabCache(projectId, 0);
    this.UPDATE_INTERVAL_DURATION = 1000;
    this.event = new EventEmitter();

    this.onFocusTabInterval = null;
    this.openerTabId2tab = {};
    this.DEBUG = false;
  }


  /**
   * [_getHashCode return hashcode from string]
   * @param  {String} str [default: '']
   * @return {String}
   */
  _getHashCode(str=''){
    var hash = 5381, i = str.length
    while(i)
      hash = (hash * 33) ^ str.charCodeAt(--i)
    return hash >>> 0;
  }

  /**
   * [getPrecursor_id search and return the precursor of tabId]
   * @param  {Number} tabId
   * @param  {String} url      [default: '']
   * @return {Number} id
   */
  getPrecursor_id(tabId, url=''){
    let id = this.tab2precursor_id.hasOwnProperty(tabId)? this.tab2precursor_id[tabId]: null;
    if(id==null && url.length>0 && Object.keys(this.tabs).length > 0){
      let hash_url = this._getHashCode(url.replace(new RegExp('^http(s)?:\/\/', 'g'), ''));
      let found = [];
      for (let _tabId of Object.keys(this.tabs)) {
        let tab = this.tabs[_tabId];
        if(tab.is() && tab.hasContent() && tab.get().links==undefined) console.log('no Links', tab.get());
        if (tab.is() && tab.hasContent() && tab.get().links.includes(hash_url)){
          found.push({tabId: _tabId, id: tab.get().id})
        }
      }//for
      if(found.length===1){
        return found[0].id
      }else if(found.length>1){
        for (let e of found) {
          if(this.openerTabId2tab.hasOwnProperty(e.tabId) && this.openerTabId2tab[e.tabId].includes(tabId)){
            return e.id;
          }
        }
        id = found[found.length-1].id
      }
    }
    return id;
  }

  /**
   * [setPrecursor_id set the precursor id of the tab-id]
   * @param {Number} tabId
   */
  setPrecursor_id(tabId, id){
    this.tab2precursor_id[tabId] = id;
    console.log('setPrecursor_id', this.tab2precursor_id[tabId]);
  }

  /**
   * [closeTab // close and delete tab and hand over the page to the event function
   * if the parameter close and tabRemove are true, than will be clean and delete the db entry
   * ]
   * @param  {Number}  tabId
   * @param  {Number}  openerTabId
   * @param  {Boolean}  close [close tab]
   * @param  {Boolean}  tabRemove [remove the db entry]
   */
  async closeTab(tabId, openerTabId, close=true, tabRemove=false){
    if(openerTabId!=null){
      if(!this.openerTabId2tab.hasOwnProperty(openerTabId)) this.openerTabId2tab[openerTabId] = [];
      if(!this.openerTabId2tab[openerTabId].includes(openerTabId)) this.openerTabId2tab[openerTabId].push(tabId);
    }
    console.log('openerTabId2tab', this.openerTabId2tab);
    if(this.tabs.hasOwnProperty(tabId)){
      if(this.tabs[tabId].hasContent()) {
          this.setPrecursor_id(tabId, this.tabs[tabId].get().id);
      }
      if(close && !tabRemove) {
        this.tabs[tabId].close(page => {
          if(page!=null){
           console.log('Send Page');
           this.event.emit(EVENT_NAMES.page, page, false);
          }
        });
      }else if(close && tabRemove){
        this.closeLostTabs([tabId])
      }
    }else{
      console.log('TabId %s not found', tabId);
    }



    // delete this.tabs[tabId];

  }

  /**
   * [_updateDuration update the duration of active tabs]
   */
  async _updateDuration(){
    try {
      let tabIds = (await this.extension.getActiveTabIds()).filter((tabId, i) => this.tabs.hasOwnProperty(tabId));
      if(tabIds.length>0){
        for (let id of tabIds) {
          this.tabs[id].updateDuration(this.UPDATE_INTERVAL_DURATION)
        }
      }//if(tabIds.length>0)
    } catch (err) {
      console.log(err);
      this._updateDuration();
      this.event.emit('error', err, true);
    }
  }

  /**
   * [_onFocus add the interval time to the duration time from the tab-ids ]
   * @param  {[type]}  [tabIds=null] [description]
   * @return {Promise}               [description]
   */
  async _onFocus(tabIds=null){
    try {
      if(this.onFocusTabInterval!=null){
        clearInterval(this.onFocusTabInterval);
        this.onFocusTabInterval = null;
      }
      this.onFocusTabInterval = setInterval(this._updateDuration, this.UPDATE_INTERVAL_DURATION);
    } catch (e) {
      this.event.emit('error', e, true);
      console.warn(e);
    }
  }


  _pushData(data, count=0){
    if(typeof data != 'object'){
      console.warn('data is no object');
    }else if(this.tabs.hasOwnProperty(data.tabId)){
      // console.log('onTabContent %s', data.tabId, data);
      // if(data.count == 1 && data.hasOwnProperty('url')){
        // data.precursor_id = this.getPrecursor_id(data.tabId, data.url);
      //   this.tabs[data.tabId].addUpdate(data)
      // }else if(this.tabs[data.tabId].hasContent()){
        // this.tabs[data.tabId].addUpdate(data)
      // }else{
      //   // this.tabs[data.tabId].create();
      //   console.log('tab id %s has not content', data.tabId, data.count);
      // }

      //close the tab if the data count lower than the old count
      if(data.count < this.tabs[data.tabId].get().count){
        console.log('Tab close');
        this.closeTab(data.tabId, undefined);
      }
      if(!this.tabs[data.tabId].get().hasOwnProperty('precursor_id')){
        data.precursor_id = this.getPrecursor_id(data.tabId, data.url);
      }
      this.tabs[data.tabId].addUpdate(data)
    }else if(count <= 10){

      console.log('Timeout', data, count);
      setTimeout(()=> this._pushData(data, count+1), 1000);
    }else{
      console.warn('Timeout over', data);
    }
  }

  async closeLostTabs(lostIds=[]){
    if(lostIds.length>0){
      let id = lostIds.shift();
      try {
        let tab = null
        if(!this.tabs.hasOwnProperty(id)){
          tab = new Tab(this.projectId, id);
          await tab.init()
        }else{
          tab = this.tabs[id];
        }

        await tab.cleanTab(page => {
          if(page!=null){
             console.log('Send Page');
             this.event.emit(EVENT_NAMES.page, page, false);
          }
        })
        console.log('Tryed to delete tab', id);
        await this.tabCache.deleteTab(id)
        console.log('Delete the Tab %s', id);
        // console.log('clean', id)

        this.closeLostTabs(lostIds)
      } catch (err) {
        this.closeLostTabs(lostIds)
        console.log(err);
      }
    }else{
      console.log('Close all tabs');
    }
  }


  close(){
    return new Promise(async (resolve, reject) => {
      try {
        this.extension.stop();
        let tabs = this.tabCache.getTabs();
        this.closeLostTabs(tabs);
        this.tabCache.close();
        this.isClose = true;
        resolve();
      } catch (err) {
        reject(err)
      }
    })
  }


  /**
   * [start all eventlistener for the handler]
   * @return {Promise}
   */
  start(){
    return new Promise(async (resolve, reject) => {
      try {
        // console.warn('START');
        await this.tabCache.init();
        this.isClose = false;
        this.tabs = {};
        let tabIds = await this.extension.getAllTabsIds();

        let lostIds = [];
        for (let id of this.tabCache.getTabsIds()) {
          id = parseInt(id, 10);
          if(!tabIds.includes(id)){
            lostIds.push(id);
          }
        }

        // close all lost tabs
        this.closeLostTabs(lostIds);

        //create all tabs
        for (let id of tabIds) {
          this.tabs[id] = new Tab(this.projectId, id);
          await this.tabs[id].init();
          //clean tab
          this.tabs[id].cleanTab(page => {
            if(page!=null){
               this.event.emit(EVENT_NAMES.page, page, false);
            }
          })
        }
        // On close the tab
        this.extension.event.on('onTabRemove', tabId => {
          if(!this.isClose){
            console.log('onTabRemove', tabId);
            this._onFocus();
            this.closeTab(tabId, undefined, true, true);
          }
        });
        //create ne Tab Object
        this.extension.event.on('onTab', tabId => {
          if(!this.isClose){
            console.log('onTab', tabId);
            let tab = new Tab(this.projectId, tabId);
            let timeout = setTimeout(()=>{
              console.warn('Timeout: Failed to create Tab');
            }, 2000)

            tab.init().then(()=> {
              console.log('Create Tab Object');
              this.tabs[tabId] = tab
              clearTimeout(timeout);
            }).catch(err => {
              console.error('Failed to create Tab', err);
            })
          }
        });
        //on focus other tab
        this.extension.event.on('onFocusTab', () => {
          if(!this.isClose){
            this._onFocus()
          }
          // console.log('onFocusTab');
        });
        //on tab update
        this.extension.event.on('onTabUpdate', e => {
          if(!this.isClose){
            console.log('#onTabUpdate', e);
            this._onFocus();
            //close the tab if the urls are different
            this.closeTab(e.tabId, e.openerTabId, this.tabs.hasOwnProperty(e.tabId) && this.tabs[e.tabId].get().url != e.tab.url);
          }
        });
        //on tab data send
        this.extension.event.on('onTabContent', data => {
          if(!this.isClose){
            this._pushData(data);
          }
        });
        this.extension.event.on('onFocusTab', () => {
          if(!this.isClose){
            this._onFocus()
          }
        });

        resolve();
      } catch (e) {
        this.event.emit('error', e, true);
        reject(e)
      }
    });
  }




}
