const NodeCache = require('node-cache');
// الكاش هيحفظ البيانات لمدة ساعة (3600 ثانية)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

module.exports = cache;