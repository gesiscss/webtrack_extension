export default class LocalExtensionStore {

  constructor(options={}) {
    this.options = Object.assign({databaseName: 'localstoreDB', objectStoreName: 'myObjectStore', id: 'id', defaultContent: {}}, options);
    this.DEBUG = false;
    this.KEYS_LIST_NAME = this.options.databaseName;
  }//()

  /**
   * [create list of all keys from databaseName]
   * @param  {String} [keyListName=this.KEYS_LIST_NAME]
   * @return {Promise}
   */
  getStoreNames(keyListName = this.KEYS_LIST_NAME){
    return new Promise((resolve, reject) => {
      xbrowser.storage.local.get(keyListName, (result) => {
        if(Object.keys(result).length===0){
          resolve({})
        }else{
          resolve(result[keyListName])
        }
      });
    });
  }

  /**
   * [add the index to the database list]
   * @param {String} storeName
   * @param {Number} id
   * @return {Promise}
   */
  addId2StoreName(storeName, id){
    return new Promise((resolve, reject) => {
      this.getStoreNames().then((list) => {
        if(!list.hasOwnProperty(storeName)){
          list[storeName] = [];
        }
        list[storeName].push(id);
        xbrowser.storage.local.set({[this.KEYS_LIST_NAME]: list}, () => {
          resolve()
        });
      }).catch(reject);
    });
  }

  /**
   * [remove the index from databaseName list]
   * @param  {String} storeName
   * @param  {Number} id
   * @return {Promise}
   */
  removeId2StoreName(storeName, id){
    return new Promise((resolve, reject) => {
      this.getStoreNames().then((list) => {
        if(list.hasOwnProperty(storeName)){
          list[storeName] = list[storeName].filter(e => e!=id);
          if(Object.keys(list[storeName]).length===0){
            delete list[storeName];
          }
        }
        xbrowser.storage.local.set({[this.KEYS_LIST_NAME]: list}, () => {
          resolve()
        });
      }).catch(reject);
    });
  }

  /**
   * [set the value from storename]
   * @param  {String} storeName
   * @return {Promise}
   */
  setStoreContent(storeName, content){
    return new Promise((resolve, reject) => {
      xbrowser.storage.local.set({[this.KEYS_LIST_NAME+'_'+storeName]: content}, () => {
        resolve()
      });
    });
  }

  /**
   * [deliver the local storage value from key]
   * @param  {String} storeName
   * @return {Promise}
   */
  getStoreContent(storeName){
    return new Promise((resolve, reject) => {
      xbrowser.storage.local.get([this.KEYS_LIST_NAME+'_'+storeName], (result) => {
        resolve(result[this.KEYS_LIST_NAME+'_'+storeName]);
      });
    })
  }

  /**
   * [delete the local storage key]
   * @param  {String} storeName
   * @return {Promise}
   */
  removeStore(storeName){
    return new Promise((resolve, reject) => {
      xbrowser.storage.local.remove([this.KEYS_LIST_NAME+'_'+storeName], () => {
        resolve();
      });
    })
  }

  /**
   * [destory all entrys]
   * @return {Promise}
   */
  clear(){
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        resolve();
      })
    });
  }


  /**
   * [deleteStore delete objectStore]
   * @param  {String} name [default: this.options.objectStoreName]
   * @return {Promise}
   */
  deleteObjectStore(objectStoreName=this.options.objectStoreName){
    return new Promise(async (resolve, reject) => {
      let storeNames = await this.getStoreNames();
      console.warn('deleteObjectStore');
    })
  }


  /**
   * [delete database]
   * @param  {Object} config [{}]
   * @return {Promise<any>}
   */
  deleteDatabase(config){
    return new Promise(async (resolve, reject) => {
      try {
        let storeNames = await this.getStoreNames(config.databaseName);
        if(storeNames.hasOwnProperty(this.options.databaseName)){
          for (let id of storeNames[this.options.databaseName]) {
            console.log(this.options.databaseName+'_'+id);
            await this.removeStore(this.options.databaseName+'_'+id)
          }
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    })
  }


  //---------------------------

  /**
   * [_createEntry create new Entry in the IDBObjectStore]
   * @param  {Object} content [default: this.options.defaultContent]
   * @return {IDBRequest}
   */
  createEntry(content=this.options.defaultContent){
    return new Promise(async (resolve, reject) => {
      try {
        // console.log(this.options.id, content);
        await this.addId2StoreName(this.options.objectStoreName, content[this.options.id]);
        await this.setStoreContent(this.options.objectStoreName+'_'+content[this.options.id], content);
        resolve();
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * [isKey ckecks if key exist]
   * @param  {String} id
   * @return {Promise} Boolean
   */
  isKey(id){
    return new Promise(async (resolve, reject) => {
      try {
        let storeNames = await this.getStoreNames();
        resolve(storeNames.hasOwnProperty(this.options.objectStoreName) && storeNames[this.options.objectStoreName].includes(id));
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * [get return value of id]
   * @param {String} id
   * @return {Promise} object
   */
  get(id){
    return new Promise(async (resolve, reject) => {
      try {
        if(await this.isKey(id)){
          let data = await this.getStoreContent(this.options.objectStoreName+'_'+id);
          resolve(data);
        }else{
          resolve(this.options.defaultContent);
        }
      } catch (e) {
        reject(e)
      }
    })
  }

  /**
   * [getAll return all entrys with id]
   * @return {Promise} Object
   */
  getAll(){
    return new Promise(async (resolve, reject) => {
      try {
        let storeNames = await this.getStoreNames();
        let entrys = {};
        if(storeNames.hasOwnProperty(this.options.objectStoreName)){
          for (let id of storeNames[this.options.objectStoreName]) {
            entrys[id] = await this.getStoreContent(this.options.objectStoreName+'_'+id);
          }
        }
        resolve(entrys);
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * [get return value of id]
   * @param {String} id
   * @return {Promise} object
   */
  delete(id){
    return new Promise(async (resolve, reject) => {
      try {
        if(await this.isKey(id)){
          await this.removeId2StoreName(this.options.objectStoreName, id);
          await this.removeStore(this.options.objectStoreName+'_'+id);
          resolve();
        }else{
          resolve(this.options.defaultContent);
        }
      } catch (e) {
        reject(e)
      }
    })
  }

  /**
   * [set update entry]
   * @param {Object}  content [default: this.options.defaultContent]
   * @param {Boolean} update [default: false]
   * @return {Promise}
   */
  set(content=this.options.defaultContent, update=false, updateTimestamp=true){
    return new Promise(async (resolve, reject) => {
      try {
        let id = content[this.options.id];
        if(id == undefined) throw new Error('id is ', typeof id)
        if(await this.isKey(id)){ //check if key exist
          let STORENAME = this.options.objectStoreName+'_'+content[this.options.id];
          let data = await this.getStoreContent(STORENAME);

          if(updateTimestamp) content = Object.assign({timestamp: +new Date()}, content);
          if (content.timestamp-data.timestamp >= 0 || !updateTimestamp) {
            for (let index in content) {
              data[index] = content[index];
            }
            if(!update){
              for (let index in data) {
                if(!content.hasOwnProperty(index)) delete data[index];
              }
            }
            this.setStoreContent(STORENAME, data);
          }else{
            debugger;
            console.warn('Timestamp older', 'content', content.timestamp, content);
            resolve();
          }
        }else{
          await this.createEntry(content);
          resolve();
        }
      } catch (e) {
        reject(e)
      }
    })
  }

}//class
