import LocalstoreDB from './LocalstoreDB';
import CacheHandler from './CacheHandler';


export default class ErrorCache extends CacheHandler {

  /**
   * [constructor
   * - create instance of FileHandler
   * - create instance of LocalstorageHandler
   * ]
   * @param {Number}
   */
  constructor(){
    super();
    this.storage = new LocalstoreDB({databaseName: 'wt_error', objectStoreName: 'data', defaultContent: {}});
    this.typeofId = 'number';
    this.debug = false;
    this.add
  }

  add(error){
    if(error.hasOwnProperty('reason')){
      error = error.reason;
    }
    error = error.hasOwnProperty('stack')? error.stack.toString(): error;
    console.log('error', error);
    super.add({id: + new Date(), time: new Date(), reason: error}).catch(console.error);
  }

  createDB(){
    return new Promise((resolve, reject) => {
      this.storage.getTransaction().then(transaction => {
        transaction.db.close();
        resolve();
      }).catch(reject)
    });
  }

}
