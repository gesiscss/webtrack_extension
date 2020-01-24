
import Tracker from '../Tracker';

export default class PrivateModeTracker extends Tracker{

  constructor(worker, privacy, extensionfilter=[]){
    super(worker, privacy);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.is_allowed = null;

    // make sure this is the case as it can be blocked due to dynamic content
    // however, currently this is not the case
    this.privacy.is_private_mode = true;

    this.blacklist_debug = false;

  }


  /**
   * get the metadata from the file
   * @return {object} the metadata of the html
   */
  getMetadata(){
    return {
        description: [],
        keywords: []
      }
  }

  /**
   * [isAllow returns if the path is allowed in social media platforms]
   * @param  {Location}  [the location element to analyze the url]
   * @return {Boolean}   [if it is allow according to social media platforms rules]
   */
  is_path_allow(path){
    return false;
  }

  /**
   * [onStart on start event]
   * @param  {Function} fn
   */
  onStart(fn){
    setTimeout(() => {
      //if (this.domain_debug) console.log('-> onStart!');
      fn(1000);
    }, 500);
  }

}//class


