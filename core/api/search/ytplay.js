const axios = require('axios');

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const getCommonHeaders = () => ({
    'User-Agent': getRandomUserAgent(),
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://media.ytmp3.gg',
    'Referer': 'https://media.ytmp3.gg/',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site'
});

async function searchYouTube(query) {
    try {
        const response = await axios.get('https://yt-meta.convert1s.com/search', {
            params: { q: query },
            headers: getCommonHeaders()
        });

        const items = (response.data?.items || []).map(item => ({
            type: item.type,
            id: item.id,
            title: item.title,
            description: item.description || null,
            thumbnailUrl: item.thumbnailUrl,
            uploaderName: item.uploaderName,
            uploaderUrl: item.uploaderUrl || null,
            duration: item.duration,
            viewCount: item.viewCount,
            uploadDate: item.uploadDate
        }));

        return { items };
    } catch (error) {
        return null;
    }
}

async function getOembed(videoUrl) {
    const response = await axios.get('https://www.youtube.com/oembed', {
        params: { url: videoUrl, format: 'json' },
        headers: getCommonHeaders()
    });
    return response.data;
}

async function checkStatus(statusUrl) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(async () => {
            try {
                if (Date.now() - startTime > 120000) {
                    clearInterval(interval);
                    return reject(new Error('Timeout waiting for download processing.'));
                }

                const { data } = await axios.get(statusUrl, { headers: getCommonHeaders() });

                if (data?.status === 'completed' || data?.downloadUrl) {
                    clearInterval(interval);
                    resolve(data);
                } else if (data?.status === 'failed') {
                    clearInterval(interval);
                    reject(new Error('Server processing failed.'));
                }
            } catch (err) {
                clearInterval(interval);
                reject(err);
            }
        }, 3000);
    });
}

async function downloadYouTube(videoUrl, format = 'mp4', quality = '1080p') {
    try {
        await getOembed(videoUrl);

        const fmt = format.toLowerCase();
        const isAudio = ['mp3', 'm4a', 'ogg', 'opus', 'vlac', 'aac', 'alac'].includes(fmt);
        const targetType = isAudio ? "audio" : "video";

        let targetQuality = quality.toLowerCase();
        if (isAudio) {
            if (!targetQuality.includes('kbps') && !targetQuality.includes('k')) {
                targetQuality = '128kbps';
            } else if (targetQuality.includes('k') && !targetQuality.includes('kbps')) {
                targetQuality = targetQuality.replace('k', 'kbps');
            }
        } else {
            if (!targetQuality.includes('p') && ['1080', '720', '480', '360', '144'].includes(targetQuality)) {
                targetQuality = targetQuality + 'p';
            }
        }

        const payload = {
            url: videoUrl,
            os: "windows",
            output: {
                type: targetType,
                format: fmt,
                quality: targetQuality
            }
        };

        if (isAudio) {
            payload.audio = { bitrate: targetQuality.includes('kbps') ? targetQuality.replace('bps', '') : targetQuality };
        } else if (fmt !== 'mp4') {
            payload.audio = { bitrate: "128k" };
        }

        const isStandardMp4 = fmt === 'mp4';
        const targetApiUrl = isStandardMp4
            ? 'https://ytdl.convert1s.com/api/v2/download'
            : 'https://hub.convert1s.com/api/download';

        const initRequest = await axios.post(targetApiUrl, payload, {
            headers: {
                ...getCommonHeaders(),
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        if (!initRequest.data?.statusUrl) {
            throw new Error('Gagal mendapatkan url status antrean dari server hulu.');
        }

        const finalData = await checkStatus(initRequest.data.statusUrl);

        return {
            status: true,
            title: finalData.title,
            duration: finalData.duration,
            download_url: finalData.downloadUrl
        };
    } catch (error) {
        return { status: false, msg: error.message };
    }
}

module.exports = async (req, res) => {
    const query = req.method === "GET" ? req.query.query : req.body.query;

    if (!query) {
        res.statusCode = 400;
        return res.end(JSON.stringify({
            status: false,
            creator: "Nixx",
            result: "Parameter 'query' wajib diisi. Contoh: ?query=alan walker who i am"
        }));
    }

    try {
        const searchResult = await searchYouTube(query);

        if (!searchResult || !searchResult.items || searchResult.items.length === 0) {
            res.statusCode = 404;
            return res.end(JSON.stringify({
                status: false,
                creator: "Nixx",
                result: "Video tidak ditemukan."
            }));
        }

        const video = searchResult.items[0];
        const downloadData = await downloadYouTube(video.id, 'mp4', '360p');

        if (!downloadData.status) {
            res.statusCode = 500;
            return res.end(JSON.stringify({
                status: false,
                creator: "Nixx",
                result: downloadData.msg
            }));
        }

        res.end(JSON.stringify({
            status: true,
            creator: "Nixx",
            result: {
                title: video.title,
                thumbnail: video.thumbnailUrl,
                duration: video.duration,
                uploader: video.uploaderName,
                url: video.id,
                download_url: downloadData.download_url
            }
        }));
    } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({
            status: false,
            creator: "Nixx",
            result: error.message
        }));
    }
};
