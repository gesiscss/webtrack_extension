
import Tracker from '../Tracker';

export default class GoogleTracker extends Tracker{

  constructor(worker, extensionfilter=[]){
    super(worker);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.is_allowed = null;
    this.instagram_debug = false;

    this.startswith_blacklist = ['/accounts', '/settings'];

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
      if(this.debug) console.log('START!!!!');
      fn(1000);
    }, 500);
  }

}//class


