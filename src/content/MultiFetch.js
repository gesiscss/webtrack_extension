export default class MultiFetch {

  constructor(worker=2) {
    this.worker = worker;
    this.DEBUG = false;

    if (this.debug) console.log('this.worker', this.worker);
    this.urls2data = {};
    this.toGet = [];
    this.workerCount = 0;

  }

  /**
   * [_getHashCode return hashcode from string]
   * @param  {String} str [default: '']
   * @return {String}
   */
  _getHashCode(str=''){
    var hash = 5381, i = str.length
    while(i)
      hash = (hash * 33) ^ str.charCodeAt(--i)
    return hash >>> 0;
  }

  /**
   * @param  {Number} [min=10]
   * @param  {Number} [max=100]
   * @return {Number}
   */
  getRandomNr(min=10, max=100){
    return Math.random() * (max - min) + min;
  }

  /**
   * [create a request-fetch and store the data to the cache
   * if the url on the cache, then will be return the cache data
   * ]
   * @param  {url} url
   * @return {Promise<blob>}
   */
  _fetchURL(url){
      return new Promise((resolve, reject)=>{

        if(this.urls2data.hasOwnProperty(url)){
          if (this.debug) console.log('URL=>', url);
          resolve(this.urls2data[url])
        }else if(url===undefined) {
          resolve(url);
        }else{

          var timeout = setTimeout(()=>{
             if (this.debug) console.log('TIMEOUT', url);
             resolve(url);
          }, 2000);

          // if( ( url.indexOf('://')>=0 && url.indexOf('http')<0 ) || url.indexOf('blob')>=0){
          if( url.indexOf('http')>0 ){
             resolve(url);
          }else{
            let fileReader = new FileReader();
            let myHeaders = new Headers();
            let options = { method: 'GET',
                           headers: myHeaders,
                           mode: 'cors',
                           cache: 'force-cache' };

            try {
              let request = new Request(url, options);

              fetch(request).then( response =>{
                clearTimeout(timeout);
                if (!response.ok){
                  resolve(url);
                }else{
                  return response.blob();
                }
              }).then(blob => {
                fileReader.onloadend = () => {
                  resolve(fileReader.result)
                }
                (blob instanceof Blob)? fileReader.readAsDataURL(blob): resolve(url);
              }).catch(console.log)
            } catch (e) {
              resolve(url)
              console.log(url);
              console.log(e);
            }
          }
        }//else undefined
      })
  }//()

  /**
   * [create multi fetch-request based on the workercount]
   */
  _worker(){
    if(this.urls.length==0 && this.workerCount==0 && !this.finish){
      if (this.debug) console.log('~~~~~FINISH~~~~~');
      this.finish = true;
      this.success(this.data);
    }else if(this.urls.length>0){
      let url = this.urls.shift();

      if(typeof url === 'string'){
        if(this.urls2data.hasOwnProperty(url)){
          this.data.push({url: url, data: this.urls2data[url].data, new: this.urls2data[url].new});
          this._worker();
        }else{
          if(url.includes('blob:')) url = url.split('blob:')[1];
          this.workerCount++;
          this._fetchURL(url).then(result => {
            this.data.push({url: url, data: result, new: true});
            this.urls2data[url] = {data: result, new: true};
            this.workerCount--
            this._worker();
          });
        }
      }
    }
  }

  /**
   * [fetch all data from the url list]
   * @param  {Array<string>} urls
   * @return {Promise} Array<object>
   */
  fetch(urls){
    return new Promise((resolve, reject)=>{
      this.finish = false;
      this.data = [];
      this.urls = urls;
      this.success = resolve;

      this.urls = urls;
      if(this.urls.length===0){
        this.success(this.data);
      }else{
        for (var i = 0; i < this.worker; i++) {
          setTimeout(e => this._worker(), this.getRandomNr(10, 200));
        }
      }

    })
  }


}
