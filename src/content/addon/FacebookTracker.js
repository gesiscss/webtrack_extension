import Tracker from '../Tracker';
const md5 = require('md5');

export default class FacebookTracker extends Tracker{

  constructor(worker, privacy, extensionfilter=[]){
    super(worker, privacy);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.rootSearch = "#contentArea div[data-gt='{\"ref\":\"nf_generic\"}']";
    
    this.posts_seen = 0;
    this.posts_people_you_may_know = 0;
    this.posts_ignored = 0;
    this.posts_captured = 0;


    this.is_allowed = null;
    this.facebook_debug = false;
    this.facebook_events_debug = false;
    this.elements = [];
    this.elementStrings = '';
    this.trackedToolbarButtons = [];


    this.eventElements = {
      allowNotToTracked: ['#leftCol ._3ph1.sp_387n34yO1ZQ', '#fbProfileCover'],

      //articles: ['#content_container [role="main"] .userContentWrapper', '#contentArea [role="article"] div[role="article"][data-testid="fbarticle_story"]'],
      likearticleButton: [
          'div[aria-label="Like"]:not(.buofh1pr)', 
          'div[aria-label="Remove Like"]:not(.buofh1pr)', 
          'div[aria-label="לייק"]:not(.buofh1pr)', 
          'div[aria-label="הסרת לייק"]:not(.buofh1pr)'
          ],

      likeComment: [{
        query: '._6coi._6qw9 li:nth-child(1) a', 
        parent: ['._4eek[role="article"]', 'div'], 
        text: { parent: '._42ef', 
                query: '._72vr > span'},
        countComment: {parent: '._42ef', query: '._6cuq > span'}},{
          query: '.UFILikeLink.UFIReactionLink', 
          parent: '.UFIRow.UFIComment', 
          text: {
            parent: '.UFICommentContentBlock', 
            query: '.UFICommentBody'
          }, countComment: {
            parent: '.UFICommentContentBlock', 
            query: '.UFICommentReactionsBling > span'
          }
        }],
      commentButton: [
        '[aria-label="Leave a comment"]', 
        '[aria-label="השאר תגובה"]', 
        '._3hg-._42ft', 
        '.comment_link', 
        '._ipm._-56', 
        '.UFIPagerLink', 
        '._fmi._613v.UFIInputContainer'
      ],
      commentfields: [
        '[aria-label="Write a comment"]',
        '[aria-label="כתיבת תגובה"]',
        '._5rpu'
      ],
      commentFromCommentButton: [
        'form.o6r2urh6.l9j0dhe7.b3i9ofy5.e72ty7fz.qlfml3jp.inkptoze.qmr60zad.rt8b4zig.n8ej3o3l.agehan2d.sk4xxmp2.j83agx80.bkfpd7mw'
      ],
      shareButtonBevor: [
        'a._2nj7', 'a.share_action_link'
        ],
      shareButton: [
        'a._2nj7', 'a.share_action_link'
        ],
      joinGroup: [
      'a._42ft._4jy0._21ku._4jy4'
      ]
    };


    // the newsfeed and the public pages are treated differently
    this.is_newsfeed = false;
    this.is_public_page = false;
    this.is_profile = false;
    this.is_verified_page_or_profile = false;
    this.is_own_profile = false;


    this.public_arias = new Set([
      'Shared with Public', 'Shared with Public group',
      'Mit Öffentlich geteilt', 'Mit Öffentliche Gruppe geteilt']);

    this.public_alts = new Set([
      'Public', "Öffentlich"]);

    this.verified_arias = new Set([
      'Verified Account', 'Verified account',
      'Bestätigtes Konto']);

    this.custom_arias = new Set([
      'Shared with Custom', 
      'Mit Benutzerdefiniert geteilt']);

    // merge the two lists
    this.public_and_custom_arias = new Set([
      ...this.public_arias, 
      ...this.custom_arias]);

    this.people_you_may_know_arias = new Set([
      'People You May Know',
      'Personen, die du vielleicht kennst']);

    this.create_pages_arias = new Set([
      'Create Page',
      'Seite erstellen']);

    this.send_message_arias = new Set([
      'Message',
      'Nachricht senden']);

    this.lastUrlPath = '';

    this.startswith_allowlist = ['/spd/'];
    this.elite_accounts = new Set(['/spd/']);


    this.privacy_flags = {
    }


    this.logged_uid = null;
    this.logged_user_id = null;
    this.logged_username = null;
    this.username_from_url = null;
    this.logged_account_id = null;
    this.logged_fullname = null;
    this.logged_shortname = null;
    this.profile_id = null;

    this.reset_credentials();

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

  _is_newsfeed(path){

    // if it is landing page
    if (this.is_logged_in){
      if (!path.endsWith('/')){
        path = path + '/';
      }

      if (path == '/'){
        return true;
      }
    }

    return false;
  }


  get_is_sm_path_allowed(path){
    return true; //this.is_newsfeed || this.is_public_page || this.is_profile || this.is_verified_page_or_profile || !this.is_logged_in;
  }


  _is_public_page(){
    let candidates = document.querySelectorAll(['a[role][aria-label]']);

    for (let i = 0; i < candidates.length; i++) {
      if (this.create_pages_arias.has(candidates[i].getAttribute('aria-label'))){
        return true;
      }
    }

    return false;
  }


  _is_profile(){
    let candidates = document.querySelectorAll(['div[role=button][aria-label]']);

    for (let i = 0; i < candidates.length; i++) {
      if (this.send_message_arias.has(candidates[i].getAttribute('aria-label'))){
        return true;
      }
    }

    return false;
  }

  _is_verified_page_or_profile(){
    let icon_title = document.querySelector('h1 i[aria-label]');
    if (icon_title){
       if (this.verified_arias.has(icon_title.getAttribute('aria-label'))){
           return true;
       }
    }
    return false;
  }

  /**
   * [get_is_content_allowed check if url changed and search in dom if find some elements they not allowed and set this.allow]
   */
  get_is_content_allowed() {
    // the content is always allowed because the path of the URL will
    // be used to control for everything
    return true;
  }


  /**
   * get the id given an anchor element using the img of the anchor
   * @param  {Location} anchor html element (<a>)
   * @return {src} the user id that is taken from the id of the imate
   */
  get_user_id_from_img(location){
    if (location){
      let imgid = location.querySelector('img').getAttribute('id');
      if (imgid) {
        let imgid_parts = imgid.split('_');
        if (imgid_parts.length > 0){
          return imgid_parts[imgid_parts.length-1];
        }
      }
    }
    return null;
  }
  
  /**
   * Setup the credentials for the logged user (if any)
   */
  reset_credentials(){

    // try now with the credentials
    let credentials = this.get_credentials_from_scripts();
    if (credentials){
      if (this.logged_user_id == null){
        this.logged_user_id = credentials.USER_ID;
      }
      this.logged_account_id = credentials.ACCOUNT_ID;
      this.logged_fullname = credentials.NAME;
      this.logged_shortname = credentials.SHORT_NAME;
    }

    this.logged_username = this.get_logged_username_from_scripts();


    if (this.logged_username){
      this.logged_uid = this.logged_username;
    } else {
      this.logged_uid = this.logged_user_id;
    }

    // logged in
    if (this.logged_uid || credentials){
      this.is_logged_in = true;
      this.is_content_allowed = this.get_is_content_allowed();

    // not logged in
    } else {
      this.is_logged_in = false;
      this.is_content_allowed = true;
    }

    // check if it is the newsfeed page (cheap check)
    this.is_newsfeed = this._is_newsfeed(location.pathname);
    this.is_own_profile = this.logged_username == this.username_from_url;

    // check if this is a public page only if it is not the newsfeed
    // the check for public page might be heavy
    if (!this.is_newsfeed){
      this.is_public_page = this._is_public_page();
    } else {
      this.is_public_page = false;
    }

    // check if this is a profile page only if it is not the newsfeed
    // the check for public page might be heavy
    if (!this.is_newsfeed && !this.is_public_page){
      this.is_profile = this._is_profile();
    } else {
      this.is_profile = false;
    }

    // check if the page or profile are verified
    this.is_verified_page_or_profile = this._is_verified_page_or_profile()

    // check if the profile id parameter is in the url bar
    this.profile_id = this.get_profile_id_from_url(location);


    // is social media path allowed
    this.is_sm_path_allowed = this.get_is_sm_path_allowed(location.pathname);
    console.log('IS ALLOWED', location.pathname, this.is_sm_path_allowed);

    if(this.facebook_debug) {
      let style = '';
      if (this.is_verified_page_or_profile) {
        style += "border-top:7px solid green !important;";
      } else {
        style += "border-top:7px solid red !important;";
      }

      if (this.is_newsfeed) {
        style += "border-right:7px solid green !important;";
      } else {
        style += "border-right:7px solid red !important;";
      }

      if (this.is_public_page) {
        style += "border-bottom:7px solid green !important;";
      } else {
        style += "border-bottom:7px solid red !important;";
      }

      if (this.is_profile) {
        style += "border-left:7px solid green !important;";
      } else {
        style += "border-left:7px solid red !important;";
      }

      if (this.is_sm_path_allowed) {
        style += "outline:7px solid blue !important;";
      } else {
        style += "outline:7px solid red !important;";
      }
      let logo = document.querySelector('a');
      if (logo) {
        logo.setAttribute("style", style);
      }

    }
  }


  /**
  Load credentials (USER_ID, SHORT_NAME, NAME and ACCOUNT_ID) from the scripts 
  in Facebook returns a dictionary with the credentials
  **/  
  get_credentials_from_scripts() {
    try{
      let scripts = document.querySelectorAll('script:not([src])');
      for (var i = 0; i < scripts.length; i++) {
        let sc = scripts[i].textContent;
        if (sc.startsWith('requireLazy(["JSScheduler","ServerJS')) {
          return JSON.parse('{' + sc.match(/"USER_ID":".*?"|"SHORT_NAME":".*?"|"NAME":".*?"|"ACCOUNT_ID":".*?"/g).join(',') + '}');
        }
      }
    } catch(e){

    }

    return null;
  }


  /**
  Load the username from the scripts in Facebook
  returns a dictionary with the credentials
  **/  
  get_logged_username_from_scripts() {
    try{
      this.username_from_url = this.get_username_from_url(location);
      let scripts = document.querySelectorAll('script:not([src])');
      for (var i = 0; i < scripts.length; i++) {
        let sc = scripts[i].textContent;
        if (sc.startsWith('requireLazy(["Bootloader')) {
          let user_match = sc.match(/"username":".*?"/g);
          if (user_match){
            let username = JSON.parse('{' + user_match.join(',') + '}').username;
            // if the username in the url exist and it is different than the username
            // in the script, then return that one
            if (this.username_from_url && this.username_from_url != username){
              return username;
            } 
          }
        }
      }
      if (this.username_from_url){
        return this.username_from_url;
      }
    } catch(e){

    }

    return null;
  }


  /**
   * Comapare an anchor selector to the logged in user
   * @param  {target} html element
   * @param  {str} with the selector that will be compared to the logged user
   * @return {Boolean} if it is the same as the logged in user
   */
  is_link_same_as_logged_user(target, selector){
    if (this.logged_uid){

      let profile_uid = this.get_username_or_id_from_url(target.querySelector(selector));
      if (profile_uid){
        return this.logged_uid == profile_uid;
      }
    }
    return null;
  }


  /**
   * get the username or id given an anchor element
   * @param  {Location} anchor html element (<a>)
   * @return {[type]} the username or id found in the anchor elment
   */
  get_username_or_id_from_url(location){
    if (location) {
      let username = this.get_username_from_url(location);
      if (username) {
        return username;
      }

      return this.get_user_id(location);
    }
    return null;
  }

  /**
   * Get the username in an anchor
   * @param  {Location} html anchor (<a>) element in which the username will be searched
   * @return {str} the username
   */
  get_username_from_url(location){
    if (location && location.pathname) {
      let username = location.pathname.split('/');
      if (username.length > 1) {
        return username[1];
      }
    }
    return null;
  }

    /**
   * Get the profile id in an anchor
   * @param  {Location} html anchor (<a>) element in which the username will be searched
   * @return {str} the username
   */
  get_profile_id_from_url(location){
    return new URLSearchParams(location.search).get('profile_id');
  }

  /**
   * Get the id of the user in an anchor
   * @param  {Location} html anchor (<a>) element in which the id will be searched
   * @return {str} the id
   */
  get_user_id(location){
    if (location) {
      let id = this.findGetParameter('id', location.search);
      return id;
    }
    return null;
  }

  /**
   * [_getValues return values of article]
   * @param  {Object} target
   * @return {Array}
   */
  _getValues(target){
    let search = [
      {
        name: 'webtracker-article-id',
        default: undefined,
      },
      {
        name: 'article-time',
        query: ['._5ptz'],
        default: undefined,
        filter: e => e.getAttribute('title')
      },
      {
        name: 'article-link',
        query: ['.oajrlxb2.g5ia77u1.qu0x051f.esr5mh6w.e9989ue4.r7d6kgcz.rq0escxv.nhd2j8a9.nc684nl6.p7hjln8o.kvgmc6g5.cxmmr5t8.oygrvhab.hcukyx3x.jb3vyjys.rz4wbd8a.qt6c0cv9.a8nywdso.i1ao9s8h.esuyzwwr.f1sip0of.lzcic4wl.gmql0nx0.gpro0wi8.b1v8xokw'],
        default: undefined,
        filter: e => e.getAttribute('href').split('?')[0]
      },
      {
        name: 'article-headertext',
        query: ['.kvgmc6g5.cxmmr5t8.oygrvhab.hcukyx3x.c1et5uql.ii04i59q'],
        default: undefined,
        filter: e => e.textContent
      },
      {
        name: 'article-publisher-name',
        query: ['h4 a span'],
        default: undefined,
        filter: e => e.textContent
      },
      {
        name: 'article-count-likes',
        query: ['.gpro0wi8.cwj9ozl2.bzsjyuwj.ja2t1vim'],
        default: undefined,
        filter: e => {
          let re = /\b(\d+\.?\d*)(K?)\b/g;
          const matches = e.textContent.match(re);
          console.log(matches);
          if (matches === null) {
            return 1;
          } else {
            let lastElement = matches[matches.length -1];
            if (lastElement.charAt(lastElement.length-1) == 'K') {
              return parseFloat(lastElement.slice(0, -1))*1000;
            } else {
              return parseInt(lastElement);
            }
          }
        } 
      },
      {
        name: 'article-count-comments',
        query: ['.gtad4xkn > .oajrlxb2.g5ia77u1.qu0x051f.esr5mh6w.e9989ue4.r7d6kgcz.rq0escxv.nhd2j8a9.nc684nl6.p7hjln8o.kvgmc6g5.cxmmr5t8.oygrvhab.hcukyx3x.jb3vyjys.rz4wbd8a.qt6c0cv9.a8nywdso.i1ao9s8h.esuyzwwr.f1sip0of.lzcic4wl.l9j0dhe7.abiwlrkh.gpro0wi8.dwo3fsh8.ow4ym5g4.auili1gw.du4w35lb.gmql0nx0'],
        default: undefined,
        filter: e => {
          let num = e.textContent.split(' ')[0];
          if (num.charAt(num.length-1) == 'K') {
            return parseFloat(num.slice(0, -1))*1000;
          } else {
            return parseInt(num);
          }
        }
      },
      {
        name: 'article-count-shares',
        query: ['.gtad4xkn > .tojvnm2t.a6sixzi8.abs2jz4q.a8s20v7p.t1p8iaqh.k5wvi7nf.q3lfd5jv.pk4s997a.bipmatt0.cebpdrjk.qowsmv63.owwhemhu.dp1hu0rb.dhp61c6y.iyyx5f41'],
        default: undefined,
        filter: e => {
          let num = e.textContent.split(' ')[0];
          if (num.charAt(num.length-1) == 'K') {
            return parseFloat(num.slice(0, -1))*1000;
          } else {
            return parseInt(num);
          }
        }
      },
      {
        name: 'article-count-contentType',
        default: undefined,
        query: ['._3x-2'],
        filter: e => {
          if(e.querySelectorAll('a[target="_blank"][rel="noopener nofollow"]').length>0){
            return 'link';
          }else if(e.querySelectorAll('a._4-eo').length>0){
            return 'picture';
          }else if(e.querySelectorAll('video').length>0){
            return 'video';
          }
          return 'message';
        }
      }
    ],
    values = [];
    for (let s of search) {
      try {
        let value = s.default;
        if (s.name == 'webtracker-article-id') {
          value = target.getAttribute('webtracker-article-id');
        } else {
          for (let query of s.query) {
            var r = target.querySelectorAll(query);
            if(r.length>0){
              r = r[0];
              let data = s.filter(r);
              if(data!=null) value = data;
            } else if (s.name == 'article-count-comments' || s.name == 'article-count-shares' || s.name == 'article-count-likes') {
              value = 0;
            }
          }//for
        }
        values.push({name: s.name, value: value})
      } catch (err) {
        console.log(err);
        console.log(target, err.toString());
      }
    }//for
    return values;
  }

  is_verified(target){
    let verified_icon = target.querySelector(["span > div > span > i[aria-label]", "h2 span span > i[aria-label]"]);
    if (verified_icon && this.verified_arias.has(verified_icon.getAttribute('aria-label'))){
      return true;
    }
    return false;
  }

  _is_public_or_custom_verified(aria_label, target){
    if (this.public_arias.has(aria_label)) {
      return true;
    } else if (this.custom_arias.has(aria_label)){
      if (this.is_verified(target)){
        return true;
      }
    }
    return false;
  }


  /**
   * [_isPublicArticle checks if element is for the public oder private]
   * @param  {Object}  target [DomElement]
   * @return {Boolean}
   */
  _isPublicArticle(target){

    // check if the icon has a public aria label
    let privacy_icon = target.querySelector(":not(h2) > span > span > span > i");
    if (privacy_icon){
      let aria_label = privacy_icon.getAttribute('aria-label');

      if (aria_label) {

        // WARNING: the order of ifs are important, make sure that 
        // is_verified_page_or_profile takes precedence
        if (this.is_newsfeed) {
          if (this._is_public_or_custom_verified(aria_label, target)){
            return true;
          }
        } else if (this.is_verified_page_or_profile){
          if (this.public_and_custom_arias.has(aria_label)) {
            return true;
          }
        } else if (this.is_public_page){
          if (this.public_and_custom_arias.has(aria_label)) {
            return true;
          }
        // this must go after this.is_verified_page_or_profile
        } else if (this.is_profile){
          if (this._is_public_or_custom_verified(aria_label, target)){
            return true;
          }
        } else if (this.is_own_profile){
          if (this.public_arias.has(aria_label)){
            return true;
          }
        } else {
          if (this._is_public_or_custom_verified(aria_label, target)){
            return true;
          }
        }
      }
    }



    // check if the icon has a public aria label
    privacy_icon = target.querySelector("div > div > img");
    if (privacy_icon){
      let alt_label = privacy_icon.getAttribute('alt');
      if (alt_label) {
        if (this.public_alts.has(alt_label)) {
          return true;
        }
      }
    }

    return false;
  }



  /**
   * [_isPeopleYouMayKnowArticle check if it is a people you may know article]
   * @param  {Object}  target [DomElement]
   * @return {Boolean}
   */
  _isPeopleYouMayKnowArticle(target){

    // check if the icon has a public aria label
    let element = target.querySelector('[role^=region]');
    if (element){
      let aria_label = element.getAttribute('aria-label');
      if (aria_label && this.people_you_may_know_arias.has(aria_label)) {
        return true;
      }
    }

    return false;
  }




  /**
   * [_isPrivate checks if element is for the public or private]
   * @param  {Object}  target [DomElement]
   * @return {Boolean}
   */
  _isPrivate(target){
    //let a_list = target.querySelectorAll('.fwn.fcg a');
    let a_list = target.querySelectorAll('.sx_94649f');    
    let c = 0;
    for (let a in a_list.length) {
      let attr = a_list[a].getAttribute("data-hovercard");
      if(attr != null && attr.indexOf('user') > 0){
        c++;
      }
    }
    return c==0 && a_list.length > 0;
  }


  /**
   * [_getPublicArticels return elements of public articles]
   * @return {Array} found
   */
  _getPublicArticels(){

    // if it is not the newsfeed or the public page, there is nothing
    // to do here, get out. 
    // if (!this.is_newsfeed && !this.is_public_page  && !this.is_profile && !this.is_verified_page_or_profile){
    //   return [];
    // }

    let bucket = [];
    //for (let query of this.eventElements.articles) {
    //let found = document.querySelectorAll('.userContentWrapper:not(.tracked), div[role="article"]:not(.tracked)');
    let found = document.querySelectorAll('[role="article"][aria-describedby]:not(.tracked)');
    this.posts_seen += found.length;

    let length = found.length;
    for (var i = 0; i < length; i++) {

      found[i].classList.add('tracked');
      found[i].setAttribute('webtracker-article-id', Math.random());
      if (this._isPublicArticle(found[i])){
        this.posts_captured += 1;
        if(this.facebook_debug) found[i].setAttribute("style", "border:3px solid green !important;");


        // This have not been tested since April 2021:
        //this._setLikeEvent(found[i]);
        //this._setCommentEvent(found[i]);
        //this._eventcommentFromCommentButton(found[i]);

        // This has not been tested since 2020
        //this._setLikeCommentEvent(found[i]); //haven't been fixed and currently unsupported
        //this._setShareEvent(found[i]);  //currently unsupported and not working
        bucket.push(found[i])
      }else{
        if (this._isPeopleYouMayKnowArticle(found[i])){
          this.posts_people_you_may_know += 1;
          if(this.facebook_debug) found[i].setAttribute("style", "border:3px solid yellow !important;");
        } else {
          this.posts_ignored += 1;

          if(this.facebook_debug) found[i].setAttribute("style", "border:3px solid red !important;");
        }
      }
    }


    //return bucket.filter(e => e!=undefined);
    return bucket;
  }

  /**
   * [_setCommentEvent set event handling of comment button fields]
   * @param {Object} article
   */
  _setCommentEvent(article){
    setTimeout(()=>{
      for (let query of this.eventElements.commentButton) {
        let commentButtons = article.querySelectorAll(query+':not(.tracked)');
        for (var i = 0; i < commentButtons.length; i++) {
          commentButtons[i].classList.add('tracked');
          if(this.facebook_debug) commentButtons[i].setAttribute("style", "border:3px solid yellow !important;");
          commentButtons[i].addEventListener('click', () => {
            this._eventComment(article, comment => {
              this.eventFn.onEvent(
                {
                  event: 'comment',
                  type: 'article',
                  values: this._getValues(article).concat([
                    {name: 'comment', value: comment},
                  ])
                }
              )
            });
            this._eventcommentFromCommentButton(article);
            this._setLikeCommentEvent(article, 100);
            // this._setCommentEvent(article);
          })
        }
      }
    }, 1000);
  }

  /**
   * [_eventcommentFromCommentButton set event handling for comment from some comment field]
   * @param {Object} article
   * @param  {Number} timeout [default: 1000]
   */
  _eventcommentFromCommentButton(article, timeout=1000){
    setTimeout(()=>{
      for (let query of this.eventElements.commentFromCommentButton) {
        let commentButtons = article.querySelectorAll(query+':not(.tracked)');
        for (var i = 0; i < commentButtons.length; i++) {
          commentButtons[i].classList.add('tracked');
          if(this.facebook_debug) commentButtons[i].setAttribute("style", "border:3px solid red !important;");
          commentButtons[i].addEventListener('click', e => {
            setTimeout(()=>{
              this._eventComment(article, comment => {
                // console.log(found, comment);
                this.eventFn.onEvent(
                  {
                    event: 'comment',
                    type: 'postanswer',
                    values: this._getValues(article).concat([
                      {name: 'comment', value: comment},
                      //{name: 'postanswer-count-likes', value: null},
                      //{name: 'postanswer-text', value: null}
                    ])
                  }
                )
                //if(this.facebook_debug) console.log('commtent  '+comment+' auf comment '+ text);
              }, 0);

            }, 500);
          })
        }

      }//for commentFromCommentButton
    }, timeout)
  }

  /**
   * [_eventComment set keyup event to elements for write some comment]
   * @param  {Object} article
   * @param  {Function} fn      [default: ()=>{}]
   * @param  {Number} timeout   [default: 1000]
   */
  _eventComment(article, fn=()=>{}, timeout=1000){
    setTimeout(()=>{
      for (let query of this.eventElements.commentfields) {
        let commentfields = article.querySelectorAll(query+':not(.tracked)');
        for (var i = 0; i < commentfields.length; i++) {
          commentfields[i].classList.add('tracked');
          if(this.facebook_debug) commentfields[i].setAttribute("style", "border:3px solid pink !important;");
          commentfields[i].addEventListener('keydown', e => {
            let spans =  e.srcElement.querySelectorAll('span[data-text="true"]');
            if(spans.length>0){
              let comment = spans[spans.length-1].textContent;
              if(this.facebook_events_debug) fn('TEST '+comment);
              if(e.keyCode==13){
                //if(this.facebook_debug) console.log('comment', comment);
                fn(comment);
              }
            }
          })
        }//for
      }//for
    }, timeout);
  }

  /**
   * [_setShareEvent set the share event]
   * @param {Object}  article
   * @param {Boolean} after  [default: false]
   */
  _setShareEvent(article, after=false){
    let findShareButton = () => {
      let shareButton = document.querySelectorAll('[aria-label="Send this to friends or post it on your timeline."]:not(.tracked)');
      setTimeout(()=>{
        for (var i = 0; i < shareButton.length; i++) {
          shareButton[i].classList.add('tracked');
          if(this.facebook_debug) shareButton[i].setAttribute("style", "border:3px solid red !important;");
          let shares = shareButton[i].querySelectorAll('ul li a:not(.tracked)');
          for (var i = 0; i < shares.length; i++) {
            shares[i].classList.add('tracked');
            if(this.facebook_debug) shares[i].setAttribute("style", "border:3px solid red !important;");
            shares[i].addEventListener('click', e => {
              this.eventFn.onEvent(
                {
                  event: 'share',
                  type: 'article',
                  values: this._getValues(article).concat([
                    {name: 'choice', value: e.srcElement.textContent},
                  ])
                }
              )
              //console.log('share', e.srcElement.textContent);
            });
            if(this.facebook_events_debug) shares[i].addEventListener('mouseover', e => {
              this.eventFn.onEvent(
                {
                  event: 'share',
                  type: 'postanswer',
                  values: this._getValues(article).concat([
                    {name: 'value', value: e.srcElement.textContent},
                  ])
                }
              )
            });
          }
        }
      }, 500)
    }
    setTimeout(()=>{
      for (let query of this.eventElements.shareButtonBevor) {
        let shares = article.querySelectorAll(query+':not(.tracked)');
        for (let i = 0; i < shares.length; i++) {
          shares[i].classList.add('tracked');
          if(this.facebook_debug) shares[i].setAttribute("style", "border:3px solid red !important;");
          if(after==false){
            if(this.facebook_events_debug) shares[i].addEventListener('mouseover', e => {
              setTimeout(()=>this._setShareEvent(article, true), 100)
            })
          }
          shares[i].addEventListener('click', e => {
            setTimeout(()=> findShareButton(), 500);
          })
        }//for
      }//for
    }, 500)
  }

  /**
   * [getValueOfLikeNumber translate name of number from like event]
   * @param  {Number} nr
   * @return {String}
   */
  getValueOfLikeNumber(nr){
    let value = '';
    switch (nr) {
      case 1: value = 'like'; break;
      case 2: value = 'love'; break;
      case 3: value = 'wow'; break;
      case 4: value = 'haha'; break;
      case 7: value = 'sad'; break;
      case 8: value = 'angry'; break;
      case 16: value = 'care'; break;
      default:
        value = 'unkown';
    }
    return value;
  }

  /**
   * [_setLikeCommentEvent set like Event for comment like Button]
   * @param {Object}  article
   * @param  {Number} timeout [default: 100]
   */
  _setLikeCommentEvent(article, timeout=0){
    setTimeout(() => {
      for (let s of this.eventElements.likeComment) {
        let buttons = article.querySelectorAll(s.query);
        for (var i = 0; i < buttons.length; i++) {
          if(this.facebook_debug) buttons[i].setAttribute("style", "border:3px solid red !important;");
          buttons[i].addEventListener('click', e => {
            let text = this.getParentElement(e.srcElement, s.text.parent).querySelectorAll(s.text.query)[0].textContent;
            let count = 0,
            countElements = this.getParentElement(e.srcElement, s.countComment.parent).querySelectorAll(s.countComment.query);
            if(countElements.length>0) count = parseInt(countElements[0].textContent, 10);
            

            if (buttons[i].classList.contains('_3_16')){
              this.eventFn.onEvent({
                  event: 'undo',
                  type: 'postanswer',
                  values: this._getValues(article).concat([
                    {name: 'reaction-value', value: 'undo'},
                    {name: 'postanswer-count-likes', value: count},
                    {name: 'postanswer-text', value: text}
                  ])
              });
            } else {
              this.eventFn.onEvent({
                  event: 'like',
                  type: 'postanswer',
                  values: this._getValues(article).concat([
                    {name: 'like-value', value: this.getValueOfLikeNumber(1)},
                    {name: 'postanswer-count-likes', value: count},
                    {name: 'postanswer-text', value: text}
                  ])
              });
            }

            //if(this.facebook_debug) console.log('like comment 1 text => ', text);
          })
          buttons[i].addEventListener('mouseover', e => {
            let text = this.getParentElement(e.srcElement, s.text.parent).querySelectorAll(s.text.query)[0].textContent;
            let count = 0,
            countElements = this.getParentElement(e.srcElement, s.countComment.parent).querySelectorAll(s.countComment.query);
            if(countElements.length>0){
              count = parseInt(countElements[0].textContent, 10);
            }
            this._toolbarHandler(nr => {
              this.eventFn.onEvent(
                {
                  event: 'reaction',
                  type: 'postanswer',
                  values: this._getValues(article).concat([{
                     name: 'reaction-value', 
                     value: nr['data_reaction'],
                     aria_label: nr['aria_label'],
                     reaction: this.getValueOfLikeNumber(nr['data_reaction'])
                    },
                    {
                      name: 'postanswer-count-likes', 
                      value: count
                    },{
                      name: 'postText', 
                      value: text
                    }
                  ])
                }
              )
              // console.log('like comment '+nr+' text => ', text);
            })
          })
        }
      }
    }, timeout)
  }

  /**
   * [_setLikeEvent like event]
   * @param {Object}  article
   */
  _setLikeEvent(article){
    setTimeout(() => {
      for (let query of this.eventElements.likearticleButton) {
        let buttons = article.querySelectorAll(query);
        for (var i = 0; i < buttons.length; i++) {
          if(this.facebook_debug) buttons[i].setAttribute("style", "border:3px solid purple !important;");
          let button = buttons[i];
          button.addEventListener('click', e =>{
            if (button.getAttribute('aria-label') === 'Remove Like'){
              this.eventFn.onEvent({
                event: 'undo',
                type: 'article',
                values: this._getValues(article).concat([
                  {name: 'reaction-value', value: 'undo'}
                ])
              });
            } else {
              this.eventFn.onEvent({
                event: 'like',
                type: 'article',
                values: this._getValues(article).concat([
                  {name: 'like-value', value: this.getValueOfLikeNumber(1)}
                ])
              })
            }

            //if(this.facebook_debug) console.log('like 1', article);
          })

          buttons[i].addEventListener('mouseenter', ()=> {
            setTimeout(() => {
                // console.log(this._getValues(article));
                let toolbar = document.querySelector('div.j83agx80[role="toolbar"]');
                let button = toolbar.querySelector('div')
                button.addEventListener('click', e =>{
                  if ((button.getAttribute('aria-label') === 'לייק') || (button.getAttribute('aria-label') === 'Like')){
                    this.eventFn.onEvent({
                      event: 'like',
                      type: 'article',
                      values: this._getValues(article).concat([
                        {name: 'like-value', value: this.getValueOfLikeNumber(1)}
                      ])
                    })
                  }
              })
            }, 700)
          })
        }
      }
    }, 0)
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
      this.privacy_flags['has_user_id'] = true;
    } else {
      this.privacy_flags['has_user_id'] = false;
    }

    if (this.logged_username) {
      anonym['username'] = this.logged_username;
      this.privacy_flags['has_username'] = true;
    } else {
      this.privacy_flags['has_username'] = false;
    }

    if (this.logged_account_id) {
      anonym['account_id'] = this.logged_account_id;
      this.privacy_flags['has_account_id'] = true;
    } else {
      this.privacy_flags['has_account_id'] = false;
    }

    if (this.profile_id) {
      anonym['profile_id'] = this.profile_id;
      this.privacy_flags['has_profile_id'] = true;
    } else {
      this.privacy_flags['has_profile_id'] = false;
    }

    if (this.logged_fullname) {
      anonym['fullname'] = this.logged_fullname;
      this.privacy_flags['has_fullname'] = true;
    } else {
      this.privacy_flags['has_fullname'] = false;
    }
    if (this.logged_shortname) {
      anonym['shortname'] = this.logged_shortname;
      this.privacy_flags['has_shortname'] = true;
    } else {
      this.privacy_flags['has_shortname'] = false;
    }

    this.privacy_flags['is_profile'] = this.is_profile;
    this.privacy_flags['is_own_profile'] = this.is_own_profile;
    this.privacy_flags['is_newsfeed'] = this.is_newsfeed;
    this.privacy_flags['is_public_page'] = this.is_public_page;
    this.privacy_flags['is_verified_page_or_profile'] = this.is_verified_page_or_profile;
    this.privacy_flags['is_logged_in'] = this.is_logged_in;



    metadata['anonym'] = anonym;
    metadata['privacy_flags'] = this.privacy_flags;

    console.log('METADATA:', metadata);

    return metadata;

  }

  /**
   * [_toolbarHandler event for reaction of smileys]
   * @param  {Function} fn [default: ()=>{}]
   */
  _toolbarHandler(fn=()=>{}){
    let remove = () => {
      let length = this.trackedToolbarButtons.length || 0
      for (let b = 0; b < length; b++) {
        this.trackedToolbarButtons[b].classList.remove("tracked");
        if(this.facebook_debug) this.trackedToolbarButtons[b].setAttribute("style", "border: green");
        this.trackedToolbarButtons[b].onclick = e => {};
        //this.trackedToolbarButtons[b].onmouseover = e => {};
        delete this.trackedToolbarButtons[b];
      }
      this.trackedToolbarButtons = this.trackedToolbarButtons.filter(e => e!= undefined);
    }

    let fetch = layer => {
      let buttons = layer.querySelectorAll('[aria-label="Reactions"]:not(.tracked)');
      for (let a = 0; a < buttons.length; a++) {
        buttons[a].classList.add('tracked');
        this.trackedToolbarButtons.push(buttons[a]);
        if(this.facebook_debug) buttons[a].setAttribute("style", "border:3px solid blue !important;");
        buttons[a].onclick = e => {
          //if(this.facebook_debug) console.log('click', e.srcElement.parentElement.getAttribute("data-reaction"));
          fn({
            arial_label: e.srcElement.parentElement.parentElement.getAttribute("aria-label"),
            data_reaction: parseInt(e.srcElement.parentElement.getAttribute("data-reaction"), 10)
          })
        }
        // if(this.facebook_events_debug) buttons[a].onmouseover = e =>{
        //   console.log('mouseOver');
        //   layer.stop();
        //   fn(parseInt(e.srcElement.parentElement.getAttribute("data-reaction"), 10))
        // }
      }
    }


    setTimeout(() =>{
        let layer = document.querySelectorAll('.uiLayer div[role="toolbar"]');
        for (let i = 0; i < layer.length; i++) {
          if(this.facebook_debug) layer[i].setAttribute("style", "border:3px solid red !important;");
          layer[i].timeouts = [];
          layer[i].timeouts.push(setTimeout(()=>{
            //if(this.facebook_debug) console.log('START REMOVE');
            if(this.facebook_debug) layer[i].setAttribute("style", "border: none");
            remove();
          }, 2000))
          //if(this.facebook_debug) console.log('start=>', layer[i].timeouts);
          layer[i].stop = () => {
            for (let c in layer[i].timeouts) {
              if(typeof layer[i].timeouts[c] == 'number'){
                clearTimeout(layer[i].timeouts[c]);
                delete layer[i].timeouts[c];
              }
            }
            layer[i].timeouts = layer[i].timeouts.filter(e => e!= undefined);
            //if(this.facebook_debug) console.log('STOP', layer[i].timeouts);
          }
          layer[i].onmouseleave = e => {
            layer[i].stop();
            layer[i].timeouts.push(setTimeout(()=>{
              if(this.facebook_debug) layer[i].setAttribute("style", "border: none");
              remove();
            }, 1100));
          }
          layer[i].onmouseover = e => {
            layer[i].stop();
            fetch(layer[i])
          }
          fetch(layer[i])
        }//for layer
    }, 1000)
  }


  /**
   * [getDom return html content from public article]
   * @return {String}
   */
  async getDom(){
    return new Promise(async (resolve, reject) => {
      try {      
        let found = this._getPublicArticels();

        // if no entries were found, then this is not a timeline or profile page
        if (this.posts_seen== 0) {
          // if the user is not logged in, then default to the normal tracker
          if (!this.is_logged_in){
            resolve(this._getDom());
          } else {
            resolve('<html><head></head><body>No entries found</body></html>');
          }

        // otherwise, the dom can be assembled
        } else {
          for (var i = 0; i < found.length; i++) {
            let cloned = found[i].cloneNode(true);
             //is this being used anywhere? No, but could be used for the comments?
            this.elements.push(found[i]);
            this.elementStrings += cloned.outerHTML
          }
          resolve('<html posts_seen="'+this.posts_seen+
            '" posts_people_you_may_know="'+this.posts_people_you_may_know+
            '" posts_ignored="'+this.posts_ignored+
            '" posts_captured="'+this.posts_captured+
            '" ><head></head><body>'
            +this.elementStrings+'</body>'+'</html>');
        }

      } catch (err) {
        reject(err)
      }
    });
  }

  /**
   * [onStart on start event]
   * @param  {Function} fn
   */
  onStart(fn){
    setTimeout(() => {
      //if(this.facebook_debug) console.log('START!!!!');
      fn(2500);
    }, 1000);
  }

}
