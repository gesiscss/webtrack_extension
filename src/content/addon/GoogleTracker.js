
import Tracker from '../Tracker';

export default class GoogleTracker extends Tracker{

  constructor(worker, extensionfilter=[]){
    super(worker);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.is_allowed = null;
    this.google_debug = false;
    this.logged_email = null;
    this.logged_fullname = null;

    this.startswith_blacklist = ['/accounts/', '/settings/', '/drive/'];

    this.setup_credentials();

  }


  /**
   * [return element without detected sensitive information]
   * @return {Promise}
   */
  _clean_sensitive_content_elements(target){
    let a_account = target.querySelector('a.gb_B.gb_Da.gb_g');
    if (a_account){
      a_account.parentNode.removeChild(a_account);
    }
    return target;
  }



  /**
   * Setup the credentials for the logged user (if any)
   */
  setup_credentials(){
    
    let email =  document.querySelector('.gb_hb');
    if (email){
      this.logged_email = email.innerText;
    }

    let fullname = document.querySelector('.gb_fb.gb_gb');
    if (fullname){
      this.logged_fullname = fullname.innerText;
    }

  }


  /**
   * get the metadata from the file
   * @return {object} the metadata of the html
   */
  getMetadata(){
    let metadata = super.getMetadata();
    let anonym = {};

    if (this.logged_fullname) {
      anonym['email'] = this.logged_email;
    }

    if (this.logged_fullname) {
      anonym['fullname'] = this.logged_fullname;
    }

    metadata['anonym'] = anonym;

    return metadata;

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
      if (this.google_debug) console.log('START!!!!');
      fn(1000);
    }, 500);
  }

}//class


