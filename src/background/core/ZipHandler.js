export default class ZipHandler {

  /**
   * [constructor]
   * @param {String} [workerScriptsPath='3rdpart/zip/']
   * @param {String} [defaultFilename='data.json']  
   */
  constructor(workerScriptsPath='3rdpart/zip/', defaultFilename='data.json') {
    zip.workerScriptsPath = workerScriptsPath;
    this.defaultFilename = defaultFilename;
  }

  /**
   * [create return zipped blob-file]
   * @param  {String} string
   * @param  {String} [filename] [default: this.defaultFilename]
   * @return {Blob}
   */
  create(string, filename=this.defaultFilename){
    return new Promise((resolve, reject)=>{
      zip.createWriter(new zip.BlobWriter("application/zip"), function(zipWriter) {
        zipWriter.add(filename, new zip.TextReader(string), function() {
          zipWriter.close(resolve);
        });
      }, reject);
    });
  }

  /**
   * [unzip unzip blob and return String]
   * @param  {Blob} blob
   * @return {String}
   */
  unzip(blob){
    return new Promise((resolve, reject)=>{
      zip.createReader(new zip.BlobReader(blob), function(zipReader) {
        zipReader.getEntries(function(entries) {
          entries[0].getData(new zip.TextWriter(), function(text) {
            zipReader.close();
            resolve(text);
          });
        });
      }, reject);
    })
 }


}
