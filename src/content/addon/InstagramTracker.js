
import Tracker from '../Tracker';

export default class InstagramTracker extends Tracker{

  constructor(worker, extensionfilter=[]){
    super(worker);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.is_allowed = null;
    this.instagram_debug = false;

    this.svg_account = 'nav a svg g path[d="M24 27c-7.1 0-12.9-5.8-12.9-12.9s5.8-13 12.9-13c7.1 0 12.9 5.8 12.9 12.9S31.1 27 24 27zm0-22.9c-5.5 0-9.9 4.5-9.9 9.9s4.4 10 9.9 10 9.9-4.5 9.9-9.9-4.4-10-9.9-10zM44 46.9c-.8 0-1.5-.7-1.5-1.5V42c0-5-4-9-9-9h-19c-5 0-9 4-9 9v3.4c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5V42c0-6.6 5.4-12 12-12h19c6.6 0 12 5.4 12 12v3.4c0 .8-.7 1.5-1.5 1.5z"]';
    this.div_fullname = '.f5Yes.oL_O8';

    this.startswith_blacklist = ['/accounts/', '/settings/', '/emails/settings/', '/session/login_activity/', '/emails/emails_sent/'];

  }


  /**
   * Setup the credentials for the logged user (if any)
   */
  reset_credentials(){
    let svg_account = this.get_svg_account();
    this.is_logged_in = this._isLogged(svg_account);

    if (this.is_logged_in){
      this.credentials = this.get_credentials();
      
      if (this.credentials == null) {
        this.logged_username = this.get_username(svg_account);
        this.logged_fullname = this.get_fullname();
      } else {
        this.logged_user_id = this.credentials.id;
        this.logged_username = this.credentials.username;
        this.logged_fullname = this.credentials.full_name;
        this.profile_pic_url = this.credentials.profile_pic_url;
        this.profile_pic_url_hd = this.credentials.profile_pic_url_hd;

        this.is_private = this.credentials.is_private;
      }

    }
    this.is_content_allowed = true;
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
    }

    if (this.logged_username) {
      anonym['username'] = this.logged_username;
    }

    if (this.profile_pic_url) {
      anonym['guest_id'] = this.profile_pic_url;
    }

    if (this.logged_fullname) {
      anonym['fullname'] = this.logged_fullname;
    }

    if (this.profile_pic_url_hd) {
      anonym['guest_id'] = this.profile_pic_url_hd;
    }

    metadata['anonym'] = anonym;

    return metadata;

  }




  /**
  Load the credentials from the script in twitter
  returns a dictionary with the credentials
  **/  
  get_credentials() {
    let scripts = document.querySelectorAll('script:not([src])');
    for (var i = 0; i < scripts.length; i++) {
      let sc = scripts[i].textContent;
      if (sc.startsWith('window._sharedData = ')) {
        return JSON.parse(sc.substring(sc.lastIndexOf('"viewer":') + 9, 
          sc.lastIndexOf(',"viewerId"')));
      }
    }
    return null;
  }  

  get_svg_account(){
    return document.querySelector(this.svg_account);
  }

  get_fullname(){
    let element = document.querySelector(this.div_fullname);
    if (element){
      return element.textContent;
    }
    return null;
  }

  get_username(svg_account){
    if (svg_account){
      return svg_account.parentNode.parentNode.parentNode.pathname.split('/')[1];
    }
    return null;
  }

  /**
   * return true if user is logged in twitter
   * @return {boolean} true if user is logged
   */
  _isLogged(svg_account) {
    if (svg_account){
      return true;
    }
    return false;
  }



  /**
   * [return dom as string]
   * @return {Promise}
   */
  getDom(){
  	return super.getDom();
  }

  /**
   * [onStart on start event]
   * @param  {Function} fn
   */
  onStart(fn){
    setTimeout(() => {
      if (this.debug) console.log('START!!!!');
      fn(1000);
    }, 500);
  }

}//class


