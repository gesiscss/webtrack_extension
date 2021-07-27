export default class URLFilter {

  constructor(config, is_dummy){

    this.config = config;
    this.is_dummy = is_dummy;
    this.debug = false;

    this._reinit();

  }

  _reinit(){
    this.cache = {};

    // this needs to be reload each time because
    // some lists are feed from the server so it cannot
    // simply be in the constructor
    this.lists = this.config.controllists;
    
    if (this.is_dummy){
      this.projectId = -1
      this.settings = null;
      this.active=false; 
      // false for DenyList, and true for AllowList 
      this.is_allow_lists=false; 
      this.server_list=[];
    } else {
      this.projectId = this.config.getSelect();
      let project = this.config.getProject(this.projectId);
      this.settings = project.SETTINGS;
      this.active = this.settings.ACTIVE_URLLIST;
      this.is_allow_lists = this.settings.URLLIST_WHITE_OR_BLACK;
      this.server_list = project.URLLIST;
    }   
  }

  /**
   * [extractRootDomain get from url the higher level domain]
   * @param  {String} url        [e.g. https://www.google.de/search?q=]
   * @return {String} domain     [e.g. google.de]
   */
  extractRootDomain(url){
      var hostname;
      if (url.indexOf("//") > -1)
          hostname = url.split('/')[2];
      else
          hostname = url.split('/')[0];

      hostname = hostname.split(':')[0];
      hostname = hostname.split('?')[0];

      var domain = hostname,
          splitArr = domain.split('.'),
          arrLen = splitArr.length;

      if (arrLen > 2) {
          domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
          if (splitArr[arrLen - 2].length == 2 && splitArr[arrLen - 1].length == 2) {
              domain = splitArr[arrLen - 3] + '.' + domain;
          }
      }
      return domain;
  }

  /**
   * [extractHostname get from url the hostdomain]
   * @param  {String} url        [e.g. https://www.google.de/search?q=]
   * @return {String} domain     [e.g. google.de]
   */
  extractHostname(url) {
    var hostname;
    //find & remove protocol (http, ftp, etc.) and get hostname

    if (url.indexOf("//") > -1) {
        hostname = url.split('/')[2];
    }
    else {
        hostname = url.split('/')[0];
    }

    //find & remove port number
    hostname = hostname.split(':')[0];
    //find & remove "?"
    hostname = hostname.split('?')[0];

    return hostname;
  }

  /**
   * [isincluded returns yes or no depending if the domain is included in the list]
   * @param  {String} url        [e.g. https://www.google.de/search?q=]
   * @return {boolean} if is included     [e.g. true]
   */
  isincluded(domain){

    // top level domain index
    let tld_idx = domain.lastIndexOf(".");

    // check if it is ip based on the Top Level Domain. If there is a 
    // number in the last position, it should be an IP as of Nov 2019.
    // e.g. 20.32.3.4
    let tld = domain.slice(tld_idx+1);
    if (/^\d+$/.test(tld)) {
      if (this.debug) console.log('if (/^\d+$/.test(tld))');
      return true;
    }

    // check if the top level domain is a exact match against the exact match set
    // e.g, example.xxx
    if (this.lists.simple.tld.has(tld)) {
      if (this.debug) console.log('if (this.lists.simple.tld.has(tld))');
      return true;
    }

    // extract the sub domain; ignore the TLD from now on
    let sub_domain = domain.slice(0,tld_idx);


    // cut www out of the sub_domain, e.g. www.bank -> bank
    if (sub_domain.startsWith('www.')){
      sub_domain = sub_domain.slice(4);
    }

    // check for exact matches under special domains (e.g. tumblr and blogspot)
    for (let [key, set] of Object.entries(this.lists.specials)) {
      // subdomain index
      let sub_idx = sub_domain.lastIndexOf('.' + key);
      if (sub_idx != -1) {
        // check if the sub_domain exists in the list (actually a Set)
        if (set.has(sub_domain.slice(0, sub_idx))){
          if (this.debug) console.log('if (set.has(sub_domain.slice(0, sub_idx)))');
          return true;
        }
      }
    }

    // bottom level domain index
    let bld_idx = sub_domain.indexOf(".");
    // if a bottom level domain has only two chars and it corresponds to a country code
    // then remove it e.g. de.bank -> bank; this does not apply to tumblr/blogspt
    if (bld_idx == 2){
      if (this.lists.simple.languages.has(sub_domain.slice(0, bld_idx))) {
        sub_domain = sub_domain.slice(bld_idx + 1);
      }
    }

    // check for exact matches under special filters
    for (let [_filter, set] of Object.entries(this.lists.filters)) {
      // check if the sub_domain passes the filter
      if ((new RegExp(_filter)).test(sub_domain)) {
        // if so, check if the sub_domain exists in the list (actually a Set)
        if (set.has(sub_domain)) {
          if (this.debug) console.log('if (set.has(sub_domain))');
          return true;
        }
      }
    }

    // check if the sub_domain is a exact match against the exact match set
    if (this.lists.simple.exact.has(sub_domain + '.' + tld)) {
      if (this.debug) console.log('if (this.lists.simple.exact.has(sub_domain))');
      // // conflicting against live.com
      // if (sub_domain == 'live'){
      //   return tld == 'tv';
      // }
      // // conflicting against yelp.com
      // if (sub_domain == 'yelp'){
      //   return tld == 'org';
      // }
      // // conflicting against emp.de
      // if (sub_domain == 'emp'){
      //   return tld == 'tv';
      // }
      // // conflicting against guru.de
      // if (sub_domain == 'guru'){
      //   return tld == 'nu';
      // }
      // // conflicting against uni.de
      // if (sub_domain == 'uni'){
      //   return tld == 'cc';
      // }
      // // conflicting against peak.ag
      // if (sub_domain == 'peak'){
      //   return tld == 'dk';
      // }
      // // conflicting against peak.ag
      // if (sub_domain == 'tvnow'){
      //   return tld == 'nl';
      // }
      // // conflicting against bonus.ch
      // if (sub_domain == 'bonus'){
      //   return tld == 'to';
      // }
      // // conflicting against berlin.de
      // if (sub_domain == 'berlin'){
      //   return tld == 'pl';
      // }
      // // conflicting against etoro.com
      // if (sub_domain == 'etoro'){
      //   return tld == 'ws';
      // }
      // // conflicting against ch.oui.sncf
      // if (sub_domain == 'oui'){
      //   return tld == 'pl';
      // }
      // // conflicting against alternate.de
      // if (sub_domain == 'alternate'){
      //   return tld == 'com';
      // }
      return true;
    }

    // check if the sub_domain endsWith any of the blocked domains
    let subdot_domain = '.' + sub_domain;
    for (let item of this.lists.simple.ends_with) {
      if (subdot_domain.endsWith(item)){
        if (this.debug) console.log('if (subdot_domain.endsWith(item))');
        return true;
      }
    }

    for (let item of this.server_list) {
      if (subdot_domain.endsWith(item)){
        if (this.debug) console.log('if (subdot_domain.endsWith(item))');
        return true;
      }
    }

    if (this.debug) console.log('it is not Full Deny');
    return false;
  }


  /**
   * [return specific social media platform for the current page]
   * @return {[str]} [the ]
   */
  _getSMP(domain){
    if(domain.indexOf('facebook')>=0){
      return 'facebook';
    }else if(domain.indexOf('youtube')>=0){
      return 'youtube';
    }else if(domain.indexOf('twitter')>=0){
      return 'twitter';
    }else if(domain.indexOf('instagram')>=0){
      return 'instagram';
    }
    return null;
  }

  /**
  * [return a location from an url]
  * @return href without hashes
  */
  get_location(event_url) {
    let location = document.createElement('a');
    location.href = event_url;
    return location;
  }



  /**
   * [isAllow checks the domain of the URL and compare with the settings and URL-list to have access to page]
   * @param  {String} domain [description]
   * @return {Boolean}     [description]
   */
  isAllow(domain){
    this._reinit();

    //uncomment to test the list in tests.json
    /////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////
    // console.log('TEST Control Lists:');
    // let fullalow=[]
    // let only_domain=[]
    // let only_url=[]
    // let fulldeny=[]
    // for (var i = 0; i < this.lists.tests.length; i++) {
    //   //when the test contains URLs
    //   //domain = this.get_location(this.lists.tests[i]).hostname

    //   //when the test contain domains
    //   domain = this.lists.tests[i];

    //   if ("????" == domain){
    //     this.debug=true;
    //   }
    //   if (!this.isincluded(domain)) {
    //     if (this.only_domain(domain)){
    //       only_domain.push(this.lists.tests[i]);
    //     } else if (this.only_url(domain)){
    //       only_url.push(this.lists.tests[i]);
    //     } else {
    //       fullalow.push(this.lists.tests[i]);
    //     }
    //   } else {
    //     fulldeny.push(this.lists.tests[i]);
    //   }
    //   if(this.debug){
    //     debugger;
    //   }
    // }
    // console.log('Full Allow:');
    // console.log(fullalow);

    // console.log('Full Deny:');
    // console.log(fulldeny);

    // console.log('Only Domain:');
    // console.log(only_domain);

    // console.log('Only URL:');
    // console.log(only_url);
    // debugger;
    ///////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////


    if(!this.cache.hasOwnProperty(domain)){
      let isinlist = this.isincluded(domain);
      let is_allow = 
            (isinlist && this.is_allow_lists) ||
            (!isinlist && !this.is_allow_lists);
      this.cache[domain] = is_allow;
    }
    let is_allow = this.cache[domain];         
    return is_allow;
  }



  /**
   * [is_track_off returns true if the user has logged in the tracker]
   * @return {Boolean}     [description]
   */
  is_track_off(){
    return this.is_dummy;
  }


  /**
   * [only_domain returns if the only tracking should be done for the domain]
   * @param  {String} domain [description]
   * @return {Boolean}     [description]
   */
  only_domain(domain){
    let hostname_parts = domain.split('.');

    if (hostname_parts.length > 1) {

      // extract the sub domain; ignore the TLD from now on
      let dot_subdomain = '.' + domain.slice(0,domain.lastIndexOf("."));

      for (let item of this.lists.simple.only_domain) {
        if (dot_subdomain.endsWith(item)){
          return true;
        }
      }
    }

    return false;
  }


  /**
   * [only_url returns if the only tracking should be done for the url]
   * @param  {String} domain [description]
   * @return {Boolean}     [description]
   */
  only_url(domain){
    let hostname_parts = domain.split('.');

    if (hostname_parts.length > 1) {
      // extract the sub domain; ignore the TLD from now on
      let dot_subdomain = '.' + domain.slice(0,domain.lastIndexOf("."));

      for (let item of this.lists.simple.only_url) {
        if (dot_subdomain.endsWith(item)){
          return true;
        }
      }
    }
    return false;
  }
}
