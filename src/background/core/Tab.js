import TabCache from './TabCache';


const DEFAULT_TAB_CONTANT = {
  tabId: null,
  id: null,
  url: '',
  title: '',
  favicon: '',
  precursor_id: '',
  meta: {
    description: '',
    keywords: ''
  },
  source: [],
  links: [],
  start: +new Date(),
  duration: 0,
  close: false,
  sendTime: null,
  send: false,
  events: [],
  content: []
}

export default class Tab {

  /**
   * [constructor]
   * @param {number} projectId
   * @param {number} tabId
   */
  constructor(projectId, tabId) {
    this.clean = this.clean.bind(this);
    this.tabCache = new TabCache(projectId, tabId.toString(), DEFAULT_TAB_CONTANT);
    // this.tabCache = tabCache;
    this.tabId = tabId;
    this.isInit = false;
    this.DEBUG = false;
    this.nr = 1;
    this.queue = {
      [this.nr]: {
        active: false,
        data: []
      }
    }
  }

  /**
   * [initialization]
   * @return {Promise}
   */
  init(){
    return new Promise(async (resolve, reject) => {
      try {
        await this.tabCache.init();
        this.nr = this.tabCache.getIds().length;
        this.queue = {
          [this.nr]: {
            active: false,
            data: []
          }
        }
        this.isInit = true;
        resolve();
      } catch (err) {
        reject(err)
      }
    });
  }

  /**
   * [wait for finish the queue befor the tab was clean]
   * @param  {Function} [callback=()=>{}]
   * @return {Promise}
   */
  cleanTab(callback=()=>{}){
    return new Promise(async (resolve, reject) => {
      try {
        let numbers = this.tabCache.getIds()

        for (let nr of numbers) {
          if(this.is(nr) && this.hasContent(nr)) {
            let page = this.tabCache.getOnly(nr)
                       
            page.close = new Date()          
            page.duration = Math.round(page.duration/1000)
            callback(this.tabCache.getOnly(nr))
          }
          if(this.is(nr)){
            await this.tabCache.clear(nr)
          }
        }
        resolve();
      } catch (err) {
        reject(err)
      }
    });
  }

  /**
   * [close the tab]
   * @param  {Function} callback
   */
  close(callback){
    let page = null
    const nr = this.nr;
    this.nr += 1;
    if(this.is(nr) && this.hasContent(nr)) {
      page = this.get(nr);
      page.close = new Date()
      page.duration = Math.round(page.duration/1000)
    }
    this.clean(nr, ()=>{
      callback(page);
    });
  }

  /**
   * @param  {number}  [nr=this.nr]
   * @return {Boolean}
   */
  is(nr=this.nr){
    return this.tabCache.is(nr)
  }

  /**
   * @param  {number}  [nr=this.nr]
   * @return {Object}
   */
  get(nr=this.nr){
    return this.tabCache.getOnly(nr)
  }

  /**
   * [check if the tab has attr]
   * @param  {number}  [nr=this.nr]
   * @return {Boolean}
   */
  hasContent(nr=this.nr){
    return this.tabCache.hasContent(nr)
  }

  /**
   * [update the duration number of tab]
   * @param  {Number} [addTime=0]
   * @return {Promise}
   */
  updateDuration(addTime=0){
    return new Promise(async (resolve, reject) => {
      try {
        if(this.hasContent()){
          await this.tabCache.update({
            nr: this.nr,
            duration: this.get().duration+addTime
          }, false);
        }
        resolve();
      } catch (err) {
        reject(err)
      }
    });
  }

  /**
   * [create the localstore object]
   */
  create(){
    this.tabCache.register(this.nr);
  }

  /**
   * [delete all attr from the store object]
   * @param  {number}   nr
   * @param  {Function} callback
   */
  clean(nr, callback){
    if(this.queue.hasOwnProperty(nr)){
      if(this.queue[nr].data.length>0){
        // if(this.DEBUG) console.log('queue', this.tabId, nr, this.queue[nr].data.length);
        this._update(nr);
        setTimeout(() => this.clean(nr, callback), 500);
      }else{
        this.tabCache.clear(nr);
        callback()
      }
    }else{
      console.log('No nr ', nr);
    }
  }

  /**
   * [add the data to the queue]
   * @param {Object} data
   */
  addUpdate(data){
    if(!this.queue.hasOwnProperty(this.nr)){
      this.queue[this.nr] = {
        active: false,
        data: []
      }
      // if(this.DEBUG) console.log('create nr ', this.nr, this.queue[this.nr]);
    }
    // if(this.DEBUG) console.log('add', this.nr, this.queue[this.nr].data.length, this.queue[this.nr].active);
    this.queue[this.nr].data.push(data);
    // if(this.DEBUG) console.log(this.queue[this.nr].data);
    this._update(this.nr);
  }

  /**
   * [run the queue to update the tab]
   * @param  {number}  nr
   * @return {Promise}
   */
  async _update(nr){
    // return;
    if(this.queue[nr].active || this.queue[nr].data.length==0) return;
    this.queue[nr].active = true;

    // this.queue[nr].data = this.queue[nr].data.sort((a, b) => {
    //   if (a.hasOwnProperty('source') && !b.hasOwnProperty('source')) return 1;
    //   if (b.hasOwnProperty('source') && !a.hasOwnProperty('source')) return -1;
    //   // if (a.hasOwnProperty('html') && !b.hasOwnProperty('html')) return 1;
    //   return 0;
    // });

    let data = this.queue[nr].data[0]


    // if(this.DEBUG) console.log(this.tabId, nr, this.queue[nr].data.length, data);

    try {
      if(this.DEBUG) console.log('---------');
      if(this.DEBUG) console.log('#Start#', 'nr', nr, 'count', data.count, 'data', data);


      // if(!this.hasContent() && data.count == 1){
      if(!this.hasContent()){
        await this._firstUpdate(data, nr)
      }else{
      //   // try {

          await this._secondUpdate(data, nr);
        // } catch (e) {
        //   console.warn(e);
        // }

      }
      this.queue[nr].data.shift();
      this.queue[nr].active = false;
      if(this.DEBUG) console.log('#Finish#', 'tabId', this.tabId, 'nr', nr, 'count', data.count, 'queue.length', this.queue[nr].data.length);
      this._update(nr);
    } catch (e) {
      console.log('#Finish-Error#', 'tabId', this.tabId, 'nr', nr, 'error', e, 'count', data.count, 'queue.length', this.queue[nr].data.length, 'data', data);
      this.queue[nr].data.shift();
      this.queue[nr].active = false;
      this._update(nr);
    }
  }//_update()

  /**
   * [create the first init update]
   * @param  {object} data
   * @param  {number} nr
   * @return {Promise}
   */
  _firstUpdate(data, nr){
    if(this.DEBUG) console.log('=>CREATE');
    let now = new Date();
    return this.tabCache.add(Object.assign(DEFAULT_TAB_CONTANT,
      {
        nr: nr,
        id: this._getRandomString(),
        url: data.url,
        title: data.title,
        precursor_id: data.precursor_id,
        meta: Object.assign({
          description: '',
          keywords: ''
        }, data.meta),
        links: data.links || [],
        start: new Date(data.startTime),
        duration: Math.round(((+now) - data.startTime)/1000)
      }
    ), true);
  }

  /**
   * [update all other data from the tab]
   * @param  {object} data
   * @param  {number} nr
   * @return {Promise}
   */
  _secondUpdate(data, nr){
    if(this.DEBUG) console.log('=>UPDATE');

    let oldData = this.get(nr);
    // if(data.hasOwnProperty('links')){
    //   data.links = oldData.links.concat(data.links)
    // }
    if(data.hasOwnProperty('source')){
      data.source = oldData.source.concat(data.source)
    }
    data.nr = nr;
    if(this.DEBUG) console.log(data);
    return this.tabCache.update(data, true);
  }

  /**
   * [_getRandomString return random string]
   * @param  {Integer} length [default: 20]
   * @return {String}
   */
  _getRandomString(length=20){
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
  }



}//class
