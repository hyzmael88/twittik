const puppeteer = require('puppeteer');
const readline = require('readline');
const { TwitterApi } = require('twitter-api-v2');
const { default: OBSWebSocket } = require('obs-websocket-js');
const fs = require('fs');

const client = new TwitterApi({
  appKey: 'H6AaojdUVQ1Ah5HxJcHBVOsnf',
  appSecret: 'I1vG17I8V18mFSdgLP7QLWRsdfUCuthJ0VIxfMG2LVgc4NepTH',
  accessToken: '1805482256263192576-KSaLZZnWLJkiwND6bbBDMJa5UBapFy',
  accessSecret: 'Yo7en12IceEAgDXPwsSTxh8jEBrkax3P9W4FWl7sEw9vK'
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
    const mediaData = await fs.promises.readFile(videoPath);
    const mediaId = await rwClient.v1.uploadMedia(mediaData, { mimeType: 'video/mp4' });
    await rwClient.v1.tweet('Check out this TikTok video!', { media_ids: mediaId });
    console.log('Video posted to Twitter');
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
        await postToTwitter('C:/Users/Hyzmael/Videos/intento.mp4'); // Reemplaza con la ruta correcta del video guardado
    
        rl.close();
        await browser.close();
      });
    };
    
    monitorTikTokLikes();