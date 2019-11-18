import LocalstorageHandler from './LocalstorageHandler';


const LOAD_CERT_AFTER_SECONDS = 60*60*24;
const UPDATE_INTERVAL = 60*15*1000


export default class Configuration {

  /**
   * [constructor]
   * @param {Object} settings [instance of Settings]
   * @param {Object} transfer [instance of Transfer]
   */
  constructor(settings, transfer, blacklists) {
    this.settings = settings;
    this.versionType = settings.versionType;
    this.mobile = settings.mobile;
    this.transfer = transfer;
    this.blacklists = blacklists;
    this.getProject = this.getProject.bind(this);
    this.getProjects = this.getProjects.bind(this);
    this.setSending = this.setSending.bind(this);
    this.onError = this.onError.bind(this);
    this.load = this.load.bind(this);
    this.projectsStorage = new LocalstorageHandler('projects', null);
    this.select = new LocalstorageHandler('select', null);
    this.defaultId = new LocalstorageHandler('defaultId', null);
    this.certstorage = new LocalstorageHandler('cert', null);
    this.projectsTmpSettings = new LocalstorageHandler('projectsTmpSettings', {});
    this.isLoad = false;
    this.debug = true;
  }


  /**
   * [initialize the default id]
   */
  initDefaultId(){
    if(this.defaultId.get()==null){
      let id = "";
      let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for (let i = 0; i < 10; i++) id += possible.charAt(Math.floor(Math.random() * possible.length));
      this.defaultId.set(id);
    }
  }

  /**
   * [log warn the error]
   * @param  {Object} err
   */
  onError(err){
    console.warn('Configuration-Error:', err)
  }

  /**
   * [_isTimeDiffover check is time over required seconds]
   * @param  {Number}  time
   * @param  {Number}  [seconds]
   * @return {Boolean}
   */
  _isTimeDiffover(time=0, seconds=0){
    return parseInt((new Date().getTime()-time)/1000, 10)> seconds;
  }

  /**
   * [_fetchCert load and save server-certificate]
   * @return {String} cert
   */
  _fetchCert(){
    return new Promise((resolve, reject)=>{
      let cert = this.certstorage.get();
      if(cert===null){
        this.transfer.fileFetch(this.settings.server+'tracking/cert').then(cert => {
          this.certstorage.set(cert)
          resolve(cert);
         })
        .catch(this.onError)
      }else{
        if(this._isTimeDiffover(this.certstorage.getTimestamp(), LOAD_CERT_AFTER_SECONDS)){
           this.certstorage.set(null)
           this._fetchCert().then(resolve)
        }else{
            resolve(cert)
        }
      }
    });
  }

  /**
   * [getCert return all certificate]
   * @return {String}
   */
  getCert(){
    return this.cert
  }

  /**
   * [_fetchProject deliver all projects]
   * @return {Array}
   */
  _fetchProject(){
    return new Promise((resolve, reject)=>{

      this.transfer.jsonFetch(this.settings.server+'client/getProjects')
        .then(p => {
          this.projectsStorage.set(p);
          resolve(p);
         })
        .catch(err => {
          this.onError(err);
          resolve(this.projectsStorage.get())
        })

    });
  }

  /**
   * [getProjects return all projects]
   * @return {Array}
   */
  getProjects(){
    return this.projects;
  }

  /**
   * [getProject return project settings]
   * @param  {Integer} id
   * @return {Object}
   */
  getProject(id){
    if(this.isProjectAvailable(id)){
      return this.projects[this.projectIdtoIndex[id]]
    }else{
      return false;
    }    
  }


  isProjectAvailable(id){
    return this.projectIdtoIndex.hasOwnProperty(id);
  }

  /**
   * [_getProjectsTmpSettings return all user-settings of project]
   * @return {Object}
   */
  _getProjectsTmpSettings(){
    let newSettings = {};
    for (let p of this.projects) newSettings[p.ID] = {clientId: null, privateMode: false, sending: false};
    let r = Object.assign({}, newSettings, this.projectsTmpSettings.get())
    for (let id in r){
      if(!this.projectIds.includes(parseInt(id, 10))) delete r[id]
    }
    this.projectsTmpSettings.set(r);
    return r;
  }

  /**
   * [setSelect set select id of project
   * if id null than client will be logout with his id]
   * @param {Integer} id
   */
  setSelect(id){
    if(id==null){
      this.setProjectsTmpSettings({clientId: null});
      this.select.set(null);
    }else{
      id = parseInt(id, 10);
      if(this.projectIds.includes(id)) this.select.set(id);
    }
  }

  /**
   * [setProjectsTmpSettings set options of project]
   * @param {Object} setting [e.g. {privateMode: true, clientId: 'xcdy'}]
   */
  setProjectsTmpSettings(setting){
    let tmp = this.projectsTmpSettings.get();
    let project_settings = Object.assign({}, tmp[this.select.get()], setting);
    tmp[this.select.get()]= project_settings;
    this.projectsTmpSettings.set(tmp);
  }

  /**
   * [setPrivateMode set the private-mode of current project]
   * @param {Boolean} b
   */
  setPrivateMode(b){
    this.setProjectsTmpSettings({privateMode: b});
  }

  /**
   * [getProjectSettings return all settings from all projects]
   * @return {Object}
   */
  getProjectSettings(){
    return this._getProjectsTmpSettings();
  }

  /**
   * [getRunProjectSettings deliver active project settings]
   * @return {Object}
   */
  getRunProjectTmpSettings(){
    if (this.debug) console.log('Configuration.getRunProjectTmpSettings()')
    let selected = this.getSelect();
    if(this._getProjectsTmpSettings().hasOwnProperty(selected)){
      return this._getProjectsTmpSettings()[selected];
    }
    return false;   
  }

  /**
   * [setClientId set the clientid of current project]
   * @param {String} client_hash
   */
  setClientId(client_hash, project_id){
    return new Promise((resolve, reject)=>{
      if(this.projectIdtoIndex.hasOwnProperty(project_id) && this.projects[this.projectIdtoIndex[project_id]].SETTINGS.ENTERID){
        if(this.projects[this.projectIdtoIndex[project_id]].SETTINGS.CHECK_CLIENTIDS){
            let options = {
              method: 'POST',
              headers:{
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({'client_hash': client_hash, 'project_id': project_id})
            };
            this.transfer.jsonFetch(this.settings.server+'client/checkid', options)
            .then(b => {
              if(b) this.setProjectsTmpSettings({clientId: client_hash});
              resolve(b)
             })
            .catch(err => {
              console.log(err);
            })
        }else{
          this.setProjectsTmpSettings({clientId: client_hash});
          resolve(true);
        }
      }else
        reject('Set clientId is not necessary because project settings not required this setting')
    });
  }

  /**
   * [setPrivateMode set the clientid of current project]
   * @param {String} clientId
   */
  setSending(b=false){
    this.setProjectsTmpSettings({sending: b});
  }

  /**
   * [getSelect return selected project_id]
   * @return {Integer}
   */
  getSelect(){
    if (this.debug) console.log('-> Configuration.getSelect()')
    let select = this.select.get();
    if (select == null) {
      for (let index in this.projects) {
        if (this.projects[index].NAME == 'Default') {
          select = this.projects[index].ID;
          break;
        }
      }
    }
    if (this.debug) console.log('<- Configuration.getSelect()')
    return select;
  }

  /**
   * [load // fetch all required settings from server]
   */
  load(){
    if (this.debug) console.log('Configuration.load()')
    return new Promise(async (resolve, reject)=>{
      try {
        // throw new Error('test');
        this.initDefaultId();
        this.cert = await this._fetchCert();
        let e = await this._fetchProject();

        this.projectIds = e.map(v => v.ID);
        this.projectIdtoIndex = {}
        for (let index in e) {
          this.projectIdtoIndex[e[index].ID] = index;
        }
        this.projects = e;
        
        let selected = this.getSelect();
        if(!this.isLoad && !this.mobile && selected != null && this.isProjectAvailable(selected)){
          let p = this.projects[this.projectIdtoIndex[selected]];
          if(p.SETTINGS.ENTERID && p.SETTINGS.FORGOT_ID){
            this.setProjectsTmpSettings({clientId: null});
          }
          this.setProjectsTmpSettings({privateMode: false});
        }

        setTimeout(() => this.load(), UPDATE_INTERVAL);
        this.isLoad = true;
        resolve();
      } catch (e) {
        console.log(e);
        reject(e)
      }

    });//Promise
  }




}//class
