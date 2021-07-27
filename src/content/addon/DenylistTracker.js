
import Tracker from '../Tracker';

export default class DenylistTracker extends Tracker{

  constructor(worker, privacy, extensionfilter=[]){
    super(worker, privacy);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.is_allowed = null;

    // make sure this is the case as it can be blocked due to dynamic content
    // however, currently this is not the case
    this.privacy.full_deny = true;

    this.denylist_debug = false;

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
   * [is_allowed_by_lists returns if the path is allowed in social media platforms]
   * @param  {path}  [the location element to analyze the url]
   * @return {Boolean}   [if it is allow according to different lists in the background]
   */
  is_allowed_by_lists(path){
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


