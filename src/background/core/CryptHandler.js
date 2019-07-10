export default class CryptHandler {

  /**
   * [constructor set the publicKey in JSEncrypt]
   * @param {String} publicKey [description]
   */
  constructor(publicKey) {
    this._asymmetric = new JSEncrypt();

    this._asymmetric.setKey(publicKey);
  }

  /**
   * [_getRandomString deliver random string with default length 100]
   * @param  {Number} [length] [default: 100]
   * @return {String} text
   */
  _getRandomString(length=100){
    let text = "", possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
  }

  /**
   * [_symmetricEncrypt Encrypts a string symmetrically]
   * @param  {String} string
   * @return {Object}
   */
  _symmetricEncrypt(string){
      let key = this._getRandomString(32),
          iv  = this._getRandomString(32);

        let base64 = {
          key: CryptoJS.enc.Base64.parse(key),
          iv: CryptoJS.enc.Base64.parse(iv)
        }

        var encrypted = CryptoJS.AES.encrypt(string, base64.key, { iv: base64.iv });

        return {
            encrypted: encrypted.toString(),
            keys: {
              key: key,
              iv: iv
            }
        };
  }


  /**
   * [encrypt return crypt Object with asymmetric crypted string-keys]
   * @param  {String} string
   * @return {Object}
   */
  encrypt(string){
    let r = this._symmetricEncrypt(string);

    let back = {
      encrypted: r.encrypted,
      cryptkeys: this._asymmetric.encrypt(JSON.stringify(r.keys))
    }
    return back;
  }


  /**
   * [getCryptzip return Blob-File of Crypted-Data]
   * @param  {String} string
   * @return {Blob} blob
   */
  getCryptzip(string){
    return new Promise((resolve, reject)=>{
      var reader = new FileReader();
      this.zipHandler.create(string).then(zipBlob => {
        reader.onload = () => {
          var r = this.encrypt(reader.result); // <-- crypt data
          var blob = new Blob([JSON.stringify(r)], {type: MINI_TYPE});
          resolve(blob);
        }
        reader.readAsDataURL(zipBlob);
      }).catch(reject)
    })
  }


}//class
