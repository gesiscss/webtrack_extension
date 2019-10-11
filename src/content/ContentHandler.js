import FacebookTracker from './addon/FacebookTracker';
import YouTubeTracker from './addon/YouTubeTracker';
import TwitterTracker from './addon/TwitterTracker';
import Tracker from './Tracker';
import DomDetector from './DomDetector';

export default class ContentHandler {

  /**
   * [constructor]
   */
  constructor(){
    this.page = null;
    this.tracker = null;
    this.count = 0;
    this.allow = false;
    this.browser = window.hasOwnProperty('chrome') ? chrome : browser;
    this.domDetector = new DomDetector();
    this.startTime = +new Date();
    this.tracker = null
    this.param = null;
    this.isSend = false;
    this.data = {}
    this.DELAY = 1000;
    this.last = 0;
    this.debug = true;
  }

  /**
   * [return specific tracker for the current page]
   * @return {[type]} [description]
   */
  _getTracker(){
    let str = location.hostname;
    if(str.indexOf('facebook')>=0){
      console.log('FacebookTracker');
      return FacebookTracker;
    }else if(str.indexOf('youtube')>=0){
      console.log('YouTubeTracker');
      return YouTubeTracker;
    }else if(str.indexOf('twitter')>=0){
      console.log('TwitterTracker');
      return TwitterTracker;
    }
    console.log('Tracker');
    return Tracker
  }

  /**
   * [get parameter from background]
   * @return {Promise<object>}
   */
  _getParam(){
    return new Promise((resolve, reject)=>{
      this.browser.runtime.sendMessage('ontracking', (response) => {
        resolve(response);
      });
    });
  }


  /**
   * [send message to the background]
   * @param  {Object} [object={}]
   */
  sendMessage(object={}){
    this.count += 1;

    let type = null;
    if(object.hasOwnProperty('html')){
      if (this.debug){
        console.log('Counter');
        console.log(this.count);

        if(object['html']) {
          console.log((object['html']).length);
        }
      }
      object = {content: [object]};
      type = 'html';
    } else if(object.hasOwnProperty('links')){
      // object = {links: this.data.links.concat(object.links)}
      // type = 'links';
    } else if(object.hasOwnProperty('source')){
      // object = {source: this.data.source.concat(object.source)}
      // type = 'source';
    } else if(object.hasOwnProperty('meta')){
      object = {meta: Object.assign({description: '', keywords: '' }, object.meta)}
      type = 'meta';
    } else if(object.hasOwnProperty('event')){
      object = {events: this.data.events.concat([object])}
      type = 'event';
    }

    this.data = Object.assign({
      startTime: this.startTime,
      createData: + new Date(),
      location_url: window.location.href,
      content: [],
      source: [],
      links: [],
      events: [],
      meta: Object.assign({
        description: '',
        keywords: ''
      }),
      favicon: '',
      count: 0
    }, this.data, object, {count: this.count})
    
    switch (type) {
      case 'html':
          let now = +new Date();
          if (now - this.last > this.DELAY) {
              this.last = now;
              // console.log('sendMessage %s', this.count, object);
              try {
                this.browser.runtime.sendMessage(this.data, (response)=>{
                  if(response==undefined){
                    this.close();
                    console.log('Close');                  
                  }                
                });
              } catch(err){
                if (err.message == "Extension context invalidated."){
                  console.log('Could not sendMessage. Did you reload the extension?');
                } else {
                  debugger;
                  throw err;
                }
              }
          }
        break;
      default:
        if(this.data.content.length>0){
          // console.log('sendMessage %s', this.count, object);
          try{
            this.browser.runtime.sendMessage(this.data, (response)=>{
              if(response==undefined){
                this.close();
                console.log('Close');                  
              }
            });
          } catch(err){
              if (err.message == "Extension context invalidated."){
                console.log('Could not sendMessage. Did you reload the extension?');
              } else {
                debugger;
                throw err;
              }
          }

        }else{
          console.log('wait for content');
        }

    }
    
  }

  close(){
    this.domDetector.removeAllEventListener();
    this.tracker.eventEmitter.removeAllListeners('onData');
    this.tracker.eventEmitter.removeAllListeners('onStart');
  }

  /**
   * [create the tracker and start the event listeners for fetching the data]
   */
  createTracker(){
    const Tracker = this._getTracker();
    this.tracker = new Tracker(5, this.param.extensionfilter);
    this.tracker.eventEmitter.on('onNewURL', () => {
      // console.clear();
      // this.count = 0;
      // this.createTracker();
    })
    this.tracker.eventEmitter.on('onData', data => {
       if(data.hasOwnProperty('html') && data.html != false){
         this.tracker.fetchLinks();
         this.tracker.fetchSource(data.html);
       }
       this.sendMessage(data);
    });
    this.tracker.eventEmitter.on('onStart', async delay => {
      // this.DELAY = delay;
       try {
         this.sendMessage({
           startTime: this.startTime,
           createData: +new Date()
         })
         if(await this.tracker.fetchHTML()){
           this.tracker.fetchFavicon();
           this.tracker.fetchMetaData();
         }
       } catch (err) {
         console.log(err);
       } finally {
         this.domDetector.onChange(() => {
           console.log('Dom Change');
           this.tracker.fetchHTML()
         }, delay);
       }
    });
    this.tracker.start();
  }

  /**
   * [initalizate the contenthandler]
   */
  async init(){
    try {
      this.param = await this._getParam();
      if(typeof this.param == 'object' && this.param.allow){
        this.createTracker();
      }else{
        setTimeout(()=> this.init(), 2000)
        console.log('Not allow to tracked from extension handler');
      }
    } catch (e) {
      console.log(e);
    }
  }

}//class
