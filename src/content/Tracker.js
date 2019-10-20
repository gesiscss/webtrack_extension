import MultiFetch from './MultiFetch';
import EventEmitter from 'eventemitter3';
const EVENT_NAMES = {
  'loadsource': 'onLoadSource',
  'data': 'onData',
  'newURL': 'onNewURL',
  'start': 'onStart'
}

export default class Tracker extends MultiFetch {

  constructor(worker, extensionfilter=[], is_track_allow=true) {
    super(worker);
    this.extensionfilter = extensionfilter;
    this.is_track_allow = is_track_allow;
    this.eventEmitter = new EventEmitter();

    this.rootElement = document;
    this.eventElements = {
      root: ['#primary']
    }
    this.eventFn = {
      onEvent: data => {
        this.eventEmitter.emit(EVENT_NAMES.data, Object.assign(data, {timestamp: + new Date()}), false)
      }
    }
    this.metadata = {
      description: [],
      keywords: []
    };
    this.links = [];
    this.lastURL = '';
    this.original_url = '';

    this.events_debug = false;
    this.debug = true;

    this.startswith_blacklist = [];
    this.pos_2nd_blacklist = [];

    this.header_clone = null;
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
   * [_getHead return header of HTML-Dom]
   * @return {String}
   */
  _getHead(){
    this.header_clone = document.querySelectorAll('head')[0].cloneNode(true);
    this.header_clone = this._clean_embedded_scripts(this.header_clone, 'script:not([src]),svg,style,noscript');

    return this.header_clone.outerHTML;
  }

  /**
   * [isAllow returns if the path is allowed in social media platforms]
   * @param  {Location}  [the location element to analyze the url]
   * @return {Boolean}   [if it is allow according to social media platforms rules]
   */
  is_path_allow(path){
    for (let i in this.startswith_blacklist) {
      if (path.startsWith(this.startswith_blacklist[i])){
        return false;
      }
    }

    if (this.pos_2nd_blacklist.length > 0){
      let path_2nd = path.split('/')[2];
      for (let i in this.pos_2nd_blacklist) {
       if (path_2nd == this.pos_2nd_blacklist[i]){
          return false;
        }
      }
    }

    return true;
  }


  /**
    * [is_url_change check if the url has changed]
    */
  is_url_change(){
    console.log(this.original_url);
    console.log(this.get_unhashed_href());
    return this.original_url != this.get_unhashed_href();
  }

  /**
   * [checkURL check if url changed and search in dom if find some elements they not allowed and set this.allow]
   */
  checkURL(){
    console.log(this.lastURL!==location.pathname, this.lastURL, location.pathname);
    if(this.lastURL!==location.pathname){
      this.lastURL = location.pathname
      this.eventEmitter.emit(EVENT_NAMES.newURL, true, false)
    }
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
    let metas = this._getElements(['head meta[name="description"]', 'head meta[name="keywords"]'], undefined, {setTracked: false});
    let data = {
      description: [],
      keywords: []
    };
    for (let meta of metas) {
      let name = meta.getAttribute('name');
      let content = meta.getAttribute('content');
      if(data.hasOwnProperty(name)) {
        data[name].push(content);
      }
    }
    this.updateMetaData(data);
  }

  /**
   * [updateMetaData update the meta data and fire the event handler for update]
   * @param  {Object} [data={}] [the data must have the property description or keywords]
   */
  updateMetaData(data={}){
    for (let name in this.metadata) {
      if(data.hasOwnProperty(name)){
        this.metadata[name] = this.metadata[name].concat(data[name]);
      }
    }
    let result = {}
    for (let name in this.metadata) {
      result[name] = this.metadata[name].join(',');
    }
    if (this.debug) console.log('======Emit Event: onData (METADATA) =======');
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
   * [_getRootElement return the rootElement from document]
   * @return {Object}
   */
  _getRootElement(){
    if(this.rootElement == document){
      let target = this._getElements(this.eventElements.root, document);
      if(target.length>0) this.rootElement = target[0];
    }
    return this.rootElement
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
   * [return dom as string]
   * @return {Promise}
   */
  getDom(){
    return new Promise((resolve, reject) => {

      var tclone = document.documentElement.cloneNode(true);

      // clean unnecessary scripts
      tclone = this._clean_embedded_scripts(tclone);

      resolve(tclone.outerHTML);
      //resolve(document.documentElement.outerHTML);
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
  fetchHTML(){
    return new Promise(async (resolve, reject)=>{
      if(this.debug) console.log('fetchHTML: ' + new Date());

      // if the tracker notices that the content is private, it will return
      // false instead, this is used to control what to send on the bottom
      var html = await this.getDom();

      // sometimes the content is updated before the url, the timeout here
      // makes the code wait for the updates in the url. This is not ideal,
      // but I don't see other way. Even if one could capture popstate and
      // pushstate eventss (which is not working in the extension), the 
      // problem would persist: the content was modified first and then the
      // url!
      setTimeout( function() {
        // check if the URL has changed
        if (this.is_url_change()){
          console.log(this.is_path_allow(location.pathname));
          this.eventEmitter.emit(EVENT_NAMES.newURL, {
            html: false,
            }, false);
          resolve(false);

        // if the URL has not changed
        } else {
          // if is it ok to track the current address, and some html was
          // recovered, then send the data
          if (html && this.is_path_allow(location.pathname)){

            if (this.debug) console.log('======Emit Event: onData (DATA) =======');
            this.eventEmitter.emit(EVENT_NAMES.data, {
              html: html, 
              create: +new Date()
            }, false);
            resolve(true);

          // if the content is blocked send an empty html, and notified the backend
          // to turn off the icon
          } else {
            if (this.debug) console.log('======Emit Event: onData (DISALLOW) =======');
            this.eventEmitter.emit(EVENT_NAMES.data, {
                html: ' ', 
                is_track_allow: false,
                create: +new Date()
              }, false);
            resolve(true)
          }
        }

      }.bind(this), 500);
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
