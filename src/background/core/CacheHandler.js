import LocalstoreDB from './LocalstoreDB';
// import SourceCache from './SourceCache';

export default class CacheHandler {

  /**
   * [constructor
   * - create instance of FileHandler
   * - create instance of LocalstorageHandler
   * ]
   * @param {Number} projectId
   */
  constructor(projectId=''){
    this.debug = true;
    this.DEFAULTCONTENT = {};
    this.storage = new LocalstoreDB({objectStoreName: 'cachehandler_'+projectId, defaultContent: {}});
    //if (this.debug) console.log('-: CacheHandler.constructor() - ', 'objectStoreName: ', 'cachehandler_' + projectId, ' this.storage: ', this.storage);
    // this.source = new SourceCache(projectId);
    this.content = {};
    this.id = 'id';
    this.typeofId = 'string';
    this.ids = [];
    this.DELAY = 500;
    this.last = 0
    this.timeouts = {};
  }

  /**
   * [initialize the content]
   * @return {Promise}
   */
  init(){
    return new Promise(async (resolve, reject) => {
      try {
        this.content = await this.storage.getAll();
        //if (this.debug) console.log('-: CacheHandler.init() - ', 'this.content:', this.content);
        resolve();
      } catch (e) {
        reject(e)
      }
    });
  }


  /**
   * [getIds return list of ids]
   * @return {Array}
   */
  getIds(){
    return Object.keys(this.content).map(nr => parseInt(nr, 10))
  }

  /**
   * [is check if id exist]
   * @param  {Number}  id
   * @return {Boolean}
   */
  is(id){
    console.assert(typeof id == this.typeofId, 'id is ', typeof id)
    return this.content.hasOwnProperty(id.toString());
  }

  /**
   * [add // add nur content]
   * @param {Object} props [default: {}]
   * @param  {Integer} now [time as number]
   * @param {Boolean} [inspect=false] [if the inspect is false the props will be not validate]
   */
  add(props={}, now, inspect=false){
    let id = props[this.id];
    //if (this.debug) console.assert(typeof id == this.typeofId, 'id is not '+this.typeofId, typeof id);
    //if (this.debug) console.log(' -: CacheHandler.add()', id);
    if(!this.is(id)){
      // console.log('Set %s default value', id, this.DEFAULTCONTENT);
      this.content[id] = this.DEFAULTCONTENT;
    }else{
      this.content[id] = props;
    }
    return this.update(props, now, inspect);
  }

  /**
   * [get return the content]
   * @return {Object} this.content
   */
  get(){
    return this.content;
  }

  /**
   * [getOnly return the content of id. If the content not exist, than will be return the default content]
   * @param  {Number} id
   * @return {Object}
   */
  getOnly(id){
    console.assert(typeof id == this.typeofId, 'id is not number')
    if(this.is(id)){
      return this.content[id];
    }else{
      //if (this.debug) console.log(this.constructor.name, 'Content from id '+id+' not found');
      return this.DEFAULTCONTENT
    }
  }

  /**
   * [update // update the content of id and save it in the storage]
   * @param  {Object} props [default: {}]
   * @param  {Integer} now [time as number]
   * @return {Promise}
   */
  update(props={}, now=+new Date(), force=false){
    return new Promise(async (resolve, reject) => {
      let id = props[this.id];
      console.assert(typeof id == this.typeofId, 'id is '+ typeof id)

      try {
        this.content[id] = Object.assign({}, this.content[id], props);
        // do big update if 5 seconds have passed
        // ii might be unnecessary
        let bigUpdate = Math.round(+ new Date() / 1000)%5==0;
        // console.log(Object.keys(props).length == 2 , props.hasOwnProperty('duration') , this.timeouts.hasOwnProperty(id) , this.timeouts[id], bigUpdate);
        // if(!force && Object.keys(props).length == 2 && props.hasOwnProperty('duration') && this.timeouts.hasOwnProperty(id) && this.timeouts[id].timeout==null && !bigUpdate){
        //   console.log('update duration');
        //   this.storage.set(props, true, false);
        // }else 
        if(!force && Object.keys(props).length == 2 && props.hasOwnProperty('elapsed') && this.timeouts.hasOwnProperty(id) && this.timeouts[id].timeout==null && !bigUpdate){
          //if (this.debug) console.log('-: CacheHandler.update() - Update elapsed');
          this.storage.set(props, true, false);
        }else if(Object.keys(props).length > 2 || bigUpdate || force){
          //if (this.debug) console.log('-: CacheHandler.update() - props: ', props);
          if(this.timeouts.hasOwnProperty(id) && this.timeouts[id].timeout!=null){
            clearTimeout(this.timeouts[id].timeout);
            this.timeouts[id].resolve();
            this.timeouts[id].resolve = resolve
          }else{
            this.timeouts[id] = {
              timeout: null,
              resolve: resolve
            }
          }
          this.timeouts[id].timeout = setTimeout(()=>{
            let merge = Object.assign(typeof now == 'boolean' && now == false? {}: {timestamp: now}, this.content[id], {[this.id]: id} );
            this.storage.set(merge).catch(console.warn)
            this.timeouts[id].timeout = null
            this.timeouts[id].resolve()
          }, this.DELAY)
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * [del delete the content of id]
   * @param  {Number}  id
   */
  del(id){
    return new Promise(async (resolve, reject) => {
      try {
        if(this.is(id)){
          // if(this.content[id].hasOwnProperty('source')){
          //   let urls = this.content[id].source.map(e => e.url)
          // }
          delete this.content[id];
          await this.storage.delete(id);
          resolve();
        }else{
          console.log(this.constructor.name, 'Id '+id+' not found in content');
        }
      } catch (err) {
        reject(err)
      }
    });
  }


}
