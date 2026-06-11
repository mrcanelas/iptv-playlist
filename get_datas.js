const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const genresUrl = 'https://contentapi-br.cdn.telefonica.com/25/default/pt-BR/contents/all?contentTypes=GEN&fields=Pid,Titler&limit=10000';
const ratingUrl = 'https://contentapi-br.cdn.telefonica.com/25/default/pt-BR/contents/all?contentTypes=AGE&fields=Pid,Titler,Description,images&limit=10000';
const LIMIT = 100000;

async function fetchPersons(offset) {
    const url = `https://contentapi-br.cdn.telefonica.com/25/default/pt-BR/contents/all?contentTypes=PER&fields=Pid,Title&orderBy=contentOrder&limit=${LIMIT}&offset=${offset}`;

    try {
        const response = await axios.get(url);

        return response.data?.Content?.List || [];
    } catch (error) {
        if (
            error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT' ||
            error.message?.includes('socket hang up')
        ) {
            return [];
        }

        console.error('Erro ao buscar dados:', error.message);
        return [];
    }
}

async function getAllPersons() {
    let allPersons = [];
    let offset = 0;
    let lastFirstPid = null;

    while (true) {
        console.log(`Buscando persons com offset ${offset}...`);

        const persons = await fetchPersons(offset);

        if (persons.length === 0) {
            break;
        }

        const currentFirstPid = persons[0]?.Pid;

        // Proteção contra API retornando sempre a mesma página
        if (currentFirstPid && currentFirstPid === lastFirstPid) {
            console.warn('A API parece estar retornando a mesma página repetidamente. Interrompendo loop.');
            break;
        }

        lastFirstPid = currentFirstPid;

        allPersons = allPersons.concat(persons);

        // Se veio menos que o limite, provavelmente acabou
        if (persons.length < LIMIT) {
            break;
        }

        offset += LIMIT;
    }

    return allPersons;
}

async function downloadJson(url, filePath) {
    try {
        const response = await axios.get(url);
        await fs.outputJSON(filePath, response.data);
    } catch (error) {
        if (
            error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT' ||
            error.message?.includes('socket hang up')
        ) {
            return;
        }

        console.error('Ocorreu um erro ao baixar o JSON:', error.message);
    }
}

async function saveToJson(data) {
    fs.outputJSON(path.join(__dirname, 'data', 'persons.json'), data);
    console.log('Dados salvos em persons.json');
}

async function main() {
    await downloadJson(genresUrl, path.join(__dirname, 'data', 'genres.json'));
    await downloadJson(ratingUrl, path.join(__dirname, 'data', 'ratings.json'));

    const allPersons = await getAllPersons();
    await saveToJson(allPersons);
}

main();

