import Tracker from '../Tracker';

export default class YouTubeTracker extends Tracker{

  constructor(worker, extensionfilter=[]){
    super(worker);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.rootElement = document;
    this.fetchCategorie = {
      is: false,
      count: 0,
      MAX_COUNT: 4
    };
    this.allow = true;
    this.debug = false;
    this.debugEvents = false;
    this.eventElements = {
      root: ['#primary'],
      allow: ['#primary'],
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
    this.lastUrlPath = '';
    this.values = [];

    this.subpath_blacklist = ['/account'];
    
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
   * [_setCategorie2Meta set the categorie to the meta keysworts]
   */
  _setCategorie2Meta(){
    if(this.fetchCategorie.is || this.fetchCategorie.count >= this.fetchCategorie.MAX_COUNT) return
    this.fetchCategorie.count += 1;
    // console.log('this.fetchCategorie.count', this.fetchCategorie.count);

    setTimeout(()=> {
        var contents = this._getElements(this.eventElements.categorie.contents, this._getRootElement(), {setTracked: false});
        for (let content of contents) content.style.display = 'none';

        let more = this._getElements(this.eventElements.categorie.button.more, this._getRootElement(), {setTracked: false});
        // console.log('more', more.length, more);
        for (let button of more) button.click();

        let categories = this._getElements(this.eventElements.categorie.categories, this._getRootElement(), {setTracked: false});
        // console.log(categories);
        if(categories.length>0) this.fetchCategorie.is = true;
        for (let categorie of categories){
          this.updateMetaData({keywords: categorie.textContent});
        }

        setTimeout(()=>{
          let less = this._getElements(this.eventElements.categorie.button.less, this._getRootElement(), {setTracked: false});
          // console.log('less', less.length, less);
          for (let button of less) button.click();
          for (let content of contents) content.style.display = '';
        }, 2000)
    }, 500);
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
   * [_eventComment set events of like oder dislike comment or write new comment for comment]
   * @param  {Object} target [DomElement default: this.getRootElement(]
   * @param  {Function} event [default: ()=>{}]
   * @param  {Object} type [default: this.eventElements.commentWrapper[0]]
   */
  _eventComment(target=this._getRootElement(), event = () => {}, type=this.eventElements.commentWrapper[0]){

    let wrappers = this._getElements(type.query, target, {color: 'blue'});
    for (let wrapper of wrappers) {
      if(this.debug){
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
          content.addEventListener('DOMSubtreeModified', () => {
            if(typeof timeout == 'number') clearTimeout(timeout);
            timeout = setTimeout(() => this._eventComment(content, e => {
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
   * [getDom return html content from public articel]
   * @return {String}
   */
  getDom(){
    return new Promise((resolve, reject) => {
      if(this._isAllow()){
        this._setCategorie2Meta();
        this._eventSetLike();
        this._eventSetDislike();
        this._eventSubscribe();
        this._eventNewComment();
        setTimeout(()=>{
          this._eventComment(undefined, e => {
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
        resolve(document.documentElement.outerHTML)
      }else{
        if(this.debug) console.log('Not allow');
        resolve(false)
      }
    });
  }

  /**
   * [onStart on start event]
   * @param  {Function} fn
   */
  onStart(fn){
    setTimeout(() => {
      if(this.debug) console.log('START!!!!');
      fn(2000);
    }, 1000);
  }

}//class
