import TrackingHandler from './TrackingHandler';
import EventEmitter from 'eventemitter3';

const EVENT_NAMES = {
  'extendPrivateMode': 'onExtendPrivateMode'
}

export default class PageHandler {

  /**
   * [constructor]
   * @param {Configuration} config
   * @param {Transfer} transfer
   */
  constructor(config, transfer) {
    this.config = config;
    this.tracker = null;
    this.transfer = transfer;
    this.debug = true;
    this.event = new EventEmitter();
    this.is_initialized = false;
  }

  async init(){
    try {
      if (this.debug) console.log('Load Configuration');
      await this.config.load();
      this.is_initialized = true;
    } catch(err){
      console.log('ERROR IN INIT');
      console.error(err);
    }
  }

  /**
   * [local settings for the project]
   * @return {object}
   */
  getProjectsTmpSettings(){
    if (this.debug) console.log('getProjectsTmpSettings()');
    return this.config._getProjectsTmpSettings();
  }

  /**
   * [config from projects]
   * @param  {number} id
   * @return {Object}
   */
  getProject(id){
    if (this.debug) console.log('PageHandler.getProject()');
    return this.config.getProject(id);
  }

  /**
   * [list of configs from projekts]
   * @return {Array}
   */
  getProjects(){
    if (this.debug) console.log('PageHandler.getProjects()');
    return this.config.getProjects();
  }

  /**
   * [is the configuration loaded]
   * @return {Boolean}
   */
  isLoaded(){
    if (this.debug) console.log('PageHandler.isLoaded()');
    return this.config.isLoaded();
  }

  /**
   * [selected project]
   * @return {number}
   */
  getSelect(){
    if (this.debug) console.log('PageHandler.getSelect()');
    return this.config.getSelect();
  }

  /**
   * [_createTracker description]
   * @return {[type]} [description]
   */
  _createTracker(){
    if (this.debug) console.log('PageHandler._createTracker()');

    let selectId = this.config.getSelect();
    if(this.tracker!=null){
      this.tracker.close();
    }
    if(selectId!=null){
      this.tracker = new TrackingHandler(this.config, this.transfer, autostart=true, mute=false);
      this.tracker.event.on('error', error => {
        this.event.emit('error', error, true);
      });
      return true
    }else{
      return false
    }
  }


  /**
   * [_createTracker description]
   * @return {[type]} [description]
   */
  _createMuteTracker(){
    if (this.debug) console.log('PageHandler._createMuteTracker()');

    this.tracker = new TrackingHandler(this.config, this.transfer, false, true);
    this.tracker.event.on('error', error => {
      this.event.emit('error', error, true);
    });
    
  }

  /**
   * [set the privatemode from running trackingHandler]
   * @param {Boolean} [b=false]
   */
  _setCurrentTrackerPrivateMode(b=false){
    this._getCurrentTracker().extension.setPrivateMode(b);
    this.config.setPrivateMode(b);
  }

  /**
   * [deliver running trackingHandler]
   * @return {TrackingHandler}
   */
  _getCurrentTracker(){
    if (this.debug) console.log('-> PageHandler._getCurrentTracker()');

    let tracker = this.tracker;
    
    // if the configuration was loaded correctly, and no project is selected
    // then return null
    if(this.config.isLoaded() && (this.config.getSelect() == null)){
      console.log('No Select return null');
      tracker = null;
    } 

    if (this.debug) console.log('<- PageHandler._getCurrentTracker()');
    return tracker;
  }

  /**
   * [set the project and create new trackingHandler instance]
   * @param  {number} [id=null]
   * @return {Promise}
   */
  selectProject(id=null, private_mode=true){
    return new Promise((resolve, reject) => {
      if (this.debug) console.log('-> PageHandler.selectProject() - Promise');
      try {
        // console.log(parseInt(id, 10) , this.config.getSelect());
        if(id!=null && parseInt(id, 10) == this.config.getSelect() && this.tracker!=null){
          /*already selected*/
        }else{
          if(id==null && this.tracker!=null){
            this.tracker.close();
            delete this.tracker;
            this.tracker = null;
            console.log('CLOSE TRACKER');
            // this._setCurrentTrackerPrivateMode(true);
          }
          this.config.setSelect(id);
          if(id != null){
            if(this._createTracker()){
              let current_tracker = this._getCurrentTracker();
              current_tracker.init(private_mode=private_mode);
              // if setting enterid false then will be disabled the private mode
              console.log('ENTERID', current_tracker.settings.ENTERID);
            }
          }
        }
      } catch (e) {
        reject(e)
      } finally{
        if (this.debug) console.log('<- PageHandler.selectProject() - Promise');
        resolve();
      }
    });
  }

  disconnectedMode(){
    return new Promise((resolve, reject) => {
      if (this.debug) console.log('-> PageHandler.disconnectedMode() - Promise');
      try {

        // make sure there is no tracker
        if (this.tracker!=null){
          this.tracker.close();
          delete this.tracker;
          this.tracker = null;
          console.log('CLOSE TRACKER');
        }
        if(this._createMuteTracker()){
          let current_tracker = this._getCurrentTracker();
          current_tracker.init(private_mode=true);
          // if setting enterid false then will be disabled the private mode
          console.log('ENTERID', current_tracker.settings.ENTERID);
        }

      } catch (e) {
        reject(e)
      } finally{
        if (this.debug) console.log('<- PageHandler.disconnectedMode() - Promise');
        resolve();
      }
    });
  }

  /**
   * [set the client id]
   * @param {String} clientId
   * @return {Promise} boolean
   */
  setClientId(clientId){
    if (this.debug) console.log('PageHandler.setClientId()', clientId)
    return this.config.setClientId(clientId, this.config.getSelect());
  }


  /**
   * [getNextPeriode return time difference of next periode ]
   * @return {Integer}
   */
  getNextPeriode(){
    if (this.debug) console.log('PageHandler.getNextPeriode()')
    return this._getCurrentTracker().getNextPeriode();
  }

  /**
   * [deliver the state if the current trackingHandler sending data]
   * @return {Boolean}
   */
  isSending(){
    if (this.debug) console.log('PageHandler.isSending()')
    let settings = this.config._getProjectsTmpSettings()[this.config.getSelect()];
    if(settings == undefined || !settings.hasOwnProperty('sending')){
      return false;
    }else{
      return settings.sending;
    }
  }

  /**
   * [return all tracked pages]
   * @return {Array<object>}
   */
  getPages(){
    if (this.debug) console.log('-> PageHandler.getPages()');
    let tracker = this._getCurrentTracker()
    let pages = tracker.getPages();
    if (this.debug) console.log('<- PageHandler.getPages()');
    return pages;
  }

  log(msg){
    console.log(msg);
  }

  /**
   * [delete page with id]
   * @param  {String} pageId
   * @return {Promise}
   */
  deletePage(pageId){
    if (this.debug) console.log('deletePage', pageId);
    return this._getCurrentTracker().deletePage(pageId);
  }

  /**
   * [call the sending function from trackingHandler]
   * @param  {Array<string>} [pages=null]
   * @return {Promise}
   */
  sendData(pages=null){
    if (this.debug) console.log('sendData');
    return this._getCurrentTracker().sendData(pages);
  }

  /**
   * [public function to set the private mode for running trackingHandler]
   * @param {Boolean} [b=false] [description]
   */
  setPrivateMode(b=false, component=null){
    this._setCurrentTrackerPrivateMode(b);

    if (component != null){
      if (b){
        this.confirm_public_mode(component);
      } else {
        this.cancel_confirm_public_mode();
      }
    }
  }

  /**
   * it will ask the user to continue in private mode in x milliseconds
   * @param  {[type]} component [description]
   * @return {[type]}           [description]
   */
  async confirm_public_mode(component, private_time=1000*60*15){
    await this.set_timeout(private_time);


    let extension = this._getCurrentTracker().extension;
    if (extension.privateMode) {

      //on focus other tab
      extension.event.once(EVENT_NAMES.extendPrivateMode, new_private_time => {
        if (this.debug) console.log('PageHandler.onExtendPrivateMode');

        if (new_private_time > 0){
          this.confirm_public_mode(component, new_private_time);

        } else {
          //this.setPrivateMode(false);
          extension.privateMode = false;
          this.config.setPrivateMode(false)
          extension.resetPublicImage(extension);
        }
        
      }, this);

      extension.displayPrivateTimePopup();
    }
  }

  /**
   * this will cancel the public mode display. It will remove the popups if it is too late
   * @param  {[type]} component [description]
   * @return {[type]}           [description]
   */
  async cancel_confirm_public_mode(){
    clearTimeout(this.timer);
    let extension = this._getCurrentTracker().extension;
    extension.removePrivateTimePopup();
  }


  /**
   * A promise of ms millisecnos
   * @param  {[type]} ms [description]
   * @return {[type]}    [description]
   */
  set_timeout(ms) {
    return new Promise(resolve => {
      this.timer = setTimeout(resolve, ms);
    });
  }



  /**
   * [deliver state of trackingHandler progress]
   * @return {Array<any>}
   */
  getProgress(){
    return this._getCurrentTracker().progress
  }

  /**
   * [set privatemode from running tracking for specific tab-id]
   * @param {Boolean} [boolean=false]
   */
  setTabPrivate(boolean=false){
    return this._getCurrentTracker().extension.setTabPrivate(boolean)
  }

  /**
   * [return private state from active open tab]
   * @return {Boolean}
   */
  isTabPrivate(){
    return this._getCurrentTracker().extension.isTabPrivate()
  }

  /**
   * @return boolean
   */
  isProjectAvailable(id){
    return this.config.isProjectAvailable(id);
  }

  /**
   * [create browser notification]
   * @param  {String} [title='title']       s
   * @param  {String} [message='mycontent']
   * @param  {function} [onClose=()=>{}]
   */
  createNotification(title='title', message='mycontent', onClose=()=>{}){
    this._getCurrentTracker().extension.createNotification(title, message, onClose);
  }



}//class
