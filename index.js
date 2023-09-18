const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const mime = require('mime');

// Create a new WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

// Define your ImgBB API key
const imgbbApiKey = '85ca8a17f8b7e83315d74faa5d9543ea'; // Replace with your ImgBB API key

// Function to generate a meme URL
function generateMemeUrl(imgUrl, memeText) {
    return `https://api.memegen.link/images/custom/_/${encodeURIComponent(memeText)}.png?background=${encodeURIComponent(imgUrl)}`;
}

client.on('message', async (message) => {
    if (message.body.startsWith('.smeme')) {
        const memeCommandParts = message.body.split(' ');
        if (memeCommandParts.length >= 2 && message.hasMedia) {
            const memeText = memeCommandParts.slice(1).join(' '); // Extract meme text from message
            message.downloadMedia().then(async (media) => {
                if (media) {
                    const mediaPath = './downloaded-media/';
                    if (!fs.existsSync(mediaPath)) {
                        fs.mkdirSync(mediaPath);
                    }
                    const extension = mime.getExtension(media.mimetype);
                    const filename = new Date().getTime();
                    const fullFilename = mediaPath + filename + '.' + extension;

                    try {
                        fs.writeFileSync(fullFilename, media.data, { encoding: 'base64' });
                        console.log('File downloaded successfully!', fullFilename);

                        // Upload the image to ImgBB
                        const imgbbFormData = new FormData();
                        imgbbFormData.append('image', fs.createReadStream(fullFilename));

                        const imgbbResponse = await axios.post(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, imgbbFormData, {
                            headers: {
                                ...imgbbFormData.getHeaders(),
                            },
                        });

                        if (imgbbResponse.data.success) {
                            const imgUrl = imgbbResponse.data.data.url;
                            console.log('Image uploaded to ImgBB:', imgUrl);

                            // Generate the meme URL
                            const memeUrl = generateMemeUrl(imgUrl, memeText);
                            console.log('Meme URL:', memeUrl);

                            // Download the generated meme
                            const memeImageResponse = await axios.get(memeUrl, { responseType: 'arraybuffer' });

                            // Save the downloaded meme with the original filename
                            const memeFilename = filename + '-meme.' + extension;
                            fs.writeFileSync(fullFilename, memeImageResponse.data, { encoding: 'binary' });
                            console.log('Meme downloaded and saved:', fullFilename);

                            // Create and send the sticker using the downloaded meme
                            const memeMedia = MessageMedia.fromFilePath(fullFilename);
                            await client.sendMessage(message.from, memeMedia, {
                                sendMediaAsSticker: true,
                                stickerAuthor: "Created By Bot",
                                stickerName: "Praki",
                            });

                            // Delete the downloaded files
                            fs.unlinkSync(fullFilename);
                            console.log('Files deleted successfully!');
                        } else {
                            console.error('ImgBB upload failed:', imgbbResponse.data);
                        }
                    } catch (err) {
                        console.error('Error:', err);
                    }
                }
            });
        } else {
            message.reply(`Send an image with caption like '.smeme Your Meme Text Here'`);
        }
    }

    else if (message.body === '000' || message.body.startsWith('000')) {
        message.reply('Bot is Active');
    }
});

// Initialize the WhatsApp client
client.initialize();