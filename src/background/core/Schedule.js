export default class Schedule {

  /**
   * [constructor]
   * @param {Object} settings [e.g. {END:1440, FRI:false, MON:true, SAT:false, START:60, SUN:true, THU:false, TUE:true, WED:true}]
   */
  constructor(settings) {
    this.settings = settings;
    this.days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  }

  /**
   * [inTime check is client-time in schedule]
   * @return {Boolean}
   */
  inTime(){
    let s = this.settings;
    let now = new Date();
    let minNow = now.getHours()*60+now.getMinutes();
    // console.log(s[this.days[now.getDay()]] ,  s.START < minNow, minNow < s.END);
    return s[this.days[now.getDay()]] && s.START < minNow && minNow < s.END
  }

  /**
   * [getNextPeriode get seconds of next sector to tracking]
   * @return {Integer}
   */
  getNextPeriode(){
    if(this.inTime()) return 0;
    let now = new Date();
    let next = -1;
    do {
      next++;
      let dateNr = now.getDay()+next;
    } while ( !this.settings[this.days[(now.getDay()+next)%7]] );
    let minNow = now.getHours()*60+now.getMinutes();
    let nextTime = (next*60*60*24*1000)+((this.settings.START-minNow)*60*1000)-now.getSeconds()*1000
    // console.log( new Date(new Date().getTime()+nextTime) );
    return nextTime;
  }



}
