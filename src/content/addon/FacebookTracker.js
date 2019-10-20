import Tracker from '../Tracker';

export default class FacebookTracker extends Tracker{

  constructor(worker, extensionfilter=[]){
    super(worker);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.rootSearch = "#contentArea div[data-gt='{\"ref\":\"nf_generic\"}']";

    this.is_allowed = null;
    this.facebook_debug = true;
    this.facebook_events_debug = true;
    this.elements = [];
    this.elementStrings = '';
    this.trackedToolbarButtons = [];
    this.eventElements = {
      allowNotToTracked: ['#leftCol ._3ph1.sp_387n34yO1ZQ', '#fbProfileCover'],
      articels: ['#content_container [role="main"] .userContentWrapper', '#contentArea [role="articel"] div[role="articel"][data-testid="fbarticel_story"]'],
      likearticelButton: ['a._6a-y', '.UFILikeLink:not(.UFIReactionLink)'],
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
      '/events', '/stories', '/friends', '/messages', '/photo', 
      '/marketplace', '/fundraisers', '/saved', '/recommendations', 
      '/crisisresponse', '/settings'];

    this.startswith_whitelist = ['/pg']

    this.pos_2nd_blacklist = ['about', 'friends_mutual', 
      'followers', 'following', 'friends', 'photos']

  }


  /**
   * [is_content_allowed check if url changed and search in dom if find some elements they not allowed and set this.allow]
   */
  is_content_allowed() {
    if (this.is_allowed == null){

      // assume it is allowed
      this.is_allowed = true;

      //own profile
      if (document.querySelector('fbProfileCoverPhotoSelector')){
        this.is_allowed = true;
        return this.is_allowed;
      }

      //public page
      // if (document.querySelector('#entity_sidebar')){
      //   this.allow = true;
      // }


      // detect the sidebar of the timelines, not always allowed to track timelines
      let sidebar_timeline = document.querySelector('#timeline_small_column');
      
      // this is a timeline
      if (sidebar_timeline){
        // this is not my own timeline
        if (!(sidebar_timeline.querySelector('._6a._m'))){
          this.is_allowed = false;
          return this.is_allowed;
        }
      }

      // this is a profile, only allow if it is the same user
      // let logged_uid = this.get_username_or_id(document.querySelector('._2s25._606w'));
      // if (logged_uid){
      //   let profile_uid = this.get_username_or_id(document.querySelector('._2nlw._2nlv'));
      //   if (profile_uid){
      //     if (logged_uid != profile_uid) {
      //       this.is_allowed = false;
      //       return this.is_allowed;
      //     }
      //   }
      // }

      // this is a profile, only allow if it is the same user  (or if this cannot 
      // be identified)
      let is_user_profile = this.is_link_same_as_logged_user(document, '._2nlw._2nlv');
      if (is_user_profile != null){

        if (!is_user_profile){
          this.is_allowed = false;
          return this.is_allowed;
        }
      }

    }
    return this.is_allowed;
  }

  is_link_same_as_logged_user(target, selector){
    let logged_uid = this.get_username_or_id(document.querySelector('._2s25._606w'));
    if (logged_uid){
      let profile_uid = this.get_username_or_id(target.querySelector(selector));
      if (profile_uid){
        return logged_uid == profile_uid;
      }
    }
    return null;
  }


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

  get_username_or_id(location){
    if (location) {
      let username = location.pathname.split('/');
      if (username.length > 1) {
        return username[1];
      }

      let id = findGetParameter('id', location.search);
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
        filter: e => location.href.substring(0, location.href.length-1)+e.getAttribute('href')
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

    if (is_same !=  null){
      if (is_same){
        return true;
      }
    }


    //let a_list = target.querySelectorAll('.fwn.fcg a');
    //let a_list = target.cloneNode(true).querySelectorAll('i.sx_a506d2');
    let friends_list = target.querySelectorAll('i.sx_b75a4a');
    let onlyme_list = target.querySelectorAll('i.sx_e89a24');
    let friendoffriend_list = target.querySelectorAll('i.sx_6be848');
    
    
    // let c = 0;
    // for (let a in a_list.length) {
    //   let attr = a_list[a].getAttribute("data-hovercard");
    //   if(attr != null && attr.indexOf('user') > 0){
    //     c++;
    //   }
    // }

    //return c==0 && 
    return ((friends_list.length == 0) 
      && (onlyme_list.length==0)
      && (friendoffriend_list.length==0));
  }



  /**
   * [_isPrivate checks if element is for the public oder private]
   * @param  {Object}  target [DomElement]
   * @return {Boolean}
   */
  _isPrivate(target){
    //let a_list = target.querySelectorAll('.fwn.fcg a');
    let a_list = target.querySelectorAll('.sx_b75a4a');    
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
      found[i].classList.add('tracked');
      if (this._isPublicOrLogInUser(found[i])){
        if(this.facebook_debug) found[i].setAttribute("style", "border:2px solid red !important;");
        this._setLikeEvent(found[i]);
        this._setCommentEvent(found[i]);
        this._eventcommentFromCommentButton(found[i]);
        this._setLikeCommentEvent(found[i]);
        this._setShareEvent(found[i]);
      }else{
        delete found[i];
      }
      bucket.push(found[i])
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
            this._setLikeCommentEvent(articel, 1500);
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
   * @param  {Number} timeout [default: 500]
   */
  _setLikeCommentEvent(articel, timeout=500){
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
            this.eventFn.onEvent(
              {
                event: 'like',
                type: 'postanswer',
                values: this._getValues(articel).concat([
                  {name: 'like-value', value: this.getValueOfLikeNumber(1)},
                  {name: 'postanswer-count-likes', value: count},
                  {name: 'postanswer-text', value: text}
                ])
              }
            )
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
                     name: 'reation-value', 
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
      for (let query of ['a._6a-y', '.UFILikeLink:not(.UFIReactionLink)']) {
        let buttons = articel.querySelectorAll(query);
        for (var i = 0; i < buttons.length; i++) {
          if(this.facebook_debug) buttons[i].setAttribute("style", "border:2px solid purple !important;");
          buttons[i].addEventListener('click', ()=>{
            this.eventFn.onEvent(
              {
                event: 'like',
                type: 'articel',
                values: this._getValues(articel).concat([
                  {name: 'like-value', value: this.getValueOfLikeNumber(1)}
                ])
              }
            )
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
                    {name: 'reation-value', 
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
    }, 300)
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
            link = elementsOfGroupname[0].getAttribute('href')
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
            link = elementsOfGroupname[0].getAttribute('href')
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
        for (var i = 0; i < found.length; i++) {
          this.elements.push(found[i]);
          this.elementStrings += found[i].outerHTML
        }
        resolve('<html>'+this.documentHead+'<body>'+this.elementStrings+'</body>'+'</html>');
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
