const puppeteer = require('puppeteer');
const readline = require('readline');
const Twitter = require('twitter-lite');
const { default: OBSWebSocket } = require('obs-websocket-js');
const fs = require('fs');

const client = new Twitter({

  consumer_key: '9o4Q3xB4mzhvTBGSJ0zR4HZw1',
  consumer_Secret: '2aeonXCTFtYoNtru3nGWvXwFvWbhthPtJbdm4Y62HUXbENplXT',
  access_token_key: '1805482256263192576-GttweuTFzMYO2SA2KDdOxV83lOm4SP',
  access_token_secret: 'naaFRSsnSEJ7qZ4UCo0Lp5Xutp8gTSrEtwMP2TStbjGRf',
  bearer_token: 'AAAAAAAAAAAAAAAAAAAAAO32uQEAAAAApIUQu6p5sfScxCLZ3BWzIOeK0bM%3DID0iEvLJtxvYnzFwK1QKcUDJrApUXFfejoywnVKedy3EfYPsVa'
});

const rwClient = client.readWrite;

const obs = new OBSWebSocket();

const startRecording = async () => {
  try {
    console.log('Connecting to OBS WebSocket...');
    await obs.connect('ws://192.168.0.100:4455');
    console.log('Connected to OBS WebSocket, starting recording...');
    await obs.call('StartRecord');
    console.log('Recording started.');
  } catch (e) {
    console.error('Failed to start recording:', e);
  }
};

const stopRecording = async () => {
  try {
    console.log('Stopping recording...');
    await obs.call('StopRecord');
    console.log('Recording stopped.');
    await obs.disconnect();
    console.log('Disconnected from OBS WebSocket.');
  } catch (e) {
    console.error('Failed to stop recording:', e);
  }
};

const scrollComments = async (page) => {
  let scrollHeight = 0;
  while (scrollHeight < 5000) {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    scrollHeight += window.innerHeight;
  }
};

const postToTwitter = async (videoPath) => {
  try {
    console.log('Reading video file...');
    const mediaData = await fs.promises.readFile(videoPath);

    console.log('Initializing media upload...');
    const initResponse = await client.post('media/upload', {
      command: 'INIT',
      total_bytes: mediaData.length,
      media_type: 'video/mp4',
      media_category: 'tweet_video'
    });

    const mediaId = initResponse.media_id_string;

    console.log('Uploading media in segments...');
    const segmentSize = 5 * 1024 * 1024; // 5MB per segment
    for (let i = 0; i < mediaData.length; i += segmentSize) {
      const segment = mediaData.slice(i, i + segmentSize);
      await client.post('media/upload', {
        command: 'APPEND',
        media_id: mediaId,
        segment_index: Math.floor(i / segmentSize),
        media: segment.toString('base64')
      });
    }

    console.log('Finalizing media upload...');
    const finalizeResponse = await client.post('media/upload', {
      command: 'FINALIZE',
      media_id: mediaId
    });

    const { processing_info } = finalizeResponse;
    if (processing_info) {
      let state = processing_info.state;
      while (state !== 'succeeded') {
        if (state === 'failed') {
          throw new Error('Video processing failed.');
        }

        const waitTime = processing_info.check_after_secs * 1000;
        console.log(`Waiting for ${waitTime} milliseconds for processing...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));

        const statusResponse = await client.get('media/upload', {
          command: 'STATUS',
          media_id: mediaId
        });

        state = statusResponse.processing_info.state;
      }
    }

    console.log('Media uploaded, posting tweet...');
    const tweetResponse = await client.post('statuses/update', {
      status: 'Check out this TikTok video!',
      media_ids: mediaId
    });
    console.log('Video posted to Twitter', tweetResponse);
  } catch (e) {
    console.error('Error posting tweet:', e);
  }
};




const monitorTikTokLikes = async () => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

  
    
    rl.question('Por favor, introduce el enlace de TikTok: ', async (url) => {
        // Asegúrate de reemplazar la ruta de abajo con la ruta de tu perfil de usuario de Chrome
        const browser = await puppeteer.launch({
            headless: false, // Necesitas ejecutar Chrome en modo no headless para usar un perfil de usuario
            userDataDir: 'C:\Users\Hyzmael\AppData\Local\Google\Chrome\User Data/Profile 3', // Ruta del perfil de usuario
        });
        const page = await browser.newPage();
    
        // Definir el tamaño de pantalla a celular, por ejemplo, iPhone X
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto(url);
    
        // Esperar a que el botón sea visible y hacer clic en él
        await page.waitForSelector('.css-1kvp3av-DivVoiceControlContainer');
        await page.click('.css-1kvp3av-DivVoiceControlContainer');
    
        // Iniciar grabación
        await startRecording();
        
        // Esperar 10 segundos para iniciar sesión manualmente (si es necesario)
        await new Promise(resolve => setTimeout(resolve, 7000));
        
        // Hacer scroll lentamente hacia abajo durante 30 segundos
        let startTime = Date.now();
        while (Date.now() - startTime < 30000) {
          await page.evaluate(() => {
            window.scrollBy(0, 15); // Ajusta el valor de scroll según necesites
          });
          await new Promise(resolve => setTimeout(resolve, 200)); // Ajusta la velocidad de scroll
        }
    
        // Detener grabación
        await stopRecording();
    
        // Publicar en Twitter
        await postToTwitter('D:/ReactJSProyectos/twittik/intento2.mp4'); // Reemplaza con la ruta correcta del video guardado
    
        rl.close();
        await browser.close();
      });
    };
    
    monitorTikTokLikes();