const axios = require('axios');

const djangoClient = axios.create({
  baseURL: process.env.DJANGO_API_URL,
  headers: {
    'X-Internal-Api-Key': process.env.INTERNAL_API_KEY,
  },
});

module.exports = djangoClient;
