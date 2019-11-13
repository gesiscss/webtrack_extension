export default class LocalstoreDB {

  constructor(options={}) {
    this.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    this.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    this.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

    this.options = Object.assign({databaseName: 'localstoreDB', objectStoreName: 'myObjectStore', id: 'id', defaultContent: {}}, options);
    // console.log(this.options);
    // this.db = null;
    // this.verionsNumber = null;
    // this.MAX_ERROR = 2;
    // this.errorCount = 0;
    this.DEBUG = false;
  }//()



  /**
   * [getConnect return IDBDatabase]
   * @return {Promise}
   */
  getConnect(){
    return new Promise((resolve, reject) => {
      let request = indexedDB.open(this.options.databaseName);
      request.onerror = (event) => {
        reject(event)
      }
      request.onsuccess = (event) => {
        resolve(request.result);
      }
    });
  }

  /**
   * [getVersionConnect]
   * @param  {IDBDatabase} db
   * @return {Promise} IDBDatabase
   */
  getVersionConnect(db){
    return new Promise((resolve, reject) => {
      let verionsNumber = db.version + 1;
      db.close();
      let timeout = setTimeout(()=>{
        console.log('Timeout ', verionsNumber);
        this.getConnect().then(db => this.getVersionConnect(db).then(resolve).catch(reject)).catch(reject)
      }, 2000)
      let request = indexedDB.open(this.options.databaseName, verionsNumber);
      request.onerror = (event) => {
        reject(event)
      }
      request.onupgradeneeded = event => {
        if (this.debug) console.log('onupgradeneeded');
        clearTimeout(timeout)
        let db = event.target.result;
        db.onversionchange = e => {
          console.log('db.onversionchange', e);
        }
        resolve(db);
      }
    })
  }

  /**
   * [getObjectStorelist return list of objectStores]
   * @param {IDBDatabase} db
   * @return {Array}
   */
  getObjectStorelist(db){
    let values = []
    for (let i = 0; i < db.objectStoreNames.length; i++) {
      values.push(db.objectStoreNames.item(i))
    }
    return values
  }


  /**
   * [deleteStore delete objectStore]
   * @param  {String} name [default: this.options.objectStoreName]
   * @return {Promise}
   */
  deleteObjectStore(objectStoreName=this.options.objectStoreName){
    return new Promise(async (resolve, reject) => {
      try {
        let db = await this.getConnect();
        //if objectStoreName not exist then will be created
        if(this.getObjectStorelist(db).includes(objectStoreName)){
          db = await this.getVersionConnect(db);
          db.deleteObjectStore(objectStoreName);
          if (this.debug) console.log('Delete objectStore', objectStoreName);
        }else{
          throw new Error('objectStorename %s not found', objectStoreName)
        }
        db.close();
        resolve();
      } catch (err) {
        reject(err)
      }
    })
  }


  /**
   * [delete database]
   * @param  {String} name
   * @return {Promise<any>}
   */
  deleteDatabase(name){
    return new Promise((resolve, reject) => {
      let request = indexedDB.deleteDatabase(name);
      request.onerror = (event) => {
        reject(event)
      };
      request.onsuccess = (event) => {
        resolve(event.result)
      };
    })
  }

  /**
   * [createObjectStore create the objectStore this.options.objectStoreName]
   * @param  {IDBDatabase} db [the db connection will be closed]
   * @return {Promise}
   */
  createObjectStore(db){
    return new Promise(async (resolve, reject) => {
      try {
        if(!this.getObjectStorelist(db).includes(this.options.objectStoreName)){
          db = await this.getVersionConnect(db);
          if (this.debug) console.log('Create objectStore', this.options.objectStoreName);
          let objectStore = db.createObjectStore(this.options.objectStoreName, { keyPath: this.options.id });
          objectStore.createIndex("timestamp", "timestamp", { unique: false });
          db.close();
        }
        resolve();
      } catch (err) {
        reject(err)
      }
    });
  }

  /**
   * [getTransaction create the objectStore if they not exist and return IDBTransaction object]
   * @return {Promise} IDBTransaction
   */
  getTransaction(){
    return new Promise(async (resolve, reject) => {
      try {
        let db = await this.getConnect();
        //if objectStoreName not exist then will be created
        if(!this.getObjectStorelist(db).includes(this.options.objectStoreName)){
          await this.createObjectStore(db);
          this.getTransaction().then(resolve).catch(reject);
        }else{
          let transaction = db.transaction([this.options.objectStoreName], "readwrite");
          transaction.oncomplete = () => {
            if (this.debug) console.log('onComplete transaction', this.options.objectStoreName);
            db.close();
            transaction.resolve();
          }
          transaction.resolve = () => {

          }
          transaction.onerror = (event) => {
            reject(event)
          };
          resolve(transaction);
        }
      } catch (e) {
        reject(e)
      }
    });
  }

  /**
   * [_getObjectStore return create readwrite IDBTransaction object and deliver IDBObjectStore]
   * @return {Promise} IDBObjectStore
   */
  getObjectStore(){
    return new Promise(async (resolve, reject) => {
      try {
        let transaction = await this.getTransaction();
        let objectStore = transaction.objectStore(this.options.objectStoreName);
        resolve(objectStore)
      } catch (e) {
        reject(e)
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
        if (this.debug) console.log('createEntry', this.options.objectStoreName, content);
        let objectStore = await this.getObjectStore();
        content = Object.assign(content, {timestamp: 0});
        let request = objectStore.add(content)
        request.onsuccess = event => {
          objectStore.transaction.resolve = () => resolve();
        }
        request.onerror = event => {
          reject(event);
        }
      } catch (err) {
        reject(err)
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
        let objectStore = await this.getObjectStore();
        let request = objectStore.getAll()
        request.onsuccess = event => {
          let result = {};
          for (let e of event.target.result) {
            result[e[this.options.id]] = e
          }
          objectStore.transaction.resolve = () => {
            resolve(result)
          };
        }
        request.onerror = event => {
          reject(event);
        }
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
        let objectStore = await this.getObjectStore();
        let request = objectStore.getAll()
        request.onsuccess = event => {
          let keys = event.target.result.map(e => e[this.options.id]).includes(id);
          objectStore.transaction.resolve = () => resolve(keys);
        }
        request.onerror = event => {
          reject(event);
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * [getCursor return IDBCursorWithValue object]
   * @param  {String} id
   * @return {Promise} IDBCursorWithValue
   */
  getCursor(id){
    return new Promise(async (resolve, reject) => {
      try {
        let objectStore = await this.getObjectStore();
        // console.log(this.IDBKeyRange.only(id));
        let request = objectStore.openCursor(this.IDBKeyRange.only(id))
        // var request = objectStore.openCursor();

        request.onsuccess = event => {
          if(event.target.result==null){
            console.warn(event.target, this.options, 'id', id);
            event.target.transaction.db.close()
            reject(new Error('cursor are null'))
          }else{
            resolve(event.target.result);
          }
        }
        request.onerror = event => {
          reject(event);
        }
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
          let cursor = await this.getCursor(id);
          cursor.source.transaction.resolve = () => resolve(cursor.value);
        }else{
          resolve(this.options.defaultContent);
        }
      } catch (e) {
        reject(e)
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
          let cursor = await this.getCursor(id);
          let request = cursor.delete();
          request.onsuccess = () => {
            if (this.debug) console.log('Delete', this.options.objectStoreName, id);
            cursor.source.transaction.resolve = () => resolve();
          };
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
          // let cursor = await this.getCursor(id);
          let data = await this.get(id);

          if(updateTimestamp) content = Object.assign({timestamp: +new Date()}, content)
          if (content.timestamp-data.timestamp >= 0 || !updateTimestamp) {
            for (let index in content) {
              data[index] = content[index];
            }
            if(!update){
              for (let index in data) {
                if(!content.hasOwnProperty(index)) delete data[index];
              }
            }
            let objectStore = await this.getObjectStore();
            let request = objectStore.put(data);
            request.onerror = err => reject(err);
            request.onsuccess = () => {
              objectStore.transaction.resolve = () => resolve();
            }
          }else{
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


  /**
   * [getObjectStorelist return list of objectStores]
   * @param {IDBDatabase} db
   * @return {Array}
   */
  getStorelist(){
    return new Promise(async (resolve, reject) => {
      try {
        let db = await this.getConnect();
        let values = []
        for (let i = 0; i < db.objectStoreNames.length; i++) {
          values.push(db.objectStoreNames.item(i))
        }
        db.close()
        resolve(values);
      } catch (err) {
        reject(err)
      }
    })
  }


}//class
