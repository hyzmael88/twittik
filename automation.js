const puppeteer = require('puppeteer');
const readline = require('readline');
const { TwitterApi } = require('twitter-api-v2');
const { default: OBSWebSocket } = require('obs-websocket-js');
const fs = require('fs');
const path = require('path');

// Configuración del cliente de Twitter con la API v2 usando OAuth 1.0a User Context
const client = new TwitterApi({
  appKey: 'O7RLYK5mkqfhUGQzpN7SgDcRH',
  appSecret: 'evwQL9r0ktLyhecgBnUE5FRSXKBZJnMdmO17c4fZvQcMmGYyAv',
  accessToken: '1805482256263192576-Vas7bZrFxtwoONKq4jbkHD9PvXOQDR',
  accessSecret: 'wtx48qeyouDvv3WvYo3zyFzfAXmyEd4BPQsAFIYdjVPKj'
});

const rwClient = client.readWrite;

const obs = new OBSWebSocket();

const startRecording = async () => {
  try {
    console.log('Connecting to OBS WebSocket...');
    await obs.connect('ws://192.168.0.100:4455');
    console.log('Connected to OBS WebSocket, starting recording...');
    
    // Iniciar grabación
    await obs.call('StartRecord');
    console.log('Recording started.');
  } catch (e) {
    console.error('Failed to start recording:', e);
    throw e;
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
    throw e;
  }
};

// Función para verificar y obtener un nombre de archivo único
const getUniqueFileName = (directory, baseName, extension) => {
  let counter = 0;
  let fileName = `${baseName}.${extension}`;
  let filePath = path.join(directory, fileName);
  while (fs.existsSync(filePath)) {
    counter += 1;
    fileName = `${baseName}${counter}.${extension}`;
    filePath = path.join(directory, fileName);
  }
  return filePath;
};

// Función para monitorear la creación del archivo de grabación
const getLatestFile = (directory) => {
  const files = fs.readdirSync(directory);
  let latestFile = null;
  let latestTime = 0;
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    if (stats.isFile() && stats.mtimeMs > latestTime) {
      latestTime = stats.mtimeMs;
      latestFile = filePath;
    }
  }
  return latestFile;
};

// Función para subir un video a Twitter
const uploadVideoToTwitter = async (videoPath) => {
  try {
    const mediaId = await rwClient.v1.uploadMedia(videoPath, { type: 'video/mp4' });
    return mediaId;
  } catch (error) {
    console.error('Error subiendo el video:', error);
    throw error;
  }
};

// Función para publicar un tweet con un video
const postVideoToTwitter = async (videoPath, tweetText) => {
  try {
    const mediaId = await uploadVideoToTwitter(videoPath);
    const response = await rwClient.v2.tweet({
      text: tweetText,
      media: { media_ids: [mediaId] }
    });
    console.log('Tweet publicado con video:', response.data);
  } catch (error) {
    console.error('Error publicando el tweet con video:', error);
  }
};

const monitorTikTokLikes = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Por favor, introduce el enlace de TikTok: ', async (url) => {
    rl.question('Por favor, introduce el texto para el tweet: ', async (tweetText) => {
      // Definir el directorio y el nombre base del archivo de salida
      const directory = 'D:/ReactJSProyectos/twittik';
      const baseName = 'twit';
      const extension = 'mp4';
      const videoPath = getUniqueFileName(directory, baseName, extension);

      // Asegúrate de reemplazar la ruta de abajo con la ruta de tu perfil de usuario de Chrome
      const browser = await puppeteer.launch({
        headless: false, // Necesitas ejecutar Chrome en modo no headless para usar un perfil de usuario
        userDataDir: 'C:\Users\Hyzmael\AppData\Local\Google\Chrome\User Data/Profile 3', // Ruta del perfil de usuario
      });
      const page = await browser.newPage();

      // Definir el tamaño de pantalla a celular, por ejemplo, iPhone X
      await page.setViewport({ width: 1080, height: 1080 });
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
      try {
        await stopRecording();
      } catch (error) {
        console.error('Error al detener la grabación:', error);
        rl.close();
        await browser.close();
        return;
      }

      // Esperar un breve momento para asegurar que el archivo esté completamente escrito
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Obtener el último archivo creado en el directorio de grabación
      const latestFile = getLatestFile(directory);

      if (latestFile) {
        // Renombrar el archivo grabado con el nombre único
        fs.renameSync(latestFile, videoPath);
        // Publicar en Twitter con video
        await postVideoToTwitter(videoPath, tweetText);
      } else {
        console.error('No se pudo encontrar el archivo de grabación.');
      }

      rl.close();
      await browser.close();
    });
  });
};

monitorTikTokLikes();
