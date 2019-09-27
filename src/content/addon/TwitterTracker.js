import Tracker from '../Tracker';

export default class TwitterTracker extends Tracker{

  constructor(worker, extensionfilter=[]){
    super(worker);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.allow = false;
    this.debug = true;
    this.debugEvents = false;
    this.eventElements = {
      root: ['#stream-items-id'],
      allow: ['#stream-items-id'],
      articels: ['article'],//#['#stream-items-id li > .tweet'],
      likeButton: ['.ProfileTweet-actionList .js-actionFavorite'],
      commentDialog: {
        wrapper: ['#global-tweet-dialog'],
        id: ['#global-tweet-dialog-body .tweet'],
        content: ['#tweet-box-global'],
        submitButton: ['.tweet-button > .EdgeButton']
      },
      retweetDialog: {
        wrapper: ['#retweet-tweet-dialog'],
        id: ['#retweet-tweet-dialog-body .tweet'],
        content: ['#retweet-with-comment'],
        submitButton: ['.RetweetDialog-footer .tweet-button > .EdgeButton']
      },
      tweetstormDialog:{
        wrapper: ['#Tweetstorm-dialog'],
        id: ['#Tweetstorm-dialog #Tweetstorm-tweet-box-0 .tweet'],
        content: ['.TweetstormDialog-tweet-box.initialized .RichEditor-scrollContainer .tweet-box'],
        submitButton: ['.modal-footer .SendTweetsButton'],
        newTweetButton: ['.modal-footer .js-add-tweet']
      },
      permalinkOverlay:{
        wrapper: ['#permalink-overlay-dialog', '#permalink-overlay'],
        content: ['#permalink-overlay-dialog .permalink-tweet-container .tweet'],
        comment: {
          text: ['.inline-reply-tweetbox-container .RichEditor-scrollContainer .tweet-box'],
          submitButton: ['.tweet-button > .EdgeButton']
        }
      },
      svg_home_activated: 'nav a svg g path[d="M22.58 7.35L12.475 1.897c-.297-.16-.654-.16-.95 0L1.425 7.35c-.486.264-.667.87-.405 1.356.18.335.525.525.88.525.16 0 .324-.038.475-.12l.734-.396 1.59 11.25c.216 1.214 1.31 2.062 2.66 2.062h9.282c1.35 0 2.444-.848 2.662-2.088l1.588-11.225.737.398c.485.263 1.092.082 1.354-.404.263-.486.08-1.093-.404-1.355zM12 15.435c-1.795 0-3.25-1.455-3.25-3.25s1.455-3.25 3.25-3.25 3.25 1.455 3.25 3.25-1.455 3.25-3.25 3.25z"]',
      svg_home_deactivated: 'nav a svg g path[d="M22.46 7.57L12.357 2.115c-.223-.12-.49-.12-.713 0L1.543 7.57c-.364.197-.5.652-.303 1.017.135.25.394.393.66.393.12 0 .243-.03.356-.09l.815-.44L4.7 19.963c.214 1.215 1.308 2.062 2.658 2.062h9.282c1.352 0 2.445-.848 2.663-2.087l1.626-11.49.818.442c.364.193.82.06 1.017-.304.196-.363.06-.818-.304-1.016zm-4.638 12.133c-.107.606-.703.822-1.18.822H7.36c-.48 0-1.075-.216-1.178-.798L4.48 7.69 12 3.628l7.522 4.06-1.7 12.015z"]'
    };
    this.lastUrlPath = '';
    this.documentHead = '';
    this.values = [];
    this.elements = [];
    this.elementStrings = '';
    this.tweetId2Element = {};
    console.log(+ new Date());
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
        query: ['.tweet-timestamp'],
        default: undefined,
        filter: e => e.getAttribute('title')
      },
      {
        name: 'articel-link',
        query: ['.tweet-timestamp'],
        default: undefined,
        filter: e => location.href.substring(0, location.href.length-1)+e.getAttribute('href')
      },
      {
        name: 'articel-headertext',
        query: ['.tweet-text'],
        default: undefined,
        filter: e => e.textContent
      },
      {
        name: 'articel-description',
        query: ['.TweetTextSize'],
        default: undefined,
        filter: e => e.textContent
      },
      {
        name: 'articel-publisher-name',
        query: ['.FullNameGroup .fullname'],
        default: undefined,
        filter: e => e.textContent.match(/\b(\w*[A-Za-z0-9 äÄöÖüÜß]\w*)\b/g).join('')
      },
      {
        name: 'articel-count-likes',
        query: ['.ProfileTweet-actionButton.js-actionFavorite .ProfileTweet-actionCountForPresentation'],
        default: undefined,
        filter: e => parseInt(e.textContent, 10)
      },
      {
        name: 'articel-count-comments',
        query: ['.ProfileTweet-actionCountList .ProfileTweet-actionCount'],
        default: undefined,
        filter: e => parseInt(e.getAttribute('data-tweet-stat-count'), 10)
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
   * [_setAllow check if url changed and search in dom if find some elements they not allowed and set this.allow]
   */
  _setAllow(){
    return new Promise((resolve, reject) => {
      console.log(this.lastURL!==location.pathname, this.lastURL, location.pathname);
      if(this.lastUrlPath!==location.pathname){
        setTimeout(() => {
          this.lastUrlPath = location.pathname
          console.log('?????????????????');
          for (let query of this.eventElements.allow) {
            let found = document.querySelectorAll(query+':not(.tracked)');
            console.log('found', found);
            this.allow = !found.length>0
          }
          console.log('ALLOW?', this.allow);
          resolve(this.allow);
        }, 2000)
      }else{
        resolve(this.allow);
      }
    });
  }



  /**
   * [_getHead return header of HTML-Dom]
   * @return {String}
   */
  _getHead(){
    this.documentHead = document.querySelectorAll('head')[0].outerHTML;
    return this.documentHead;
  }



  /**
   * [_isPublic checks if element is for the public oder private]
   * @param  {Object}  target [DomElement]
   * @return {Boolean}
   */
  _isPublic(target){
    var ispublic = true;
    //var svgs = target.getElementsByTagName('svg');

    var svgs = target.querySelectorAll('svg[aria-label="Protected account"]');

    if (svgs.length > 0) {
      return false;
    } else {
      return true;
    }

    // for (var i = 0; i < svgs.length; i++) {
    //   if (svgs[i].hasAttribute('aria-label')) {
    //     if (svgs[i].getAttribute('aria-label') == 'Protected account') {
    //       ispublic = false;
    //       break;
    //     }
    //   }
    // }

    //return ispublic;
    //return !target.querySelectorAll('[class="Icon Icon--protected"]').length>0;
  }

  /**
   * [_getPublicArticels return elements of public articels]
   * @return {Array} articels
   */
  _getPublicArticels(){
    let articels = this._getElements(this.eventElements.articels, document, {setBorder: false});
    for (var i = 0; i < articels.length; i++) {
      if(this._isPublic(articels[i])){
        this._setBorder(articels[i]);
        let id = articels[i].getAttribute('data-tweet-id');
        this.tweetId2Element[id] = articels[i];
        this._setEventLikeButton(id);
      }else{
        delete articels[i]
      }
    }
    return articels.filter(e => e!=undefined);
  }

  /**
   * [_setEventLikeButton set like-events for un-/like buttons from articel]
   * @param {number} id
   */
  _setEventLikeButton(id){
    let likeButton = this._getElements(this.eventElements.likeButton, this.tweetId2Element[id]);
    for (var i = 0; i < likeButton.length; i++) {
      likeButton[i].addEventListener('click', e => {
        let value = 'like';
        if(e.srcElement.parentNode.parentNode.classList.contains('u-linkClean')) value = 'unlike';
        this.eventFn.onEvent({
          event: 'like',
          type: 'articel',
          values: this._getValues(this.tweetId2Element[id]).concat([
             {name: 'like', value: value}
          ])
        })
      })//mouseover
    }
  }

  /**
   * [_eventListenComment listen the comment dialog and fire comment event if the user write some comment]
   */
  _eventListenComment(){
    let tweet = this._getElements(this.eventElements.commentDialog.id, document);
    if(tweet.length>0){
      let id = tweet[0].getAttribute("data-tweet-id");
      if(Object.keys(this.tweetId2Element).includes(id)){
        let wrapper = this._getElements(this.eventElements.commentDialog.wrapper, document, {setBorder: false})[0];
        let content = this._getElements(this.eventElements.commentDialog.content, wrapper)[0];
        let submitButton = this._getElements(this.eventElements.commentDialog.submitButton, wrapper)[0];
        submitButton.addEventListener('click', e => {
          this.eventFn.onEvent({
            event: 'comment',
            type: 'articel',
            values: this._getValues(this.tweetId2Element[id]).concat([
               {name: 'comment', value: content.textContent}
            ])
          })
        })
      }//if
    }//if
  }

  /**
   * [_eventListenComment listen the retweet dialog and fire retweet-event if the user write some new retweet]
   */
  _eventListenRetweet(){
    let tweet = this._getElements(this.eventElements.retweetDialog.id, document);
    if(tweet.length>0){
      let id = tweet[0].getAttribute("data-tweet-id");
      if(Object.keys(this.tweetId2Element).includes(id)){
        let wrapper = this._getElements(this.eventElements.retweetDialog.wrapper, document, {setBorder: false})[0];
        let content = this._getElements(this.eventElements.retweetDialog.content, wrapper)[0];
        let submitButtons = this._getElements(this.eventElements.retweetDialog.submitButton, wrapper);
        for (var i = 0; i < submitButtons.length; i++) {
          submitButtons[i].addEventListener('click', e => {
            this.eventFn.onEvent({
              event: 'retweet',
              type: 'articel',
              values: this._getValues(this.tweetId2Element[id]).concat([
                 {name: 'comment', value: content.textContent}
              ])
            })
          })
        }//for
      }//if
    }//if
  }

  /**
   * [_eventListenTweetstorm listen the tweetstorm-dialog and fire event if the user write new threds]
   */
  _eventListenTweetstorm(){
    let tweet = this._getElements(this.eventElements.tweetstormDialog.id, document);
    if(tweet.length>0){
      let id = tweet[0].getAttribute("data-tweet-id");
      if(Object.keys(this.tweetId2Element).includes(id)){

        let wrapper = this._getElements(this.eventElements.tweetstormDialog.wrapper, document, {setBorder: false})[0];
        let content = this._getElements(this.eventElements.tweetstormDialog.content, wrapper);
        let submitButton = this._getElements(this.eventElements.tweetstormDialog.submitButton, wrapper)[0];
        let newTweetButton = this._getElements(this.eventElements.tweetstormDialog.newTweetButton, wrapper)[0];

        newTweetButton.addEventListener('click', () => setTimeout(()=>{
          let newContent = this._getElements(this.eventElements.tweetstormDialog.content, wrapper);
          content = content.concat(newContent);
        }, 500))

        submitButton.addEventListener('click', e => {
          let values = this._getValues(this.tweetId2Element[id]),
          comments = content.map(e => e.textContent).filter(e => e.length>0);

          for (var i = 0; i < comments.length; i++)
            values.push({name: 'comment-'+(i+1), value: comments[i]})

          this.eventFn.onEvent({
            event: 'retweet',
            type: 'articel',
            values: values
          })
        })
      }//if
    }//if
  }

  /**
   * [_eventListenPermalinkOverlay description]
   */
  _eventListenPermalinkOverlay(){
    let articels = this._getElements(this.eventElements.permalinkOverlay.content, document);
    if(articels.length==1 && this._isPublic(articels[0])){
      let id = articels[0].getAttribute("data-tweet-id");
      this.tweetId2Element[id] = articels[0];
      let wrapper = this._getElements(this.eventElements.permalinkOverlay.wrapper, document)[0];
      let content = this._getElements(this.eventElements.permalinkOverlay.comment.text, wrapper)[0];
      let submitButton = this._getElements(this.eventElements.permalinkOverlay.comment.submitButton, wrapper)[0];
      submitButton.addEventListener('click', e => {
        this.eventFn.onEvent({
          event: 'comment',
          type: 'articel',
          values: this._getValues(this.tweetId2Element[id]).concat([
             {name: 'comment', value: content.textContent}
          ])
        })
      })
    }//if
  }


  /**
   * [return true if user is logged in twitter]
   * @return {[bool]} [description]
   */
  _isNotLoggedTwitter(){
    //document.documentElement.querySelectorAll('script,link,svg,style');
    //var navs = document.documentElement.getElementsByTagName('nav');
    //var navs = document.documentElement.querySelectorAll('nav a[aria-label="Profile"]');

    var svgs = document.documentElement.querySelectorAll(
      this.eventElements.svg_home_deactivated);
    console.log(svgs);
    if (svgs.length > 0){
      console.log('it is logged!!!!!!');
      return false;
    } else {
      var svgs = document.documentElement.querySelectorAll(
        this.eventElements.svg_home_activated);
      console.log(svgs);
      if (svgs.length > 0){
        console.log('it is logged!!!!!!');
        return false;
      } else {
        console.log('NOOOOOOOOT logged!!!!!!');
        return true;
      }
    }

  }

  /**
   * [getDom return html content from public articel]
   * @return {String}
   */
  getDom(){
    if (this._isNotLoggedTwitter()){
        return super.getDom();
    } else {
      return new Promise(async (resolve, reject) => {
        let found = this._getPublicArticels();
        this._eventListenComment();
        this._eventListenRetweet();
        this._eventListenTweetstorm();
        this._eventListenPermalinkOverlay();
        for (var i = 0; i < found.length; i++) {
          this.elements.push(found[i]);
          this.elementStrings += found[i].outerHTML;
          //this.elementStrings += "<div>" + found[i].textContent + "</div>";
        }

        console.log('DOOMING....');
        console.log(this.elements.length);

        if(this.elements.length==0){
          if(this.debug) console.log('Not allow');
          resolve(false);
        }else{

          console.log('RESOLVING....');
          resolve('<html>'+this._getHead()+'<body>'+this.elementStrings+'</body>'+'</html>');
        }
      })
    }
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
