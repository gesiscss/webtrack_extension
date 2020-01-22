import Tracker from '../Tracker';

export default class FacebookTracker extends Tracker{

  constructor(worker, privacy, extensionfilter=[]){
    super(worker, privacy);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.rootSearch = "#contentArea div[data-gt='{\"ref\":\"nf_generic\"}']";

    this.is_allowed = null;
    this.facebook_debug = false;
    this.facebook_events_debug = false;
    this.elements = [];
    this.elementStrings = '';
    this.trackedToolbarButtons = [];
    this.eventElements = {
      allowNotToTracked: ['#leftCol ._3ph1.sp_387n34yO1ZQ', '#fbProfileCover'],
      articels: ['#content_container [role="main"] .userContentWrapper', '#contentArea [role="articel"] div[role="articel"][data-testid="fbarticel_story"]'],
      likearticelButton: ['a._6a-y._3l2t._18vj', '.UFILikeLink:not(.UFIReactionLink)'],
      likeComment: [
        {query: '._6coi._6qw9 li:nth-child(1) a', parent: ['._4eek[role="articel"]', 'div'], text: {parent: '._42ef', query: '._72vr > span'}, countComment: {parent: '._42ef', query: '._6cuq > span'}},
        {query: '.UFILikeLink.UFIReactionLink', parent: '.UFIRow.UFIComment',  text: {parent: '.UFICommentContentBlock', query: '.UFICommentBody'}, countComment: {parent: '.UFICommentContentBlock', query: '.UFICommentReactionsBling > span'}}
      ],
      commentButton: ['._666h._18vj._18vk._42ft', '._3hg-._42ft', '.comment_link', '._ipm._-56', '.UFIPagerLink', '._fmi._613v.UFIInputContainer'],
      commentfields: ['._5rpu'],
      commentFromCommentButton: [
        {query: '._6coi._6qw9 li:nth-child(2) a', nextElement: ['._4eek[role="articel"]', 'div'], text: {query: '._72vr > span'}, countComment: {query: '._6cuq > span'}},
        {query: '._2h2j > div', previousElement: ['._2h2j', 'div'],  text: {query: '._72vr > span'}, countComment: {query: '._6cuq > span'}},
        {query: '.UFIReplyLink', nextElement: '.UFIRow.UFIComment',  text: {query: '.UFICommentBody'}, countComment: {query: '.UFISutroLikeCount'}},
        {query: '.UFIReplyList > div', previousElement: '.UFIReplyList',  text: {query: '.UFICommentBody'}, countComment: {query: '.UFISutroLikeCount'}},
      ],
      shareButtonBevor: ['a._2nj7', 'a.share_action_link'],
      shareButton: ['a._2nj7', 'a.share_action_link'],
      joinGroup: ['a._42ft._4jy0._21ku._4jy4']
    };
    this.documentHead = '';

    this.lastUrlPath = '';

    if(this.allow){
      this._joinGroup();
      this.documentHead = this._getHead();
      // console.log(this.documentWrapper);
    }

    this.startswith_blacklist = [
     '/ads/activity/', '/crisisresponse/', '/events/', '/friends/', 
     '/gaming/', '/jobs/', '/marketplace/', '/memories/', 
     '/messages/', '/notifications/', '/offers/', '/photo/', '/recommendations/', 
     '/saved/',  '/settings/'];

    this.startswith_whitelist = ['/pg/']

    this.pos_2nd_blacklist = ['about', 'archive', 'events', 'films', 'followers', 
      'following', 'friends_all', 'friends_college', 'friends_current_city', 'friends', 'friends_hometown', 
      'friends_mutual', 'friends_with_upcoming_birthdays', 'games', 'likes', 'music', 
      'notes', 'photos', 'reviews', 'sports']

    this.blocked = new Set(['-51px -298px', '-19px -314px', '0 -21px']);

    this.public_map = {
      // public
      'rfZj1qaBrro.png': '-39px -300px',
    }
    this.blocked_map = {
      // friends
      'vtaY25qSQy-.png': '0px -101px',
      // only me (all of the user is public)
      // 'JTNOKcsLgL6.png': ['-19px -327px'], 
    }

    this.post_capture = {
      'public': null,
      'private': null,
    }


    this.entries_found = 0;
    this.logged_uid = null;
    this.logged_user_id = null;
    this.logged_username = null;
    this.logged_account_id = null;
    this.logged_fullname = null;
    this.logged_shortname = null;

    this.reset_credentials();

  }


  /**
   * [get_content_allowed check if url changed and search in dom if find some elements they not allowed and set this.allow]
   */
  get_content_allowed() {

    //own profile
    if (document.querySelector('fbProfileCoverPhotoSelector')){
      //if (this.facebook_debug) console.log('** get_content_allowed', 'fbProfileCoverPhotoSelector', document.querySelector('fbProfileCoverPhotoSelector'));
      return true;
    }

    //public page
    // if (document.querySelector('#entity_sidebar')){
    //   this.allow = true;
    // }


    // detect the sidebar of the timelines, not always allowed to track timelines
    let sidebar_timeline = document.querySelector('#timeline_small_column');
    
    // this is a timeline
    if (sidebar_timeline){
      //if (this.facebook_debug) console.log('** get_content_allowed', '#timeline_small_column', sidebar_timeline);
      // this is not my own timeline
      if (!(sidebar_timeline.querySelector('._6a._m'))){
        return false;
      }
    }

    // this is a profile, only allow if it is the same user
    // let logged_uid = this.get_username_or_id(document.querySelector('._2s25._606w'));
    // if (logged_uid){
    //   let profile_uid = this.get_username_or_id(document.querySelector('._2nlw._2nlv'));
    //   if (profile_uid){
    //     if (logged_uid != profile_uid) {
    //       return false;
    //     }
    //   }
    // }

    // this is a profile, only allow if it is the same user  (or if this cannot 
    // be identified)
    let is_user_profile = this.is_link_same_as_logged_user(document, '._2nlw._2nlv');
    if (is_user_profile != null){
      //if (this.facebook_debug) console.log('** get_content_allowed ', '#timeline_small_column', is_user_profile);

      if (!is_user_profile){
        return false;
      }
    }

    return true;
  }


  /**
   * Indicates if the html correspond to a logged in user
   * @return {boolean} true if the html corresponds to a Log In page
   */
  _isLoggedIn(){
    return this.logged_uid != null;
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

    

    let location = document.querySelector('._2s25._606w');
    this.logged_username = this.get_username(location);

    if (this.logged_username == null){
      this.logged_user_id = this.get_user_id(location);
    } else {
      this.logged_user_id = this.get_user_id_from_img(location);
    }

    if (this.logged_user_id == null){
      // grab the user id from the about
      this.logged_user_id = this.get_user_id(document.querySelector("a._6-6[data-tab-key=about]"));
    }

    if (this.logged_username){
      this.logged_uid = this.logged_username;
    } else {
      this.logged_uid = this.logged_user_id;
    }

    // try now with the credentials
    let credentials = this.get_credentials();
    if (credentials){
      if (this.logged_user_id == null){
        this.logged_user_id = credentials.USER_ID;
      }
      this.logged_account_id = credentials.ACCOUNT_ID;
      this.logged_fullname = credentials.NAME;
      this.logged_shortname = credentials.SHORT_NAME;

    }

    // logged in
    if (this.logged_uid || credentials){
      this.is_logged_in = true;
      this.is_content_allowed = this.get_content_allowed();

    // not logged in
    } else {
      this.is_logged_in = false;
      this.is_content_allowed = true;
    }
  }


  /**
  Load the credentials from the script in Facebook
  returns a dictionary with the credentials
  **/  
  get_credentials() {
    try{
      let scripts = document.querySelectorAll('script:not([src])');
      for (var i = 0; i < scripts.length; i++) {
        let sc = scripts[i].textContent;
        if (sc.startsWith('require("TimeSliceImpl").guard(')) {
          return JSON.parse('{' + sc.match(/"USER_ID":".*?"|"SHORT_NAME":".*?"|"NAME":".*?"|"ACCOUNT_ID":".*?"/g).join(',') + '}')      
        }
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

      let profile_uid = this.get_username_or_id(target.querySelector(selector));
      if (profile_uid){
        return this.logged_uid == profile_uid;
      }
    }
    return null;
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
   * get the username or id given an anchor element
   * @param  {Location} anchor html element (<a>)
   * @return {[type]} the username or id found in the anchor elment
   */
  get_username_or_id(location){
    if (location) {
      let username = this.get_username(location);
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
  get_username(location){
    if (location && location.pathname) {
      let username = location.pathname.split('/');
      if (username.length > 1) {
        return username[1];
      }
    }
    return null;
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
   * [_getValues return values of articel]
   * @param  {Object} target
   * @return {Array}
   */
  _getValues(target){
    let search = [
      {
        name: 'articel-time',
        query: ['._5ptz'],
        default: undefined,
        filter: e => e.getAttribute('title')
      },
      {
        name: 'articel-link',
        query: ['.fsm.fwn.fcg a'],
        default: undefined,
        filter: e => e.href
      },
      {
        name: 'articel-headertext',
        query: ['.userContent p'],
        default: undefined,
        filter: e => e.textContent
      },
      {
        name: 'articel-publisher-name',
        query: ['.fwn .fwb a'],
        default: undefined,
        filter: e => e.textContent
      },
      {
        name: 'articel-count-likes',
        query: ['a._3dlf > span', '._2x4v > span'],
        default: undefined,
        filter: e => parseInt(e.textContent.replace(/\D+/g, ""), 10)
      },
      {
        name: 'articel-count-comments',
        query: ['._1whp._4vn2 a', '._36_q a'],
        default: undefined,
        filter: e => parseInt(e.textContent.replace(/\D+/g, ""), 10)
      },
      {
        name: 'articel-count-shares',
        query: ['._355t._4vn2 a', '._ipm._2x0m'],
        default: undefined,
        filter: e => parseInt(e.textContent.replace(/\D+/g, ""), 10)
      },
      {
        name: 'articel-count-contentType',
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
        for (let query of s.query) {
          var r = target.querySelectorAll(query);
          if(r.length>0){
            r = r[0];
            let data = s.filter(r);
            if(data!=null) value = data;
          }
        }//for
        values.push({name: s.name, value: value})
      } catch (err) {
        console.log(err);
        console.log(target, err.toString());
      }
    }//for
    return values;
  }


  /**
   * [_isPublicOrLogInUser checks if element is for the public oder private]
   * @param  {Object}  target [DomElement]
   * @return {Boolean}
   */
  _isPublicOrLogInUser(target){

    // try to detect if the is the same user as logged in
    let is_same = this.is_link_same_as_logged_user(target, '.fwn.fcg a');

    if (is_same != null){
      if (is_same){
        if (this.facebook_debug) console.log('is same');
        return true;
      }
    }

    if (!this.is_content_allowed){
      if (this.facebook_debug) console.log("if (!this.is_content_allowed){");
      return false;
    }

    let els = target.querySelectorAll('i[class*=sx_')
    let is_public = false;
    for (let i = 0; i < els.length; i++) {
      let style = getComputedStyle(els[i]);
      for (let key in this.blocked_map) {
        if (style['background-image'].includes(key) && this.blocked_map[key] == style['background-position']){
          if (this.facebook_debug) console.log("if (key in style['background-image'] && this.blocked_map[key] == style['background-position']){");
          this.post_capture['private'] = true;
          return false;
        }
      }
      for (let key in this.public_map) {
        if (style['background-image'].includes(key) && this.public_map[key] == style['background-position']){
          if (this.facebook_debug) console.log("if (key in style['background-image'] && this.public_map[key == style['background-position']){");
          this.post_capture['public'] = true;
          is_public = true;
        }
      }
    }

    // the return is not immediate in the loop because there could icons inside indicating
    // that the post is private. We can only be sure after all icons have been checked.
    if (is_public){
      return true;
    }

    //let a_list = target.querySelectorAll('.fwn.fcg a');
    //let a_list = target.cloneNode(true).querySelectorAll('i.sx_a506d2');
    let _friends = target.querySelectorAll('i.sx_94649f');
    //let onlyme = target.querySelectorAll('i.sx_e89a24');
    let _public = target.querySelectorAll('i.sx_6be848');

    if (_friends.length > 0){
      this.post_capture['private'] = true;
      return false;
    }

    if (_public.length > 0){
      this.post_capture['public'] = true;
      return true;
    }
    
    return true;
  }



  /**
   * [_isPrivate checks if element is for the public oder private]
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
   * [_getPublicArticels return elements of public articels]
   * @return {Array} found
   */
  _getPublicArticels(){
    let bucket = [];

    //for (let query of this.eventElements.articels) {
    let found = document.querySelectorAll('.userContentWrapper:not(.tracked)');


    let length = found.length;
    for (var i = 0; i < length; i++) {
      this.entries_found += 1;

      found[i].classList.add('tracked');
      if (this._isPublicOrLogInUser(found[i])){
        if(this.facebook_debug) found[i].setAttribute("style", "border:2px solid green !important;");
        this._setLikeEvent(found[i]);
        this._setCommentEvent(found[i]);
        this._eventcommentFromCommentButton(found[i]);
        this._setLikeCommentEvent(found[i]);
        this._setShareEvent(found[i]);
        bucket.push(found[i])
      }else{
        if(this.facebook_debug) found[i].setAttribute("style", "border:2px solid red !important;");
        delete found[i];
      }

    }
    //}
    return bucket.filter(e => e!=undefined);
  }

  /**
   * [_setCommentEvent set event handling of comment button fields]
   * @param {Object} articel
   */
  _setCommentEvent(articel){
    setTimeout(()=>{
      for (let query of this.eventElements.commentButton) {
        let commentButtons = articel.querySelectorAll(query+':not(.tracked)');
        for (var i = 0; i < commentButtons.length; i++) {
          commentButtons[i].classList.add('tracked');
          if(this.facebook_debug) commentButtons[i].setAttribute("style", "border:2px solid red !important;");
          commentButtons[i].addEventListener('click', () => {
            this._eventComment(articel, comment => {
              this.eventFn.onEvent(
                {
                  event: 'comment',
                  type: 'articel',
                  values: this._getValues(articel).concat([
                    {name: 'comment', value: comment},
                  ])
                }
              )
            });
            this._eventcommentFromCommentButton(articel);
            this._setLikeCommentEvent(articel, 100);
            // this._setCommentEvent(articel);
          })
        }
      }
    }, 1000);
  }

  /**
   * [_eventcommentFromCommentButton set event handling for comment from some comment field]
   * @param {Object} articel
   * @param  {Number} timeout [default: 1000]
   */
  _eventcommentFromCommentButton(articel, timeout=1000){
    setTimeout(()=>{
      for (let s of this.eventElements.commentFromCommentButton) {
        let commentButtons = articel.querySelectorAll(s.query+':not(.tracked)');
        for (var i = 0; i < commentButtons.length; i++) {
          commentButtons[i].classList.add('tracked');
          if(this.facebook_debug) commentButtons[i].setAttribute("style", "border:2px solid red !important;");

          commentButtons[i].addEventListener('click', e => {
            if(s.hasOwnProperty('previousElement')){
              var found = this.getParentElement(e.srcElement, s.previousElement);
              var comment = found.previousElementSibling;
            }else if(s.hasOwnProperty('nextElement')){
              var comment = this.getParentElement(e.srcElement, s.nextElement);
              var found = comment.nextElementSibling; // comment box
            }

            setTimeout(()=>{

              let text = comment.querySelectorAll(s.text.query)[0].textContent,
              countElements = comment.querySelectorAll(s.countComment.query),
              count = 0;
              if(countElements.length>0) count = parseInt(countElements[0].textContent, 10);

              this._eventComment(found, comment => {
                // console.log(found, comment);
                this.eventFn.onEvent(
                  {
                    event: 'comment',
                    type: 'postanswer',
                    values: this._getValues(articel).concat([
                      {name: 'comment', value: comment},
                      {name: 'postanswer-count-likes', value: count},
                      {name: 'postanswer-text', value: text}
                    ])
                  }
                )
                if(this.facebook_debug) console.log('commtent  '+comment+' auf comment '+ text);
              }, 0);

            }, 500);
          })
        }

      }//for commentFromCommentButton
    }, timeout)
  }

  /**
   * [_eventComment set keyup event to elements for write some comment]
   * @param  {Object} articel
   * @param  {Function} fn      [default: ()=>{}]
   * @param  {Number} timeout   [default: 1000]
   */
  _eventComment(articel, fn=()=>{}, timeout=1000){
    setTimeout(()=>{
      for (let query of this.eventElements.commentfields) {
        let commentfields = articel.querySelectorAll(query+':not(.tracked)');
        for (var i = 0; i < commentfields.length; i++) {
          commentfields[i].classList.add('tracked');
          if(this.facebook_debug) commentfields[i].setAttribute("style", "border:2px solid red !important;");
          commentfields[i].addEventListener('keyup', e => {
            let spans =  e.srcElement.querySelectorAll('span[data-text="true"]');
            if(spans.length>0){
              let comment = spans[spans.length-1].textContent;
              if(this.facebook_events_debug) fn('TEST '+comment);
              if(e.keyCode==13){
                if(this.facebook_debug) console.log('comment', comment);
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
   * @param {Object}  articel
   * @param {Boolean} after  [default: false]
   */
  _setShareEvent(articel, after=false){
    let findShareButton = () => {
      let shareButton = document.querySelectorAll('.uiContextualLayer:not(.tracked)');
      setTimeout(()=>{
        for (var i = 0; i < shareButton.length; i++) {
          shareButton[i].classList.add('tracked');
          if(this.facebook_debug) shareButton[i].setAttribute("style", "border:2px solid red !important;");
          let shares = shareButton[i].querySelectorAll('ul li a:not(.tracked)');
          for (var i = 0; i < shares.length; i++) {
            shares[i].classList.add('tracked');
            if(this.facebook_debug) shares[i].setAttribute("style", "border:2px solid red !important;");
            shares[i].addEventListener('click', e => {
              this.eventFn.onEvent(
                {
                  event: 'share',
                  type: 'articel',
                  values: this._getValues(articel).concat([
                    {name: 'choice', value: e.srcElement.textContent},
                  ])
                }
              )
              console.log('share', e.srcElement.textContent);
            });
            if(this.facebook_events_debug) shares[i].addEventListener('mouseover', e => {
              this.eventFn.onEvent(
                {
                  event: 'share',
                  type: 'postanswer',
                  values: this._getValues(articel).concat([
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
        let shares = articel.querySelectorAll(query+':not(.tracked)');
        for (let i = 0; i < shares.length; i++) {
          shares[i].classList.add('tracked');
          if(this.facebook_debug) shares[i].setAttribute("style", "border:2px solid red !important;");
          if(after==false){
            if(this.facebook_events_debug) shares[i].addEventListener('mouseover', e => {
              setTimeout(()=>this._setShareEvent(articel, true), 100)
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
      default:
        value = 'unkown';
    }
    return value;
  }

  /**
   * [_setLikeCommentEvent set like Event for comment like Button]
   * @param {Object}  articel
   * @param  {Number} timeout [default: 100]
   */
  _setLikeCommentEvent(articel, timeout=0){
    setTimeout(() => {
      for (let s of this.eventElements.likeComment) {
        let buttons = articel.querySelectorAll(s.query);
        for (var i = 0; i < buttons.length; i++) {
          if(this.facebook_debug) buttons[i].setAttribute("style", "border:2px solid red !important;");
          buttons[i].addEventListener('click', e => {
            let text = this.getParentElement(e.srcElement, s.text.parent).querySelectorAll(s.text.query)[0].textContent;
            let count = 0,
            countElements = this.getParentElement(e.srcElement, s.countComment.parent).querySelectorAll(s.countComment.query);
            if(countElements.length>0) count = parseInt(countElements[0].textContent, 10);
            

            if (buttons[i].classList.contains('_3_16')){
              this.eventFn.onEvent({
                  event: 'undo',
                  type: 'postanswer',
                  values: this._getValues(articel).concat([
                    {name: 'reaction-value', value: 'undo'},
                    {name: 'postanswer-count-likes', value: count},
                    {name: 'postanswer-text', value: text}
                  ])
              });
            } else {
              this.eventFn.onEvent({
                  event: 'like',
                  type: 'postanswer',
                  values: this._getValues(articel).concat([
                    {name: 'like-value', value: this.getValueOfLikeNumber(1)},
                    {name: 'postanswer-count-likes', value: count},
                    {name: 'postanswer-text', value: text}
                  ])
              });
            }

            if(this.facebook_debug) console.log('like comment 1 text => ', text);
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
                  values: this._getValues(articel).concat([{
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
   * @param {Object}  articel
   */
  _setLikeEvent(articel){
    setTimeout(() => {
      for (let query of this.eventElements.likearticelButton) {
        let buttons = articel.querySelectorAll(query);
        for (var i = 0; i < buttons.length; i++) {
          if(this.facebook_debug) buttons[i].setAttribute("style", "border:2px solid purple !important;");
          buttons[i].addEventListener('click', ()=>{
            if (buttons[i].classList.contains('_3_16')){
              this.eventFn.onEvent({
                event: 'undo',
                type: 'articel',
                values: this._getValues(articel).concat([
                  {name: 'reaction-value', value: 'undo'}
                ])
              });
            } else {
              this.eventFn.onEvent({
                event: 'like',
                type: 'articel',
                values: this._getValues(articel).concat([
                  {name: 'like-value', value: this.getValueOfLikeNumber(1)}
                ])
              })
            }

            if(this.facebook_debug) console.log('like 1', articel);
          })

          buttons[i].addEventListener('mouseover', ()=> {
            // console.log(this._getValues(articel));
            this._toolbarHandler(nr => {
              this.eventFn.onEvent(
                {
                  event: 'reaction',
                  type: 'articel',
                  values: this._getValues(articel).concat([
                    {name: 'reaction-value', 
                     value: nr['data_reaction'],
                     aria_label: nr['aria_label'],
                     reaction: this.getValueOfLikeNumber(nr['data_reaction'])
                    }
                  ])
                }
              )
            })
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
    }

    if (this.logged_username) {
      anonym['username'] = this.logged_username;
    }

    if (this.logged_account_id) {
      anonym['account_id'] = this.logged_account_id;
    }
    if (this.logged_fullname) {
      anonym['fullname'] = this.logged_fullname;
    }
    if (this.logged_shortname) {
      anonym['shortname'] = this.logged_shortname;
    }

    metadata['anonym'] = anonym;

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
      let buttons = layer.querySelectorAll('span [data-reaction]:not(.tracked)');
      for (let a = 0; a < buttons.length; a++) {
        buttons[a].classList.add('tracked');
        this.trackedToolbarButtons.push(buttons[a]);
        if(this.facebook_debug) buttons[a].setAttribute("style", "border:2px solid blue !important;");
        buttons[a].onclick = e => {
          if(this.facebook_debug) console.log('click', e.srcElement.parentElement.getAttribute("data-reaction"));
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
          if(this.facebook_debug) layer[i].setAttribute("style", "border:2px solid red !important;");
          layer[i].timeouts = [];
          layer[i].timeouts.push(setTimeout(()=>{
            if(this.facebook_debug) console.log('START REMOVE');
            if(this.facebook_debug) layer[i].setAttribute("style", "border: none");
            remove();
          }, 2000))
          if(this.facebook_debug) console.log('start=>', layer[i].timeouts);
          layer[i].stop = () => {
            for (let c in layer[i].timeouts) {
              if(typeof layer[i].timeouts[c] == 'number'){
                clearTimeout(layer[i].timeouts[c]);
                delete layer[i].timeouts[c];
              }
            }
            layer[i].timeouts = layer[i].timeouts.filter(e => e!= undefined);
            if(this.facebook_debug) console.log('STOP', layer[i].timeouts);
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
   * [_joinGroup event handling for join in public group]
   */
  _joinGroup(){
    for (let query of this.eventElements.joinGroup) {
      let buttons = document.querySelectorAll(query+':not(.tracked)');
      for (let i = 0; i < buttons.length; i++) {
        if(this.facebook_debug) buttons[i].setAttribute("style", "border:2px solid red !important;");
        buttons[i].classList.add('tracked');
        buttons[i].addEventListener('click', e => {
          let elementsOfcountGroupUser = document.querySelectorAll('.groupsStreamMemberBoxNames'),
          elementsOfGroupname = document.querySelectorAll('#seo_h1_tag a'),
          name = '',
          id = '',
          link = '',
          lastpost = [],
          countGroupUser = 0;
          if(elementsOfcountGroupUser.length>0){
            countGroupUser = parseInt(elementsOfcountGroupUser[0].textContent.replace(/\D+/g, ""), 10);
          }
          if(elementsOfGroupname.length>0){
            link = elementsOfGroupname[0].href
            id = parseInt(link.replace(/\D+/g, ""), 10);
            name = elementsOfGroupname[0].textContent;
          }
          if(this.facebook_debug) console.log('join group', lastpost, id, link, name, countGroupUser);
        })
        if(this.facebook_events_debug) buttons[i].addEventListener('mouseover', e => {
          let elementsOfcountGroupUser = document.querySelectorAll('.groupsStreamMemberBoxNames'),
          elementsOfGroupname = document.querySelectorAll('#seo_h1_tag a'),
          name = '',
          id = '',
          link = '',
          lastpost = '',
          countGroupUser = 0;
          if(elementsOfcountGroupUser.length>0){
            countGroupUser = parseInt(elementsOfcountGroupUser[0].textContent.replace(/\D+/g, ""), 10);
          }
          if(elementsOfGroupname.length>0){
            link = elementsOfGroupname[0].href
            id = parseInt(link.replace(/\D+/g, ""), 10);
            name = elementsOfGroupname[0].textContent;
          }
          this.eventFn.onEvent({event: 'joinGroup', type: 'info', values: [
            {name: 'name', value: name},
            {name: 'id', value: id},
            {name: 'link', value: link},
            {name: 'count-Groupuser', value: countGroupUser},
            {name: 'lastpost', value: lastpost}
          ]})
        })
      }//for
    }
  }

  /**
   * [getDom return html content from public articel]
   * @return {String}
   */
  async getDom(){
    return new Promise(async (resolve, reject) => {
      try {      
        let found = this._getPublicArticels();

        // if no entries were found, then this is not a timeline or profile page
        if (this.entries_found == 0) {
          // if the user is not logged in, then default to the normal tracker
          if (!this.is_logged_in){
            resolve(this._getDom());
          } else {
            resolve('<html><head></head><body></body></html>');
          }

        // otherwise, the dom can be assembled
        } else {
          for (var i = 0; i < found.length; i++) {
            this.elements.push(found[i]);
            this.elementStrings += found[i].outerHTML
          }
          resolve('<html>'+this._getHead()+'<body>'+this.elementStrings+'</body>'+'</html>');
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
      if(this.facebook_debug) console.log('START!!!!');
      fn(2500);
    }, 1000);
  }

}
