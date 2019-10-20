export default class FacebookTracker extends Tracker{

  constructor(worker, extensionfilter=[]){
    super(worker);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.rootSearch = "#contentArea div[data-gt='{\"ref\":\"nf_generic\"}']";
    this.allow = true;
    this.debug = true;
    this.debugEvents = true;
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
        {query: ['._6coi._6qw9 li:nth-child(2) a'], nextElement: ['._4eek[role="articel"]', 'div'], text: {query: ['._72vr > span']}, countComment: {query: ['._6cuq > span']}},
        {query: ['._2h2j > div'], previousElement: ['._2h2j', 'div'],  text: {query: ['._72vr > span']}, countComment: {query: ['._6cuq > span']}},
        {query: ['.UFIReplyLink'], nextElement: '.UFIRow.UFIComment',  text: {query: ['.UFICommentBody']}, countComment: {query: ['.UFISutroLikeCount']}},
        {query: ['.UFIReplyList > div'], previousElement: '.UFIReplyList',  text: {query: ['.UFICommentBody']}, countComment: {query: ['.UFISutroLikeCount']}},
      ],
      shareButtonBevor: ['a._2nj7', 'a.share_action_link'],
      shareButton: ['a._2nj7', 'a.share_action_link'],
      joinGroup: ['a._42ft._4jy0._21ku._4jy4']
    };
    this.documentHead = '';

    this.lastUrlPath = '';
    this._setAllow();

    if(this._setAllow()){
      this._joinGroup();
      this.documentHead = this._getHead();
      // console.log(this.documentWrapper);
    }

    this.startswith_blacklist = ['/messages', '/settings'];

  }

  /**
   * [_getHead return header of HTML-Dom]
   * @return {String}
   */
  _getHead(){
    return document.querySelectorAll('head')[0].outerHTML;
  }

  /**
   * [_setAllow check if url changed and search in dom if find some elements they not allowed and set this.allow]
   */
  _setAllow(){
    if(this.lastUrlPath!==location.pathname){
      this.lastUrlPath = location.pathname;
      for (let query of this.eventElements.allowNotToTracked){
        let found = document.querySelectorAll(query+':not(.tracked)');
        this.allow = !found.length>0;
      }
    }
    return this.allow
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
   * [_isPublic checks if element is for the public oder private]
   * @param  {Object}  target [DomElement]
   * @return {Boolean}
   */
  _isPublic(target){
    let a_list = target.querySelectorAll('.fwn.fcg a');
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
    let articels = this._getElements(this.eventElements.articels, document, {setBorder: false});
    for (var i = 0; i < articels.length; i++) {
      if(this._isPublic(articels[i])){
        this._setBorder(articels[i]);
        this._setLikeEvent(articels[i]);
        this._setCommentEvent(articels[i]);

      }else{
        console.log('delete');
        delete articels[i]
      }
    }
    return articels.filter(e => e!=undefined);
  }

  /**
   * [_setCommentEvent set event handling of comment button fields]
   * @param {Object} articel
   */
  _setCommentEvent(articel){
    setTimeout(()=>{
      let commentButtons = this._getElements(this.eventElements.commentButton, articel);
      for (let button of commentButtons) {
        button.addEventListener('click', () => {
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
        })
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
        let commentButtons = this._getElements(s.query, articel);

        for (var i = 0; i < commentButtons.length; i++) {
          commentButtons[i].addEventListener('click', e => {
            if(s.hasOwnProperty('previousElement')){
              var found = this.getParentElement(e.srcElement, s.previousElement);
              var comment = found.previousElementSibling;
            }else if(s.hasOwnProperty('nextElement')){
              console.log(s.nextElement);
              var comment = this.getParentElement(e.srcElement.parentNode, s.nextElement);
              var found = comment.nextElementSibling; // comment box
            }

            setTimeout(()=>{

              let text = this._getElements(s.text.query, comment)[0].textContent,
              countElements = this._getElements(s.countComment.query, comment),
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
                if(this.debug) console.log('commtent  '+comment+' auf comment '+ text);
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
          if(this.debug) commentfields[i].setAttribute("style", "border:2px solid red !important;");
          commentfields[i].addEventListener('keyup', e => {
            let spans =  e.srcElement.querySelectorAll('span[data-text="true"]');
            if(spans.length>0){
              let comment = spans[spans.length-1].textContent;
              if(this.debugEvents) fn('TEST '+comment);
              if(e.keyCode==13){
                if(this.debug) console.log('comment', comment);
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
          if(this.debug) shareButton[i].setAttribute("style", "border:2px solid red !important;");
          let shares = shareButton[i].querySelectorAll('ul li a:not(.tracked)');
          for (var i = 0; i < shares.length; i++) {
            shares[i].classList.add('tracked');
            if(this.debug) shares[i].setAttribute("style", "border:2px solid red !important;");
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
            if(this.debugEvents) shares[i].addEventListener('mouseover', e => {
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
          if(this.debug) shares[i].setAttribute("style", "border:2px solid red !important;");
          if(after==false){
            if(this.debugEvents) shares[i].addEventListener('mouseover', e => {
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
      case 3: value = 'haha'; break;
      case 4: value = 'wow'; break;
      case 5: value = 'sad'; break;
      case 6: value = 'angry'; break;
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
          if(this.debug) buttons[i].setAttribute("style", "border:2px solid red !important;");
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
            if(this.debug) console.log('like comment 1 text => ', text);
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
                  event: 'like',
                  type: 'postanswer',
                  values: this._getValues(articel).concat([
                    {name: 'like-value', value: this.getValueOfLikeNumber(nr)},
                    {name: 'postanswer-count-likes', value: count},
                    {name: 'postText', value: text}
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
      let buttons = this._getElements(this.eventElements.likearticelButton, articel);
      for (let button of buttons) {
        button.addEventListener('click', ()=>{
          this.eventFn.onEvent(
            {
              event: 'like',
              type: 'articel',
              values: this._getValues(articel).concat([
                {name: 'like-value', value: this.getValueOfLikeNumber(1)}
              ])
            }
          )
          if(this.debug) console.log('like 1', articel);
        })
        button.addEventListener('mouseover', ()=> {
          // console.log(this._getValues(articel));
          this._toolbarHandler(nr => {
            this.eventFn.onEvent(
              {
                event: 'like',
                type: 'articel',
                values: this._getValues(articel).concat([
                  {name: 'like-value', value: this.getValueOfLikeNumber(nr)}
                ])
              }
            )
          })
        })
      }//for
    }, 500)
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
        if(this.debug) this.trackedToolbarButtons[b].setAttribute("style", "border: none");
        this.trackedToolbarButtons[b].onclick = e => {};
        this.trackedToolbarButtons[b].onmouseover = e => {};
        delete this.trackedToolbarButtons[b];
      }
      this.trackedToolbarButtons = this.trackedToolbarButtons.filter(e => e!= undefined);
    }

    let fetch = layer => {
      let buttons = this._getElements(['span [data-reaction]'], layer);
      for (let button of buttons) {
        button.onclick = e => {
          if(this.debug) console.log('click', e.srcElement.parentElement.getAttribute("data-reaction"));
          fn(parseInt(e.srcElement.parentElement.getAttribute("data-reaction"), 10))
        }
        if(this.debugEvents) button.onmouseover = e =>{
          console.log('mouseOver');
          layer.stop();
          fn(parseInt(e.srcElement.parentElement.getAttribute("data-reaction"), 10))
        }
      }
    }


    setTimeout(() =>{
        let layers = this._getElements(['.uiLayer div[role="toolbar"]'], document, {setTracked: false});
        for (let layer of layers) {
          layer.timeouts = [];
          layer.timeouts.push(setTimeout(()=>{
            if(this.debug) console.log('START REMOVE');
            remove();
          }, 2000))
          if(this.debug) console.log('start=>', layer.timeouts);
          layer.stop = () => {
            for (let c in layer.timeouts) {
              if(typeof layer.timeouts[c] == 'number'){
                clearTimeout(layer.timeouts[c]);
                delete layer.timeouts[c];
              }
            }
            layer.timeouts = layer.timeouts.filter(e => e!= undefined);
            // if(this.debug) console.log('STOP', layer.timeouts);
          }
          layer.onmouseleave = e => {
            layer.stop();
            layer.timeouts.push(setTimeout(()=>{
              if(this.debug) layer.setAttribute("style", "border: none");
              remove();
            }, 1100));
          }
          layer.onmouseover = e => {
            layer.stop();
            fetch(layer)
          }
          fetch(layer)
        }//for
    }, 1000)
  }

  /**
   * [_joinGroup event handling for join in public group]
   * @return {[type]} [description]
   */
  _joinGroup(){
    for (let query of this.eventElements.joinGroup) {
      let buttons = document.querySelectorAll(query+':not(.tracked)');
      for (let i = 0; i < buttons.length; i++) {
        if(this.debug) buttons[i].setAttribute("style", "border:2px solid red !important;");
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
          if(this.debug) console.log('join group', lastpost, id, link, name, countGroupUser);
        })
        if(this.debugEvents) buttons[i].addEventListener('mouseover', e => {
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
  getDom(){
    if(this._setAllow()){
      let found = this._getPublicArticels();
      for (var i = 0; i < found.length; i++) {
        this.elements.push(found[i]);
        this.elementStrings += found[i].outerHTML
      }
      return '<html>'+this.documentHead+'<body>'+this.elementStrings+'</body>'+'</html>';
    }else{
      if(this.debug) console.log('Not allow');
      return false;
    }
    return '';
  }

  /**
   * [onStart on start event]
   * @param  {Function} fn
   */
  onStart(fn){
    setTimeout(() => {
      if(this.debug) console.log('START!!!!');
      fn(1000);
    }, 1000);
  }

}
