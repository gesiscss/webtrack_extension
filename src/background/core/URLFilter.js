export default class URLFilter {

  constructor(list=[], active=false, white_or_black=true) {
    this.active = active;
    this.white_or_black = white_or_black;
    this.list = list;
    this.cache = {};
  }


  /**
   * [extractRootDomain get from url the domain]
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
   * [isAllow checks the domain of the URL and compare with the settings and URL-list to have access to page]
   * @param  {String}  url [description]
   * @return {Boolean}     [description]
   */
  isAllow(url){
    if(this.active){
      if(this.cache.hasOwnProperty(url)){
        return this.cache[url];
      }
      if(this.white_or_black){
        this.cache[url] = this.list.includes(this.extractRootDomain(url))? true: false;
      }
      if(!this.white_or_black){
        this.cache[url] = this.list.includes(this.extractRootDomain(url))? false: true
      }
      return this.cache[url];
    }else
      return true
  }

}
