/*global chrome*/
/*global browser*/

import EventEmitter from 'eventemitter3';
const EVENT_NAMES = {
  'ready': 'onReady'
}

export default class Extension{

    constructor(){
      this.xbrowser = chrome? chrome: browser;
      this.event = new EventEmitter();
      this.companie = this.get().companie;
      this.settings = this.get().settings;
      this.requireUpdate = this.get().requireUpdate;
      this.pageHandler = this.get().pageHandler;

      // if the pagehanlder is not loaded (e.g. because the server
      // is down) try to load it
      if (this.pageHandler.isLoaded()){
        //only reload configuration to update parameters such as the urllist
        this.pageHandler.reload_config();
      } else {
        this.pageHandler.init();
      }
      
      // hack to force an event in the background when the extension is closed
      var port = this.xbrowser.runtime.connect();
      this._onReady();
    }

    /**
     * [wait if the pageHandler on the cross view from the background page exist]
     * @return {[type]} [description]
     */
    _onReady(){
      this.interval = setInterval(function(){
        if(this.pageHandler!=null){
          clearInterval(this.interval);
          this.event.emit(EVENT_NAMES.ready, {
            pageHandler: this.pageHandler,
            settings: this.settings,
            companie: this.companie
          }, false);
        }
      }.bind(this), 500);
    }

    /**
     * [get the window object from the brackground page]
     * @return {Object}
     */
    get(){
      return this.xbrowser.extension.getBackgroundPage()
    }

}
