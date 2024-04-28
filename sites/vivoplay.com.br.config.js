const dayjs = require('dayjs');
const regex = /T(\d+)\s+EP(\d+)/;
const genres = require("../data/genres.json")
const ratings = require("../data/ratings.json")
const persons = require("../data/persons.json")

module.exports = {
  lang: 'pt',
  site: 'vivoplay.com.br',
  channels: 'sites/vivoplay.com.br.channels.xml',
  output: 'gh-pages/guide.xml',
  days: 3,
  maxConnections: 100,

  url: function ({ date, channel }) {
    return `https://contentapi-br.cdn.telefonica.com/25/default/pt-BR/schedules?ca_deviceTypes=null%7C401&fields=Title,Description,Start,End,EpgSerieId,SeriesPid,SeasonPid,AgeRatingPid,ReleaseDate,images.videoFrame,images.banner&orderBy=START_TIME:a&filteravailability=false&starttime=${date.unix()}&endtime=${date.add(1, 'day').unix()}&livechannelpids=${channel.site_id}`;
  },
  logo: function ({ channel }) {
    const img = channel.logo
    return img;
  },
  parser: function ({ content }) {
    let programs = []
    const items = parseItems(content)

    items.forEach(item => {
      programs.push({
        title: parseTitle(item),
        sub_title: parseSubTitle(item),
        start: parseStart(item),
        stop: parseStop(item),
        date: parseDate(item),
        description: item.Description,
        ratings: parseRating(item),
        season: parseSeason(item),
        episode: parseEpisode(item),
        categories: parseCategories(item),
        icon: parseIcon(item),
        directors: parsePersons(item.DirectorPids),
        actors: parsePersons(item.ActorPids),
        writers: parsePersons(item.WriterPids),
        producers: parsePersons(item.ProducerPids),
      })
    })
    return programs;
  },
};

function parseItems(content) {
  const data = JSON.parse(content)
  if (!data || !Array.isArray(data.Content)) return []

  return data.Content
}

function parseTitle(item) {
  return (item.Title.split(':')[1] != undefined) ? item.Title.split(':')[0] : item.Title
}

function parseSubTitle(item) {
  const parts = item.Title.split(':');
  if (parts.length > 1) {
    const secondPart = parts[1].trim();
    if (secondPart.includes('-')) {
      return secondPart.split('-')[1].trim();
    } else {
      return secondPart;
    }
  } else {
    return undefined;
  }
}

function parseStart(item) {
  return dayjs.unix(item.Start)
}

function parseStop(item) {
  return dayjs.unix(item.End)
}

function parseDate(item) {
  return dayjs.unix(item.ReleaseDate)
}

function parseSeason(item) {
  const match = item.Title.match(regex)
  return match ? match[1] : undefined
}

function parseEpisode(item) {
  const match = item.Title.match(regex)
  return match ? match[2] : undefined
}

function parseCategories(item) {
  if (!item.GenrePids || !Array.isArray(item.GenrePids) || item.GenrePids.length === 0) {
    return [];
  }

  return item.GenrePids.map(Pid => {
    const findGenre = genres.Content.List.find(genre => genre.Pid === Pid);
    if (findGenre) {
      return {
        lang: 'pt',
        value: findGenre.Title
      };
    }
  })
}

function parsePersons(items) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items.map(Pid => {
    const findPerson = persons.find(person => person.Pid === Pid);
    if (findPerson) {
      return {
        value: findPerson.Title
      };
    }
  })
}

function parseRating(item) {
  if (!item.AgeRatingPid) {
    return [];
  }

  const findRating = ratings.Content.List.find(rating => rating.Pid === item.AgeRatingPid);

  if (!findRating) {
    return {};
  }

  const icon = findRating.Images.Cover && findRating.Images.Cover[0] && findRating.Images.Cover[0].Url
    ? findRating.Images.Cover[0].Url
    : findRating.Images.Icon && findRating.Images.Icon[0] && findRating.Images.Icon[0].Url
      ? findRating.Images.Icon[0].Url
      : '';

  return {
    system: '',
    icon: icon,
    value: findRating.Description
  };
}


function parseIcon(item) {
  if (Array.isArray(item.Images.VideoFrame) && item.Images.VideoFrame.length) {
    return {
      src: `https://spotlight-br.cdn.telefonica.com/customer/v1/source?image=${encodeURIComponent(item.Images.VideoFrame[0].Url)}&width=455&height=256&resize=CROP&format=JPEG`
    }
  }

  return null
}
