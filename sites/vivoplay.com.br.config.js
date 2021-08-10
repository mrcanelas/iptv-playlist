const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const today = dayjs.utc().format('YYYY-MM-DD')
const tomorrow = dayjs(today).add(1, 'd').format('YYYY-MM-DD')
const starttime = dayjs(today).unix()
const endtime = dayjs(tomorrow).unix()

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
    return `https://contentapi-br.cdn.telefonica.com/25/default/pt-BR/schedules?ca_deviceTypes=null%7C401&fields=Title,Description,Start,End,EpgSerieId,SeriesPid,SeasonPid,images.videoFrame,images.banner&orderBy=START_TIME:a&filteravailability=false&starttime=${starttime}&endtime=${endtime}&livechannelpids=${channel.site_id}`;
  },
  logo: function ({channel}) {
    const img = channel.logo
    return img;
  },
  parser: function ({content}) {
    let programs = []
    const data = JSON.parse(content)
    const items = data.Content
    if (!items.length) return programs
    
    items.forEach(item => {
        const title = (item.Title.split(':')[1] != undefined) ? item.Title.split(':')[0] : item.Title
        const category = (item.Title.split(':')[1] != undefined) ? item.Title.split(':')[1] : ''
        const start = (dayjs.unix(item.Start).get('h') < 3) ? dayjs.unix(item.Start).add(1, 'd') : dayjs.unix(item.Start)
        const stop = (dayjs.unix(item.End).get('h') < 3) ? dayjs.unix(item.End).add(1, 'd') : dayjs.unix(item.End)
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
