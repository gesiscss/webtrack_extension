import LocalstorageHandler from './LocalstorageHandler';


const LOAD_CERT_AFTER_SECONDS = 60*60*24;
// Every 20 minutes
const UPDATE_INTERVAL = 20*60*1000


export default class Configuration {

  /**
   * [constructor]
   * @param {Object} settings [instance of Settings]
   * @param {Object} transfer [instance of Transfer]
   */
  constructor(settings, transfer, blacklists) {
    this.settings = settings;
    this.versionType = settings.versionType + ' (' + settings.getBrowser().name + '-' + settings.getBrowser().version + ')';
    this.mobile = settings.mobile;
    this.transfer = transfer;
    this.blacklists = blacklists;
    this.getProject = this.getProject.bind(this);
    this.getProjects = this.getProjects.bind(this);
    this.setSending = this.setSending.bind(this);
    this.load = this.load.bind(this);
    this.projectsStorage = new LocalstorageHandler('projects', null);
    this.select = new LocalstorageHandler('select', null);
    this.defaultId = new LocalstorageHandler('defaultId', null);
    this.certstorage = new LocalstorageHandler('cert', null);
    this.projectsTmpSettings = new LocalstorageHandler('projectsTmpSettings', {});
    this.is_load = false;
    this.debug = false;

    //if (this.debug) console.log(blacklists);
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
        //if (this.debug) console.log('No certificate, fetching one');
        this.transfer.fileFetch(this.settings.server+'tracking/cert').then(cert => {
          //if (this.debug) console.log('Fetch certificate!');
          this.certstorage.set(cert)
          resolve(true);
         })
        .catch(err => {
          //if (this.debug) console.log('Faile fetching the certificate: ', err);
          resolve(false);
        })
      }else{
        if(this._isTimeDiffover(this.certstorage.getTimestamp(), LOAD_CERT_AFTER_SECONDS)){
          //if (this.debug) console.log('Expired certificate, renewing it');
          this.certstorage.set(null)
          this._fetchCert().then(b => resolve(b));
        }else{
          //if (this.debug) console.log('Using restored certificate');
          resolve(true)
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

      let client_hash = null;
      if (this.getRunProjectTmpSettings()){
        client_hash = this.getRunProjectTmpSettings().clientId;
      } 
      if (client_hash == null ) {
        client_hash = 'NULL';
      }
      this.transfer.jsonFetch(this.settings.server+'client/getProjects', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({client_hash: client_hash})})
      .then(projects => {
          //if (this.debug) console.log('Fetch projects!');
          this.projectsStorage.set(projects);
          this.store_projects(projects);
          resolve(true);
         })
        .catch(err => {
          //if (this.debug) console.log('_fetchProject: ', err);
          console.log("Failed fetching the projects");
          resolve(false);
        })

    });
  }

  /**
   * [getProjects return all projects]
   * @return {Array}
   */
  getProjects(){
    //if (this.debug) console.log('-> Configuration.getProjects()');
    return this.projects;
  }


  /**
   * [is the configuraion loaded correctly]
   * @return {Boolean} [true if the configuration was loaded correctly]
   */
  isLoaded(){
    //if (this.debug) console.log('-> Configuration.isLoaded()');
    return this.is_load;
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
    //if (this.debug) console.log('-> Configuration.getProjectSettings()');
    if (!this.isLoaded()){
      return {};
    }
    let newSettings = {};
    for (let p of this.projects) { 
      newSettings[p.ID] = {clientId: null, privateMode: false, sending: false}
    }
    let r = Object.assign({}, newSettings, this.projectsTmpSettings.get());
    for (let id in r) {
      if(!this.projectIds.includes(parseInt(id, 10))) { 
        delete r[id];
      }
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
    //if (this.debug) console.log('-> Configuration.setSelect(',id,')');

    if(id==null){
      this.setProjectsTmpSettings({clientId: null});
      this.select.set(null);
    } else if (!this.isLoaded()){
      // Do not remove the client Id
      this.select.set(null);
    } else{
      id = parseInt(id, 10);
      if(this.projectIds.includes(id)) this.select.set(id);
    }
  }

  /**
   * [setProjectsTmpSettings set options of project]
   * @param {Object} setting [e.g. {privateMode: true, clientId: 'xcdy'}]
   */
  setProjectsTmpSettings(setting){
    //if (this.debug) console.log('-> Configuration.setProjectsTmpSettings()');

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
    //if (this.debug) console.log('-> Configuration.getProjectSettings()');
    return this._getProjectsTmpSettings();
  }

  /**
   * [getRunProjectSettings deliver active project settings]
   * @return {Object}
   */
  getRunProjectTmpSettings(){
    //if (this.debug) console.log('-> Configuration.getRunProjectTmpSettings()');
    let selected = this.getSelect();
    if(this._getProjectsTmpSettings().hasOwnProperty(selected)){
      return this._getProjectsTmpSettings()[selected];
    }
    return null;
  }

  /**
   * [setClientId set the clientid of current project]
   * @param {String} client_hash
   */
  setClientId(client_hash, project_id){
    return new Promise((resolve, reject)=>{
      //if (this.debug) console.log('-> config.setClientId(', client_hash, ',', project_id, ')');

      if (client_hash == null){
        this.setProjectsTmpSettings({clientId: null});
        resolve(true);
      } else {
        client_hash = client_hash.trim();
        if(this.projectIdtoIndex.hasOwnProperty(project_id) && 
          this.projects[this.projectIdtoIndex[project_id]].SETTINGS.ENTERID){
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
                resolve(null);
              })
          }else{
            this.setProjectsTmpSettings({clientId: client_hash});
            resolve(true);
          }
        } else {
          reject('Set clientId is not necessary because project settings not required this setting')
        }
      }
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
    //if (this.debug) console.log('-> Configuration.getSelect()');
    let select = this.select.get();
    if (select == null) {
      let project_name = this.settings.project_name
      console.log(this.projects) 
      for (let index in this.projects) {
        if (this.projects[index].NAME == project_name) {
          select = this.projects[index].ID;
          break;
        }
      }
      if (select == null) {
        console.log('No project with the name:', project_name);
      } else {
        console.log('Project found: ', project_name);

      }
    }

    //if (this.debug) console.log('<- Configuration.getSelect()')
    return select;
  }

  /**
   * load the projects and variables associated for the main control of the prorgram
   * @param  projects coming from the server request
   */
  store_projects(projects){
    //if (this.debug) console.log('-> Configuration.store_projects()');
    this.projectIds = projects.map(v => v.ID);
    this.projectIdtoIndex = {}
    for (let index in projects) {
      this.projectIdtoIndex[projects[index].ID] = index;
    }
    this.projects = projects;
    
    let selected = this.getSelect();
    if(!this.is_load && !this.mobile && selected != null && this.isProjectAvailable(selected)){
      let p = this.projects[this.projectIdtoIndex[selected]];
      if(p.SETTINGS.ENTERID && p.SETTINGS.FORGOT_ID){
        this.setProjectsTmpSettings({clientId: null});
      }
      this.setProjectsTmpSettings({privateMode: false});
    }
    this.is_load = true;

    setTimeout(() => this.load(), UPDATE_INTERVAL);
    
  }

  /**
   * load dummy variables when the connection to the server is not succesful
   */
  _loadDisconnectedMode(){
    //if (this.debug) console.log('Operating in disconnected mode');

    this.projectIds = null;
    this.projectIdtoIndex = null;
    this.projects = [];
    setTimeout(() => this.load(), UPDATE_INTERVAL);

  }

  /**
   * [load // fetch all required settings from server]
   */
  load(){

    return new Promise(async (resolve, reject)=>{

      //if (this.debug) console.log('-> Configuration.load() - Promise');

      //TODO: is this necessary
      this.initDefaultId();

      // Load the certificates
      if (await this._fetchCert()){

        // Load the projects
        await this._fetchProject();
      }

      //if (this.debug) console.log('<- Configuration.load() - Promise');
      resolve(this.is_load);

    });//Promise
  }




}//class
