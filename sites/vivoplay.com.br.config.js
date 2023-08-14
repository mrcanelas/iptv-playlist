const dayjs = require('dayjs');

module.exports = {
  lang: 'pt',
  site: 'vivoplay.com.br',
  channels: 'sites/vivoplay.com.br.channels.xml',
  output: 'gh-pages/guide.xml',
  days: 2,
  maxConnections: 200,

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
          start,
          stop,
          category,
          description: item.Description,
          icon
        })
      })
    return programs;
  },
};

//https://spotlight-br.cdn.telefonica.com/customer/v1/source?image=http%3A%2F%2Fmedia.gvp.telefonica.com%2Fstoragearea0%2FIMAGES%2F00%2F16%2F58%2F16587395_7AC529DE5E1485AD.jpg&width=455&height=256&resize=CROP&format=JPEG
//https://spotlight-br.cdn.telefonica.com/customer/v1/source?image=http%3A%2F%2Fmedia.gvp.telefonica.com%2Fstoragearea0%2FIMAGES%2F00%2F16%2F58%2F16587395_7AC529DE5E1485AD.jpg&amp;width=455&amp;height=256&amp;resize=CROP&amp;format=JPEG
