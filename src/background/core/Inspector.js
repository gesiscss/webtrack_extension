const inspector = require('schema-inspector');
const validUrl = require('valid-url');

const stringDate = function (schema, post) {
  if (typeof post === 'string' && (new Date(post) === "Invalid Date" || isNaN(new Date(post)) )) {
       this.report('must be a string date (2019-04-02T07:16:25.879Z)');
       return '_INVALID_';
  }
  return post;
}

const stringUrl = function (schema, post) {
  try {
    if (!validUrl.isUri(post)) throw new Error('undefined');
    return post;
  } catch (_) {
    this.report(post+' is no URL');
    return '_INVALID_';
  }
}

const schemaPages = {
    type: 'object',
    properties: {
        close: {
          type: ['date', 'boolean']
        },
        content: {
          type: 'array',
          items: {
            create: {
              type: 'string',
              exec: stringDate
            },
            html: {
              type: 'string',
              minLength: 1
            },
          }
        },
        // adding when sending the data to the server
        // departing_url: {
        //   type: 'string',
        //   exec: stringUrl,
        // },
        elapsed: {
          type: 'integer',
        },
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              event: {
                type: 'string',
              },
              timestamp: {
                type: 'integer',
              },
              type: {
                type: 'string',
              },
              values: {
                type: 'array',
                properties: {
                  name: {
                    type: 'string',
                  },
                  value: {
                    type: ['string', 'number'],
                  },
                }
              },
            }
          }
        },
        id: {
          type: ['string'],
          minLength: 1
        },
        hashes: {
          type: 'array',
        },
        hostname: {
          type: 'string',
        },
        landing_url: {
          type: 'string',
          exec: stringUrl,
        },
        links: {
          type: 'array',
        },
        meta: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
            },
            keywords: {
              type: 'string',
            },
          }
        },
        precursor_id: {
          type: ['number', 'string', 'null']
        },
        // adding when sending the data to the server
        // send: {
        //   type: 'boolean',
        // },
        // sendTime: {
        //   type: 'string',
        //   exec: stringDate
        // },
        source: {
          type: 'array',
          items: {
            url: {
              type: 'string',
            },
            data: {
              type: 'string',
            },
          }
        },
        start: {
          type: 'string',
          exec: stringDate
        },
        // adding when sending the data to the server
        // startTime: {
        //   type: 'string',
        //   exec: stringDate
        // },
        tabId: {
          type: ['integer', 'null'],
        },
        title: {
          type: 'string',
        },
        unhashed_url: {
          type: 'string',
          exec: stringUrl
        }
    }
};



export default class Inspector {

  /**
   * [validatePage check the validation of a page object]
   * @param  {Object} pages
   * @return {Promise}
   */
  validatePage(pages){
    return new Promise((resolve, reject) =>{
      inspector.validate(schemaPages, pages, (err, result) =>  {
          if(!result.valid){
            reject(result.format())
          } else {
            resolve();
          }
      });
    });
  }

}
