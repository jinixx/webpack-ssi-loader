const request = require("sync-request");
const fs = require('fs');
const path = require('path');

class SSI {

  constructor(options) {
    this.options = options;

    this.options.matchers = {
      BLOCK: /<!--\s?#\s?block\s+name="(\w+)"\s+-->(.*?)<!--\s?#\s+endblock\s+-->/,
      INCLUDE: /<!--\s?#\s?include\s+(?:virtual|file)="([^"]+)"(?:\s+stub="(\w+)")?\s+-->/
    }
  }

  compile = async (content) => {
    // let output       = [];
    const blocks       = {};
    const splitContent = content.split("\n");
    const allPromises = [];

    for(let line of splitContent) {
      const part            = line.trim();
      const [name, content] = this.processBlock( part );

      if(name){
        blocks[name] = content;
      }
      else {
        allPromises.push(
          this.processInclude(part, blocks)
        )
      }
    }

    const resArr = await Promise.all(allPromises);

    return Array.isArray(resArr) ? resArr.join('') : '';
  }

  processBlock(part) {
    const matches = part.match(this.options.matchers.BLOCK);
    if(!matches) return "";
    return [matches[1], matches[2]];
  }

  processInclude(part, blocks) {
    return new Promise((resolve, reject) => {
      const matches = part.match(this.options.matchers.INCLUDE);
      
      if(!matches) resolve(part);

      const location = matches[1]
      const stub     = matches[2];

      this.getContent(location).then((res) => {
        const [status, body] = res;
        resolve(body);
      }).catch((err) => {
        // console.log('error', err);
        blocks[stub] ? resolve(blocks[stub]) : resolve('');
      });
    })
  }

  getContent(location) {
    return new Promise((resolve, reject) => {
      let match = false;

      for (let key in this.options.locations) {
        if(location.match(key)) {
          const filePath = path.join(this.options.root || __dirname, location);
   
          fs.readFile(filePath, 'utf8', function(err, contents) {
              if (err) throw(err);
              resolve([200, contents.toString()]);
          });
          
          match = true;
          break;
          // return [res.statusCode, res.statusCode < 400 ? res.getBody("utf8") : ""];
        }
      }
      if (!match) throw('no matching key');
    });
  }
}

module.exports = SSI;
