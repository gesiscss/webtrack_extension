import AWSWrapper from './AWSWrapper';

export default class S3Service extends AWSWrapper{

    constructor(accessKeyId, secretAccessKey, defaultBucket=null) {
      super();
      //NeedPermisson IAMFullAccess
      this.prefix = 0;
      this.user = Object.assign({}, this.DEFAUL_CONFIG, Object.assign({}, {accessKeyId: accessKeyId, secretAccessKey: secretAccessKey} ));
      this.config = new AWS.Config(this.user);
      this.service = new AWS.S3(this.config);
      this.setDefaultBucket(defaultBucket);
    }

    /**
     * [getRandomStr return random string]
     * @param  {Number} [max] [Default: 5]
     * @return {String}
     */
    getRandomStr(max=5) {
      let text = "";
      let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for (let i = 0; i < max; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      return text;
    }

    /**
     * [setDefaulURL set default Bucket]
     * @param {String} bucket
     */
    setDefaultBucket(bucket){
      this.defaultBucket = bucket;
    }

    /**
     * [create new Bucket]
     * @param  {String}  bucket       [default: '']
     * @param  {Boolean} setAsDefault    [default: false]
     * @param  {Object} bucketConfiguration    [default: {}]
     * @return {Promise} String QueueUrl
     */
    create(bucket='', setAsDefault=false, bucketConfiguration={}){
      return new Promise(async (resolve, reject)=>{
          try {
            bucketConfiguration =  Object.assign({}, {LocationConstraint: this.user.region}, bucketConfiguration);
            console.log('bucketConfiguration', bucketConfiguration);
            let r = await this._runService('createBucket', {Bucket: bucket, CreateBucketConfiguration:  bucketConfiguration});
            this.defaultBucket = r.bucket;
            resolve(bucket)
          } catch (e) {
            reject(e)
          }
      });
    }

    /**
     * [get return all bucket names as list]
     * @return {Promise} Array
     */
    get(){
      return new Promise((resolve, reject)=>{
        this._runService('listBuckets')
        .then(e => resolve(e.Buckets.map(e=>e.Name) || []))
        .catch(reject)
      });
    }

    /**
     * [delete bucket]
     * @param  {String} bucket
     * @return {Promise} Object
     */
    delete(bucket){
      return new Promise((resolve, reject)=>{
        this._runService('deleteBucket', {Bucket: bucket})
          .then(e => resolve(true))
          .catch(reject)
      });
    }

    /**
     * [sendMessage sending Data to the bucket]
     * @param  {Object} param      [default: {}]
     * @return {Promise} Object
     */
    upload(param={}){
      return new Promise((resolve, reject)=>{
        let c = Object.assign({}, {Bucket: this.defaultBucket, Key: this.getRandomStr(10), ACL: 'private'}, param);
        this._runService('upload',  c)
          .then(resolve)
          .catch(reject)
      });
    }

    /**
     * [listKeys return list of file keys]
     * @param  {Object} param      [default: {}]
     * @return {Promise} Array
     */
    listKeys(param={}){
      return new Promise((resolve, reject) => {
        this._runService('listObjects', Object.assign({}, {Bucket: this.defaultBucket}, param) )
          .then(e => resolve(e.Contents.map(f => f.Key) || []))
          .catch(reject)
      });
    }


     /**
      * [getObject return uploaded file]
      * @param  {Object} param      [default: {}]
      * @return {Promise} Array
      */
    getObject(param={}){
      return new Promise((resolve, reject) => {
        this._runService('getObject', Object.assign({}, {Bucket: this.defaultBucket}, param) )
          .then(e => resolve(e || []))
          .catch(reject)
      });
    }

    /**
     * [deleteObject delete file from the bucket]
     * @param  {Object} param      [default: {}]
     * @return {Promise} Object
     */
    deleteObject(param={}){
      return new Promise((resolve, reject)=>{
        this._runService('deleteObject', Object.assign({}, {Bucket: this.defaultBucket}, param) )
          .then(resolve)
          .catch(reject)
      });
    }


  }//class
