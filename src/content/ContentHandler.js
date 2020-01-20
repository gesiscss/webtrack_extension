import FacebookTracker from './addon/FacebookTracker';
import YouTubeTracker from './addon/YouTubeTracker';
import TwitterTracker from './addon/TwitterTracker';
import InstagramTracker from './addon/InstagramTracker';
import DomainTracker from './addon/DomainTracker';
import URLTracker from './addon/URLTracker';
import GoogleTracker from './addon/GoogleTracker';
import AppleTracker from './addon/AppleTracker';
import BlacklistTracker from './addon/BlacklistTracker';
import Tracker from './Tracker';
import DomDetector from './DomDetector';

const DOMAIN_SET = new Set(['instagram', 'skype', 'xing', 
  'linkedin', 'twitch', 'tumblr', 'pinterest', 'flickr', 
  'wechat', 'viber', 'vk', 'whatsapp', 'telegram' ]);

const YOUTUBE_SET = new Set(['artists', 'creatoracademy']);

const TWITTER_SET = new Set(['ads', 'analytics', 'help']);

const URL_SET = new Set(['soscisurvey']);

export default class ContentHandler {

  /**
   * [constructor]
   */
  constructor(){
    // probably not used
    this.page = null;
    this.allow = false;
    this.isSend = false;
    this.isListeningToBackend = false;

    // this value gets overwritten in the init
    this.default_private_time_ms = 15*60*1000;

    // initialized only once
    this.browser = window.hasOwnProperty('chrome') ? chrome : browser;
    this.param = null;
    this.DELAY = 1000;
    this.debug = true;

    this.onBackendMessage = this.onBackendMessage.bind(this);
    this.click_counter = this.click_counter.bind(this);
    this.focus_counter = this.focus_counter.bind(this);
    this.scroll_counter = this.scroll_counter.bind(this);
    
    
    // needs to be initialized, if restarting
    this.clear();

    this.display_notification = false;
  }

  /**
   * initialize the data
   * @return {[type]} [description]
   */
  init_data(){
    return {
      createData: new Date(),
      content: [],
      source: [],
      events: [],
      meta: Object.assign({
        description: '',
        keywords: ''
      }),
      favicon: '',
      count: 0,
      startTime: this.startTime,
      landing_url: window.location.href,
      hostname: location.protocol + '//' + location.hostname,
      page_load_time: window.performance.timing.domContentLoadedEventEnd-window.performance.timing.navigationStart,
      unhashed_url: this.get_unhashed_href(),
      clicks: this.clicks,
      scrolls: this.scrolls
    }
  }

  /**
   * count clicks in the page
   * @return {[type]} [description]
   */
  click_counter () {
    this.clicks += 1;
    this.sendMessage({ 
      clicks: this.clicks
    });
  }

  /**
   * count focuses in the page
   * @return {[type]} [description]
   */
  focus_counter () {
    this.focuses += 1;
    this.sendMessage({ 
      focuses: this.focuses
    });
  }


  /**
   * count scrolls in the page
   * @return {[type]} [description]
   */
  scroll_counter (e) {
    this.scrolls += 1;
    if (!this.is_scroll_timed) {
      this.is_scroll_timed = true;
      setTimeout(()=> this.send_scroll(), 500)
    }
  }

  send_scroll () {
    this.sendMessage({ 
      scrolls: this.scrolls
    });
    this.is_scroll_timed = false;
  }

  /**
   * [return specific tracker for the current page]
   * @return {[type]} [description]
   */
  _getTracker(privacy){
    let hostname_parts = location.hostname.split('.');
    if (hostname_parts.length > 1) {

      let str = hostname_parts[hostname_parts.length - 2];

      if(str.endsWith('facebook')){
        if (this.debug) console.log('FacebookTracker');
        return FacebookTracker;
      }else if(str.endsWith('youtube')){
        if (hostname_parts.length > 2 && YOUTUBE_SET.has(hostname_parts[hostname_parts.length - 3])) {
            return DomainTracker;
        } else {
          if (this.debug) console.log('YouTubeTracker');
          return YouTubeTracker;
        }
      }else if(str.endsWith('twitter')){
        if (hostname_parts.length > 2 && TWITTER_SET.has(hostname_parts[hostname_parts.length - 3])) {
          if (this.debug) console.log('DomainTracker');
          return DomainTracker;
        } else {
          if (this.debug) console.log('TwitterTracker');
          return TwitterTracker;
        }
      }else if(str.endsWith('instagram')){
        if (this.debug) console.log('InstagramTracker');
        return InstagramTracker;
      }else if(str.endsWith('google')){
        if (this.debug) console.log('GoogleTracker');
        return GoogleTracker;
      } else if(str.endsWith('apple')){
        if (this.debug) console.log('AppleTracker');
        return AppleTracker;
      } else if (privacy.is_blacklisted){
        if (this.debug) console.log('BlacklistTracker');
        return BlacklistTracker;
      } else if (privacy.only_domain){
        if (this.debug) console.log('DomainTracker');
        return DomainTracker;
      } else if (privacy.only_url){
        if (this.debug) console.log('URLTracker');
        return URLTracker;
      } 
    }
    if (this.debug) console.log('Tracker');
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
          // console.log(this.browser.runtime.lastError);
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
   * delete page in the background
   * @return {Promise<object>}
   */
  deletePage(){
    return new Promise((resolve, reject)=>{
      if (this.debug) console.log('sendMessage("delete_page")');
      this.browser.runtime.sendMessage('delete_page', (response) => {
        if(this.browser.runtime.lastError) {
          /*ignore when the background is not listening*/;
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
        content: [object],
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

    object['count'] = this.count;
    // in firefox the domContentLoadedEventEnd is loaded only after the domContentLoadedEventEnd
    if (this.data['page_load_time'] < -9999){
      this.data['page_load_time'] = window.performance.timing.domContentLoadedEventEnd-window.performance.timing.navigationStart;
    }

    this.data = Object.assign(this.data, object);
    if (this.debug) console.log(this.data);

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
          if (this.debug) console.log('waiting for content...');
        }

    }
    
  }

  close(){
    this.domDetector.removeAllEventListener();
    this.browser.runtime.onMessage.removeListener(this.onBackendMessage);
    window.removeEventListener("click", this.click_counter);
    window.removeEventListener("scroll", this.scroll_counter);
    window.removeEventListener("focus", this.focus_counter);
    this.isListeningToBackend = false;
    if (this.tracker && this.tracker.eventEmitter){
      this.tracker.eventEmitter.removeAllListeners('onData');
      this.tracker.eventEmitter.removeAllListeners('onStart');
    }
  }

  closeOnData(){
    if (this.tracker){
      this.tracker.eventEmitter.removeAllListeners('onData');
    }
  }

  openOnData(){
    if (this.tracker){
      this.tracker.eventEmitter.on('onData', data => {
         if (this.debug) console.log('onData: this.sendMessage');
         this.sendMessage(data);
      });
    } else {
      this.init();
    }
  }

  onBackendMessage (message, sender, sendResponse) {
    if (this.debug) console.log(message);
    
    if (message.action == 'init'){
      if (this.tracker==null){
        this.init();
      } 
      sendResponse(true);
    } else if (message.action == 'private_mode'){
      if (message.private_mode) {
        this.closeOnData();
        this.sendMessage({ 
          meta: {
            is_private_mode: true,
          }
        });
      } else {
        console.log('is allow?');
        console.log(message.allow);
        if(message.allow){

          this.openOnData();
          this.tracker.fetchHTML(100).then(() => {
           //this.tracker.fetchFavicon();
           this.tracker.fetchMetaData();
         })
        }
      }
      sendResponse(true);
    }
    else if (message.action == 'popup_private_time'){
      if (this.debug) console.log('popup_private_time');
      if (message.display){
        this.showNotification();
      } else {
        this.hideNotification();
      }

      sendResponse(true);
      //return true;
      return Promise.resolve("Dummy response to keep the console quiet");
    }
  }


  /**
   * [create the tracker and start the event listeners for fetching the data]
   */
  createTracker(privacy){
    if (this.debug) console.log('-> createTracker()')
    const Tracker = this._getTracker(privacy);
    this.tracker = new Tracker(5, privacy, this.param.extensionfilter);
    this.tracker.eventEmitter.on('onNewURL', () => {
      this.close();
      this.clear();
      // In case a new url is open from javascript, it is not possible to
      // recover the loading time 
      this.data['page_load_time'] = -9999;
      this.init();
    })
    this.openOnData();
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
            if (this.debug) console.log('Dom Change');
            // 500 millisecons are necessary as the content changes before 
            // the url in pages like Facebook
            this.tracker.fetchHTML(500);
          }, delay);
        }
    });
    this.browser.runtime.connect().onDisconnect.addListener(function() {
      this.close();
      this.clear();
      if (this.init_timer){
        clearTimeout(this.init_timer);
      }
    }.bind(this));
    this.tracker.start();
  }

  hideNotification() {
    /*create the notification bar div if it doesn't exist*/
    let body = document.querySelector('body');
    if (body){
      let notification_window = body.querySelector('div #webtrack-notification-8888');
      if (notification_window != null){
        body.removeChild(notification_window.parentElement);
        this.display_notification = false;
      }
    }
  }

  //http://jsfiddle.net/BdG2U/1/
  showNotification() {
   
      let height = 300;

      /*create the notification bar div if it doesn't exist*/
      let body = document.querySelector('body');

      if (body){
          let notification = body.querySelector('div #webtrack-notification-8888');
          if (notification == null){
            let notification_window = this.get_notification_window();
            notification_window.querySelector('#fifteen').addEventListener("click", function(){
              this.request_more_private_time(this.default_private_time_ms);
              body.removeChild(notification_window);
              this.display_notification = false;
            }.bind(this));

            notification_window.querySelector('#hour').addEventListener("click", function(){
              this.request_more_private_time(60*60*1000);
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
        width:410px; height:335px; border: 8px solid #0085bc; background-color: #FFFFFF; 
        position: fixed; z-index: 100001; font: normal 12px arial;">
        <div>
          <div style="float: left; margin-right: 10px">
            <img style="width: 120px;" src="` + this.browser.extension.getURL('images/on.png') + `">
          </div>
          <div style="margin-left: 15px">
            <div style="display: block;font-size: 48px; color: #0085bc; font-weight: bold; padding-top:10px">
              Webtrack
            </div>
            <div style="display: block; font-size: 16px; color: #0085bc; font-weight: bold;">
              Schalten Sie den privaten Modus aus
            </div>
          </div>

          <div style="clear: both;"> </div>

          <div style="margin:15px; font-size: 14px;">
            <div>Es sind 15 Minuten vergangen, seit Sie den privaten Modus aktiviert haben.</div>
            <br />
            <div style="font-weight:bold;">Möchten Sie im privaten Modus weiter surfen?</div>
          </div>

          <div style="text-align: center; position: absolute; bottom: 10px; width: 100%;">
            <div id="turnoff" style="background: #0085bc; border-radius: 5px; padding: 8px 16px; 
                 color: #ffffff; display: inline-block; font: normal bold 13px arial; 
                 text-align: center; margin-bottom: 5px; width: 350px; cursor: pointer;">
                 Nein, d.h. privater Modus wird ausgeschaltet. 
            </div>
            <div id="fifteen" style="background: #0085bc; border-radius: 5px; padding: 8px 16px; 
                 color: #ffffff; display: inline-block; font: normal bold 13px arial; 
                 text-align: center; margin-bottom: 5px; width: 350px; cursor: pointer;">
                 Ja, ich brauche 15 Minuten mehr im privaten Modus.
            </div>
            <div id="hour" style="background: #0085bc; border-radius: 5px; padding: 8px 16px; 
                 color: #ffffff; display: inline-block; font: normal bold 13px arial; 
                 text-align: center; width: 350px; cursor: pointer;">
                 Ja, ich brauche 1 Stunde mehr im privaten Modus.
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
   * [clear the contenthandler]
   */  
  clear(){
    this.tracker = null;
    this.init_timer = null;
    this.count = 0;
    this.domDetector = new DomDetector();
    this.startTime = +new Date();
    this.last = 0;
    this.clicks = 0;
    this.scrolls = 0;
    this.focuses = 0;
    this.is_scroll_timed = false;
    this.data = this.init_data();
  }


  /**
   * [initalizate the contenthandler]
   */
  async init(){
    if (!this.isListeningToBackend){
      window.addEventListener("click", this.click_counter);
      window.addEventListener("scroll", this.scroll_counter);
      window.addEventListener("focus", this.focus_counter);
      this.browser.runtime.onMessage.addListener(this.onBackendMessage);
      this.isListeningToBackend = true;
    }

    try {
      this.param = await this._getParam();

      if(typeof this.param == 'object' && this.param.allow){
        if(this.debug) console.log(this.param);
        this.default_private_time_ms = this.param.default_private_time_ms;
        this.createTracker(this.param.privacy);
      }
    } catch (e) {
      this.init_timer = setTimeout(()=> this.init(), 2000)
      console.log(e);
    }
  }

}//class





