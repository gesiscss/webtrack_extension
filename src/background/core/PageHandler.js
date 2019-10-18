import TrackingHandler from './TrackingHandler';
import EventEmitter from 'eventemitter3';

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
    this.debug = false;
    this.event = new EventEmitter();
  }

  /**
   * [local settings for the project]
   * @return {object}
   */
  getProjectsTmpSettings(){
    if(this.debug) console.log('getProjectsTmpSettings');
    return this.config._getProjectsTmpSettings();
  }

  /**
   * [config from projects]
   * @param  {number} id
   * @return {Object}
   */
  getProject(id){
    return this.config.getProject(id);
  }

  /**
   * [list of configs from projekts]
   * @return {Array}
   */
  getProjects(){
    if(this.debug) console.log('getProjects');
    return this.config.getProjects();
  }

  /**
   * [selected project]
   * @return {number}
   */
  getSelect(){
    if(this.debug) console.log('getSelect')
    return this.config.getSelect();
  }

  

  /**
   * [_createTracker description]
   * @return {[type]} [description]
   */
  _createTracker(){
    let selectId = this.config.getSelect();
    if(this.tracker!=null){
      this.tracker.close();
    }
    if(selectId!=null){
      this.tracker = new TrackingHandler(this.config, this.transfer, true);
      this.tracker.event.on('error', error => {
        this.event.emit('error', error, true);
      });
      return true
    }else{
      return false
    }
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
    if(this.config.getSelect()==null){
      console.log('No Select return null');
      return null;
    }else if(this.tracker!=null) {
      return this.tracker;
    }else{
      console.error('Return no tracker', this.config.getSelect());
    }
  }

  /**
   * [set the project and create new trackingHandler instance]
   * @param  {number} [id=null]
   * @return {Promise}
   */
  selectProject(id=null){
    return new Promise(async (resolve, reject) => {
      try {
        // console.log(parseInt(id, 10) , this.config.getSelect());
        if(id!=null && parseInt(id, 10) == this.config.getSelect() && this.tracker!=null){
          resolve();
        }else{
          if(this.debug) console.log('selectProject')
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
              await this._getCurrentTracker().init();
              // if setting enterid false then will be disabled the private mode
              console.log('ENTERID', this._getCurrentTracker().settings.ENTERID);
              // this._setCurrentTrackerPrivateMode(false);
              // if(this._getCurrentTracker().settings.ENTERID){
              //
              // }

            }
          }
          resolve();
        }
      } catch (e) {
        reject(e)
      }
    });

  }

  /**
   * [set the client id]
   * @param {String} clientId
   * @return {Promise} boolean
   */
  setClientId(clientId){
    if(this.debug) console.log('setClientId', clientId)
    return this.config.setClientId(clientId, this.config.getSelect());
  }


  /**
   * [getNextPeriode return time difference of next periode ]
   * @return {Integer}
   */
  getNextPeriode(){
    if(this.debug) console.log('getNextPeriode')
    return this._getCurrentTracker().getNextPeriode();
  }

  /**
   * [deliver the state if the current trackingHandler sending data]
   * @return {Boolean}
   */
  isSending(){
    if(this.debug) console.log('isSending')
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
    if(this.debug) console.log('getProjects')
    return this._getCurrentTracker().getPages()
  }

  /**
   * [delete page with id]
   * @param  {String} pageId
   * @return {Promise}
   */
  deletePage(pageId){
    if(this.debug) console.log('deletePage', pageId)
    return this._getCurrentTracker().deletePage(pageId)
  }

  /**
   * [call the sending function from trackingHandler]
   * @param  {Array<string>} [pages=null]
   * @return {Promise}
   */
  sendData(pages=null){
    if(this.debug) console.log('sendData')
    return this._getCurrentTracker().sendData(pages)
  }

  /**
   * [public function to set the private mode for running trackingHandler]
   * @param {Boolean} [b=false] [description]
   */
  setPrivateMode(b=false){
    if(this.debug) console.log('setPrivateMode', b)
    this._setCurrentTrackerPrivateMode(b);
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
