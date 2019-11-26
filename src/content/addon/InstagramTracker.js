
import Tracker from '../Tracker';

export default class InstagramTracker extends Tracker{

  constructor(worker, extensionfilter=[]){
    super(worker);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.is_allowed = null;
    this.instagram_debug = false;

    this.svg_account = 'nav a svg g path[d="M24 27c-7.1 0-12.9-5.8-12.9-12.9s5.8-13 12.9-13c7.1 0 12.9 5.8 12.9 12.9S31.1 27 24 27zm0-22.9c-5.5 0-9.9 4.5-9.9 9.9s4.4 10 9.9 10 9.9-4.5 9.9-9.9-4.4-10-9.9-10zM44 46.9c-.8 0-1.5-.7-1.5-1.5V42c0-5-4-9-9-9h-19c-5 0-9 4-9 9v3.4c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5V42c0-6.6 5.4-12 12-12h19c6.6 0 12 5.4 12 12v3.4c0 .8-.7 1.5-1.5 1.5z"]';
    this.div_fullname = '.f5Yes.oL_O8';
    this.span_heart = 'section span.fr66n';
    this.span_comment = 'section span._15y0l';
    this.span_share = 'section span._5e4p';
    this.span_save = 'section span.wmtNn';
    this.anchor_article = 'div.eo2As a.c-Yi7';
    this.article = 'article.M9sTE.L_LMM.ePUX4';
    this.mosaik = 'div.v1Nh3.kIKUG._bz0w';

    this.articleId2Element = {};
    this.mosaikId2Element = {};

    this.logged_user_id = null;
    this.logged_username = null;
    this.logged_fullname = null;
    this.profile_pic_url = null;
    this.profile_pic_url_hd = null;
    this.credentials = null;
    this.is_logged_in = null;
    this.is_timeline = false;
    this.is_explore = false;
    this.is_profile = false;
    this.is_my_profile = false;
    this.is_post = false;

    this.startswith_blacklist = ['/accounts/', '/settings/', '/emails/settings/', '/session/login_activity/', '/emails/emails_sent/'];

    this.pos_2nd_blacklist = [ 'followers', 'following', 'saved', 'tagged'];
  }


  /**
   * Setup the credentials for the logged user (if any)
   */
  reset_credentials(){
    let svg_account = this.get_svg_account();
    this.is_logged_in = this._isLogged(svg_account);

    if (this.is_logged_in){
      this.credentials = this.get_credentials();
      
      if (this.credentials == null) {
        this.logged_username = this.get_username(svg_account);
        this.logged_fullname = this.get_fullname();
      } else {
        this.logged_user_id = this.credentials.id;
        this.logged_username = this.credentials.username;
        this.logged_fullname = this.credentials.full_name;
        this.profile_pic_url = this.credentials.profile_pic_url;
        this.profile_pic_url_hd = this.credentials.profile_pic_url_hd;
        this.is_private = this.credentials.is_private;
      }

      let pathname = location.pathname;
      if (pathname == '/'){
        if (this.instagram_debug) console.log('credentials: is_timeline');
        this.is_timeline = true;
      } else if (pathname.startsWith('/explore/')) {
        if (this.instagram_debug) console.log('credentials: is_explore');
        this.is_explore = true;
      } else if (pathname.startsWith('/p/')) {
        if (this.instagram_debug) console.log('credentials: is_post');
        this.is_post = true;
      } else {
        let parts = pathname.split('/');
        if (parts.length == 3) {
          if (this.instagram_debug) console.log('credentials: is_profile');
          this.is_profile = true;
        }
        if (parts[1] == this.logged_username){
          if (this.instagram_debug) console.log('credentials: is_my_profile');
          this.is_my_profile = true;
        }
      }
    }
    this.is_content_allowed = true;

  }


    /**
   * get the metadata from the file
   * @return {object} the metadata of the html
   */
  getMetadata(){
    let metadata = super.getMetadata();
    let anonym = {};

    if (this.logged_user_id) {
      anonym['user_id'] = this.logged_user_id;
    }

    if (this.logged_username) {
      anonym['username'] = this.logged_username;
    }

    if (this.profile_pic_url) {
      anonym['guest_id'] = this.profile_pic_url;
    }

    if (this.logged_fullname) {
      anonym['fullname'] = this.logged_fullname;
    }

    if (this.profile_pic_url_hd) {
      anonym['guest_id'] = this.profile_pic_url_hd;
    }

    metadata['anonym'] = anonym;

    return metadata;

  }




  /**
  Load the credentials from the script in Instagram
  returns a dictionary with the credentials
  **/  
  get_credentials() {
    let scripts = document.querySelectorAll('script:not([src])');
    for (var i = 0; i < scripts.length; i++) {
      let sc = scripts[i].textContent;
      if (sc.startsWith('window._sharedData = ')) {
        return JSON.parse(sc.substring(sc.lastIndexOf('"viewer":') + 9, 
          sc.lastIndexOf(',"viewerId"')));
      }
    }
    return null;
  }  

  get_svg_account(){
    return document.querySelector(this.svg_account);
  }

  get_fullname(){
    let element = document.querySelector(this.div_fullname);
    if (element){
      return element.textContent;
    }
    return null;
  }

  get_username(svg_account){
    if (svg_account){
      return svg_account.parentNode.parentNode.parentNode.pathname.split('/')[1];
    }
    return null;
  }

  /**
   * return true if user is logged in Instagram
   * @return {boolean} true if user is logged
   */
  _isLogged(svg_account) {
    if (svg_account){
      return true;
    }
    return false;
  }


  /**
   * [_isPublic checks if element is for the public oder private]
   * @param  {Object}  target [DomElement]
   * @return {Boolean}
   */
  _isPublic(target){

    // if the user is not logged in, the content is public for sure
    if (!this.is_logged_in){
      return true;
    }

    if (this.is_explore){
      return true;
    }

    if (this.is_profile){
      return true;
    }

    // if the protected svg appear in the tweet, the content is private
    if (target.querySelector(this.span_share)) {
      return true;
    } else {
      return false;
    }

  }


  /**
   * [_getId looks for an href that contains the id of the element]
   * @param  {Object}  target [DomElement]
   * @return {int}
   */
  _getId(article){
    let _id =null;
    try {
      var anchor = article.querySelector(this.anchor_article);
      _id = anchor.pathname.split('/')[2];
    }
    catch(error) {
      console.log(error);
      console.log('Unexpected error getting Instagram ID in InstagramTracker');
    }
    
    return _id;
  }

    /**
   * [_getMosaikId looks for an href that contains the id of the element]
   * @param  {Object}  target [DomElement]
   * @return {int}
   */
  _getMosaikId(mosaik){
    let _id =null;
    try {
      var anchor = mosaik.querySelector('a');
      _id = anchor.pathname.split('/')[2];
    } catch(error) {
      console.log(error);
      console.log('Unexpected error getting Instagram ID in InstagramTracker');
    }
    
    return _id;
  }

  /**
   * [_getPublicArticels start tracking an article]
   */
  trackArticle(id, article){
    this.articleId2Element[id] = article.cloneNode(true);
  }


  /**
   * [_getPublicArticels start tracking an article]
   */
  trackMosaik(id, article){
    this.mosaikId2Element[id] = article.cloneNode(true);
  }

  /**
   * [_getPublicArticels return elements of public articels]
   * @return {Array} true if at least one article was found
   */
  addPublicArticles(){
    
    let articles = document.querySelectorAll(this.article);
    let counter = 0;

    for (var i = 0; i < articles.length; i++) {
      let id = this._getId(articles[i]);
      if (id == null) {
          // This does not seem to be a post (delete it)
          delete articles[i];
      } else {
        if(this._isPublic(articles[i])){
          this.trackArticle(id, articles[i]);
          counter += 1;
        }
      }
    }

    if (this.instagram_debug) console.log('Articles Found: ' + articles.length);
    if (this.instagram_debug) console.log('Public Articles: ' + counter);

    // return True if at least one article was found (regardless it being public/private)
    return articles.length > 0;
  }

  /**
   * [_getPublicArticels return elements of public articels]
   * @return {Array} true if at least one article was found
   */
  addArticleMosaik(){
    
    let mosaiks = document.querySelectorAll(this.mosaik);
    let counter = 0;

    for (var i = 0; i < mosaiks.length; i++) {
      let id = this._getMosaikId(mosaiks[i]);
      if (id == null) {
          // This does not seem to be a mosaik (delete it)
          delete mosaiks[i];
      } else {
        this.trackMosaik(id, mosaiks[i]);
        counter += 1;
      }
    }

    if (this.instagram_debug) console.log('Mosaiks Found: ' + mosaiks.length);
    if (this.instagram_debug) console.log('Public Mosaiks: ' + counter);

    // return True if at least one article was found (regardless it being public/private)
    return mosaiks.length > 0;
  }

  /**
   * [assembleDom with the existent html]
   * @return {String}
   */
  reAssembleDom(){

    let dom = this.__getDom();

    //this.timeline_body = 'div.cGcGK > div > div';
    //this.explore_body = 'article.v1pSD > div > div';
    //this.profile_body = 'article.ySN3v > div > div';

    if(this.is_timeline){
      if (this.instagram_debug) console.log('is_timeline');
      let timeline_body = dom.querySelector(this.article).parentNode;
      if (timeline_body){
        timeline_body.innerHTML = "";
        for (var key in this.articleId2Element) {
          if (this.articleId2Element.hasOwnProperty(key)){
            this.articleId2Element[key].setAttribute('webtrack-post-id', key);
            timeline_body.append(this.articleId2Element[key]);
          }
        }
      }
    }

    if(this.is_explore || this.is_profile){
      // let mosaik_body = null;
      // if (this.is_explore) {
      //   mosaik_body = dom.querySelector(this.explore_body);
      // } else {
      //   mosaik_body = dom.querySelector(this.profile_body);
      // }
      if (this.instagram_debug) console.log('is_explore or is_profile');
      let one_mosaik = dom.querySelector(this.mosaik);
      if (one_mosaik){
        let mosaik_body = one_mosaik.parentNode.parentNode;
        if (mosaik_body){
          mosaik_body.innerHTML = "";
          for (var key in this.mosaikId2Element) {
            if (this.mosaikId2Element.hasOwnProperty(key)){
              this.mosaikId2Element[key].setAttribute('webtrack-post-id', key);
              mosaik_body.append(this.mosaikId2Element[key]);
            }
          }
        }
      }
    }

    if(this.is_post){
      if (this.instagram_debug) console.log('is_post');
      let articles = dom.querySelectorAll(this.article);
      if (articles.length == 1){
        let article = articles[0];
        if (this._isPublic(article)){
          if (this.instagram_debug) console.log('is_public_post');
          let _id = this._getId(article);
          if (_id) {
            article.setAttribute('webtrack-post-id', _id);
          }
        } else {
          if (this.instagram_debug) console.log('is_private_post');
          article.parentNode.removeChild(article);
        }
      } else {
        debugger;
      }
    }

    return dom.outerHTML;
  }

  /**
   * [return dom as string]
   * @return {Promise}
   */
  getDom(){
    //if (this._isNotLoggedTwitter()){
    //    return super.getDom();
    //} else {
      return new Promise((resolve, reject) => {
        console.log('promise');
        if(this.is_timeline){
          if (this.instagram_debug) console.log('is_timeline');
          this.addPublicArticles();
        } else if (this.is_explore || this.is_profile) {
          if (this.instagram_debug) console.log('is_explore or is_profile');
          this.addArticleMosaik();
        }

        if (this.instagram_debug) console.log('Reassemble Dom');

        resolve(this.reAssembleDom());
        
      });
    //}
  }

  /**
   * [onStart on start event]
   * @param  {Function} fn
   */
  onStart(fn){
    setTimeout(() => {
      if (this.instagram_debug) console.log('START!!!!');
      fn(1000);
    }, 500);
  }

}//class


