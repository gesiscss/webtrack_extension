import MultiFetch from './MultiFetch';
import EventEmitter from 'eventemitter3';
const EVENT_NAMES = {
  'loadsource': 'onLoadSource',
  'data': 'onData',
  'newURL': 'onNewURL',
  'start': 'onStart'
}

export default class Tracker extends MultiFetch {

  constructor(worker, privacy, extensionfilter=[]) {
    super(worker);
    this.privacy = privacy; 
    this.extensionfilter = extensionfilter;
    this.is_track_allow = true;
    this.eventEmitter = new EventEmitter();

    this.rootElement = document;

    this.eventFn = {
      onEvent: data => {
        this.eventEmitter.emit(EVENT_NAMES.data, Object.assign(data, {timestamp: + new Date()}), false)
      }
    }
    this.metadata = {
      description: [],
      keywords: [],
      anonym: null,
      privacy: privacy
    };


    this.links = [];
    this.lastURL = '';
    this.original_url = '';

    this.debug = true;
    this.events_debug = false;

    this.startswith_denylist = [];
    this.startswith_allowlist = [];
    this.pos_2nd_denylist = [];

    this.header_clone = null;
    this.is_logged_in = false;
    this.is_content_allowed = true;

    // WARNING: this must remain null after fully fetch the first DOM
    // because of syncing issues. If the variable is null, it is not 
    // possible to know if the location.pathname is or not allowed. 
    this.is_sm_path_allowed = null;
  }

  /**
   * [start the tracker]
   * @return {[type]} [description]
   */
  start(){
    this.lastURL = location.pathname;
    this.original_url = this.get_unhashed_href();

    this.onStart(delay => {
      this.eventEmitter.emit(EVENT_NAMES.start, delay, false)
    });

    // and any time that the locationchange
    // unnecessary as the dom also changes!
    // window.addEventListener('locationchange', function(event){
    //   console.log('locationchange');
    //   //eventEmitter.emit(EVENT_NAMES.start, delay, false)
    //   this.onStart(delay => {
    //     this.eventEmitter.emit(EVENT_NAMES.start, delay, false)
    //   });
    // }.bind(this));
  }

  /**
   * turn on the private mode on the tracker
   * @param {[type]} b [description]
   */
  set_private_mode(b) {
    this.privacy['private_mode'] = b;
  }

  /**
   * get_privacy flags
   * @return {[type]} [description]
   */
  get_privacy(){
    return this.privacy;
  }

    /**
   * [_getHead return header of HTML-Dom]
   * @return {String}
   */
  _getHead(){
    this.header_clone = document.querySelectorAll('head')[0].cloneNode(true);
    this.header_clone = this._clean_embedded_scripts(this.header_clone, 'script:not([src]),svg,style,noscript');

    return this.header_clone.outerHTML;
  }


  /**
   * Setup the credentials for the logged user (if any)
   */
  reset_credentials(){
    // is social media path allowed
    this.is_sm_path_allowed = this.get_is_sm_path_allowed(location.pathname);
    if (this.debug) console.log('IS ALLOWED', location.pathname, this.is_sm_path_allowed);

  }


  /**
   * [isAllow returns if the path is allowed in social media platforms]
   * @param  {Location}  [the location element to analyze the url]
   * @return {Boolean}   [if it is allow according to social media platforms rules]
   */
  get_is_sm_path_allowed(path){
    if (!this.is_logged_in) {
      return true;
    }

    if (!path.endsWith('/')){
      path = path + '/';
    }

    return this._get_is_sm_path_allowed(path);
  }


  /**
   * Reimplemente this method to adjust the controls in each Tracker
   */
  _get_is_sm_path_allowed(path){

    for (let i in this.startswith_denylist) {
      if (path.startsWith(this.startswith_denylist[i])){
        return false;
      }
    }

    for (let i in this.startswith_allowlist) {
      if (path.startsWith(this.startswith_allowlist[i])){
        return true;
      }
    }

    if (this.pos_2nd_denylist.length > 0){
      let path_2nd = path.split('/')[2];
      for (let i in this.pos_2nd_denylist) {
       if (path_2nd == this.pos_2nd_denylist[i]){
          return false;
        }
      }
    }

    return true;
  }



  /**
   * [is_allowed_by_lists returns if the path is allowed in social media platforms]
   * @param  {path}  [the location element to analyze the url]
   * @return {Boolean}   [if it is allow according to different lists in the background]
   */
  is_allowed_by_lists(path){
      return true;
  }


  /**
    * [is_url_change check if the url has changed]
    */
  is_url_change(){
    return this.original_url != this.get_unhashed_href();
  }

  /**
   * [checkURL check if url changed and search in dom if find some elements they not allowed and set this.allow]
   */
  checkURL(){
    if(this.lastURL!==location.pathname){
      this.lastURL = location.pathname
      this.eventEmitter.emit(EVENT_NAMES.newURL, true, false)
    }
  }

  /**
   * get the value of a paraemeter in the parameters of an url
   * @param  {str} that contains the url paramesters, e.g. ?id=000&var=x
   * @param  {str} name of the parameter that the value is being looked for
   * @return {str} the value  of the partameter
   */
  findGetParameter(params, parameterName) {
    var tmp = [];
    var items = params.substr(1).split("&");
    for (var index = 0; index < items.length; index++) {
        tmp = items[index].split("=");
        if (tmp[0] === parameterName) {
          return decodeURIComponent(tmp[1]);
        } 
    }
    return null;
  }

  /**
  * [rebuild and href without hash]
  * @return href without hashes
  */
  get_unhashed_href() {
    return location.protocol+'//'+
      location.hostname+
     (location.port?":"+location.port:"")+
      location.pathname+
     (location.search?location.search:"");
 }

  /**
   * [fetchMetaData fetch and search meta-data]
   */
  fetchMetaData(){
    let metadata = this.getMetadata();
    this.updateMetaData(metadata);
  }

  /**
   * get the metadata from the file
   * @return {object} the metadata of the html
   */
  getMetadata(){
    let metas = this._getElements(['head meta[name="description"]', 'head meta[name="keywords"]'], undefined, {setTracked: false});
    let metadata = {
      description: [],
      keywords: []
    };
    for (let meta of metas) {
      let name = meta.getAttribute('name');
      let content = meta.getAttribute('content');
      if(metadata.hasOwnProperty(name)) {
        metadata[name].push(content);
      }
    }
    return metadata;
  }

  /**
   * [updateMetaData update the meta data and fire the event handler for update]
   * @param  {Object} [data={}] [the data must have the property description or keywords]
   */
  updateMetaData(data={}){
    let result = {};
    if(data.hasOwnProperty('description')){
      this.metadata['description'] = this.metadata['description'].concat(data['description']);
      result['description'] = this.metadata['description'].join(',');
    }

    if(data.hasOwnProperty('keywords')){
      this.metadata['keywords'] = this.metadata['keywords'].concat(data['keywords']);
      result['keywords'] = this.metadata['keywords'].join(',');
    }

    if (data.hasOwnProperty('anonym')){
      result['anonym'] = data['anonym'];
    } else {
      result['anonym'] = this.metadata['anonym'];
    }

    if (data.hasOwnProperty('privacy_flags')){
      result['privacy_flags'] = data['privacy_flags'];
    } else {
      result['privacy_flags'] = this.metadata['privacy_flags'];
    }
    
    if (data.hasOwnProperty('privacy')){
      result['privacy'] = data['privacy'];
    } else {
      result['privacy'] = this.metadata['privacy'];
    }
   
    if (this.debug) console.log('======Emit Event: onData (METADATA) =======');
    if (this.debug) console.log(result);

    this.eventEmitter.emit(EVENT_NAMES.data, {meta: result}, false);
  }

  /**
   * [_setBorder set borderColor]
   * @param {[type]} target        [description]
   * @param {String} [color='red'] [description]
   */
  _setBorder(target, color='red'){
    if(this.events_debug) target.setAttribute("style", "border:2px solid "+color+" !important;");
  }

  /**
   * [_getElements search and return elements and set tracking class]
   * @param  {Array}  querys         [default: []]
   * @param  {[type]} target         [default: document]
   * @param  {Object} options        [default: {color: 'red', setBorder: true, setTracked: true, ignoreTracked: false, notSearch: '.tracked', addClass: 'tracked'}]
   * @return {Array} bucket
   */
  _getElements(querys=[], target=document, options={}){
    console.assert(Array.isArray(querys), 'querys is no array');
    console.assert(querys.length!=0, 'querys empty');
    // console.log('querys', querys);
    let bucket = [];
    options = Object.assign({}, {color: 'red', setBorder: true, setTracked: true, ignoreTracked: false, filter: ':not(.tracked)', addClass: 'tracked'}, options);
    for (let query of querys) {
      if(!options.ignoreTracked) query += options.filter;
      // console.log(target, query);
      let elements = target.querySelectorAll(query);
      let length = elements.length;
      for (var i = 0; i < length; i++) {
        if(options.setTracked && options.addClass.length>0) elements[i].classList.add(options.addClass);
        if(options.setBorder) this._setBorder(elements[i], options.color);
        bucket.push(elements[i]);
      }//for i
    }//for query
    return bucket;
  }

  /**
   * [return all matches from regex]
   * @param  {RegExp} regex
   * @param  {String} text
   * @return {Array}
   */
  getAllMatches(regex, text){
    if (regex.constructor !== RegExp) {
        throw new Error('not RegExp');
    }
    var res = [];
    var match = null;
    if (regex.global) {
        while (match = regex.exec(text)) {
            res.push(match[0]);
        }
    }
    else {
        if (match = regex.exec(text)) {
            res.push(match[0]);
        }
    }
    return res;
  }

  /**
   * [fetch all links from documentElement, filtered by the extensionfilter]
   * @param  {String} [dom='']
   * @return {Array<string>}
   */
  _getSourceLinks(dom=''){
    let tags = this.getAllMatches(/<\b(link|meta|script|img|video)(.*?)\>/gi, dom);

    let attr = this.getAllMatches(/\"(.*?)\"/g, tags.join(' '));
    let a = this.getAllMatches(/("(.*?)\")/gi, attr.join(' '));

    var links = [];
    for (let v of a) {
      v = v.replace(new RegExp('"', 'g'), '');
      if(v.indexOf('/')>=0 && v.indexOf('.')>=0 && ( (this.extensionfilter.length == 1 && this.extensionfilter[0] == 'ALL') || this.extensionfilter.includes(v.split('.').pop()) ) ){
        links.push(v);
      }//if
    }//for
    return links;
  }

  /**
   * [seach the parent element]
   * @param  {Node} node
   * @param  {String} selector
   * @param  {String} [stop_selector='body'] [description]
   * @return {Node|null}
   */
  _findParentElement(node, selector, stop_selector = 'body') {
    try {
      var parent = node.parentNode;
      while (true) {
        if (parent.matches(stop_selector)) break;
        if (parent.matches(selector)) break;
        parent = parent.parentNode; // get upper parent and check again
      }
      if (parent.matches(stop_selector)) parent = null; // when parent is a tag 'body' -> parent not found
      return parent;
    } catch (e) {
      console.log(node);
      console.log(e);
    }
  }

  /**
   * [return the parent element
   * handling selector with array or strings
   * ]
   * @param  {Node} node
   * @param  {String|Array} selector
   * @param  {String} stop_selector
   * @return {String|Array}
   */
  getParentElement(node, selector, stop_selector){
    if(typeof selector == 'string'){
      return this._findParentElement(node, selector, stop_selector);
    }else if(Array.isArray(selector)){
      for (let str of selector) {
        node = this._findParentElement(node, str, stop_selector);
      }
      return node;
    }
  }

  /**
   * [getFavicon return object with meta data strings]
   * @return {Object} [description]
   */
  getFavicon(){
    return new Promise(async (resolve, reject) => {
      try {
        if(this.favicon==null){
          let link = this._getElements(['link[rel="icon"]', 'link[rel="shortcut icon"]'], undefined, {setTracked: false});
          if(link.length==1){
            link = link[0].getAttribute("href");
            if(typeof link == 'string' && link.length>0){
              this.favicon = await this._fetchURL(link);
              resolve(this.favicon);
            }else{
              resolve(false)
            }
          }else{
            resolve(false)
          }
        }else{
          resolve(this.favicon)
        }
      } catch (e) {
        reject(e)
      }
    });
  }

  /**
   * [deliver list of hash numbers from urls]
   * @return {Array<number>}
   */
  fetchHASHLinks(){
    let e = document.querySelectorAll('a[href]');
    let urls = [];
    for (var i = 0; i < e.length; i++) {
      //let hash = this._getHashCode(e[i].getAttribute("href").replace(new RegExp('^http(s)?:\/\/', 'g'), ''));
      // if(!this.links.includes(hash)){
      //   this.links.push(hash);
      // }
      let hash = e[i].getAttribute("href").replace(new RegExp('^http(s)?:\/\/', 'g'), '');
      urls.push(hash);
    }
    return urls;
  }

  /**
   * [deliver list of urls]
   * @return {Array<number>}
   */
  getLinks(){
    let e = document.querySelectorAll('a[href]');
    let urls = [];
    for (var i = 0; i < e.length; i++) {
      urls.push(e[i].getAttribute("href"));
    }
    return urls;
  }

  /**
   * [return element without embedd js, css, etc]
   * @return {Promise}
   */
  _clean_embedded_scripts(target, selectors='script:not([src]),svg,style'){
    var r = target.querySelectorAll(selectors);
    for (var i = (r.length-1); i >= 0; i--) {
        if(r[i].getAttribute('id') != 'a'){
            r[i].parentNode.removeChild(r[i]);
        }
    }
    return target;
  }

  /**
   * [return element without detected sensitive information]
   * @return {Promise}
   */
  _clean_sensitive_content_elements(target){
    return target;
  }


  __getDom(){
    var tclone = document.documentElement.cloneNode(true);
    // clean unnecessary scripts
    tclone = this._clean_embedded_scripts(tclone);
    // clean sensitive information
    tclone = this._clean_sensitive_content_elements(tclone);
    return tclone;

  }


  /**
   * _getDom dom as string
   * @return {string}
   */
  _getDom(){
    return this.__getDom().outerHTML;
  }


  /**
   * [return dom as string]
   * @return {Promise}
   */
  getDom(){
    return new Promise((resolve, reject) => {
      resolve(this._getDom());
    });
  }


  /**
   * [return all sources from dom]
   * @param  {String} dom
   * @return {Promise} Array<object>
   */
  fetchSource(dom){
    return new Promise(async (resolve, reject)=>{
      try {
        let source = await this.fetch(this._getSourceLinks(dom));
        source = source.filter(e => e.new).map(e => {
          this.urls2data[e.url].new = false;
          delete e.new;
          return e;
        });
        // this.eventEmitter.emit(EVENT_NAMES.data, {source: source}, false)
        const CHUNKSIZE = 50;
        let sources = [].concat.apply([], source.map((elem,i) => {
            return i%CHUNKSIZE ? [] : [source.slice(i,i+CHUNKSIZE)];
        }))
        for (var i = 0; i < sources.length; i++) {
          this.eventEmitter.emit(EVENT_NAMES.data, {source: sources[i]}, false)
        }

      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * [fetch favicon and run the event listener]
   * @return {Promise}
   */
  fetchFavicon(){
    return new Promise(async (resolve, reject)=>{
      try {
        let favicon = await this.getFavicon();
        this.eventEmitter.emit(EVENT_NAMES.data, {favicon: favicon}, false)
        resolve();
      } catch (err) {
        reject(favicon)
      }
    })
  }

  /**
   * [fetch all hash links and run the event listener]
   * @return {[type]} [description]
   */
  fetchLinks(){
    return new Promise(async (resolve, reject)=>{
      try {
        //this.fetchHASHLinks();
        this.eventEmitter.emit(EVENT_NAMES.data, {}, false);
        resolve();
      } catch (err) {
        reject(err)
      }
    });
  }

  /**
   * [fetch the html content and run the event listener]
   * @return {Promise}
   */
  fetchHTML(timeout=750){
    return new Promise(async (resolve, reject)=>{
      if (this.debug) console.log('fetchHTML: ' + new Date());

      // sometimes the content is updated before the url, the timeout here
      // makes the code wait for the updates in the url. This is not ideal,
      // but I don't see other way. Even if one could capture popstate and
      // pushstate eventss (which is not working in the extension), the 
      // problem would persist: the content was modified first and then the
      // url!
      setTimeout( async function() {
        if (this.debug) console.log('timeout: FetchHTML');

        // reset the credentials before anything else, this will turn on/off
        // different flags for the creation of the DOM
        this.reset_credentials();

        // check if the URL has changed
        if (this.is_url_change()){
          if (this.debug) console.log('======Emit Event: newURL =======');
          this.eventEmitter.emit(EVENT_NAMES.newURL, {
            html: false,
            }, false);
          resolve(false);

        // if the URL has not changed
        } else {

          // if the tracker notices that the content is private, it will return
          // false instead, this is used to control what to send on the bottom
          var html = await this.getDom();

          // if is it ok to track the current address, and some html was
          // recovered, then send the data
          if (html && this.is_sm_path_allowed
             && this.is_allowed_by_lists(location.pathname) 
             && this.is_content_allowed){
            if (this.debug) console.log('======Emit Event: onData (DATA) =======');

          // if the content is blocked send an empty html, and notified the backend
          // to turn off the icon
          } else {
            if (this.debug) console.log('======Emit Event: onData (DISALLOW) =======');
            html = '<EMPTY>';
          }

          this.eventEmitter.emit(EVENT_NAMES.data, {
              html: html, 
              is_sm_path_allowed: this.is_sm_path_allowed,
              is_content_allowed: this.is_content_allowed,
              is_allowed_by_lists: this.is_allowed_by_lists(location.pathname),
              create: (new Date()).toJSON()
            }, false);
          resolve(true)
        }

      }.bind(this), timeout);
    });
  }

  /**
   * [onStart]
   * @param  {Function} fn 
   */
  onStart(fn){
    fn(1000);
  }

}
