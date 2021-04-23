const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const br_date = dayjs.utc().tz('America/Sao_Paulo');

module.exports = {
  lang: 'pt',
  site: 'tvmagazine.com.br',
  channels: 'tvmagazine.com.br.channels.xml',
  output: '.gh-pages/guide-tvmagazine.xml',
  
  request: {

    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36 Edg/79.0.309.71',
    },
    timeout: 50000

  },

  url({ date, channel }) {
    const [slug, id] = channel.site_id.split('/');
    return `https://94c8cb9f702d-tv-magazine-api.baby-beamup.club/${slug}/${id}/${br_date.format(
      'DD-MM-YYYY'
    )}`;
  },
  logo({ content }) {
    const img = content[0].logo
    return img;
  },
  parser({ content, date }) {
    const programs = content.map((el) => {
      const title = el.title
      const description = el.description
      const icon = el.icon
      const category = el.category
      const time = el.start
      const start = dayjs.utc(time, 'YYYY-MM-DD HH:mm:00-0300')
      return {
        title,
        start,
        description,
        category,
        icon
      }
    })
    return programs;
  },
};
