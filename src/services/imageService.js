const axios = require('axios');

async function getWikiImage(query) {
    try {
        let wikiUrl = 'https://en.wikipedia.org/w/api.php?action=query&titles=' + encodeURIComponent(query) + '&prop=pageimages&format=json&pithumbsize=800&origin=*';
        let response = await axios.get(wikiUrl);
        let pages = response.data.query.pages;
        let pageId = Object.keys(pages)[0];
        if (pageId !== '-1' && pages[pageId].thumbnail) return pages[pageId].thumbnail.source; 
        return null; 
    } catch (error) { return null; }
}

async function getUnsplashImage(query) {
    try {
        const url = 'https://api.unsplash.com/search/photos?query=' + query + '&client_id=' + process.env.UNSPLASH_ACCESS_KEY + '&per_page=1';
        const response = await axios.get(url);
        if (response.data.results.length > 0) return response.data.results[0].urls.regular;
        return null;
    } catch (error) { return null; }
}

module.exports = { getWikiImage, getUnsplashImage };