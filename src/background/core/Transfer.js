import ZipHandler from './ZipHandler';
import S3Service from './storage/aws/S3Service';
import CryptHandler from './CryptHandler';


export default class Transfer {

  constructor(url) {
    this.zipHandler = new ZipHandler('3rdpart/zip/', 'data.json');
    this._storageDestation = false;
    this.MINI_TYPE = 'application/cryptzip';
    this.server = url;
    this.defaultTraget = {url: url+'tracking/upload'}
    this.thirdDestation = null;
    this.DEFAULT_OPTION = {
      method: 'GET',
      headers:{
        'Accept': 'application/json'
      }
    }
  }


  /**
   * send an start installation message
   * @return {[type]} [description]
   */
  async startInstallation(){
    this.__ping_server('startInstallation');
  }

  /**
   * send an end installation message
   * @return {[type]} [description]
   */
  async endInstallation(){
    this.__ping_server('endInstallation');
  }


  /**
   * [__ping_server quick message to the serve]
   */
  __ping_server(msg){
    return new Promise((resolve, reject)=>{
      this.jsonFetch(this.server+'client/' + msg)
        .then(projects => {
          resolve(true);
         })
        .catch(err => {
          console.log(err);
          resolve(false);
        })
    });
  }

  /**
   * [setCert set certificate]
   * @param {String} cert
   */
  setCert(cert){
    this._cryptHandler = new CryptHandler(cert);
  }

  /**
   * [setTragetOption set the target options]
   * @param {Boolean} b                    [default: false]
   * @param {Object}  options              [default: this.defaultTraget]
   */
  setTragetOption(b=false, options=this.defaultTraget){
    this._storageDestation = b;
    this.options = options;
  }

  /**
   * [deliver specific third destination object who was required from the destination settings]
   * @return {S3Service} object
   */
  getThirdDestation(){
    if(this.thirdDestation==null){
      switch (this.options.DESTINATION) {
        case 'aws':
          this.thirdDestation = new S3Service(this.options.WRITEONLY_ACCESSKEYID, this.options.WRITEONLY_SECRETACCESSKEY, this.options.BUCKET);
          break;
        default:
      }
    }
    return this.thirdDestation;
  }

  /**
   * [sendingData compress data-string to file and sending to the target-server]
   * @param  {String} string
   * @param  {Function} callbackStatus
   * @return {Promise}
   */
  sendingData(string, callbackStatus){
    return new Promise((resolve, reject)=>{
      if(!this._storageDestation)
        this._direktSending(string, callbackStatus).then(resolve).catch(reject)
      else
        this._storageDestationSending(string, callbackStatus).then(resolve).catch(reject)
    })
  }


  /**
   * [_direktSending compress data-string to zip file and sending to the server]
   * @param  {String} string
   * @param  {Function} callbackStatus
   * @return {Promise}
   */
  _direktSending(string, callbackStatus){
    // return new Promise((resolve, reject)=>{
    //   this.sendFile(this.options.url, 'page', new Blob([string], {type: "application/json"})).then(resolve).catch(reject);
    // });

    // return this._fetch(url, options);

    return new Promise((resolve, reject)=>{
      //var fd = new FormData();
      //fd.append(type, blob);
      this._fetch(this.options.url, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: string
      }).then(resolve).catch(reject)
    });
  }

  /**
   * [_direktSending compress data-string to zip file and sending to the server]
   * @param  {String} string
   * @param  {Function} callbackStatus
   * @return {Promise}
   */
  _direktSending_old(string, callbackStatus){
    return new Promise((resolve, reject)=>{
      this.sendFile(this.options.url, 'page', new Blob([string], {type: "application/json"})).then(resolve).catch(reject);
    });
  }

  /**
   * [_storageDestationSending compress and crypt data-string to cryptzip file and sending to the storage destination]
   * @param  {String} string
   * @param  {Function} callbackStatus
   * @return {Promise}
   */
  _storageDestationSending(string, callbackStatus){
    return new Promise((resolve, reject)=>{
      let reader = new FileReader();
      this.zipHandler.create(string).then(zipBlob => {

        reader.onload = () => {
          var r = this._cryptHandler.encrypt(reader.result); // <-- crypt data
          var blob = new Blob([JSON.stringify(r)], {type: this.MINI_TYPE});
          callbackStatus('compressed');
          this.getThirdDestation().upload({
            Body: blob
          }).then(resolve).catch(reject);
        }

        reader.readAsDataURL(zipBlob);
      }).catch(reject)
    });
  }


  /**
   * [sendFile send the blob withe the typename to the url]
   * @param  {String} url
   * @param  {String} type
   * @param  {Blob} blob
   * @return {Promise}
   */
  sendFile(url, type, blob){
    return new Promise((resolve, reject)=>{
      var fd = new FormData();
      fd.append(type, blob);
      this._fetch(url, {
          method: 'POST',
          body: fd
      }).then(resolve).catch(reject)
    });
  }


  /**
   * [fileFetch get raw GET-request]
   * @param  {String} url
   * @return {Promise}
   */
  fileFetch(url){
    return new Promise((resolve, reject)=>{
      fetch(url).then(response  => {
        if (!response.ok) throw response.statusText;
        let blob = response.blob();
        resolve(new Response(blob).text());
      }).catch(err => {
        //if (this.debug) console.log('Failed to Fetch File: ', url);
        reject({
          message: 'fileFetch: ' + err.message,
          code: '500',
          nr: '-1',
        })
      });
    });
  }

  /**
   * [jsonFetch create request with options]
   * @param  {String} url
   * @param  {Object} options [default: this.DEFAULT_OPTION]
   * @return {Promise} Object
   */
  jsonFetch(url, options=this.DEFAULT_OPTION){
    return this._fetch(url, options);
  }

  /**
   * [fetch json from response url and format it to the default json response]
   * @param  {String} url
   * @param  {Object} options
   * @return {Object} data
   */
  _fetch(url, options){
    return new Promise((resolve, reject)=>{
      var res = null;
      fetch(url, options).then(response => {
        res = response;
        if (!response.ok) throw response.statusText;
        return response.json();
      })
      .then(d => {
        if(d.error != null){
          reject({ 
            message: d.error.message || '', 
            code: d.error.code || '', 
            nr: d.error.nr || ''
          });
        }else {
          let authData = d.result.authData;
          var data = (typeof d.result==='object' && d.result.hasOwnProperty('data'))? d.result.data: d.result;
          resolve(data);
        }
      }).catch(err => {
        //if (this.debug) console.log('Failed to Fetch JSON: ', url);
        console.log(err);
        reject({
          message: '_fetch: ' + err.message,
          code: '500',
          nr: '-1',
        })
      });
    })
  }

}//class
