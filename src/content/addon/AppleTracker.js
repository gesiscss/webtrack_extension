
import Tracker from '../Tracker';

export default class AppleTracker extends Tracker{

  constructor(worker, privacy, extensionfilter=[]){
    super(worker, privacy);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.is_allowed = null;

    this.startswith_denylist = ['/in/icloud/', '/icloud/', '/de/itunes/', '/itunes/'];
    this.pos_2nd_denylist = ['itunes', 'icloud'];

    this.apple_debug = false;

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
      //if (this.apple_debug) console.log('-> onStart');
      fn(1000);
    }, 500);
  }

}//class


