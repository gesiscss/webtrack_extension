import Tracker from '../Tracker';

export default class YouTubeTracker extends Tracker{

  constructor(worker, extensionfilter=[]){
    super(worker);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.rootElement = null;
    this.fetchCategorie = {
      is: false,
      count: 0,
      MAX_COUNT: 4
    };
    this.allow = true;
    this.youtube_debug = false;
    this.eventElements = {
      root: ['#primary'],
      allow: ['#primary'],

      logged_email: 'yt-formatted-string#email',
      logged_fullname: 'yt-formatted-string#account-name',
      profile_pic_url_comment: 'yt-img-shadow#author-thumbnail img#img',
      profile_pic_url_avatar: '#avatar-btn img#img',
      watch_later: '.ytp-watch-later-button.ytp-button',

      svg_protected: '#container .style-scope.ytd-badge-supported-renderer svg g path[d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"]',
      categorie: {
        contents: ['#content', '#collapsible'],
        button: {
          more: ['#more'],
          less: ['#less']
        },
        categories: ['#container #collapsible *:first-child #content a']
      },
      likearticelButton: ['#top-level-buttons > *:nth-child(1) a'],
      dislikearticelButton: ['#top-level-buttons > *:nth-child(2) a'],
      subscribeButton: ['#subscribe-button [role="button"]'],
      newComment: ['#simple-box'],
      hashtag: ['a.yt-simple-endpoint[href]'],
      commentWrapper: [
        {
          name: 'postanswer',
          query: ['#comments #contents > *'],
        },
        {
          name: 'postanswer-comment',
          query: ['#expander-contents #loaded-replies > *'],
        }
      ],
      comment: {
        content: ['#content-text'],
        timeContent: ['#header-author .published-time-text'],
        buttonLike: ['#toolbar #like-button a'],
        buttonDislike: ['#toolbar #dislike-button a'],
        countMiddle: ['#toolbar #vote-count-middle'],
        countComments: ['#expander #more #more-text'],
        moreCommentFromComments: [
          {
            parentNode: ['#replies #expander'],
            button: ['#more'],
            content: ['#content'],
          }
        ],
        buttonComment: [
          {
            button: ['#reply-button-end'],
            parent: '#action-buttons',
          }
        ],
      },
      commentButton: {
        wrapper: ['#comment-dialog', '#reply-dialog'],
        input: ['#contenteditable-textarea'],
        submit: ['#submit-button']
      }
    };

    
    this.logged_email = null;
    this.is_correct_logged_fullname = false;
    this.logged_fullname = null;
    this.is_correct_profile_pic_url = false;
    this.profile_pic_url = null;
    this.updateMetada = false;


    this.lastUrlPath = '';
    this.values = [];

    this.startswith_blacklist = ['/account/', '/reporthistory/', '/upload/', '/account_notifications/', 
      '/account_playback/', '/account_privacy/', '/account_sharing/', '/pair/', 
      '/account_billing/', '/account_advanced/'];
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
        query: ['.date'],
        default: undefined,
        filter: e => e.textContent.match(/\b(\w*[A-Za-z0-9 äÄöÖüÜß]\w*)\b/g).join('')
      },
      {
        name: 'articel-link',
        query: ['#primary-inner'],
        default: undefined,
        filter: e => location.href
      },
      {
        name: 'articel-headertext',
        query: ['.title'],
        default: undefined,
        filter: e => e.textContent
      },
      {
        name: 'articel-description',
        query: ['#meta #container #content #description'],
        default: undefined,
        filter: e => e.textContent
      },
      {
        name: 'articel-publisher-name',
        query: ['#owner-name a'],
        default: undefined,
        filter: e => e.textContent
      },
      {
        name: 'articel-count-likes',
        query: ['#top-level-buttons > *:nth-child(1) #text'],
        default: undefined,
        filter: e => e.textContent
      },
      {
        name: 'articel-count-dislikes',
        query: ['#top-level-buttons > *:nth-child(2) #text'],
        default: undefined,
        filter: e => e.textContent
      },
      {
        name: 'articel-count-comments',
        query: ['#comments #count'],
        default: undefined,
        filter: e => parseInt(e.textContent.replace(/\D+/g, ""), 10)
      }
    ],
    values= [];
    if(search.length == this.values.length) return this.values
    let is = this.values.filter(e => e.value!=undefined).map(e => e.name);
    for (let s of search) {
      if(is.includes(s.name)) continue;
      try {
        let value = s.default;
        for (let query of s.query) {
          var r = this._getRootElement().querySelectorAll(query);
          if(r.length>0){
            r = r[0];
            let data = s.filter(r);
            if(data!=null) value = data;
          }
        }//for
        // console.log(s.name, r, value);
        this.values.push({name: s.name, value: value})
      } catch (err) {
        console.log(err);
        console.log(target, err.toString());
      }
    }//for
    return this.values;
  }

  /**
   * [_setAllow check if url changed and search in dom if find some elements they not allowed and set this.allow]
   */
  _isAllow(){
    return new Promise((resolve, reject) => {
      if(this.lastUrlPath!==location.pathname){
        this.lastUrlPath = location.pathname;
        for (let query of this.eventElements.allow){
          let found = document.querySelectorAll(query+':not(.tracked)');
          this.allow = found.length>0;
        }
      }
      resolve(this.allow)
    });
  }



  /**
   * Setup the credentials for the logged user (if any). Not posible in youtube
   */
  reset_credentials(){
    this.rootElement = this._getRootElement();

    this.is_logged_in = this._isLogged();

    if (this.is_logged_in){
      this.updateMetada = false;
      this.logged_email = this._get_logged_email();
      this.logged_fullname = this._get_logged_fullname();
      this.profile_pic_url = this._get_profile_pic_url();

      if (this.updateMetada){
        this.fetchMetaData();
      }
    } 

    //document.querySelector('#avatar-btn');
    this.is_content_allowed = this.get_content_allowed();
  }

    /**
   * get the metadata from the file
   * @return {object} the metadata of the html
   */
  getMetadata(){
    let metadata = super.getMetadata();
    let anonym = {};

    if (this.logged_email) {
      anonym['email'] = this.logged_email;
    }

    if (this.logged_fullname) {
      anonym['fullname'] = this.logged_fullname;
    }

    if (this.profile_pic_url) {
      anonym['guest_id'] = this.profile_pic_url;
    }

    metadata['anonym'] = anonym;

    return metadata;
  }


  _get_logged_email(){
    if (this.logged_email){
      return this.logged_email;
    }

    let el = document.querySelector(this.eventElements.logged_email);
    if (el){
      this.update_metadata = true;
      return el.textContent;
    }
    return null;
  }

  _get_logged_fullname(){
    if (this.is_correct_logged_fullname){
      return this.logged_fullname;
    }

    let el = document.querySelector(this.eventElements.logged_fullname);
    if (el){
      this.is_correct_logged_fullname = true;
      this.updateMetada = true;
      return el.textContent;
    } else {
      el = document.querySelector(this.eventElements.profile_pic_url_comment);
      if (el){
        this.updateMetada = true;
        this.is_correct_logged_fullname = true;
        return el.alt;
      } else {
        el = document.querySelector(this.eventElements.watch_later);
        if (el) {
          return el.title;
        }
      }
    }
    return null;
  }

  _get_profile_pic_url(){
    if (this.is_correct_profile_pic_url){
      return this.profile_pic_url;
    }

    let src = null;
    let el = document.querySelector(this.eventElements.profile_pic_url_comment);
    if (el){
      this.updateMetada = true;
      this.is_correct_profile_pic_url = true;
      src = el.src;
    } else {
      el = document.querySelector(this.eventElements.profile_pic_url_avatar);
      if (el){
        src = el.src;
      }
    }
    if (src) {
      let parts = src.split('/');
      return parts[parts.length - 1];
    }
    return null;
  }

  _isLogged() {
    if (document.querySelector('#avatar-btn')){
      return true;
    }
    return false;
  }


  get_content_allowed() {
    if (this.rootElement.querySelector(this.eventElements.svg_protected)){
      return false;
    }
    return true;
  }

  /**
   * [_getRootElement return the rootElement from document]
   * @return {Object}
   */
  _getRootElement(){
    if(this.rootElement == null){
      let target = this._getElements(this.eventElements.root, document);
      if(target.length>0) { 
        return  target[0];
      } else {
        return document;
      }
    }
    return this.rootElement;
  }

  


  /**
   * [_setCategorie2Meta set the categorie to the meta keysworts]
   */
  _setCategorie2Meta(){
    if(this.fetchCategorie.is || this.fetchCategorie.count >= this.fetchCategorie.MAX_COUNT) return
    this.fetchCategorie.count += 1;
    // console.log('this.fetchCategorie.count', this.fetchCategorie.count);

    var contents = this._getElements(this.eventElements.categorie.contents, this._getRootElement(), {setTracked: false, color: 'purple'});
    for (let content of contents) content.style.display = 'none';

    let more = this._getElements(this.eventElements.categorie.button.more, this._getRootElement(), {setTracked: false, color: 'purple'});
    // console.log('more', more.length, more);
    for (let button of more) button.click();

    let categories = this._getElements(this.eventElements.categorie.categories, this._getRootElement(), {setTracked: false, color: 'purple'});
    // console.log(categories);
    if(categories.length>0) this.fetchCategorie.is = true;
    for (let categorie of categories){
      this.updateMetaData({keywords: categorie.textContent});
    }

    let less = this._getElements(this.eventElements.categorie.button.less, this._getRootElement(), {setTracked: false, color: 'purple'});
    // console.log('less', less.length, less);
    for (let button of less) button.click();
    for (let content of contents) content.style.display = '';

  }

  /**
   * [_eventSetLike set event for all button likes]
   */
  _eventSetLike(){
    let buttons = this._getElements(this.eventElements.likearticelButton, this._getRootElement());
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', e => {
        this.eventFn.onEvent(
          {
            event: 'like',
            type: 'articel',
            values: this._getValues().concat([
              {name: 'like', value: 'like'},
            ])
          }
        )
      });
    }
  }

  /**
    * [_eventSetLike set event for all button for dislikes]
   */
  _eventSetDislike(){
    let buttons = this._getElements(this.eventElements.dislikearticelButton, this._getRootElement());
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', e => {
        this.eventFn.onEvent(
          {
            event: 'like',
            type: 'articel',
            values: this._getValues().concat([
              {name: 'like', value: 'dislike'},
            ])
          }
        )
      });
    }
  }

  /**
   * [_eventSubscribe subscribe channel event]
   */
  _eventSubscribe(){
    let buttons = this._getElements(this.eventElements.subscribeButton, this._getRootElement(), {color: 'blue'});
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', e => {
        this.eventFn.onEvent(
          {
            event: 'subscribe',
            type: 'articel',
            values: this._getValues()
          }
        )
      });
    }
  }

  /**
   * [_eventNewComment fire event if write new comment]
   */
  _eventNewComment(){
    let inputs = this._getElements(this.eventElements.newComment, this._getRootElement(), {color: 'blue'});
    for (let input of inputs) {
      input.addEventListener('click', e => setTimeout(() => {
          this._eventCommentDialog(input, comment => {
            this.eventFn.onEvent({
                event: 'comment',
                type: 'articel',
                values: this._getValues().concat([
                  {name: 'comment', value: comment},
                ])
            })
          })
      }, 500));
    }
  }

  /**
   * [_eventClickHashtag fire event if click user on hashtag link]
   */
  _eventClickHashtag(){
    let inputs = this._getElements(this.eventElements.hashtag, this._getRootElement(), {color: 'blue'});
    for (var i = 0; i < inputs.length; i++) {
      if(inputs[i].textContent.substring(0, 1)!='#'){
        inputs[i].classList.remove('tracked');
        this._setBorder(inputs[i], 'transparent');
      }else{
        inputs[i].addEventListener('click', e =>
            this.eventFn.onEvent(
              {
                event: 'hashtag',
                type: 'articel',
                values: this._getValues().concat([
                  {name: 'name', value: e.srcElement.textContent},
                ])
              }
            ));
      }
    }
  }

  /**
   * [_getValuesFromComment return search values of comment]
   * @param  {Object} target [DomElement]
   * @param  {Object} s      [index of this.eventElements.comment array]
   * @return {Object}        [{time: String, content: String, countMiddle: Number}]
   */
  _getValuesFromComment(target){
    //----content---
    let contentString = null;
    let content = this._getElements(this.eventElements.comment.content, target, {ignoreTracked: false});
    for (let c = 0; c < content.length; c++) contentString = content[c].textContent;
    //----time comment---
    let timeString = null;
    let timeContent = this._getElements(this.eventElements.comment.timeContent, target, {ignoreTracked: false});
    for (let t = 0; t < timeContent.length; t++) timeString = timeContent[t].textContent;
    //----countMiddle---
    let countMiddleInt = null;
    let countMiddle = this._getElements(this.eventElements.comment.countMiddle, target, {ignoreTracked: false});
    for (let cm = 0; cm < countMiddle.length; cm++) countMiddleInt = parseInt(countMiddle[cm].textContent.replace(/\D+/g, ""), 10);
    return {time: timeString, content: contentString, countMiddle: countMiddleInt};
  }

  /**
   * [_eventCommentLike set events of like oder dislike comment or write new comment for comment]
   * @param  {Object} target [DomElement default: this.getRootElement(]
   * @param  {Function} event [default: ()=>{}]
   * @param  {Object} type [default: this.eventElements.commentWrapper[0]]
   */
  _eventCommentLike(target=this._getRootElement(), event = () => {}, type=this.eventElements.commentWrapper[0]){

    let wrappers = this._getElements(type.query, target, {color: 'blue'});
    for (let wrapper of wrappers) {
      if (this.youtube_debug){
        if(type.name=='postanswer'){
          this._setBorder(wrapper, 'blue');
        }else{
          this._setBorder(wrapper, 'green');
        }
      }
      let values = this._getValuesFromComment(wrapper);

      let buttonLikes = this._getElements(this.eventElements.comment.buttonLike, wrapper);
      for (let buttonLike of buttonLikes) {
        buttonLike.addEventListener('click', e => {
          event({
            event: 'like',
            type: type.name,
            values: [
              {name: 'postanswer-time', value: values.time},
              {name: 'postanswer-count-middle', value: values.countMiddle},
              {name: 'postanswer-text', value: values.content},
              {name: 'like-value', value: 'like'}
            ]
          })
        });
      }//for buttonLikes

      let buttonDislikes = this._getElements(this.eventElements.comment.buttonDislike, wrapper);
      for (let buttonDislike of buttonDislikes) {
        buttonDislike.addEventListener('click', e => {
          event({
            event: 'like',
            type: type.name,
            values: [
              {name: 'postanswer-time', value: values.time},
              {name: 'postanswer-count-middle', value: values.countMiddle},
              {name: 'postanswer-text', value: values.content},
              {name: 'like-value', value: 'dislike'}
            ]
          })
        });
      }//for buttonLikes

      for (let buttonComment of this.eventElements.comment.buttonComment) {
        let buttonC = this._getElements(buttonComment.button, wrapper);
        for (let button of buttonC) {
          button.addEventListener('click', e => setTimeout(() => {
            try {
              let actionButtons = this.getParentElement(e.srcElement, buttonComment.parent);
              this._eventCommentDialog(actionButtons, comment => {
                event({
                  event: 'like',
                  type: type.name,
                  values: [
                    {name: 'postanswer-time', value: values.time},
                    {name: 'postanswer-count-middle', value: values.countMiddle},
                    {name: 'postanswer-text', value: values.content},
                    {name: 'comment', value: comment}
                  ]
                });
              });
            } catch (e) {
              console.log(e);
            }
          }, 500));
        }
      }//for buttonComment

    }//for wrappers



    wrappers = this._getElements(type.query, target, {filter: '.tracked:not(.find-replies)', addClass: ''});
    for (let wrapper of wrappers) {
      for (let b of this.eventElements.comment.moreCommentFromComments) {
        let parentNodes = this._getElements(b.parentNode, wrapper, {color: 'blue'});
        let values = this._getValuesFromComment(wrapper);
        for (let node of parentNodes) {
          wrapper.classList.add('find-replies');
          let content = this._getElements(b.content, node)[0];
          let timeout = null

          if (content){
            content.addEventListener('DOMSubtreeModified', () => {
              if(typeof timeout == 'number') clearTimeout(timeout);
              timeout = setTimeout(() => this._eventCommentLike(content, e => {
                let returnEvent = {
                  event: 'like',
                  type: e.type,
                  values: [
                    {name: 'postanswer-time', value: values.time},
                    {name: 'postanswer-count-middle', value: values.countMiddle},
                    {name: 'postanswer-text', value: values.content},
                  ]
                }
                for (let v of e.values) {
                  returnEvent.values.push({
                    name: e.type+'_'+v.name,
                    value: v.value
                  })
                }
                event(returnEvent);
              }, this.eventElements.commentWrapper[1]), 500);
            });
          }

        }//for parentNodes
      }//for moreCommentFromComments
    }//for

  }//()

  /**
   * [_eventCommentDialog eventhandling for wirting new comment]
   * @param  {Object} target   [description]
   * @param  {Function} fn [default: ()=>{}]
   */
  _eventCommentDialog(target, fn = ()=> {}){
    let wrappers = this._getElements(this.eventElements.commentButton.wrapper, target, {color: 'green'});
    for (let wrapper of wrappers) {
      let comment = '';
      let inputs = this._getElements(this.eventElements.commentButton.input, wrapper);
      for (let input of inputs){
        input.addEventListener('keyup', e => {
          comment = e.srcElement.textContent;
        })
      }
      let submits = this._getElements(this.eventElements.commentButton.submit, wrapper);
      for (let submit of submits){
        submit.addEventListener('click', e => {
          if(comment.length>0) fn(comment)
        })
      }
    }//for
  }

  /**
   * [return element without embedd js, css, etc]
   * @return {Promise}
   */
  _clean_embedded_scripts(target, selectors='script:not([src]),svg,style'){
    return super._clean_embedded_scripts(target, selectors + ',dom-module');
  }


  /**
   * [getDom return html content from public articel]
   * @return {String}
   */
  getDom(){
    return new Promise((resolve, reject) => {
      // if(this._isAllow()){
      
        //this._setCategorie2Meta();
        this._eventSetLike();
        this._eventSetDislike();
        this._eventSubscribe();

        this._eventNewComment();
        setTimeout(()=>{
          this._eventCommentLike(undefined, e => {
            this.eventFn.onEvent(
              {
                event: e.event,
                type: e.type,
                values: this._getValues().concat(e.values)
              }
            )
          });
          this._eventClickHashtag();
        }, 500);

        // cloning the dom does not work as expected :/
        // resolve(this._getDom());
        resolve(document.documentElement.outerHTML);

      // } else {
      //   if (this.youtube_debug) console.log('YouTube Not allow');
      //   resolve(false)
      // }


    
    });
  }

  /**
   * [onStart on start event]
   * @param  {Function} fn
   */
  onStart(fn){
    setTimeout(() => {
      if (this.youtube_debug) console.log('START!!!!');
      fn(2000);
    }, 1000);
  }

}//class
