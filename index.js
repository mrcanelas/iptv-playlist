const express = require('express')
const app = express()
const axios = require('axios')
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const respond = function (res, data) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  res.send(data);
};

function getTimestamp(value){
  return dayjs(value).unix()
}

function arrayDates(iniDate, endDate) {
  const dates = []
  for(var newDate = dayjs(iniDate, "DD-MM-YYYY"); newDate <= dayjs(endDate, "DD-MM-YYYY"); newDate = newDate.add(1, "day")){
    dates.push(newDate)
  }
  return dates
}

async function getMoreDays(channel, arr_dates) {
  const dates = arr_dates.map(date => {
    const today = date
    const tomorrow = date.add(1, "day")
    return `https://contentapi-br.cdn.telefonica.com/25/default/pt-BR/schedules?ca_deviceTypes=null%7C401&fields=Title,Description,Start,End,EpgSerieId,SeriesPid,SeasonPid,images.videoFrame,images.banner&orderBy=START_TIME:a&filteravailability=false&starttime=${getTimestamp(today)}&endtime=${getTimestamp(tomorrow)}&livechannelpids=${channel}`
  })
  const data = await Promise.all(dates.map(async (elem) => {
    const content = await axios.get(elem)
    return content.data.Content
  }))
  const items = [].concat(...data)
  return Promise.resolve(items)
}

app.get('/:channel/:iniDate/:endDate', async function (req, res) {
  const [channel, iniDate, endDate] = [req.params.channel, req.params.iniDate, req.params.endDate]
  const dates = arrayDates(iniDate, endDate)
  const resp = await getMoreDays(channel, dates)
  respond(res, resp)
})
 
module.exports = app