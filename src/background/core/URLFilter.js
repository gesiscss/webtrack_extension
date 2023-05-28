import Transfer from './Transfer';

export default class URLFilter {


  constructor(config, is_dummy){

    this.config = config;
    this.is_dummy = is_dummy;
    this.debug = false;

    this.cache = {};
    this.expiration = 7;  //how long to leave data from controllists in the cache
    this.projectId = this.config.getSelect();
    let project = this.config.getProject(this.projectId);
    this.settings = project.SETTINGS;
    //this._reinit();

  }

  /*--
  _reinit(){
    
    // this needs to be reload each time because
    // some lists are feed from the server so it cannot
    // simply be in the constructor
    
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
  }--*/

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
   * [is_track_off returns true if the user has logged in the tracker]
   * @return {Boolean}     [description]
   */
  is_track_off(){
    return this.is_dummy;
  }

  /**
   * [is_allow returns 'Full Deny', 'Full Allow', 'Domain Only' or 'URL Only' based on controllist on the server]
   * @param {String}  domain
   * @return {String}     [description]
   */
  async is_allow(domain){
    //if the domain is in the cache and not older than 30 days, don't query the server
    if ((this.cache.hasOwnProperty(domain)) && (((Date.now() - this.cache[domain].timestamp)/86400000) < this.expiration)) {
      const json = this.cache[domain].value;
      return json.trim();
    } else {
      this.transfer = new Transfer(config.settings.server + 'tracking/controllists');
      const json = await this.transfer.jsonFetch(config.settings.server + 'tracking/controllists', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({'domain': domain})})
      //after querying the server update the cache
      let ts = Date.now();
      this.cache[domain] = {value: json.trim(), timestamp: ts};
      return json.trim();
    }
  }
} 
