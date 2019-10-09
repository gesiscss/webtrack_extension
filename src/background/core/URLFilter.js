export default class URLFilter {

  constructor(list=[], active=false, white_or_black=true) {
    this.active = active;
    this.white_or_black = white_or_black;
    this.list = list;
    this.cache = {};
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
   * [isAllow checks the domain of the URL and compare with the settings and URL-list to have access to page]
   * @param  {String}  url [description]
   * @return {Boolean}     [description]
   */
  isAllow(url){
    if(this.active){     
      var hostname = this.extractHostname(url);
      if(!this.cache.hasOwnProperty(hostname)){
        var isinlist = this.isincluded(hostname);
        this.cache[hostname] = isinlist;
      }
      var isinlist = this.isincluded(hostname);
      if(this.white_or_black){
        return this.cache[hostname];
      } else {
        return !this.cache[hostname];
      }
    }else{
      return true;
    }
  }
}
