import URLFilter from './URLFilter';
import Extension from '../Extension';
import TabHandler from './TabHandler';
import PageCache from './PageCache';
import Schedule from './Schedule';
import {EventEmitter, clearEvent} from 'eventemitter3';
import lang from '../../lib/lang';
import ErrorCache from './ErrorCache';
import moment from 'moment';

const EVENT_NAMES = {
  'page': 'onPage',
  'schedule': 'onSchedule'
}

export default class TrackingHandler {

  /**
   * [constructor]
   * @param {Configuration} config
   * @param {Boolean} autostart [default: false]
   */
  constructor(config, transfer, autostart=false) {
    this._addPage = this._addPage.bind(this);
    this.deletePage = this.deletePage.bind(this);
    this.AUTOSTART = autostart;
    this.config = config;
    this.event = new EventEmitter();
    this.debug = true;

    // fields that should be anonymized
    this.to_anonym = [
        'departing_url',
        'id',
        'landing_url',
        'precursor_id',
        'title',
        'unhashed_url',
        'url',
      ];

    this.regex_escapers = /[.*+?^${}()|[\]\\]/g;

    try {

      this.projectId = this.config.getSelect();
      let settings = this.config.getProject(this.config.getSelect());
      this.settings = settings.SETTINGS;

      this.schedule = typeof settings.SCHEDULE==='object' && Object.keys(settings.SCHEDULE).length>0? new Schedule(settings.SCHEDULE) : null;
      let privateMode = (this.schedule==null || this.schedule.getNextPeriode()===0)? this.config.getRunProjectTmpSettings().privateMode : true;
      this.SENDDATAAUTOMATICALLY = settings.SETTINGS.SENDDATAAUTOMATICALLY;

      let urlFilter = new URLFilter(settings.URLLIST, settings.SETTINGS.ACTIVE_URLLIST, settings.SETTINGS.URLLIST_WHITE_OR_BLACK);
      this.extension = new Extension(urlFilter, privateMode, settings.SHOW_DOMAIN_HINT, settings.SETTINGS.EXTENSIONSFILTER);
      this.tabHandler = new TabHandler(this.projectId, this.extension);
      this.tabHandler.event.on('error', error => {
        this.event.emit('error', error, true);
      });
      this.pageCache = new PageCache(this.projectId);


      this.extension.event.on('error', error => new ErrorCache().add(error));
      this.privateMode = privateMode;
      this.transfer = transfer;
      this._initTraget(settings.SETTINGS.STORAGE_DESTINATION);
    } catch (e) {
      console.log(this.event);
      this.event.emit('error', e, true);
      console.log(e);
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
      if (this.debug) console.log('-: TrackingHandler.init()');
      return new Promise(async (resolve, reject) =>{
        try {
          await this.pageCache.init();
        } catch (e) {
          this.event.emit('error', e, true);
          reject(e);
        } finally{
          console.log('AUTOSTART', this.AUTOSTART);
          this.startTimeoutScheudle();
          // I am forcing it to start in private mode so it doesnt try to collect
          // data immediately
          if(this.AUTOSTART) this.start(private_mode);
          if(this.config.getRunProjectTmpSettings().sending || this.SENDDATAAUTOMATICALLY){
            console.log('Autostart send');
            this.sendData(null, true);
          }
          resolve();
        }
      });
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
        console.log('page has no content', page);
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


  /**
   * [check dead references in the eventemitter3 object]
   * @param  {String} [eventName='']
   */
  cleanDeadReferenceInEvent(eventName=''){
    let listeners = this.event.listeners(eventName);
    if(!Array.isArray(listeners)){
      listeners = [listeners];
    }
    listeners = listeners.filter(listener => {
      try {
        listener.constructor
        return listener;
      } catch (e) {}
    });
    this.event.removeAllListeners(eventName);
    for (let listener of listeners) {
      this.event.addListener(eventName, listener)
    }
  }

  escapeRegExp(string) {
    return string.replace(this.regex_escapers, '\\$&'); // $& means the whole matched string
  }

  anonymize(page){
    if (page.meta.hasOwnProperty('anonym')){ 
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

        if (piperegex.length > 0){
          let pipe_regex = new RegExp(piperegex.slice(0, -1), "g");
          page['content'][0].html = page['content'][0].html.replace(pipe_regex,'_______');
          page.meta.description = page.meta.description.replace(pipe_regex,'_______');
          page.meta.keywords = page.meta.keywords.replace(pipe_regex,'_______');
        }
      }

      delete page.meta.anonym;
    }
    return page;
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
          if(this.debug) console.log('-> sendData');
          this.cleanDeadReferenceInEvent('onSend');
          this.event.emit('onSend', true);
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

                if(this.debug) console.log('='.repeat(50), '\n>>>>> TRANSFER:', page.unhashed_url, ' hashes:', page.hashes, ' <<<<<\n' + '='.repeat(50));
                let send = await this.transfer.sendingData(JSON.stringify({
                  id: this.getClientId(),
                  projectId: this.projectId,
                  versionType: this.config.versionType,
                  pages: [this.anonymize(page)]
                }), status => {
                  count += 1;
                  // this.event.emit('onSendData', {
                  //   max: max,
                  //   now: count,
                  //   title: page.title,
                  //   status: status
                  // });
                });

                count += 1;
                this.event.emit('onSendData', {
                  max: max,
                  now: count,
                  title: page.title,
                  status: status
                });

                // This lines clean the bulky parts of the object (JSONs) that are not necessary to keep in
                // the storage. 
                this.pageCache.update({id: page.id, content: [], links: [], 
                    hashes: [], source:[], events: [], meta: {}}, undefined, true) // set the page attr send to true
                this.pageCache.cleanSource(page.id);//.catch(console.warn);

                if(this.debug) console.log('<- sendData');
              } catch (e) {
                count += 1;
                // this.event.emit('error', e, true);
                console.log(page);
                console.warn(e);
                let title = 'unknown';
                if(page!=null) title = page.title;
                // this.event.emit('onSendData', {
                //   max: max,
                //   now: count,
                //   title: title,
                //   status: 'failed'
                // });

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
          this.event.emit('onSend', false, false);
        }
      });
  }

  /**
   * [getPages return list of pages]
   * @return {Array}
   */
  getPages(){
    return Object.values(this.pageCache.get());
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
