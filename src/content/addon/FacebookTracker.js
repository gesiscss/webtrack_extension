import Tracker from '../Tracker';
const md5 = require('md5');

export default class FacebookTracker extends Tracker{

  constructor(worker, privacy, extensionfilter=[]){
    super(worker, privacy);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.rootSearch = "#contentArea div[data-gt='{\"ref\":\"nf_generic\"}']";
    this.totalPostsSeen = 0;
    this.is_allowed = null;
    this.facebook_debug = true;
    this.facebook_events_debug = true;
    this.elements = [];
    this.elementStrings = '';
    this.trackedToolbarButtons = [];


    this.eventElements = {
      allowNotToTracked: ['#leftCol ._3ph1.sp_387n34yO1ZQ', '#fbProfileCover'],

      //articels: ['#content_container [role="main"] .userContentWrapper', '#contentArea [role="articel"] div[role="articel"][data-testid="fbarticel_story"]'],
      likearticelButton: [
          'div[aria-label="Like"]:not(.buofh1pr)', 
          'div[aria-label="Remove Like"]:not(.buofh1pr)', 
          'div[aria-label="לייק"]:not(.buofh1pr)', 
          'div[aria-label="הסרת לייק"]:not(.buofh1pr)'
          ],

      likeComment: [{
        query: '._6coi._6qw9 li:nth-child(1) a', 
        parent: ['._4eek[role="articel"]', 'div'], 
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

    this.lastUrlPath = '';

    this.startswith_allowlist = ['/', '/spd/']


    this.privacy_flags = {
      'public': null,
      'private': null,
      'issame': null,
      'user_id': null,
      'username': null,
      'account_id': null,
      'fullname': null,
      'shortname': null
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

  _is_sm_path_allowed(path){

    path = path.toLowerCase();

    if (!path.endsWith('/')){
      path = path + '/';
    }

    for (let i in this.startswith_allowlist) {
      console.log('ALLOWED SW', this.startswith_allowlist[i]);
      if (path == this.startswith_allowlist[i]){
        return true;
      }
    }

    return false;
  }


  /**
   * [get_content_allowed check if url changed and search in dom if find some elements they not allowed and set this.allow]
   */
  get_content_allowed() {
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
      this.is_content_allowed = this.get_content_allowed();

    // not logged in
    } else {
      this.is_logged_in = false;
      this.is_content_allowed = true;
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
      let scripts = document.querySelectorAll('script:not([src])');
      for (var i = 0; i < scripts.length; i++) {
        let sc = scripts[i].textContent;
        if (sc.startsWith('requireLazy(["Bootloader')) {
          let user_match = sc.match(/"username":".*?"/g);
          if (user_match){
            return JSON.parse('{' + user_match.join(',') + '}').username;
          }
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
        name: 'webtracker-articel-id',
        default: undefined,
      },
      {
        name: 'articel-time',
        query: ['._5ptz'],
        default: undefined,
        filter: e => e.getAttribute('title')
      },
      {
        name: 'articel-link',
        query: ['.oajrlxb2.g5ia77u1.qu0x051f.esr5mh6w.e9989ue4.r7d6kgcz.rq0escxv.nhd2j8a9.nc684nl6.p7hjln8o.kvgmc6g5.cxmmr5t8.oygrvhab.hcukyx3x.jb3vyjys.rz4wbd8a.qt6c0cv9.a8nywdso.i1ao9s8h.esuyzwwr.f1sip0of.lzcic4wl.gmql0nx0.gpro0wi8.b1v8xokw'],
        default: undefined,
        filter: e => e.getAttribute('href').split('?')[0]
      },
      {
        name: 'articel-headertext',
        query: ['.kvgmc6g5.cxmmr5t8.oygrvhab.hcukyx3x.c1et5uql.ii04i59q'],
        default: undefined,
        filter: e => e.textContent
      },
      {
        name: 'articel-publisher-name',
        query: ['h4 a span'],
        default: undefined,
        filter: e => e.textContent
      },
      {
        name: 'articel-count-likes',
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
        name: 'articel-count-comments',
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
        name: 'articel-count-shares',
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
        if (s.name == 'webtracker-articel-id') {
          value = target.getAttribute('webtracker-article-id');
        } else {
          for (let query of s.query) {
            var r = target.querySelectorAll(query);
            if(r.length>0){
              r = r[0];
              let data = s.filter(r);
              if(data!=null) value = data;
            } else if (s.name == 'articel-count-comments' || s.name == 'articel-count-shares' || s.name == 'articel-count-likes') {
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
        //if (this.facebook_debug) console.log('is same');
        this.privacy_flags['issame'] = true;
        target.classList.add('is_same_webtracker_flag');
        return true;
      }
    }

    if (!this.is_content_allowed){
      //if (this.facebook_debug) console.log("if (!this.is_content_allowed){");
      return false;
    }


    // the return is not immediate in the loop because there could icons inside indicating
    // that the post is private. We can only be sure after all icons have been checked.
    if (is_public){
      target.classList.add('public_webtracker_flag');
      return true;
    }

    //let a_list = target.querySelectorAll('.fwn.fcg a');
    //let a_list = target.cloneNode(true).querySelectorAll('i.sx_a506d2');
    let _friends = target.querySelectorAll('i.sx_94649f');
    //let onlyme = target.querySelectorAll('i.sx_e89a24');
    let _public = target.querySelectorAll('i.sx_6be848');

    if (_friends.length > 0){
      this.privacy_flags['private'] = true;
      target.classList.add('private_webtracker_flag');
      return false;
    }

    if (_public.length > 0){
      this.privacy_flags['public'] = true;
      target.classList.add('public_webtracker_flag');
      return true;
    }
    
    return true;
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
   * [_getPublicArticels return elements of public articels]
   * @return {Array} found
   */
  _getPublicArticels(){
    let bucket = [];
    //for (let query of this.eventElements.articels) {
    //let found = document.querySelectorAll('.userContentWrapper:not(.tracked), div[role="article"]:not(.tracked)');
    let found = document.querySelectorAll('[data-pagelet^="FeedUnit"]:not(.tracked)');

    // // try to capture elements in the new interface
    // if (found.length == 0){
    //   found = document.querySelectorAll('div[role="article"]:not(.tracked)');
    // }


    let length = found.length;
    for (var i = 0; i < length; i++) {
      this.entries_found += 1;

      found[i].classList.add('tracked');
      found[i].setAttribute('webtracker-article-id', Math.random());
      if (this._isPublicOrLogInUser(found[i])){
        if(this.facebook_debug) found[i].setAttribute("style", "border:2px solid green !important;");
        this._setLikeEvent(found[i]);
        this._setCommentEvent(found[i]);
        this._eventcommentFromCommentButton(found[i]);
        //this._setLikeCommentEvent(found[i]); //haven't been fixed and currently unsupported
        //this._setShareEvent(found[i]);  //currently unsupposted and not working
        bucket.push(found[i])
      }else{
        if(this.facebook_debug) found[i].setAttribute("style", "border:2px solid red !important;");
        delete found[i];
      }

    }
    //}
    //removes all non-public posts from bucket
    const savedElements = [];
    for (var i = 0; i < bucket.length; i++) {
      let privacy_icon = bucket[i].querySelector("span.g0qnabr5 > span > span > i")
      if ((privacy_icon && privacy_icon.getAttribute('aria-label') == 'Shared with Public') ||
          (privacy_icon && privacy_icon.getAttribute('aria-label') == 'Shared with Public group') ||
          (privacy_icon && privacy_icon.getAttribute('aria-label') == 'Shared with Custom') ||
          (privacy_icon && privacy_icon.getAttribute('aria-label') == 'משותף עם קבוצה ציבורית') ||
          (privacy_icon && privacy_icon.getAttribute('aria-label') == 'משותף עם ציבורי') ||
          (privacy_icon && privacy_icon.getAttribute('aria-label') == 'משותף עם התאמה אישית')) {
        savedElements.push(bucket[i]);
      }
    }
    
    this.totalPostsSeen += bucket.length;
    //return bucket.filter(e => e!=undefined);
    return savedElements;
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
          if(this.facebook_debug) commentButtons[i].setAttribute("style", "border:2px solid yellow !important;");
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
      for (let query of this.eventElements.commentFromCommentButton) {
        let commentButtons = articel.querySelectorAll(query+':not(.tracked)');
        for (var i = 0; i < commentButtons.length; i++) {
          commentButtons[i].classList.add('tracked');
          if(this.facebook_debug) commentButtons[i].setAttribute("style", "border:2px solid red !important;");
          commentButtons[i].addEventListener('click', e => {
            setTimeout(()=>{
              this._eventComment(articel, comment => {
                // console.log(found, comment);
                this.eventFn.onEvent(
                  {
                    event: 'comment',
                    type: 'postanswer',
                    values: this._getValues(articel).concat([
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
          if(this.facebook_debug) commentfields[i].setAttribute("style", "border:2px solid pink !important;");
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
   * @param {Object}  articel
   * @param {Boolean} after  [default: false]
   */
  _setShareEvent(articel, after=false){
    let findShareButton = () => {
      let shareButton = document.querySelectorAll('[aria-label="Send this to friends or post it on your timeline."]:not(.tracked)');
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
              //console.log('share', e.srcElement.textContent);
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
      case 16: value = 'care'; break;
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
          let button = buttons[i];
          button.addEventListener('click', e =>{
            if (button.getAttribute('aria-label') === 'Remove Like'){
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

            //if(this.facebook_debug) console.log('like 1', articel);
          })

          buttons[i].addEventListener('mouseenter', ()=> {
            setTimeout(() => {
                // console.log(this._getValues(articel));
                let toolbar = document.querySelector('div.j83agx80[role="toolbar"]');
                let button = toolbar.querySelector('div')
                button.addEventListener('click', e =>{
                  if ((button.getAttribute('aria-label') === 'לייק') || (button.getAttribute('aria-label') === 'Like')){
                    this.eventFn.onEvent({
                      event: 'like',
                      type: 'articel',
                      values: this._getValues(articel).concat([
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
      this.privacy_flags['user_id'] = true;
    }

    if (this.logged_username) {
      anonym['username'] = this.logged_username;
      this.privacy_flags['username'] = true;
    }

    if (this.logged_account_id) {
      anonym['account_id'] = this.logged_account_id;
      this.privacy_flags['account_id'] = true;
    }
    if (this.logged_fullname) {
      anonym['fullname'] = this.logged_fullname;
      this.privacy_flags['fullname'] = true;
    }
    if (this.logged_shortname) {
      anonym['shortname'] = this.logged_shortname;
      this.privacy_flags['shortname'] = true;
    }

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
        if(this.facebook_debug) buttons[a].setAttribute("style", "border:2px solid blue !important;");
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
          if(this.facebook_debug) layer[i].setAttribute("style", "border:2px solid red !important;");
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
            resolve('<html><head></head><body>No entries found</body></html>');
          }

        // otherwise, the dom can be assembled
        } else {
          for (var i = 0; i < found.length; i++) {
            let cloned = found[i].cloneNode(true);
            let commentator = cloned.querySelectorAll('[class="pq6dq46d"]');
            for (var j = 0; j < commentator.length; j++) {
              commentator[j].innerText = md5(commentator[j].innerText);
            }
            this.elements.push(found[i]); //is this being used anywhere?
            this.elementStrings += cloned.outerHTML
          }
          resolve('<html totalPostsSeen="'+this.totalPostsSeen+'" ><head></head><body>'+this.elementStrings+'</body>'+'</html>');
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
