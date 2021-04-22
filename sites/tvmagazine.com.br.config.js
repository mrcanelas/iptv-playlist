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
