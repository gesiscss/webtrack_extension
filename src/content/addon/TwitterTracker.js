import Tracker from '../Tracker';

export default class TwitterTracker extends Tracker{

  constructor(worker, privacy, extensionfilter=[]){
    super(worker, privacy);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.is_allowed = null;
    
    this.allow = false;
    this.twitter_debug = false;
    this.twitter_debugEvents = false;
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
      svg_tweet_promoted: 'article svg g path[d="M20.75 2H3.25C2.007 2 1 3.007 1 4.25v15.5C1 20.993 2.007 22 3.25 22h17.5c1.243 0 2.25-1.007 2.25-2.25V4.25C23 3.007 21.993 2 20.75 2zM17.5 13.504c0 .483-.392.875-.875.875s-.875-.393-.875-.876V9.967l-7.547 7.546c-.17.17-.395.256-.62.256s-.447-.086-.618-.257c-.342-.342-.342-.896 0-1.237l7.547-7.547h-3.54c-.482 0-.874-.393-.874-.876s.392-.875.875-.875h5.65c.483 0 .875.39.875.874v5.65z"]',

      svg_account_protected: 'div span svg g path[d="M19.75 7.31h-1.88c-.19-3.08-2.746-5.526-5.87-5.526S6.32 4.232 6.13 7.31H4.25C3.01 7.31 2 8.317 2 9.56v10.23c0 1.24 1.01 2.25 2.25 2.25h15.5c1.24 0 2.25-1.01 2.25-2.25V9.56c0-1.242-1.01-2.25-2.25-2.25zm-7 8.377v1.396c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-1.396c-.764-.3-1.307-1.04-1.307-1.91 0-1.137.92-2.058 2.057-2.058 1.136 0 2.057.92 2.057 2.056 0 .87-.543 1.61-1.307 1.91zM7.648 7.31C7.838 5.06 9.705 3.284 12 3.284s4.163 1.777 4.352 4.023H7.648z"]',

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

      // the username can be taken from here
      svg_lists_deactivated: 'nav svg g path[d="M19.75 22H4.25C3.01 22 2 20.99 2 19.75V4.25C2 3.01 3.01 2 4.25 2h15.5C20.99 2 22 3.01 22 4.25v15.5c0 1.24-1.01 2.25-2.25 2.25zM4.25 3.5c-.414 0-.75.337-.75.75v15.5c0 .413.336.75.75.75h15.5c.414 0 .75-.337.75-.75V4.25c0-.413-.336-.75-.75-.75H4.25z"]',
      svg_lists_activated: 'nav svg g path[d="M19.75 2H4.25C3.013 2 2 3.013 2 4.25v15.5C2 20.987 3.013 22 4.25 22h15.5c1.237 0 2.25-1.013 2.25-2.25V4.25C22 3.013 20.987 2 19.75 2zM11 16.75H7c-.414 0-.75-.336-.75-.75s.336-.75.75-.75h4c.414 0 .75.336.75.75s-.336.75-.75.75zm6-4H7c-.414 0-.75-.336-.75-.75s.336-.75.75-.75h10c.414 0 .75.336.75.75s-.336.75-.75.75zm0-4H7c-.414 0-.75-.336-.75-.75s.336-.75.75-.75h10c.414 0 .75.336.75.75s-.336.75-.75.75z"]',

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
    this.trendId2Element = {};
    this.tweets_exist = false;

    this.header = null;
    this.sidebar_left = null;
    this.sidebar_right = null;

    this.startswith_denylist = ['/messages/', '/settings/', '/notifications/', '/login/', '/account/'];

    this.pos_2nd_denylist = ['bookmarks', 'signup', 'flow', 'notifications'];

    this.privacy_flags = {
      'user_id': null,
      'username': null,
      'guest_id': null,
      'email': null,
      'is_logged_in': null,
      'seen_protected_tweet': null,
      'seen_promoted_tweet': null
    }

    this.logged_username = null;
    this.credentials = null;


    this.tweet_header_ids_captured = new Set();
    this.tweet_header_ids_ignored = new Set();
    this.tweet_ids_captured = new Set();
    this.tweet_ids_ignored = new Set();
    this.promoted_tweets_captured = new Set();
    this.tweet_wo_id_seen = 0;


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


  get_is_content_allowed() {
    if (document.querySelector(this.selectors.svg_account_protected)){
      return false;
    }
    return true;
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
   * Setup the credentials for the logged user (if any)
   */
  reset_credentials(){

    this.is_logged_in = this._isLoggedTwitter();

    if (this.is_logged_in){
      this.credentials = this.get_credentials();

      if (this.credentials != null) {
        try {
          this.logged_user_id = this.credentials.session.user_id;
          this.entity = this.credentials.entities.users.entities[this.logged_user_id];
          this.logged_username = this.entity.screen_name;
          this.logged_fullname = this.entity.name;
          this.logged_guest_id = this.credentials.session.guestId;

        } catch( error) {
          this.logged_username = this.get_username();
        }
        
      } else {
        this.logged_username = this.get_username();
      }
      

      this.is_content_allowed = this.get_is_content_allowed();


    }else{
      this.is_content_allowed = true;
    }


    // is social media path allowed
    this.is_sm_path_allowed = this.get_is_sm_path_allowed(location.pathname);
    console.log('IS ALLOWED', location.pathname, this.is_sm_path_allowed);


    if(this.twitter_debug) {
      let style = '';
      if (this.is_logged_in) {
        style += "border-top:7px solid green !important;";
      } else {
        style += "border-top:7px solid red !important;";
      }

      if (this.logged_username) {
        style += "border-right:7px solid green !important;";
      } else {
        style += "border-right:7px solid red !important;";
      }

      if (this.logged_fullname) {
        style += "border-bottom:7px solid green !important;";
      } else {
        style += "border-bottom:7px solid red !important;";
      }

      if (this.logged_guest_id) {
        style += "border-left:7px solid green !important;";
      } else {
        style += "border-left:7px solid red !important;";
      }

      if (this.is_sm_path_allowed) {
        style += "outline:7px solid blue !important;";
      } else {
        style += "outline:7px solid red !important;";
      }
      document.querySelector('a[aria-label]').setAttribute("style", style);

    }

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

    if (this.logged_guest_id) {
      anonym['guest_id'] = this.logged_guest_id;
      this.privacy_flags['guest_id'] = true;
    }

    if (this.logged_fullname) {
      anonym['fullname'] = this.logged_fullname;
      this.privacy_flags['fullname'] = true;
    }

    metadata['anonym'] = anonym;
    metadata['privacy_flags'] = this.privacy_flags;

    return metadata;

  }

  /**
  Load the credentials from the script in twitter
  returns a dictionary with the credentials
  **/  
  get_credentials() {
    let scripts = document.querySelectorAll('body script[nonce]');
    for (var i = 0; i < scripts.length; i++) {
      let sc = scripts[i].textContent.trim();
      if (sc.startsWith('window.__INITIAL_STATE__')) {
        try {
          //window.__INITIAL_STATE__
          let mid_index = sc.indexOf(';');
          let initial_state = sc.substring(sc.indexOf('{'), mid_index);
          return JSON.parse(initial_state);

          // // extractin important parts from the json
          // let user_id = initial_state['session']['user_id'];
          // let guestId = initial_state['session']['guestId'];
          // let user_json = initial_state['entities']['users']['entities'][user_id];
          // user_json['user_id'] = user_id;

          // //window.__META_DATA__
          // let meta = sc.substring(mid_index).substring(
          //   sc.substring(sc.indexOf('{'), 
          //   sc.indexOf(';')));
          // meta = JSON.parse(meta);
          // user_json['is_logged_in'] = meta["isLoggedIn"];

          // return user_json;
        } catch (error){
          console.log(error);
        }

        
      }
    }
    return null;
  }


  /**
   * return true if user is logged in twitter
   * @return {boolean} true if user is logged
   */
  get_username(){
    //document.documentElement.querySelectorAll('script,link,svg,style');
    //var navs = document.documentElement.getElementsByTagName('nav');
    //var navs = document.documentElement.querySelectorAll('nav a[aria-label="Profile"]');
    //document.querySelector('head link[hreflang]') 


    var svg = document.documentElement.querySelector(
      this.selectors.svg_lists_deactivated);
    if (svg){
      return svg.parentElement.parentElement.parentElement.parentElement.parentElement.pathname.split('/')[1];
    } else {
      var svg = document.documentElement.querySelector(this.selectors.svg_lists_activated);
      if (svg){
        return svg.parentElement.parentElement.parentElement.parentElement.parentElement.pathname.split('/')[1];
      } 
    }
    return null;
  }

  /**
   * return true if user is logged in twitter
   * @return {boolean} true if user is logged
   */
  _isLoggedTwitter(){
    //document.documentElement.querySelectorAll('script,link,svg,style');
    //var navs = document.documentElement.getElementsByTagName('nav');
    //var navs = document.documentElement.querySelectorAll('nav a[aria-label="Profile"]');

    var svgs = document.documentElement.querySelectorAll(
      this.selectors.svg_home_deactivated);
    if (svgs && (svgs.length > 0)){
      this.privacy_flags['is_logged_in'] = true;
      return true;
    } else {
      var svgs = document.documentElement.querySelectorAll(
        this.selectors.svg_home_activated);
      if (svgs && (svgs.length > 0)){
        this.privacy_flags['is_logged_in'] = true;
        return true;
      } 
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
      return true;
    }

    return !this._isProtected(target);
  }


  /**
   * [_isPublic checks if element is for the public oder private]
   * @param  {Object}  target [DomElement]
   * @return {Boolean}
   */
  _isProtected(target){

   // if the protected svg appear in the tweet, the content is private
    if (target.querySelector(this.selectors.svg_tweet_protected)) {
      this.privacy_flags['seen_protected_tweet'] = true;
      return true;
    } else {
      return false;
    }
  }

  /**
   * [_isPublic checks if element is for the public oder private]
   * @param  {Object}  target [DomElement]
   * @return {Boolean}
   */
  _isPromoted(target){

    // if the protected svg appear in the tweet, the content is private
    if (target.querySelector(this.selectors.svg_tweet_promoted)) {
      this.privacy_flags['seen_promoted_tweet'] = true;
      return true;
    } else {
      return false;
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
   * [_getPromotedId get the tweet header id from the location bar]
   * @param  {Object}  target [DomElement]
   * @return {int}
   */
  _getPromotedId(article){
    
    var _anchor = article.querySelector('a[role=link]');
    if (_anchor != null){
      return _anchor.getAttribute('href');
    }
    return 'default_promoted_id';

  }


  /**
   * [_getId looks for an href that contains the id of the element]
   * @param  {Object}  target [DomElement]
   * @return {int}
   */
  _getId(article){
    try {

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
  trackArticle(id, article, category){
    let cloned = article.cloneNode(true);
    cloned.classList.add(category);
    this.tweetId2Element[id] = cloned;
  }

  /**
   * [_getPublicArticels return elements of public articels]
   * @return {Array} true if at least one article was found
   */
  addPublicArticles(){
    let articles = document.querySelectorAll('article');

    for (var i = 0; i < articles.length; i++) {
      //let id = articles[i].getAttribute('data-tweet-id');
      let id = this._getId(articles[i]);
      let header_id = this._getHeaderId();

      if ((i == 0) && (header_id != null) && !this._isProtected(articles[i])) {
        this.tweet_header_ids_captured.add(header_id);
        this.trackArticle(header_id, articles[i], 'header-not-protected');
        if(this.twitter_debug) articles[i].setAttribute("style", "border:3px solid cyan !important;");
      
      } else if ((i == 0) && (header_id != null) && this._isProtected(articles[i])) {
        this.tweet_header_ids_ignored.add(header_id);
        if(this.twitter_debug) articles[i].setAttribute("style", "border:3px solid yellow !important;");
      
      } else if (this._isPromoted(articles[i])) {
        this.promoted_tweets_captured.add(promoted_id);
        let promoted_id = this._getPromotedId(articles[i]);
        this.trackArticle(promoted_id, articles[i], 'promoted');
        if(this.twitter_debug) articles[i].setAttribute("style", "border:3px solid blue !important;");
      
      } else if(id && !this._isProtected(articles[i])) {
        this.tweet_ids_captured.add(id);
        this.trackArticle(id, articles[i], 'not-protected');
        if(this.twitter_debug) articles[i].setAttribute("style", "border:3px solid green !important;");
      
      } else if(id) {
        this.tweet_ids_ignored.add(id);
        // This does not seem to be a public tweet
        if(this.twitter_debug) articles[i].setAttribute("style", "border:3px solid red !important;");
      
      } else {
        this.tweet_wo_id_seen += 1;
        // This does not seem to be a tweet at all (no id)
        if(this.twitter_debug) articles[i].setAttribute("style", "border:6px solid magent !important;");
      }
    }

    if (this.twitter_debug) console.log('Articles Found: ' + articles.length);

    // return True if at lest one article was found (regardless it being public/private)
    return articles.length > 0;
  }

  /**
   * [_getPublicArticels return elements of public articels]
   * @return {Array} true if at least one article was found
   */
  addPublicArticlesIfLoggedOut(){
    let articles = document.querySelectorAll('#stream-items-id li > .tweet');
    let counter = 0;

    for (var i = 0; i < articles.length; i++) {
      let id = articles[i].getAttribute('data-tweet-id');
      if (id != null) {
        this.trackArticle(id, articles[i], 'logged-out');
        counter += 1;
      }
    }

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
      console.log('Unexpected error getting Who ID in TwitterTracker');
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
        //if (this.twitter_debug) console.log('ID detected: ' + id);
        this.whoId2Element[id] = who[i].cloneNode(true);
        counter += 1;
      }
    }

    if (this.twitter_debug) console.log('WhoToFollow: ' + who.length);
    if (this.twitter_debug) console.log('WhoToFollow correct: ' + counter);

    // return True if at lest one article was found (regardless it being public/private)
    return who.length > 0;
  }




  /**
   * [_getId looks for a user id to follow]
   * @param  {DomElement}  target [DomElement]
   * @return {string} the element
   */
  _getTrendId(target){
    try {
      var _clone = target.cloneNode(true);
      var hashtag = target.querySelector('div[dir=ltr]');
      if (hashtag){
        return hashtag.innerText;
      }
    }
    catch(error) {
      console.log(error);
      console.log('Unexpected error getting Trend ID in TwitterTracker');
    }
    
    return null;
  }


  /**
   * add trends
   * @return number of trends
   */
  addTrends(){
    let trend = document.querySelectorAll('div[data-testid="primaryColumn"] div[data-testid="trend"]');

    let counter = 0;
    for (var i = 0; i < trend.length; i++) {
      //let id = trend[i].getAttribute('data-tweet-id');
      let id = this._getTrendId(trend[i]);
      if (id != null) {
        //if (this.twitter_debug) console.log('ID detected: ' + id);
        this.trendId2Element[id] = trend[i].cloneNode(true);
        counter += 1;
      }
    }

    if (this.twitter_debug) console.log('Trend: ' + trend.length);
    if (this.twitter_debug) console.log('Trend correct: ' + counter);

    // return True if at lest one article was found (regardless it being public/private)
    return trend.length > 0;
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
      if (this.twitter_debug) console.log('No public tweets/replies found');
    }


    if (this.twitter_debug) console.log('Sending ' + counter + ' tweets');
    return '<html tweet_header_ids_captured="' + this.tweet_header_ids_captured.size +
                '" tweet_header_ids_ignored="' + this.tweet_header_ids_ignored.size +
                '" tweet_ids_captured="' + this.tweet_ids_captured.size +
                '" tweet_ids_ignored="' + this.tweet_ids_ignored.size +
                '" promoted_tweets_captured="' + this.promoted_tweets_captured.size +
                '" tweet_wo_id_seen="' + this.tweet_wo_id_seen +
            '" ><head></head><body><h1>Tweets</h1><div class="tweets">' + tweet_strings + '</div></body></html>';
  }


  /**
   * [return element without embedd js, css, etc]
   * @return {Promise}
   */
  _clean_embedded_scripts(target, selectors='script:not([src]),svg,style'){
    return super._clean_embedded_scripts(target, selectors + ',noscript');
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
        let found = this.addPublicArticles();
        this.tweets_exist = found || this.tweets_exist;

        if (this.tweets_exist){
          if (this.twitter_debug) console.log('assembling dom');
          resolve(this.assembleDom());
        } else if (this.tweets_exist == false) {
          if (this.twitter_debug) console.log('No tweets were found');
          // just send the entire html
          resolve("<html><head></head><body><h1>No Tweets Found</h1></body></html>");
        }
      });
    //}
  }

  /**
   * [onStart on start event]
   * @param  {Function} fn
   */
  onStart(fn){
    setTimeout(() => {
      if (this.twitter_debug) console.log('START!!!!');
      fn(1000);
    }, 500);
  }

}//class
