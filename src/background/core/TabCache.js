import LocalstoreDB from './LocalstoreDB';
import LocalExtensionStore from './LocalExtensionStore';
import CacheHandler from './CacheHandler';
import Inspector from './Inspector';
import LocalstorageHandler from './LocalstorageHandler';

export default class TabCache extends CacheHandler{

  /**
   * [constructor
   * - create instance of FileHandler
   * - create instance of LocalstorageHandler
   * ]
   * @param {Number} projectId
   */
  constructor(projectId, tabId, defaultContent={}) {
    super();
    this.debug = true;
    this.inspector = new Inspector()
    this.tabId = parseInt(tabId, 10);
    this.projectId = projectId;
    // this.config = {databaseName: this.getDBName(), objectStoreName: 'data', defaultContent: defaultContent, id: "nr"};
    this.databases = new LocalstorageHandler('tabcache_databases_'+projectId, []);
    this.config = {databaseName: 'wt_project_'+projectId, objectStoreName: tabId, defaultContent: defaultContent, id: "nr"};
    this.storage = new LocalExtensionStore(this.config);
    if(this.debug) console.log('-: TabCache.constructor() - ', 'this.config: ', this.config, ' this.storage: ', this.storage);
    this.id = 'nr';
    this.typeofId = 'number';
    this.register = this.register.bind(this);
  }

  /**
   * [return name of tab in localstoredb]
   * @param  {number|string} [tabId=this.tabId]
   * @param  {number|string} [projectId=this.projectId]
   * @return {string}
   */
  getDBName(tabId=this.tabId, projectId=this.projectId){
    return 'wt_tab_'+projectId+'_'+tabId
  }

  /**
   * [initialization]
   * @return {Promise}
   */
  init(){
    if(this.debug) console.log('-: TabCache.init()');
    return new Promise(async (resolve, reject) => {
      try {
        if(this.tabId!=0){
          if(this.debug) console.log('-: TabCache.init() - this.tabId', this.tabId);
          if(this.databases.get().includes(this.getDBName(this.tabId))){
            await super.init();
          }
        }
        resolve();
      } catch (e) {
        reject(e)
      }
    });
  }

  /**
   * [list of open tabs]
   * @return {Array<string>}
   */
  getTabs(){
    return this.databases.get()
  }

  /**
   * [list of tab ids]
   * @return {Array<number>}
   */
  getTabsIds(){
    let list = this.getTabs();
    let ids = [];
    for (let i = 0; i < list.length; i++) {
      let path = list[i].split('_');
      path = path.slice(1, path.length);
      if(path.length==3 && path[0] == 'tab' && parseInt(path[1], 10) == this.projectId){
        ids.push(parseInt(path[2], 10));
      }
    }
    return ids
  }

  /**
   * [delete the tab]
   * @param  {number} [tabId=this.tabId]
   * @return {Promise}
   */
  deleteTab(tabId=this.tabId){
    return new Promise((resolve, reject) => {
      this.storage.deleteDatabase({databaseName: 'wt_project_'+this.projectId, objectStoreName: tabId})
      .then(()=>{
        let tables = this.databases.get().filter((table)=> table!=this.getDBName(tabId))
        this.databases.set(tables);
        resolve();
      }).catch(reject)
    });
  }


  /**
   * [getLength return the length of tab-ids]
   * @return {Number}
   */
  getLength(){
    return this.getIds().length
  }

  /**
   * [hasContent return the count of attributes]
   * @param  {Number}  id
   * @return {Number}
   */
  hasContent(id){
    if(!this.is(id)){
      return false
    }else{
      return Object.keys(this.getOnly(id)).length > 2;
    }
  }

  /**
   * [register add list or Number of TabIds]
   * @param  {Number/Array} p
   */
  register(p){
    if(typeof p === 'number'){
      if(!this.is(p)) this.add({[this.id]: p}, false, + new Date());
    }else if(typeof p === 'object'){
      for (let id of p){
        if(!this.is(id)) this.add({[this.id]: id});
      }
    }
  }


  /**
   * [clear delete the cache of id]
   * @param  {Number}  id
   */
  clear(id){
    try {
      return this.del(id);
    } catch (e) {
      console.log(this.constructor.name, e);
    }
  }

  /**
   * [update // update the content of id and save it in the storage]
   * @param  {Object} props [default: {}]
   * @param {Boolean} [inspect=false] [if the inspect is false the props will be not validate]
   * @return {Promise}
   */
  async update(props={}, inspect=false){
    return new Promise(async (resolve, reject) => {
      try {
        let id = props[this.id];
        console.assert(typeof id == this.typeofId, 'id is '+ typeof id)
        let newContent = Object.assign({}, this.content[id], props);
        if(inspect){
          await this.inspector.validatePage(newContent);
          await super.update(props)
        }else{
          await super.update(props)
        }
        resolve()
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * [add content]
   * @param {Object}  [props={}]
   * @param {Boolean} [inspect=false] [if the inspect is false the props will be not validate]
   * @param  {Integer} now [time as number]
   * @return {Promise}
   */
  add(props={}, inspect=false, now){
    return new Promise(async (resolve, reject) => {
      try {
        // console.clear();

        // this.databases.set(this.databases.get().push(this.getDBName(this.tabId)));
        if(inspect){
          await this.inspector.validatePage(props);
          await super.add(props)
        }else{
          await super.add(props, inspect, now)
        }
        let tables = this.databases.get()
        tables.push(this.getDBName(this.tabId))
        this.databases.set(tables);
        resolve();
      } catch (err) {
        reject(err)
      }
    });
  }


  /**
   * [handling closing]
   */
  close(){
    if(typeof this.storage.clear === 'function'){
      this.storage.clear();
    }
  }

}
