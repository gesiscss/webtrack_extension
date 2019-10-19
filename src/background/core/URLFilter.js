export default class URLFilter {

  constructor(list=[], active=false, white_or_black=true) {
    this.active = active;
    this.white_or_black = white_or_black;
    this.list = list;
    this.cache = {};

    this.smp_blacklist = {
      'twitter': ['/messages', '/settings'],
      'facebook': ['/messages', '/settings'],
      'youtube': ['/account'],
      'instagram': ['/accounts', '/settings'],
      //'google': ['messages', 'settings'],
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
    for (let i in this.list){
      if (domain.endsWith(this.list[i])){
        return true;
      }
    }
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
   * [isAllow returns if the path is allowed in social media platforms]
   * @param  {Location}  [the location element to analyze the url]
   * @return {Boolean}   [if it is allow according to social media platforms rules]
   */
  is_smp_allow(location){
    let platform = this._getSMP(location.hostname);
    if (platform != null) {
      let path = location.pathname;
      let subpaths = this.smp_blacklist[platform];
      for (let i in subpaths) {
        if (path.startsWith(subpaths[i])){
          return false;
        }
      }
    }
    return true;
  }


  /**
   * [isAllow checks the domain of the URL and compare with the settings and URL-list to have access to page]
   * @param  {String}  url [description]
   * @return {Boolean}     [description]
   */
  isAllow(url){
    if(this.active){
      var location = this.get_location(url);

      if(!this.cache.hasOwnProperty(location.hostname)){
        let isinlist = this.isincluded(location.hostname);
       
        let is_allow = 
              // is in whitelist
              (isinlist && this.white_or_black) ||
              // is not in blacklist
              (!isinlist && !this.white_or_black);
        this.cache[location.hostname] = is_allow;
      }
      let is_allow = this.cache[location.hostname];
            
      // if (is_allow){
      //   is_allow = this.is_smp_allow(location);
      // }
      
      //console.log('Allowed in social media?', is_allow);

      return is_allow;
    }else{
      return true;
    }
  }
}
