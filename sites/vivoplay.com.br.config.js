const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const today = dayjs.utc().tz('America/Sao_Paulo')
const iniDate = dayjs(today).subtract(2, 'day').format('DD-MM-YYYY')
const endDate = dayjs(today).add(2, 'day').format('DD-MM-YYYY')

module.exports = {
  lang: 'pt',
  site: 'vivoplay.com.br',
  channels: 'vivoplay.com.br.channels.xml',
  output: '.gh-pages/guide.xml',

  request: {

    method: 'GET',
    headers: {
      'Content-Type':
        'application/json; charset=utf-8',
    },
  },

  url: function ({channel}) {
    return `http://127.0.0.1:3000/${channel.site_id}/${iniDate}/${endDate}`;
  },
  logo: function ({channel}) {
    const img = channel.logo
    return img;
  },
  parser: function ({content}) {
    let programs = []
    const items = JSON.parse(content)
    if (!items.length) return programs
    
    items.forEach(item => {
        const title = (item.Title.split(':')[1] != undefined) ? item.Title.split(':')[0] : item.Title
        const category = (item.Title.split(':')[1] != undefined) ? item.Title.split(':')[1] : ''
        const start = dayjs.unix(item.Start)
        const stop = dayjs.unix(item.End)
        const icon = item.Images.VideoFrame[0].Url
        programs.push({
          title,
          category,
          description: item.Description,
          start: start,
          stop: stop,
          icon
        })
      })
    return programs;
  },
};
