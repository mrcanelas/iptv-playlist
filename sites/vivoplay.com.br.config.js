const dayjs = require('dayjs');

module.exports = {
  lang: 'pt',
  site: 'vivoplay.com.br',
  channels: 'vivoplay.com.br.channels.xml',
  output: 'gh-pages/guide.xml',
  lang: 'pt',
  days: 3,

  url: function ({date, channel}) {
    return `https://contentapi-br.cdn.telefonica.com/25/default/pt-BR/schedules?ca_deviceTypes=null%7C401&fields=Title,Description,Start,End,EpgSerieId,SeriesPid,SeasonPid,images.videoFrame,images.banner&orderBy=START_TIME:a&filteravailability=false&starttime=${date.unix()}&endtime=${date.add(1, 'day').unix()}&livechannelpids=${channel.site_id}`;
  },
  logo: function ({channel}) {
    const img = channel.logo
    return img;
  },
  parser: function ({content}) {
    let programs = []
    const items = JSON.parse(content)

    items.Content.forEach(item => {
        const title = (item.Title.split(':')[1] != undefined) ? item.Title.split(':')[0] : item.Title
        const category = (item.Title.split(':')[1] != undefined) ? item.Title.split(':')[1] : ''
        const start = dayjs.unix(item.Start)
        const stop = dayjs.unix(item.End)
        const icon = item.Images.VideoFrame[0].Url
        programs.push({
          title,
          category,
          description: item.Description,
          start,
          stop,
          icon
        })
      })
    return programs;
  },
};
