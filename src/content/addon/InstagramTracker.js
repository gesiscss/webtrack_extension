
import Tracker from '../Tracker';

export default class InstagramTracker extends Tracker{

  constructor(worker, extensionfilter=[]){
    super(worker);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.is_allowed = null;
    this.instagram_debug = false;

    this.startswith_blacklist = ['/accounts', '/settings'];

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


