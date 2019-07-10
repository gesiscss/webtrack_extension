/*global settings*/
import LocalstorageHandler from './LocalstorageHandler';
import settings from './settings';
import * as en from './lang/en-lg';
import * as de from './lang/de-lg';

const language = {
  en: en.default,
  de: de.default
};
const DEFAULT = 'en';

// const extension = new Extension();

class Lang{

  constructor() {
    this.storage = new LocalstorageHandler('lang', settings.lang);
    let lang = this.storage.get();
    if(Object.keys(language).includes(lang)){
      for (let i in language[lang]) {
        this[i] = language[lang][i];
      }
    }else{
      console.error('Language was not found');
    }
  }//constructor

  /**
   * [set the default language]
   * @param {String} [lang=DEFAULT]
   */
  set(lang=DEFAULT){
    if(Object.keys(language).includes(lang)){
      this.storage.set(lang);
    }
  }

}//()

export default new Lang();
