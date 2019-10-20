import Tracker from '../Tracker';

export default class TwitterTracker extends Tracker{

  constructor(worker, extensionfilter=[]){
    super(worker);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.is_allowed = null;
    
    this.allow = false;
    this.debug = true;
    this.debugEvents = false;
    this.selectors = {
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
      svg_home_deactivated: 'nav a svg g path[d="M22.46 7.57L12.357 2.115c-.223-.12-.49-.12-.713 0L1.543 7.57c-.364.197-.5.652-.303 1.017.135.25.394.393.66.393.12 0 .243-.03.356-.09l.815-.44L4.7 19.963c.214 1.215 1.308 2.062 2.658 2.062h9.282c1.352 0 2.445-.848 2.663-2.087l1.626-11.49.818.442c.364.193.82.06 1.017-.304.196-.363.06-.818-.304-1.016zm-4.638 12.133c-.107.606-.703.822-1.18.822H7.36c-.48 0-1.075-.216-1.178-.798L4.48 7.69 12 3.628l7.522 4.06-1.7 12.015z"]',
      
      //svg_maintweet_protected: ':not(article) svg g path[d="M19.75 7.31h-1.88c-.19-3.08-2.746-5.526-5.87-5.526S6.32 4.232 6.13 7.31H4.25C3.01 7.31 2 8.317 2 9.56v10.23c0 1.24 1.01 2.25 2.25 2.25h15.5c1.24 0 2.25-1.01 2.25-2.25V9.56c0-1.242-1.01-2.25-2.25-2.25zm-7 8.377v1.396c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-1.396c-.764-.3-1.307-1.04-1.307-1.91 0-1.137.92-2.058 2.057-2.058 1.136 0 2.057.92 2.057 2.056 0 .87-.543 1.61-1.307 1.91zM7.648 7.31C7.838 5.06 9.705 3.284 12 3.284s4.163 1.777 4.352 4.023H7.648z"]',
      //svg_tweet_protected: 'article svg g path[d="M19.75 7.31h-1.88c-.19-3.08-2.746-5.526-5.87-5.526S6.32 4.232 6.13 7.31H4.25C3.01 7.31 2 8.317 2 9.56v10.23c0 1.24 1.01 2.25 2.25 2.25h15.5c1.24 0 2.25-1.01 2.25-2.25V9.56c0-1.242-1.01-2.25-2.25-2.25zm-7 8.377v1.396c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-1.396c-.764-.3-1.307-1.04-1.307-1.91 0-1.137.92-2.058 2.057-2.058 1.136 0 2.057.92 2.057 2.056 0 .87-.543 1.61-1.307 1.91zM7.648 7.31C7.838 5.06 9.705 3.284 12 3.284s4.163 1.777 4.352 4.023H7.648z"]',

      svg_tweet_protected: 'article svg g path[d="M19.75 7.31h-1.88c-.19-3.08-2.746-5.526-5.87-5.526S6.32 4.232 6.13 7.31H4.25C3.01 7.31 2 8.317 2 9.56v10.23c0 1.24 1.01 2.25 2.25 2.25h15.5c1.24 0 2.25-1.01 2.25-2.25V9.56c0-1.242-1.01-2.25-2.25-2.25zm-7 8.377v1.396c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-1.396c-.764-.3-1.307-1.04-1.307-1.91 0-1.137.92-2.058 2.057-2.058 1.136 0 2.057.92 2.057 2.056 0 .87-.543 1.61-1.307 1.91zM7.648 7.31C7.838 5.06 9.705 3.284 12 3.284s4.163 1.777 4.352 4.023H7.648z"]',
      svg_account_protected: ':not(article) svg g path[d="M19.75 7.31h-1.88c-.19-3.08-2.746-5.526-5.87-5.526S6.32 4.232 6.13 7.31H4.25C3.01 7.31 2 8.317 2 9.56v10.23c0 1.24 1.01 2.25 2.25 2.25h15.5c1.24 0 2.25-1.01 2.25-2.25V9.56c0-1.242-1.01-2.25-2.25-2.25zm-7 8.377v1.396c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-1.396c-.764-.3-1.307-1.04-1.307-1.91 0-1.137.92-2.058 2.057-2.058 1.136 0 2.057.92 2.057 2.056 0 .87-.543 1.61-1.307 1.91zM7.648 7.31C7.838 5.06 9.705 3.284 12 3.284s4.163 1.777 4.352 4.023H7.648z"]',

      // assumes that the target is the tweet/comment
      //svg_proeet_favorite: ':not(article) svg g path[d="M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12zM7.354 4.225c-2.08 0-3.903 1.988-3.903 4.255 0 5.74 7.034 11.596 8.55 11.658 1.518-.062 8.55-5.917 8.55-11.658 0-2.267-1.823-4.255-3.903-4.255-2.528 0-3.94 2.936-3.952 2.965-.23.562-1.156.562-1.387 0-.014-.03-1.425-2.965-3.954-2.965z"]',
      //svg_favorite: 'article svg g path[d="M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12zM7.354 4.225c-2.08 0-3.903 1.988-3.903 4.255 0 5.74 7.034 11.596 8.55 11.658 1.518-.062 8.55-5.917 8.55-11.658 0-2.267-1.823-4.255-3.903-4.255-2.528 0-3.94 2.936-3.952 2.965-.23.562-1.156.562-1.387 0-.014-.03-1.425-2.965-3.954-2.965z"]',
      svg_favorite: 'svg g path[d="M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12zM7.354 4.225c-2.08 0-3.903 1.988-3.903 4.255 0 5.74 7.034 11.596 8.55 11.658 1.518-.062 8.55-5.917 8.55-11.658 0-2.267-1.823-4.255-3.903-4.255-2.528 0-3.94 2.936-3.952 2.965-.23.562-1.156.562-1.387 0-.014-.03-1.425-2.965-3.954-2.965z"]',
 
      /**This is not enough!!!, the icon appears twice!!!
      an idea is two check for the content:
      .parentNode.parentNode.parentNode.innerText != ''
      **/
      //svg_maintweet_retweet: ':not(article) svg g path[d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z"]',
      //svg_retweet: 'article svg g path[d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z"]'
      svg_retweet: 'svg g path[d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z"]',
      /** there is also the retweet with comment**/

      // the twitter id needs to be search in the .parentNode.parentNode.parentNode.getAttribute('href'), e.g. "/username/status/995297509001048064/analytics"
      svg_maintweet_tweetid: 'a svg g path[d="M12 22c-.414 0-.75-.336-.75-.75V2.75c0-.414.336-.75.75-.75s.75.336.75.75v18.5c0 .414-.336.75-.75.75zm5.14 0c-.415 0-.75-.336-.75-.75V7.89c0-.415.335-.75.75-.75s.75.335.75.75v13.36c0 .414-.337.75-.75.75zM6.86 22c-.413 0-.75-.336-.75-.75V10.973c0-.414.337-.75.75-.75s.75.336.75.75V21.25c0 .414-.335.75-.75.75z"]',
      svg_maintweet_tweetid_regex: /.*status\/(\d+).*/,
      // the twitter id needs to be search in the .parentNode.getAttribute('href'), e.g. "/username/status/1176767347950084096"
      time_tweetid: 'a time',
      time_tweetid_regex: /.*status\/(\d+).*/
    };

    this.lastUrlPath = '';

    this.values = [];
    this.elements = [];
    this.elementStrings = '';
    this.tweetId2Element = {};
    this.whoId2Element = {};
    this.tweets_exist = false;

    this.startswith_blacklist = ['/messages', '/settings'];

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
          for (let query of this.selectors.allow) {
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


  is_content_allowed() {
    if (this.is_allowed == null){
      this.is_allowed = true;
      if (document.querySelector(this.selectors.svg_account_protected)){
        this.is_allowed = false;
        return this.is_allowed;
      }
    }
    return this.is_allowed;
  }

  /**
   * [_setEventLikeButton set like-events for un-/like buttons from articel]
   * @param {number} id
   */
  _setEventLikeButton(id){
    let likeButton = this._getElements(this.selectors.likeButton, this.tweetId2Element[id]);
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
    let tweet = this._getElements(this.selectors.commentDialog.id, document);
    if(tweet.length>0){
      let id = tweet[0].getAttribute("data-tweet-id");
      if(Object.keys(this.tweetId2Element).includes(id)){
        let wrapper = this._getElements(this.selectors.commentDialog.wrapper, document, {setBorder: false})[0];
        let content = this._getElements(this.selectors.commentDialog.content, wrapper)[0];
        let submitButton = this._getElements(this.selectors.commentDialog.submitButton, wrapper)[0];
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
    let tweet = this._getElements(this.selectors.retweetDialog.id, document);
    if(tweet.length>0){
      let id = tweet[0].getAttribute("data-tweet-id");
      if(Object.keys(this.tweetId2Element).includes(id)){
        let wrapper = this._getElements(this.selectors.retweetDialog.wrapper, document, {setBorder: false})[0];
        let content = this._getElements(this.selectors.retweetDialog.content, wrapper)[0];
        let submitButtons = this._getElements(this.selectors.retweetDialog.submitButton, wrapper);
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
    let tweet = this._getElements(this.selectors.tweetstormDialog.id, document);
    if(tweet.length>0){
      let id = tweet[0].getAttribute("data-tweet-id");
      if(Object.keys(this.tweetId2Element).includes(id)){

        let wrapper = this._getElements(this.selectors.tweetstormDialog.wrapper, document, {setBorder: false})[0];
        let content = this._getElements(this.selectors.tweetstormDialog.content, wrapper);
        let submitButton = this._getElements(this.selectors.tweetstormDialog.submitButton, wrapper)[0];
        let newTweetButton = this._getElements(this.selectors.tweetstormDialog.newTweetButton, wrapper)[0];

        newTweetButton.addEventListener('click', () => setTimeout(()=>{
          let newContent = this._getElements(this.selectors.tweetstormDialog.content, wrapper);
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
    let articels = this._getElements(this.selectors.permalinkOverlay.content, document);
    if(articels.length==1 && this._isPublic(articels[0])){
      let id = articels[0].getAttribute("data-tweet-id");
      this.tweetId2Element[id] = articels[0];
      let wrapper = this._getElements(this.selectors.permalinkOverlay.wrapper, document)[0];
      let content = this._getElements(this.selectors.permalinkOverlay.comment.text, wrapper)[0];
      let submitButton = this._getElements(this.selectors.permalinkOverlay.comment.submitButton, wrapper)[0];
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
      this.selectors.svg_home_deactivated);
    if (svgs.length > 0){
      if(this.debug) console.log(' ++++ Logged!!!!!! +++');
      return false;
    } else {
      var svgs = document.documentElement.querySelectorAll(
        this.selectors.svg_home_activated);
      if (svgs.length > 0){
        if(this.debug) console.log(' ++++ Logged!!!!!! +++');
        return false;
      } else {
        if(this.debug) console.log('Not logged!!!!!!');
        return true;
      }
    }

  }

  /**
   * [_isPublic checks if element is for the public oder private]
   * @param  {Object}  target [DomElement]
   * @return {Boolean}
   */
  _isPublic(target){
    var ispublic = true;
    var svgs = target.querySelectorAll(this.selectors.svg_tweet_protected);  

    if (svgs.length > 0) {
      return false;
    } else {
      return true;
    }
  }


  /**
   * [_isHeaderTweet checks if element is the one open (header Tweet) ]
   * @param  {Object}  target [DomElement]
   * @return {Boolean}
   */
  _isHeaderTweet(target){
    if (target.hasChildNodes()){
      // Hackish way to detect the header
      if(target.children[0].childElementCount > 2) {
        return true;
      }
    }
    return false; 
  }

    /**
   * [_getHeaderId get the tweet header id from the location bar]
   * @param  {Object}  target [DomElement]
   * @return {int}
   */
  _getHeaderId(article){
    
    var match = location.pathname.match(this.selectors.time_tweetid_regex);
    if (match != null){
      return match[1];
    }
    return null;

  }



  /**
   * [_getId looks for an href that contains the id of the element]
   * @param  {Object}  target [DomElement]
   * @return {int}
   */
  _getId(article){
    try {

      var _clone = article.cloneNode(true);
      var times = article.querySelectorAll(this.selectors.time_tweetid);
      if (times.length > 0){
        return times[0].parentNode.getAttribute('href').match(this.selectors.time_tweetid_regex)[1];
      } else {
        var svgs = article.querySelectorAll(this.selectors.svg_maintweet_tweetid);
        if (svgs.length > 0){
          return svgs[0].parentNode.parentNode.parentNode.getAttribute('href').match(this.selectors.svg_maintweet_tweetid_regex)[1];
        }
      }
    }
    catch(error) {
      console.log(error);
      console.log('Unexpected error getting Twitter ID in TwitterTracker');
    }
    
    return null;
  }


  /**
   * [_getPublicArticels start tracking an article]
   */
  trackArticle(id, article){
    this.tweetId2Element[id] = article.cloneNode(true);
  }

  /**
   * [_getPublicArticels return elements of public articels]
   * @return {Array} true if at least one article was found
   */
  addPublicArticles(){
    let articles = document.querySelectorAll('article');

    let counter = 0;

    for (var i = 0; i < articles.length; i++) {
      //let id = articles[i].getAttribute('data-tweet-id');
      let id = this._getId(articles[i]);
      if (id == null) {
        // Heeader Tweet
        if ((i == 0) && this._isHeaderTweet(articles[i])){
          let id = this._getHeaderId();
          //if (this.debug) console.log('HEADER ID detected: ' + id);
          this.trackArticle(id, articles[i]);
          debugger;
          counter += 1;
        } else {
          // This does not seem to be a tweet
          delete articles[i];
        }
      } else {
        if(this._isPublic(articles[i])){
          //this._setBorder(articles[i]);
          //let id = this._getId(articles[i]);
          //if (this.debug) console.log('ID detected: ' + id);
          this.trackArticle(id, articles[i]);

          counter += 1;
        }else{
          //if (this.debug) console.log('Not public: ', articles[i]);
        }
      }
    }

    if (this.debug) console.log('Articles Found: ' + articles.length);
    if (this.debug) console.log('Public Articles: ' + counter);

    // return True if at lest one article was found (regardless it being public/private)
    return articles.length > 0;
  }


  /**
   * [_getId looks for a user id to follow]
   * @param  {Object}  target [DomElement]
   * @return {int}
   */
  _getWhoId(article){
    try {
      var _clone = article.cloneNode(true);
      var _anchor = article.querySelector('a[href]');
      if (_anchor){
        return _anchor.getAttribute('href');
      }
    }
    catch(error) {
      console.log(error);
      console.log('Unexpected error getting Twitter ID in TwitterTracker');
    }
    
    return null;
  }

  /**
   * [_getPublicArticels return elements of public articels]
   * @return {Array} true if at least one article was found
   */
  addWhoToFollow(){
    let who = document.querySelectorAll('div[data-testid="primaryColumn"] div[data-testid="UserCell"]')

    let counter = 0;
    for (var i = 0; i < who.length; i++) {
      //let id = who[i].getAttribute('data-tweet-id');
      let id = this._getWhoId(who[i]);
      if (id != null) {
        //if (this.debug) console.log('ID detected: ' + id);
        this.whoId2Element[id] = who[i].cloneNode(true);
        counter += 1;
      }
    }

    if (this.debug) console.log('WhoToFollow: ' + who.length);
    if (this.debug) console.log('WhoToFollow correct: ' + counter);

    // return True if at lest one article was found (regardless it being public/private)
    return who.length > 0;
  }


  /**
   * [assembleDom with the existent html]
   * @return {String}
   */
  assembleDom(){
    var tweet_strings = '';
    var counter = 0;
    for (var key in this.tweetId2Element) {
      if (this.tweetId2Element.hasOwnProperty(key)){
        this.tweetId2Element[key].setAttribute('webtrack-tweet-id', key);
        tweet_strings += this.tweetId2Element[key].outerHTML;
        counter += 1;
      }
    }
    if(counter == 0){
      if(this.debug) console.log('No public tweets/replies found');
    }

    var who_strings = '';
    var counter = 0;
    for (var key in this.whoId2Element) {
      if (this.whoId2Element.hasOwnProperty(key)){
        who_strings += this.whoId2Element[key].outerHTML;
        counter += 1;
      }
    }
    if(counter == 0){
      if(this.debug) console.log('No public tweets/replies found');
    }


    var sidebar = document.querySelector('div[data-testid="sidebarColumn"]');
    if (sidebar){
      sidebar = sidebar.outerHTML;
    } else {
      sidebar = '';
    }

    if(this.debug) console.log('Sending ' + counter + ' tweets');
    return '<html>' + this._getHead() + 
       '<body><h1>Tweets</h1><div class="tweets">' + tweet_strings +
      '</div><h1>Who To Follow</h1><div class="WhoToFollow">' + who_strings + 
      '</div><h1>SideBar</h1><div class="sidebar">' + sidebar +  '</div></body>'+'</html>';
    
  }


  /**
   * [return dom as string]
   * @return {Promise}
   */
  _getDom(){
    var tclone = document.documentElement.cloneNode(true);

    tclone = this._clean_embedded_scripts(tclone, 'script:not([src]),svg,style,noscript');

    return tclone.outerHTML;
    //resolve(document.documentElement.outerHTML);

  }


  /**
   * [return dom as string]
   * @return {Promise}
   */
  getDom(){
    if (this._isNotLoggedTwitter()){
        return super.getDom();
    } else {
      return new Promise((resolve, reject) => {
        let found = this.addPublicArticles();
        this.addWhoToFollow();

        //this._eventListenComment();
        //this._eventListenRetweet();
        //this._eventListenTweetstorm();
        //this._eventListenPermalinkOverlay();

        this.tweets_exist = found || this.tweets_exist;

        if (this.tweets_exist){
            //SEND
          if (this.debug) console.log('assembling dom');
          resolve(this.assembleDom());
        } else if (this.tweets_exist == false) {
          if (this.debug) console.log('No tweets were found');
          // just send the entire html
          resolve(this._getDom());
        }      
      });
    }
  }

  /**
   * [onStart on start event]
   * @param  {Function} fn
   */
  onStart(fn){
    setTimeout(() => {
      if(this.debug) console.log('START!!!!');
      fn(1000);
    }, 500);
  }

}//class
