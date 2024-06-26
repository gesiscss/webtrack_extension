
import Tracker from '../Tracker';

export default class URLTracker extends Tracker{

  constructor(worker, privacy, extensionfilter=[]){
    super(worker, privacy);
    this.extensionfilter = extensionfilter;
    this.onStart = this.onStart.bind(this);
    this.is_allowed = null;

    this.url_debug = false;

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
      //if (this.url_debug) console.log('-> onStart!');
      fn(1000);
    }, 500);
  }

}//class


