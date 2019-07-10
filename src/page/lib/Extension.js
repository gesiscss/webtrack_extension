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
