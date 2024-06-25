const puppeteer = require('puppeteer');
const readline = require('readline');
const Twit = require('twit');
const { default: OBSWebSocket } = require('obs-websocket-js');
const fs = require('fs');

const T = new Twit({
  consumer_key: 'GMaTFsmeqF4fihi5ZEhIbeIwE',
  consumer_secret: 'IzfrSyea6R9SYe6WM2Te6RGLWV3OryHuES3ETLRmtNQGAtms0w',
  access_token: '1805482256263192576-lgSLLd5nlQyzP2rnne7ZHRi1g6oNsN',
  access_token_secret: 'hM2KFF8rc5qZZg2Y4KhzcMijZWORJ8bsPAH3ws2vNCn4J'
});

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

/*
const postToTwitter = async (videoPath) => {
  const b64content = fs.readFileSync(videoPath, { encoding: 'base64' });

  T.post('media/upload', { media_data: b64content }, (err, data, response) => {
    if (err) {
      console.error('Error uploading media:', err);
      return;
    }
    const mediaIdStr = data.media_id_string;
    const params = { status: 'Check out this TikTok video!', media_ids: [mediaIdStr] };

    T.post('statuses/update', params, (err, data, response) => {
      if (err) {
        console.error('Error posting tweet:', err);
        return;
      }
      console.log('Video posted to Twitter');
    });
  });
};
*/
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

    rl.close();
    await browser.close();
  });
};

monitorTikTokLikes();