
import Tracker from '../Tracker';

export default class AppleTracker extends Tracker{

  constructor(worker, extensionfilter=[]){
    super(worker);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.is_allowed = null;

    this.startswith_blacklist = ['/in/icloud/', '/icloud/', '/de/itunes/', '/itunes/'];
    this.pos_2nd_blacklist = ['itunes', 'icloud'];

    this.setup_credentials();

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


