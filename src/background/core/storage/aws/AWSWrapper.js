export default class AWSWrapper {

  /**
   * [DEFAUL_CONFIG description]
   * @return {Object}
   */
  get DEFAUL_CONFIG(){
    return {region: 'eu-central-1', logger: console}
  }

  /**
   * [_runService run aws-sdk service-functions with parameters]
   * @param  {String} functionname
   * @param  {Object} param         [default: {}]
   * @return {Promise} Object
   */
  _runService(functionname, param={}){
    return new Promise((resolve,reject) => {
      this.service[functionname](param, (err, data)=>{
        if(err)
          reject(err)
        else
          resolve(data)
      });
    });
  }

}
