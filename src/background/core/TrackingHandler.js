import URLFilter from './URLFilter';
import Extension from '../Extension';
import TabHandler from './TabHandler';
import PageCache from './PageCache';
import Schedule from './Schedule';
import {EventEmitter, clearEvent} from 'eventemitter3';
import lang from '../../lib/lang';
// import ErrorCache from './ErrorCache';
import moment from 'moment';

const EVENT_NAMES = {
  'page': 'onPage',
  'schedule': 'onSchedule',
  'disconnectPopup': 'onDisconnectPopup'
}

const DEFAULT_SETTINGS = {
  ID: null,
  NAME: null,
  DESCRIPTION: null,
  ACTIVE: null,
  SCHEDULE: null,
  ENTERID: null,
  CHECK_CLIENTIDS: null,
  SENDDATAAUTOMATICALLY: null,
  PRIVATEBUTTON: null,
  SHOWHISTORY: null,
  EDITHISTORY: null,
  SHOW_DOMAIN_HINT: null,
  FORGOT_ID: null,
  PRIVATETAB: null,
  ACTIVE_URLLIST: null,
  URLLIST_WHITE_OR_BLACK: null,
  EXTENSIONSFILTER: null,
  STORAGE_DESTINATION: null,
  CREATEDATE: null,
}

export default class TrackingHandler {

  /**
   * [constructor]
   * @param {Configuration} config
   * @param {Boolean} autostart [default: false]
   */
  constructor(config, transfer, autostart=false, is_dummy=false) {
    this._addPage = this._addPage.bind(this);
    this.deletePage = this.deletePage.bind(this);
    this.AUTOSTART = autostart;
    this.is_dummy = is_dummy;
    this.config = config;
    this.event = new EventEmitter();
    this.debug = true;
    this.settings = {};

    // fields that should be anonymized
    this.to_anonym = [
        'departing_url',
        'landing_url',
        'title',
        'unhashed_url',
        'url',
      ];

    this.regex_escapers = /[.*+?^${}()|[\]\\]/g;


    if (!is_dummy){
      try {

        this.projectId = this.config.getSelect();
        let settings = this.config.getProject(this.projectId);
        this.settings = settings.SETTINGS;

        this.schedule = typeof settings.SCHEDULE==='object' && Object.keys(settings.SCHEDULE).length>0? new Schedule(settings.SCHEDULE) : null;
        let privateMode = (this.schedule==null || this.schedule.getNextPeriode()===0)? this.config.getRunProjectTmpSettings().privateMode : true;
        this.SENDDATAAUTOMATICALLY = settings.SETTINGS.SENDDATAAUTOMATICALLY;

        let urlFilter = new URLFilter(this.config, is_dummy);
        this.extension = new Extension(urlFilter, privateMode, settings.SHOW_DOMAIN_HINT, settings.SETTINGS.EXTENSIONSFILTER);
        this.tabHandler = new TabHandler(this.projectId, this.extension);
        this.tabHandler.event.on('error', error => {
          this.event.emit('error', error, true);
        });
        this.pageCache = new PageCache(this.projectId);


        // this.extension.event.on('error', error => new ErrorCache().add(error));
        this.privateMode = privateMode;
        this.transfer = transfer;
        this._initTraget(settings.SETTINGS.STORAGE_DESTINATION);
      } catch (e) {
        console.log(e);
        this.event.emit('error', e, true);
      }
    } else {
      this.schedule == null;
      let urlFilter = new URLFilter(this.config, is_dummy);
      this.extension = new Extension(urlFilter);
      this.tabHandler = new TabHandler(null, this.extension);
      this.tabHandler.event.on('error', error => {
        this.event.emit('error', error, true);
      });
      this.pageCache = new PageCache(null);
    }
  }


  /**
   * [_init
   *  -initialize pageCache
   *  -start tracking
   *  -start Sending pages
   *  ]
   *  @return Promise
   */
   init(private_mode=true){
      //if (this.debug) console.log('-> TrackingHandler.init()');
      return new Promise(async (resolve, reject) =>{
        try {
          await this.pageCache.init();
        } catch (e) {
          this.event.emit('error', e, true);
          reject(e);
        } finally{
          if (this.debug) console.log(':::AUTOSTART:::', this.AUTOSTART);
          this.startTimeoutScheudle();
          // I am forcing it to start in private mode so it doesnt try to collect
          // data immediately
          if(this.AUTOSTART) await this.start(private_mode);
          if (!this.is_dummy){
            if(this.config.getRunProjectTmpSettings().sending || this.SENDDATAAUTOMATICALLY){
              if (this.debug) console.log(':- Autostart send');
              this.sendData(null, true);
            }
            this.extension.initAllTabs();
          }
          resolve();
        }
      });
   }

   /**
    * indicates if the current tracker is a dummy (used when the server is down, or there
    * are connectivity problems)
    * @return {Boolean} true when is a dummy connection
    */
   isDummy(){
    return this.is_dummy;
   }

   /**
    * [startTimeoutScheudle start interval after the schedule begin]
    */
   startTimeoutScheudle(){
     if(this.schedule!=null && this.schedule.getNextPeriode()>0){
       setTimeout(() => {
         this.event.emit(EVENT_NAMES.schedule, false, false);
         this.extension.setPrivateMode(false);
       }, this.schedule.getNextPeriode()*1000);
     }
   }

  /**
   * [setSending state of sending]
   * @param {Boolean} b [default: false]
   */
  setSending(b=false){
    this.config.setSending(b);
  }

  /**
   * [_initTraget set traget options]
   * @param  {Boolean} extern     [default: false]
   * @param  {Object}  options   [default: {}]
   */
  _initTraget(extern=false, options=undefined){
    if(!extern){
      this.transfer.setTragetOption(false, options);
    }else{
      this.transfer.setTragetOption(true, extern);
      this.transfer.setCert(this.config.getCert());
    }
  }

  /**
   * [getClientId return clientId]
   * @return {String}
   */
  getClientId(){
    return this.config.getRunProjectTmpSettings().clientId || this.config.defaultId.get();
  }

  /**
   * [_addPage save page]
   * @param {Object} page
   */
  async _addPage(page){
    if (this.debug) console.log('-> _addPage(page)');
    try {
      // console.log('DISBALE SAVE PAGE  !!!');
      // return;
      if(!page.hasOwnProperty('content') || page.content.length == 0){
        console.log('Page has no content!!!!', page);
      }else{
        this.pageCache.add(page, +new Date());
        this.event.emit(EVENT_NAMES.page, page, false);
      }
    } catch (e) {
      console.warn(e);
      this.event.emit('error', e, true);
    } finally {
      if(this.SENDDATAAUTOMATICALLY) this.sendData();
    }
    if (this.debug) console.log('<- _addPage(page)');
  }

  /**
   * [start // start tracking and save pages with content]
   * @param  {Boolean} privateMode   [froce privateMode to start // default: this.extension.privateMode]
   */
  async start(privateMode=this.extension.privateMode){
    try {
      if (this.debug) console.log('-> TrackingHandler.start()');
      this.extension.setPrivateMode(privateMode);
      await this.tabHandler.start();
      await this.extension.start();      
      this.tabHandler.event.on('onPage', this._addPage);
    } catch (e) {
      console.warn(e);
      this.event.emit('error', e, true);
    }
  }

  /**
   * [close the tabHandler and the action from this object]
   */
  async close(){
    try {
      await this.tabHandler.close();
    } catch (e) {
      console.warn(e);
      this.event.emit('error', e, true);
    }
  }


  escapeRegExp(string) {
    return string.replace(this.regex_escapers, '\\$&'); // $& means the whole matched string
  }

  anonymize(page, client_hash){

    if (page.meta.hasOwnProperty('is_private_mode') && page.meta.is_private_mode) {
      for (var i = 0; i < this.to_anonym.length; i++) {
        page['hostname'] = 'http://private.mode/';
        try {
          page[this.to_anonym[i]] = page['hostname'];
        } catch (e){}
      }
      if (page.hasOwnProperty('hashes')){ 
        page['hashes'] = []; 
      }
      if (page.hasOwnProperty('events')){ 
        page['events'] = []; 
      }
      page["favicon"] = "";
      page['content'][0].html =  '<html><head></head><body>'+page['hostname']+'</body></html>';
    }

    if (page.meta.hasOwnProperty('domain_only') && page.meta.domain_only) {
      for (var i = 0; i < this.to_anonym.length; i++) {
        try {
          page[this.to_anonym[i]] = page['hostname'];
        } catch (e){}
      }
      if (page.hasOwnProperty('hashes')){ 
        page['hashes'] = []; 
      }
      page['content'][0].html = '<html><head></head><body>'+page['hostname']+'</body></html>';
    }

    if (page.meta.hasOwnProperty('url_only') && page.meta.url_only) {
      page['title'] = ''
      page['content'][0].html = '<html><head></head><body>'+page['landing_url']+'</body></html>';
    }

    if (page.meta.hasOwnProperty('anonym') && page.meta.anonym){ 
      let anonym = page.meta.anonym;

      let piperegex = '';
      for (var key in anonym) {
        let escaped = this.escapeRegExp(anonym[key]);
        piperegex += escaped + "|";

        if (escaped.length > 0) {
          let regex = new RegExp(escaped,"g");
          for (var i = 0; i < this.to_anonym.length; i++) {
            try {
              page[this.to_anonym[i]] = page[this.to_anonym[i]].replace(regex, key.substr(0, 14));
            } catch (e){}
          }
        }
      }

      if (piperegex.length > 0){
        let pipe_regex = new RegExp(piperegex.slice(0, -1), "g");
        page['content'][0].html = page['content'][0].html.replace(pipe_regex,'__:'+client_hash+':__');
        page.meta.description = page.meta.description.replace(pipe_regex,'__:'+client_hash+':__');
        page.meta.keywords = page.meta.keywords.replace(pipe_regex,'__:'+client_hash+':__');
      }

      delete page.meta.anonym;
    }
    return page;
  }

  /**
   *  Adds a listener associated to the onSend event
   */
  addOnSendListener(onSendCallBack){

    //when the extension popup is closed, then stop listenning
    this.extension.event.on(EVENT_NAMES.disconnectPopup, 
      () => {
        this.event.removeListener('onSend');
      }, this);

    this.event.on('onSend', onSendCallBack);
  }

  /**
   * [sendData upload all pages to the target]
   * @param  {Array} [pages=null]         [description]
   * @param  {Boolean} nonClosed [if they active the this function send pages who has the attribute send true but sendTime is null]
   * @return {Promise}                    [description]
   */
  sendData(pages=null, nonClosed=false){
      return new Promise(async (resolve, reject) => {
        try {
          if (this.debug) console.log('-> sendData');
          //this.cleanDeadReferenceInEvent('onSend');
          //this.event.emit('onSend', true);
          this.setSending(true);

          let pageIds = Object.values(this.pageCache.get()).filter(v=> v.send===false || nonClosed==true && v.send===true && v.sendTime===null).map(e=>e.id);
          if(typeof pages == 'object' && Array.isArray(pages)){
            pageIds = pages.filter(id => pageIds.includes(id));
          }

          if(pageIds.length>0){
            const max = this.settings.STORAGE_DESTINATION? pageIds.length*2: pageIds.length;
            let count = 0;

            for (let id of pageIds){

              var page = null
              try {
                let sendTime = (new Date()).toJSON();
                await this.pageCache.update({id: id, send: true, sendTime: sendTime}, undefined, true);

                page = await this.pageCache.getOnly(id);

                if (this.debug) console.log('='.repeat(50), '\n>>>>> TRANSFER:', page.unhashed_url, ' hashes:', page.hashes, ' <<<<<\n' + '='.repeat(50));

                let client_hash = this.getClientId();
                this.transfer.sendingData(
                  JSON.stringify ({
                    id: client_hash,
                    projectId: this.projectId,
                    versionType: this.config.versionType,
                    pages: [this.anonymize(page, client_hash)]
                  }), status => {
                    //count += 1;
                    // this.event.emit('onSendData', {
                    //   max: max,
                    //   now: count,
                    //   title: page.title,
                    //   status: status
                    // });
                  }).then(()=>{
                    if (this.debug) console.log('='.repeat(50), '\n>>>>> TRANSFER SUCCESS:', page.unhashed_url, ' <<<<<\n' + '='.repeat(50));
                    count += 1;
                    this.event.emit('onSendData', {
                      max: max,
                      now: count,
                      title: page.title,
                      status: status
                    });                    
                  }).catch(err => {
                    if (this.debug) console.log('='.repeat(50), '\n>>>>> TRANSFER ERROR:', page.unhashed_url, ' <<<<<\n' + '='.repeat(50));
                    if (this.debug) console.log(err);
                    count += 1;
                    this.event.emit('onSendData', {
                      max: max,
                      now: count,
                      title: page.title,
                      status: 'failed'
                    });  
                  }).finally( () => {
                    if (this.debug) console.log('='.repeat(50), '\n>>>>> TRANSFER FINALIZED:', page.unhashed_url, ' <<<<<\n' + '='.repeat(50));

                    // This lines clean the bulky parts of the object (JSONs) that are not necessary to keep in
                    // the storapageCache. 
                    this.pageCache.update({id: page.id, content: [], links: [], 
                        hashes: [], source:[], events: [], meta: {}}, undefined, true) // set the page attr send to true
                    this.pageCache.cleanSource(page.id);//.catch(console.warn);
                  });
              

                if (this.debug) console.log('<- sendData');
              } catch (e) {
                count += 1;
                // this.event.emit('error', e, true);
                if (this.debug) console.log('Unknown error sending data: ', page);
                console.warn(e);
              }
            }//for
            if(!this.SENDDATAAUTOMATICALLY){
              this.extension.createNotification(lang.trackingHandler.notification.title, lang.trackingHandler.notification.message);
            }
          }//if
          this.setSending(false);
          resolve();
        } catch (err) {
          this.setSending(false);
          this.event.emit('error', err, true);
          console.log(err);
          this.event.emit('error', err, true);
          reject(err);
        } finally {
          if (this.debug) console.log('======Emit Event: onSend (false) =======');
          this.event.emit('onSend', false);
        }
      });
  }

  /**
   * [getPages return list of pages]
   * @return {Array}
   */
  getPages(){
    //if (this.debug) console.log('-> TrackingHandler.getPages()');
    let pages = Object.values(this.pageCache.get());
    ////if (this.debug) console.log('<- TrackingHandler.getPages()');
    return pages;
  }

  /**
   * [deletePage delete page from storage]
   * @param  {Number} id
   * @return {Promise}
   */
  deletePage(id){
    return new Promise((resolve, reject) => {
      if(this.pageCache.is(id)){
        this.pageCache.del(id);
        resolve();
      }else{
        reject(new Error('Id not found'));
      }
    });
  }

  /**
   * [getNextPeriode return time difference of next periode ]
   * @return {Integer}
   */
  getNextPeriode(){
    return this.schedule!=null? this.schedule.getNextPeriode(): 0;
  }


}
