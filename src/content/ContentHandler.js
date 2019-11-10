import FacebookTracker from './addon/FacebookTracker';
import YouTubeTracker from './addon/YouTubeTracker';
import TwitterTracker from './addon/TwitterTracker';
import InstagramTracker from './addon/InstagramTracker';
import GoogleTracker from './addon/GoogleTracker';
import Tracker from './Tracker';
import DomDetector from './DomDetector';

export default class ContentHandler {

  /**
   * [constructor]
   */
  constructor(){
    // probably not used
    this.page = null;
    this.allow = false;
    this.isSend = false;

    // initialized only once
    this.browser = window.hasOwnProperty('chrome') ? chrome : browser;
    this.param = null;
    this.DELAY = 1000;
    this.debug = true;
    
    // needs to be initialized, if restarting
    this.tracker = null;
    this.count = 0;
    this.domDetector = new DomDetector();
    this.startTime = +new Date();
    this.data = {}
    this.last = 0;

    this.display_notification = false;
  }

  /**
   * [return specific tracker for the current page]
   * @return {[type]} [description]
   */
  _getTracker(){
    let hostname_parts = location.hostname.split('.');

    if (hostname_parts.length > 1) {

      let str = hostname_parts[hostname_parts.length - 2];

      if(str.endsWith('facebook')){
        console.log('FacebookTracker');
        return FacebookTracker;
      }else if(str.endsWith('youtube')){
        console.log('YouTubeTracker');
        return YouTubeTracker;
      }else if(str.endsWith('twitter')){
        console.log('TwitterTracker');
        return TwitterTracker;
      }else if(str.endsWith('instagram')){
        console.log('InstagramTracker');
        return InstagramTracker;
      }else if(str.endsWith('google')){
        console.log('GoogleTracker');
        return GoogleTracker;
      }

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
      if (this.debug) console.log('sendMessage("ontracking")');
      this.browser.runtime.sendMessage('ontracking', (response) => {
        if(this.browser.runtime.lastError) {
          /*ignore when the background is not listening*/;
        } else {
          if (response.pending_private_time_answer){
            this.display_notification = true;
            this.showNotification();
          }
        }
        resolve(response);
      });

    });
  }


  /**
  * [rebuild and href without hash]
  * @return href without hashes
  */
  get_unhashed_href() {
    let location = window.location;
      return location.protocol+'//'+
      location.hostname+
     (location.port?":"+location.port:"")+
      location.pathname+
     (location.search?location.search:"");
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
        console.log('Count: ' + this.count);

        if(object['html']) {
          console.log('HTML length: ' + (object['html']).length);
        }
      }
      object = {
        //links: object['links'],
        content: [object]
      };
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

    this.data = Object.assign(
      {
        startTime: this.startTime,
        createData: new Date(),
        landing_url: window.location.href,
        hostname: window.location.hostname,
        content: [],
        source: [],
        events: [],
        meta: Object.assign({
          description: '',
          keywords: ''
        }),
        favicon: '',
        count: 0
      }, 
      this.data, 
      object, 
      {
        unhashed_url: this.get_unhashed_href(),
        count: this.count,
      }
    );

    // console.log(this.data.landing_url);
    // if (now - this.last > this.DELAY) {
    // console.log(this.data.unhashed_url);
    // try {
    //   console.log(this.data.content[0].html);
    // } catch (e){
    //   console.log('no content');
    // }

    switch (type) {
      case 'html':
          let now = +new Date();
          if (now - this.last > this.DELAY) {

              this.last = now;
              // console.log('sendMessage %s', this.count, object);
              try {
                if (this.debug) console.log('html: runtime.sendMessage(this.data,...');
                this.browser.runtime.sendMessage(this.data, (response)=>{
                  if(this.browser.runtime.lastError) {
                    /*ignore when the background is not listening*/;
                  }
                  if(response==undefined){
                    this.close();
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
            if (this.debug) console.log('default:  runtime.sendMessage(this.data,...');
            this.browser.runtime.sendMessage(this.data, (response)=>{
              if(this.browser.runtime.lastError) {
                /*ignore when the background is not listening*/;
              }
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
      this.close();
      this.tracker = null;
      this.count = 0;
      this.domDetector = new DomDetector();
      this.startTime = +new Date();
      this.data = {}
      this.last = 0;
      this.createTracker();
    })
    this.tracker.eventEmitter.on('onData', data => {
       //if(data.hasOwnProperty('html') && data.html != false){
         //this.tracker.fetchLinks();
         //this.tracker.fetchSource(data.html);
       //}
       if (this.debug) console.log('onData: this.sendMessage');
       this.sendMessage(data);

       // refresh the notification when content is sent
       if (this.display_notification){
        this.showNotification();
       }
    });
    this.tracker.eventEmitter.on('onStart', async delay => {
      // this.DELAY = delay;
      if (this.debug) console.log('onStart this.sendMessage');
       try {
         this.sendMessage({
           startTime: this.startTime,
           createData: new Date()
         })
         if(await this.tracker.fetchHTML()){
           //this.tracker.fetchFavicon();
           this.tracker.fetchMetaData();
         }
       } catch (err) {
          console.log(err);
       } finally {
          this.domDetector.onChange(() => {
            console.log('Dom Change');
            this.tracker.fetchHTML()
          }, delay);


          // listen for request to cancel private mode
          this.browser.runtime.onMessage.addListener(
            (message, sender, sendResponse) => {
             if (message.action == 'private_time_is_over'){
              sendResponse(true);
              this.showNotification();
              
              //return true;
              return Promise.resolve("Dummy response to keep the console quiet");
             }
           });
       }
    });
    this.tracker.start();
  }

  //http://jsfiddle.net/BdG2U/1/
  showNotification() {
   
      let height = 300;

      /*create the notification bar div if it doesn't exist*/
      let body = document.querySelector('body');

      let notification = document.querySelector('body #webtrack-notification-8888');

      if (body){
          if (notification == null){
            let notification_window = this.get_notification_window();
            notification_window.querySelector('#fifteen').addEventListener("click", function(){
              this.request_more_private_time(2*1000);
              body.removeChild(notification_window);
              this.display_notification = false;
            }.bind(this));

            notification_window.querySelector('#turnoff').addEventListener("click", function(){
              this.request_more_private_time(-1);
              body.removeChild(notification_window);
              this.display_notification = false;
            }.bind(this));

            body.prepend(notification_window);
            this.display_notification = true;
          }
      }

  }

  request_more_private_time(private_time){
    return new Promise((resolve, reject)=>{
      if (this.debug) console.log('sendMessage("private_time")');
      this.browser.runtime.sendMessage({'private_time': private_time}, (response) => {
        if(this.browser.runtime.lastError) {
          /*ignore when the background is not listening*/;
        }
        resolve(response);
      });
    });
  }

  get_notification_window(){
    //#337ab7
    var notification_window =  document.createElement('div');
    notification_window.innerHTML = `
    <div id="webtrack-notification-8888" style="all: initial;width:100%; height: 100%;
     color: #000000; position: fixed; top:0; 
    right:0; z-index: 100000; background: rgba(0, 0, 0, 0.5);">
      <div style="left: 50%; top: 40%; transform: translate(-50%, -50%); 
        width:400px; height:300px; border: 8px solid #0085bc; background-color: #FFFFFF; 
        position: fixed; z-index: 100001; font: normal 12px sans-serif;">
        <div>
          <div style="float: left; margin-right: 10px">
            <img style="width: 120px;" src="` + this.browser.extension.getURL('images/on.png') + `">
          </div>
          <div style="margin-left: 15px">
            <div style="display: block;font-size: 48px; color: #0085bc; font-weight: bold; padding-top:10px">
              Webtrack
            </div>
            <div style="display: block; font-size: 20px; color: #0085bc; font-weight: bold;">
              Private mode deactivation.
            </div>
          </div>

          <div style="clear: both;"> </div>

          <div style="margin:15px; font-size: 14px;">
            <div>15 minutes have passed since you activated the Webtrack private mode.</div>
            <br />
            <div style="font-weight:bold;">Do you want to continue browsing in private mode?</div>
          </div>

          <div style="text-align: center; position: absolute; bottom: 10px; width: 100%;">
            <div id="fifteen" style="background: #0085bc; border-radius: 5px; padding: 8px 16px; 
                 color: #ffffff; display: inline-block; font: normal bold 14px sans-serif; 
                 text-align: center; margin-bottom: 5px; width: 200px; cursor: pointer;">
                 Yes, I need 15 minutes more
            </div>
            <div id="turnoff" style="background: #0085bc; border-radius: 5px; padding: 8px 16px; 
                 color: #ffffff; display: inline-block; font: normal bold 14px sans-serif; 
                 text-align: center; width: 200px; cursor: pointer;">
                 No, turn off the private mode
            </div>
          <div>
          </div>
          </div>
        </div>
      </div>
    </div>`;
    return notification_window;
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





