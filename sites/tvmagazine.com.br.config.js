const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const cheerio = require('cheerio');
const needle = require('needle');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const endpoint = 'https://www.tvmagazine.com.br';
const br_date = dayjs.utc().tz('America/Sao_Paulo');

module.exports = {
  lang: 'pt',
  site: 'tvmagazine.com.br',
  channels: 'tvmagazine.com.br.channels.xml',
  output: '.gh-pages/guide.xml',

  url({ date, channel }) {
    const [slug, id] = channel.site_id.split('/');
    return `https://www.tvmagazine.com.br/programacao/${slug}/${id}/${br_date.format(
      'DD/MM/YYYY'
    )}`;
  },
  logo({ content }) {
    $ = cheerio.load(content);
    const img = $('.logo').find('img').attr('src');
    return endpoint + img;
  },
  parser({ content, date }) {
    const programs = [];
    console.log(content)
    $ = cheerio.load(content);

    $("*[itemscope]").each((i, el) => {
      const url = endpoint + $(el).find('a').attr('href');
      const title = $(el).find('a').text();
      const time = $(el).find('meta').attr('content');
      console.log({url, title, time})
      const [icon, description, category] = needle.get(
        url,
        function (error, response) {
          if (!error && response.statusCode == 200)
          $ = cheerio.load(response.body);
          const icon = endpoint + $('.fotos').find('a').attr('href');
          const description = $('.infos').text();
          const category = $('.fichatecnica').find('li').text();
          const data = { icon, description, category };
          console.log(data)
          return data;
        }
      );

      if (title && time) {
        const start = dayjs.utc(time, 'YYYY-MM-DD HH:mm:00-0300');          

        if (programs.length && !programs[programs.length - 1].stop) {
          programs[programs.length - 1].stop = start
        }
      }

      programs.push({
        title,
        start,
        icon,
        description,
        category,
      });
    });

    return programs;
  },
};
