export default class LocalstorageHandler {

  /**
   * [constructor]
   * @param {String} id
   * @param {Unknown} defaultValue
   */
  constructor(id, defaultValue) {
    this.id = id;
    this.defaultValue = defaultValue
  }

  /**
   * [is check is set value of id]
   * @return {Boolean}
   */
  is(){
    return localStorage.getItem(this.id)? true: false
  }

  /**
   * [set // set value of id in localstorage]
   * @param {Unknown} data
   */
  set(data, timestamp=new Date()){
    // console.log(this.getTimestamp());
    try {
      if((timestamp.getTime()-this.getTimestamp()) >= 0){
        data = JSON.stringify({timestamp: timestamp.getTime(), value: data});
        localStorage.setItem(this.id, data);
      }else{
        throw new Error('Not Saved! Timestamp is older than saved state');
      }
    } catch (e) {
      console.log(e);
      console.log(data);
    }
  }

  /**
   * [get return the Object of id]
   * @return {Object}
   */
  _fetch(){
    let data = localStorage.getItem(this.id) || {value: this.defaultValue, timestamp: null}
    try {
      data = JSON.parse(data);
    } catch (e) {}
    return data;
  }

  /**
   * [get return value of id]
   * @return {Unknown}
   */
  get(){
    return this._fetch().value;
  }

  /**
   * [get return timestamp of id]
   * @return {Integer}
   */
  getTimestamp(){
    return this._fetch().timestamp;
  }


  /**
   * [remove delete value of id]
   * @return {Boolean}
   */
  remove(){
    return localStorage.removeItem(this.id);
  }


}//class
