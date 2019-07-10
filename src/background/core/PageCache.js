import LocalstoreDB from './LocalstoreDB';
import CacheHandler from './CacheHandler';


export default class PageCache extends CacheHandler {

  /**
   * [constructor
   * - create instance of FileHandler
   * - create instance of LocalstorageHandler
   * ]
   * @param {Number} projectId
   */
  constructor(projectId=''){
    super();
    this.storage = new LocalstoreDB({databaseName: 'wt_page_'+projectId, objectStoreName: 'data', defaultContent: {}});
    this.delay = 500;
    // this.fileAttr = ['content', 'source', 'links', 'events'];
    this.typeofId = 'string';
    this.fileAttr = [];
    this.LOAD_FILES_AFTER_INIT = false;
    this.debug = false;
  }

  /**
   * [cleanSource delete all sources from source table]
   * @param  {String} id
   * @return {Promise}
   */
  cleanSource(id){
    return new Promise(async (resolve, reject) => {
      try {
        let content = await super.getOnly(id);
        if(content.hasOwnProperty('source')){
          let urls = content.source.map(e => e.url);
          await super.cleanSource(urls);
        }
        resolve();
      } catch (err) {
        reject(err)
      }
    });
  }

  // /**
  //  * [getOnly return the merg content of page with source]
  //  * @param  {String} id
  //  * @return {Promise} Object
  //  */
  // getOnly(id){
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       let content = await super.getOnly(id);
  //       content.source = await this.source.getMerg(content.source);
  //       resolve(content);
  //     } catch (err) {
  //       reject(err)
  //     }
  //   });
  // }

}
