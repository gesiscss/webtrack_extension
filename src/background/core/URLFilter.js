export default class URLFilter {

  constructor(config, is_dummy){

    this.config = config;
    this.is_dummy = is_dummy;
    this.debug = true;

    this._reinit();

  }

  _reinit(){
    if (this.is_dummy){
      this.projectId = -1
      this.settings = null;
      this.lists={}; 
      this.active=false; 
      this.white_or_black=true; 
      this.server_list=[];
    } else {
      this.projectId = this.config.getSelect();
      let project = this.config.getProject(this.projectId);
      this.settings = project.SETTINGS;
      this.active = this.settings.ACTIVE_URLLIST;
      this.white_or_black = this.settings.URLLIST_WHITE_OR_BLACK;
      this.lists = this.config.blacklists;
      this.server_list = project.URLLIST;
      this.cache = {};
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
    if (this.lists.simple.exact.has(sub_domain)) {
      if (this.debug) console.log('if (this.lists.simple.exact.has(sub_domain))');
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

    if (this.debug) console.log('it is not blacklisted');
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

    if(this.active){

      //uncomment to text the list in tests.json
      // console.log('TEST blacklist:');
      // let white=[]
      // let black=[]
      // for (var i = 0; i < this.lists.tests.length; i++) {
      //   //when the test contains URLs
      //   //domain = this.get_location(this.lists.tests[i]).hostname

      //   //when the test contain domains
      //   domain = this.lists.tests[i];
      //   if (!this.isincluded(domain)) {
      //     console.log(this.lists.tests[i])
      //     white.push(this.lists.tests[i]);
      //   } else {
      //     black.push(this.lists.tests[i]);
      //   }
      // }
      // console.log(white);
      // console.log(black);
      // debugger;



      if(!this.cache.hasOwnProperty(domain)){
        let isinlist = this.isincluded(domain);
       
        let is_allow = 
              // is in whitelist
              (isinlist && this.white_or_black) ||
              // is not in blacklist
              (!isinlist && !this.white_or_black);
        this.cache[domain] = is_allow;
      }
      let is_allow = this.cache[domain];
            
      return is_allow;
    }else{
      return true;
    }
  }

  /**
   * [only_domain returns if the only tracking should be done for the domain]
   * @param  {String} domain [description]
   * @return {Boolean}     [description]
   */
  only_domain(domain){
    if(this.active){
      let hostname_parts = domain.split('.');

      if (hostname_parts.length > 1) {
        return this.lists.simple.only_domain.has(
          hostname_parts[hostname_parts.length - 2]);
      }

      return false;
    }
  }


  /**
   * [only_url returns if the only tracking should be done for the url]
   * @param  {String} domain [description]
   * @return {Boolean}     [description]
   */
  only_url(domain){
    if(this.active){
      let hostname_parts = domain.split('.');

      if (hostname_parts.length > 1) {
        return this.lists.simple.only_url.has(
          hostname_parts[hostname_parts.length - 2]);
      }

      return false;
    }
  }
}
