
import Tracker from '../Tracker';

export default class InstagramTracker extends Tracker{

  constructor(worker, privacy, extensionfilter=[]){
    super(worker, privacy);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.is_allowed = null;
    this.instagram_debug = false;

    this.svg_account = 'a path[d="M24 27c-7.1 0-12.9-5.8-12.9-12.9s5.8-13 12.9-13c7.1 0 12.9 5.8 12.9 12.9S31.1 27 24 27zm0-22.9c-5.5 0-9.9 4.5-9.9 9.9s4.4 10 9.9 10 9.9-4.5 9.9-9.9-4.4-10-9.9-10zm20 42.8c-.8 0-1.5-.7-1.5-1.5V42c0-5-4-9-9-9h-19c-5 0-9 4-9 9v3.4c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5V42c0-6.6 5.4-12 12-12h19c6.6 0 12 5.4 12 12v3.4c0 .8-.7 1.5-1.5 1.5z"]';

    this.svg_share = 'path[d="M46.5 3.5h-45C.6 3.5.2 4.6.8 5.2l16 15.8 5.5 22.8c.2.9 1.4 1 1.8.3L47.4 5c.4-.7-.1-1.5-.9-1.5zm-40.1 3h33.5L19.1 18c-.4.2-.9.1-1.2-.2L6.4 6.5zm17.7 31.8l-4-16.6c-.1-.4.1-.9.5-1.1L41.5 9 24.1 38.3z"]';
    this.svg_like = 'path[d="M34.3 3.5C27.2 3.5 24 8.8 24 8.8s-3.2-5.3-10.3-5.3C6.4 3.5.5 9.9.5 17.8s6.1 12.4 12.2 17.8c9.2 8.2 9.8 8.9 11.3 8.9s2.1-.7 11.3-8.9c6.2-5.5 12.2-10 12.2-17.8 0-7.9-5.9-14.3-13.2-14.3zm-1 29.8c-5.4 4.8-8.3 7.5-9.3 8.1-1-.7-4.6-3.9-9.3-8.1-5.5-4.9-11.2-9-11.2-15.6 0-6.2 4.6-11.3 10.2-11.3 4.1 0 6.3 2 7.9 4.2 3.6 5.1 1.2 5.1 4.8 0 1.6-2.2 3.8-4.2 7.9-4.2 5.6 0 10.2 5.1 10.2 11.3 0 6.7-5.7 10.8-11.2 15.6z"]';

    this.div_fullname = '.f5Yes.oL_O8';
    this.span_heart = 'section span.fr66n';
    this.span_comment = 'section span._15y0l';
    this.span_share = 'section span.glyphsSpriteDirect__outline__24__grey_9';
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

    this.privacy_flags = {
      'is_logged_in': null,
      'is_my_profile': null,
      'public': null,
      'has_like': null,
      'user_id': null,
      'username': null,
      'profile_pic_url': null,
      'fullname': null,
      'profile_pic_url_hd': null,
    }

    this.startswith_denylist = ['/accounts/', '/settings/', '/emails/settings/', '/session/login_activity/', '/emails/emails_sent/'];

    this.pos_2nd_denylist = [ 'followers', 'following', 'saved', 'tagged'];
  }


  /**
   * Setup the credentials for the logged user (if any)
   */
  reset_credentials(){
    
    try {
      this.credentials = this.get_credentials();
      this.logged_username = this.credentials.config.viewer.username;
      this.is_logged_in = true;
      this.logged_fullname = this.credentials.config.viewer.full_name;
      this.logged_user_id = this.credentials.config.viewer.id;          
      this.profile_pic_url = this.credentials.config.viewer.profile_pic_url;
      this.profile_pic_url_hd = this.credentials.config.viewer.profile_pic_url_hd;
      this.is_private = this.credentials.config.viewer.is_private;
    } catch (error){
      let svg_account = this.get_svg_account();
      this.logged_username = this.get_username(svg_account);
      this.logged_fullname = this.get_fullname();
      if (this.logged_fullname || this.logged_fullname){
        this.is_logged_in = true;
      } else {        
        this.is_logged_in = this._isLogged(svg_account);
      }
    }

    if (this.is_logged_in){
      this.privacy_flags['is_logged_in'] = true;
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
        this.privacy_flags['is_my_profile'] = true;
        this.is_my_profile = true;
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
      this.privacy_flags['user_id'] = true;
    }

    if (this.logged_username) {
      anonym['username'] = this.logged_username;
      this.privacy_flags['username'] = true;
    }

    if (this.profile_pic_url) {
      anonym['profile_pic_url'] = this.profile_pic_url;
      this.privacy_flags['profile_pic_url'] = true;
    }

    if (this.logged_fullname) {
      anonym['fullname'] = this.logged_fullname;
      this.privacy_flags['fullname'] = true;
    }

    if (this.profile_pic_url_hd) {
      anonym['profile_pic_url_hd'] = this.profile_pic_url_hd;
      this.privacy_flags['profile_pic_url_hd'] = true;
    }

    metadata['anonym'] = anonym;
    metadata['privacy_flags'] = this.privacy_flags;

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
        return JSON.parse(sc.substring(sc.indexOf('{'), sc.indexOf('};') + 1));
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
      if (this.instagram_debug) console.log('not logged in');
      return true;
    }

    if (this.is_explore){
      if (this.instagram_debug) console.log('is explore');
      return true;
    }

    if (this.is_profile){
      if (this.instagram_debug) console.log('is profile');
      return true;
    }


    // check that the like icon is of svg type (it is then likely tha the
    // svg is the way of controlling for public posts)
    if (target.querySelector(this.svg_like)) {
      if (this.instagram_debug) console.log('it has svg_like icon');
      this.privacy_flags['has_like'] = true;
      // if the protected svg appear in the tweet, the content is private
      if (target.querySelector(this.svg_share)) {
        if (this.instagram_debug) console.log('is share');
        this.privacy_flags['public'] = true;
        return true;
      } else {
        if (this.instagram_debug) console.log('it is private (no share icon)');
        return false;
      }
    } 

    if (this.instagram_debug) console.log('is public (assumption)');
    return true;

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
    if (this.instagram_debug) console.log('-> addPublicArticles()')
    
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

  __getDom(){
    // this needs to be overwritten in instagram because removing scripts breaks the 
    // SVGs and then it is not possible to detect if posts are private
    return document.documentElement.cloneNode(true);

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
      let timeline_body = dom.querySelector(this.article);
      if (timeline_body && timeline_body.parentNode){
        timeline_body = timeline_body.parentNode;
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
      fn(1500);
    }, 1000);
  }

}//class


