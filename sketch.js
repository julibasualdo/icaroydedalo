// ============================================================================
// Sketch Principal: El Mito de Ícaro y Dédalo (Máxima Optimización)
// ============================================================================

let ws;
try {
  ws = new WebSocket("ws://localhost:8080");
} catch (e) { ws = null; }

function avisar(evento) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ evento }));
  }
}

let video = null;
let introVid = null;
let introVidReady = false;
let introLayer = null;
let keyShader = null;

const vertShader = `
  attribute vec3 aPosition;
  attribute vec2 aTexCoord;
  varying vec2 vTexCoord;
  void main() {
    vTexCoord = aTexCoord;
    vec4 positionVec4 = vec4(aPosition, 1.0);
    positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
    gl_Position = positionVec4;
  }
`;

const fragShader = `
  precision mediump float;
  varying vec2 vTexCoord;
  uniform sampler2D tex0;
  void main() {
    vec2 uv = vec2(vTexCoord.x, 1.0 - vTexCoord.y);
    vec4 col = texture2D(tex0, uv);
    float luma = max(col.r, max(col.g, col.b));
    float alpha = smoothstep(0.03, 0.16, luma);
    gl_FragColor = vec4(col.rgb, alpha);
  }
`;

let startScreenStartTime = 0;
const INTRO_ZOOM_START = 3200;
const INTRO_ZOOM_END   = 5200;
const INTRO_UI_DELAY   = 4600;

let pose = null;
let cameraInstance = null;
let poses = [];
let feathers = [];
let floatingLeaves = [];
let seagulls = [];
let bgClouds = [];
let novilloSparkles = [];
let finalRainDrops = [];

// Variables de imágenes y buffers pre-difuminados
let featherImg = null;
let nubeArribaImg = null;
let nubeAbajoImg = null;
let nubeArribaSoft = null;
let nubeAbajoSoft = null;
let nubeArribaBgSoft = null;
let nubeAbajoBgSoft = null;
let leavesImg = null;
let personajeImg = null;
let alasCerradasImg = null;
let alasAbiertasImg = null;
let icaroCayendoImg = null;
let novilloImg = null;

// Caché de degradado atmosférico
let cachedGrad = null;
let cachedTopKey = "";
let cachedBotKey = "";
let cachedGradH = 0;

// Control de inicio y estado
let gameStarted = false;
let resolumeSenalEnviada = false;

// Control de audios
let sndAmbiente = null;
let sndAleteo = null;
let sndViento = null;
let sndFuego = null;
let sndFuego2 = null;
let sndFinal = null;

let thunderNoise = null;
let thunderEnv = null;

let playingAmbiente = false;
let playingAleteo = false;
let playingViento = false;
let playingFuego = false;
let playingFuego2 = false;
let playingFinal = false;
let aleteoFaded = false;
let audioEndingFaded = false;

// Pausa
let isPaused = false;
let pauseStartMillis = 0;
let totalPausedDuration = 0;

// Temporización y vuelo
let startTime = 0;
const STORY_DURATION = 3000;
const TRANSITION_DURATION = 1200;
const FLIGHT_START = STORY_DURATION + TRANSITION_DURATION;

let interactiveProgress = 0.0;
let progress = 0.0;

let cameraStarted = false;
let cameraShutDown = false;
let isProcessingPose = false;
let lastPoseSendTime = 0;
const POSE_INTERVAL_MS = 75;
let lastAudioUpdate = 0;

// Aleteo y tracking
let wingOpenness = 0.0;
let visualWingAnim = 0.0;
let lastWingOpenness = 0.0;
let alasAlpha = 0.0;
let flapStrength = 0;

let lightningFlash = 0;
let currentLightning = null;
let lightningTriggered = false;

let explosionTriggered = false;
let explosionFlash = 0;
let epilogueStartTime = 0;
let finalStormLightningDone = false;

function preload() {
  featherImg      = loadImage('pluma.png');
  nubeArribaImg   = loadImage('nubearriba.png');
  nubeAbajoImg    = loadImage('nubeabajo.png');
  leavesImg       = loadImage('hojas.png');
  personajeImg    = loadImage('personaje.png');
  alasCerradasImg = loadImage('alascerradas.png');
  alasAbiertasImg = loadImage('alasabiertas.png');
  icaroCayendoImg = loadImage('icarocae.png');
  novilloImg      = loadImage('novillo.png');
}

// Pre-renderiza la nube con bordes difuminados a un tamaño acotado para ahorrar memoria
function bakeSoftCloud(img, maxW, coreBlur, haloBlur) {
  if (!img || img.width <= 0) return null;
  let ratio = img.height / img.width;
  let targetW = Math.min(img.width, maxW);
  let targetH = Math.round(targetW * ratio);
  let pad = Math.ceil(haloBlur * 2.2);
  let w = targetW + pad * 2;
  let h = targetH + pad * 2;

  let pg = createGraphics(w, h);
  pg.pixelDensity(1);
  let ctx = pg.drawingContext;

  ctx.save();
  ctx.filter = `blur(${haloBlur}px)`;
  ctx.globalAlpha = 0.55;
  pg.image(img, pad - targetW * 0.015, pad - targetH * 0.015, targetW * 1.03, targetH * 1.03);
  ctx.restore();

  ctx.save();
  ctx.filter = `blur(${coreBlur}px)`;
  ctx.globalAlpha = 1.0;
  pg.image(img, pad, pad, targetW, targetH);
  ctx.restore();

  return pg;
}

function rebuildCloudCaches() {
  if (nubeArribaSoft) nubeArribaSoft.remove();
  if (nubeAbajoSoft) nubeAbajoSoft.remove();
  if (nubeArribaBgSoft) nubeArribaBgSoft.remove();
  if (nubeAbajoBgSoft) nubeAbajoBgSoft.remove();

  nubeArribaSoft   = bakeSoftCloud(nubeArribaImg, 920, 2.5, 15);
  nubeAbajoSoft    = bakeSoftCloud(nubeAbajoImg, 880, 2.5, 15);
  nubeArribaBgSoft = bakeSoftCloud(nubeArribaImg, 480, 7, 14);
  nubeAbajoBgSoft  = bakeSoftCloud(nubeAbajoImg, 480, 7, 14);
}

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent(document.body);
  pixelDensity(1);
  frameRate(60);

  startScreenStartTime = millis();
  rebuildCloudCaches();

  introLayer = createGraphics(windowWidth, windowHeight, WEBGL);
  keyShader = introLayer.createShader(vertShader, fragShader);

  introVid = createVideo(['intro.mp4'], () => {
    introVidReady = true;
    introVid.volume(0);
    introVid.loop();
    startScreenStartTime = millis();
  });
  introVid.volume(0);
  introVid.loop();
  introVid.hide();

  soundFormats('mp3');
  try {
    sndAmbiente = loadSound('1AMBIENTE.mp3');
    sndAleteo   = loadSound('2ALETEO.mp3');
    sndViento   = loadSound('3VIENTO 4.mp3');
    sndFuego    = loadSound('3FUEGO.mp3');
    sndFuego2   = loadSound('FUEGO2.mp3');
    sndFinal    = loadSound('4FINAL.mp3');
  } catch (e) {
    console.log("Audio omitido o cargando en segundo plano.");
  }

  thunderEnv = new p5.Envelope();
  thunderEnv.setADSR(0.01, 1.2, 0.1, 0.8);
  thunderEnv.setRange(0.8, 0);
  thunderNoise = new p5.Noise('brown');
  thunderNoise.amp(thunderEnv);
  thunderNoise.start();

  for (let i = 0; i < 20; i++) {
    novilloSparkles.push({
      angle: random(TWO_PI),
      distRadius: random(50, 150),
      size: random(3, 6.5),
      speed: random(0.015, 0.045),
      alphaOffset: random(TWO_PI)
    });
  }

  for (let i = 0; i < 5; i++) {
    bgClouds.push({
      x: random(width * 0.18, width * 0.82),
      y: random(-100, height + 100),
      speedY: random(1.5, 3.0),
      sizeW: random(280, 460),
      alpha: random(70, 125),
      isTopType: i % 2 === 0
    });
  }

  for (let i = 0; i < 3; i++) {
    seagulls.push({
      x: random(-width * 0.5, 0),
      y: random(height * 0.2, height * 0.6),
      vx: random(3.5, 5.5),
      size: random(16, 26),
      wingAngle: random(TWO_PI),
      wingSpeed: random(0.08, 0.14)
    });
  }

  for (let i = 0; i < 55; i++) {
    finalRainDrops.push({
      x: random(width * 0.08, width * 0.92),
      y: random(-height, height),
      len: random(14, 28),
      speedY: random(13, 21),
      speedX: random(-2.2, -1.0),
      alpha: random(65, 150)
    });
  }
}

function mousePressed() {
  userStartAudio();

  if (!gameStarted) {
    if (introVid && introVidReady && introVid.elt && introVid.elt.paused) {
      introVid.loop();
    }

    let introElapsed = millis() - startScreenStartTime;
    if (introElapsed < INTRO_UI_DELAY) return;

    let novilloX = width / 2;
    let novilloY = height * 0.365;
    let d = dist(mouseX, mouseY, novilloX, novilloY);

    if (d < 100) {
      gameStarted = true;
      startTime = millis();

      if (introVid) {
        introVid.stop();
        introVid.remove();
        introVid = null;
      }
      if (introLayer) {
        introLayer.remove();
        introLayer = null;
      }

      if (sndAmbiente && sndAmbiente.isLoaded() && !sndAmbiente.isPlaying()) {
        sndAmbiente.loop();
        sndAmbiente.setVolume(0.35);
        playingAmbiente = true;
      }
    }
    return;
  }

  isPaused = !isPaused;

  if (isPaused) {
    pauseStartMillis = millis();
    pauseAllSounds();
  } else {
    totalPausedDuration += (millis() - pauseStartMillis);
    resumeCurrentSounds();
  }
}

function pauseAllSounds() {
  if (sndAmbiente && sndAmbiente.isPlaying()) sndAmbiente.pause();
  if (sndAleteo && sndAleteo.isPlaying()) sndAleteo.pause();
  if (sndViento && sndViento.isPlaying()) sndViento.pause();
  if (sndFuego && sndFuego.isPlaying()) sndFuego.pause();
  if (sndFuego2 && sndFuego2.isPlaying()) sndFuego2.pause();
  if (sndFinal && sndFinal.isPlaying()) sndFinal.pause();
}

function resumeCurrentSounds() {
  if (playingAmbiente && sndAmbiente) sndAmbiente.loop();
  if (playingAleteo && sndAleteo && !playingFuego) sndAleteo.loop();
  if (playingViento && sndViento) sndViento.loop();
  if (playingFuego && sndFuego) sndFuego.loop();
  if (playingFuego2 && sndFuego2) sndFuego2.loop();
  if (playingFinal && sndFinal) sndFinal.loop();
}

function draw() {
  if (!gameStarted) {
    drawStartScreen();
    return;
  }

  if (isPaused) {
    drawPauseOverlay();
    return;
  }

  let elapsed = (millis() - totalPausedDuration) - startTime;

  if (elapsed > FLIGHT_START && !explosionTriggered) {
    if (!cameraStarted) {
      startCameraTracking();
    }

    let targetWing = 0.0;

    if (poses.length > 0) {
      let leftWrist = poses[15];
      let rightWrist = poses[16];
      let leftShoulder = poses[11];
      let rightShoulder = poses[12];

      if (leftWrist && rightWrist && leftShoulder && rightShoulder) {
        let wristsDistX = Math.abs(leftWrist.x - rightWrist.x);
        let shoulderDistX = Math.abs(leftShoulder.x - rightShoulder.x);

        let avgShoulderY = (leftShoulder.y + rightShoulder.y) * 0.5;
        let avgWristY = (leftWrist.y + rightWrist.y) * 0.5;
        let liftNormalized = (avgShoulderY - avgWristY) / Math.max(shoulderDistX, 0.05);

        if (shoulderDistX > 0.01) {
          let spreadFactor = map(wristsDistX, shoulderDistX * 0.95, shoulderDistX * 2.1, 0, 1, true);
          let liftFactor = map(liftNormalized, -0.45, 0.35, 0, 1, true);
          targetWing = spreadFactor * liftFactor;
        }
      }
    }

    wingOpenness = lerp(wingOpenness, targetWing, 0.35);
    visualWingAnim = lerp(visualWingAnim, wingOpenness, 0.38);
    flapStrength = wingOpenness * 12;

    let wingDelta = abs(wingOpenness - lastWingOpenness);
    lastWingOpenness = wingOpenness;

    if (wingOpenness > 0.08 && wingDelta > 0.003) {
      interactiveProgress += map(wingOpenness, 0.08, 1.0, 0.0036, 0.0085, true);
    }

    interactiveProgress = constrain(interactiveProgress, 0, 1);
    progress = interactiveProgress;

    if (progress >= 0.85 && !cameraShutDown) {
      stopCameraTracking();
    }
  } else if (elapsed <= FLIGHT_START) {
    progress = 0;
    wingOpenness = 0;
    visualWingAnim = 0;
    lastWingOpenness = 0;
  }

  handleSequentialAudio(elapsed);

  if (playingAleteo && sndAleteo && sndAleteo.isPlaying() && millis() - lastAudioUpdate > 150) {
    let flapVol = map(flapStrength, 0, 12, 0.2, 0.65, true);
    sndAleteo.setVolume(flapVol, 0.1);
    lastAudioUpdate = millis();
  }

  drawAtmosphere(elapsed);
  drawAscendingBackgroundClouds(elapsed);
  drawPairedClouds(elapsed);

  if (elapsed >= 0 && elapsed < STORY_DURATION) {
    drawCaesarText("EL MITO", width / 2, height * 0.18, min(width * 0.095, 86), elapsed);
    drawCaesarText("DE ÍCARO Y DÉDALO", width / 2, height * 0.42, min(width * 0.05, 44), elapsed);
  }

  if (personajeImg && personajeImg.width > 0 && elapsed > FLIGHT_START && !explosionTriggered) {
    push();
    let charX = width / 2;
    let charY = height * 0.82;

    imageMode(CENTER);
    let charTintG = map(progress, 0.25, 0.82, 255, 140, true);
    let charTintB = map(progress, 0.25, 0.82, 255, 90, true);
    tint(255, charTintG, charTintB);

    image(personajeImg, charX, charY, min(width * 0.35, 410), min(height * 0.58, 570));
    pop();
  }

  if (elapsed > FLIGHT_START && progress < 0.50 && !explosionTriggered) {
    drawSeagulls();
  }

  if (elapsed > 600 && !lightningTriggered) {
    triggerLightning();
    lightningTriggered = true;
    if (thunderEnv) thunderEnv.play();
  }
  updateAndDrawLightning();

  if (elapsed > FLIGHT_START && progress < 0.85) {
    let wingAlpha = map(elapsed, FLIGHT_START, FLIGHT_START + 800, 0, 255, true);
    if (wingAlpha > 10 && personajeImg && personajeImg.width > 0) {
      drawInteractiveWings(width / 2, height * 0.82 - 35, visualWingAnim);
    }
  }

  if (progress >= 0.76 && progress < 1.0 && !explosionTriggered) {
    releaseFastBurnFeathers();
  }

  updateFloatingLeaves();
  drawSolidBlackRibbonsAndBottomBar();
  updateFeathersOnTop();

  drawPromptMessage(elapsed);
  drawWarningBanner();

  if (progress >= 0.85) {
    triggerAndDropExplosion();
  }
}

function drawOpaqueIcaroVideo() {
  if (!introVid || !introVidReady || introVid.width <= 0 || !introLayer || !keyShader) return;

  introLayer.clear();
  introLayer.shader(keyShader);
  keyShader.setUniform('tex0', introVid);

  let vidAspect = introVid.height / introVid.width;
  let vidW = width * 0.84;
  let vidH = vidW * vidAspect;
  if (vidH < height * 0.88) {
    vidH = height * 0.88;
    vidW = vidH / vidAspect;
  }

  introLayer.noStroke();
  introLayer.rect(-vidW / 2, -vidH / 2, vidW, vidH);

  push();
  imageMode(CENTER);
  noTint();
  image(introLayer, width / 2, height * 0.48);
  pop();
}

function drawStartScreen() {
  push();

  let introElapsed = millis() - startScreenStartTime;
  let rawT = constrain(map(introElapsed, INTRO_ZOOM_START, INTRO_ZOOM_END, 0, 1), 0, 1);
  let zoomT = rawT * rawT * (3 - 2 * rawT);

  let ctxBg = drawingContext;
  let grad = ctxBg.createLinearGradient(0, 0, 0, height);
  let topR = lerp(8, 18, zoomT);
  let topG = lerp(22, 55, zoomT);
  let topB = lerp(52, 110, zoomT);
  let botR = lerp(35, 85, zoomT);
  let botG = lerp(75, 155, zoomT);
  let botB = lerp(130, 215, zoomT);
  grad.addColorStop(0, `rgb(${Math.round(topR)}, ${Math.round(topG)}, ${Math.round(topB)})`);
  grad.addColorStop(1, `rgb(${Math.round(botR)}, ${Math.round(botG)}, ${Math.round(botB)})`);
  ctxBg.fillStyle = grad;
  ctxBg.fillRect(0, 0, width, height);

  drawAscendingBackgroundClouds(0);
  drawOpaqueIcaroVideo();

  let cloudScale = lerp(1.55, 1.0, zoomT);
  let topCloudCol = lerpColor(color(75, 92, 125), color(255, 255, 255), zoomT);
  let botCloudCol = lerpColor(color(55, 70, 100), color(235, 240, 248), zoomT);

  let imgTop = nubeArribaSoft || nubeArribaImg;
  let imgBot = nubeAbajoSoft || nubeAbajoImg;

  push();
  imageMode(CENTER);
  if (imgTop && imgTop.width > 0) {
    let wArriba = min(width * 0.72, 910) * cloudScale;
    let hArriba = wArriba * (imgTop.height / imgTop.width);
    let yArriba = lerp(height * 0.25, height * 0.20, zoomT);
    tint(red(topCloudCol), green(topCloudCol), blue(topCloudCol), 255);
    image(imgTop, width / 2, yArriba, wArriba, hArriba);
  }
  if (imgBot && imgBot.width > 0) {
    let wAbajo = min(width * 0.69, 870) * cloudScale;
    let hAbajo = wAbajo * (imgBot.height / imgBot.width);
    let yAbajo = lerp(height * 0.50, height * 0.43, zoomT);
    tint(red(botCloudCol), green(botCloudCol), blue(botCloudCol), 255);
    image(imgBot, width / 2 + wAbajo * 0.085, yAbajo, wAbajo, hAbajo);
  }
  pop();

  drawSolidBlackRibbonsAndBottomBar();

  if (introElapsed >= INTRO_UI_DELAY) {
    let uiFade = constrain(map(introElapsed, INTRO_UI_DELAY, INTRO_UI_DELAY + 900, 0, 1), 0, 1);

    let ctxTop = drawingContext;
    ctxTop.save();
    ctxTop.globalAlpha = uiFade;
    let topSize = min(width * 0.038, 34);
    ctxTop.font = topSize + "px 'Caesar Dressing', serif";
    ctxTop.textAlign = "center";
    ctxTop.textBaseline = "middle";
    ctxTop.lineWidth = topSize * 0.14;
    ctxTop.strokeStyle = "rgba(10, 10, 10, 0.95)";
    ctxTop.fillStyle = "rgb(255, 245, 220)";

    ctxTop.strokeText("DALE LAS ÚLTIMAS PUNTADAS", width / 2, height * 0.16);
    ctxTop.fillText("DALE LAS ÚLTIMAS PUNTADAS", width / 2, height * 0.16);

    ctxTop.strokeText("A TUS ALAS PARA COMENZAR", width / 2, height * 0.22);
    ctxTop.fillText("A TUS ALAS PARA COMENZAR", width / 2, height * 0.22);
    ctxTop.restore();

    let novilloX = width / 2;
    let novilloY = height * 0.365;
    let hover = dist(mouseX, mouseY, novilloX, novilloY) < 100;

    push();
    noStroke();
    for (let s of novilloSparkles) {
      s.angle += s.speed;
      let sx = novilloX + cos(s.angle) * s.distRadius;
      let sy = novilloY + sin(s.angle * 1.5) * (s.distRadius * 0.75);
      let sAlpha = map(sin(millis() * 0.01 + s.alphaOffset), -1, 1, 100, 255) * uiFade;

      fill(255, 235, 160, sAlpha);
      ellipse(sx, sy, s.size, s.size);
    }
    pop();

    push();
    imageMode(CENTER);
    translate(novilloX, novilloY);

    let nWidth = hover ? min(width * 0.17, 200) : min(width * 0.14, 165);
    let aspect = novilloImg && novilloImg.width > 0 ? (novilloImg.height / novilloImg.width) : 1;

    if (novilloImg && novilloImg.width > 0) {
      tint(255, 255, 255, 255 * uiFade);
      image(novilloImg, 0, 0, nWidth, nWidth * aspect);
    }
    pop();

    let alphaPulse = map(sin(millis() * 0.006), -1, 1, 150, 255) * uiFade;
    push();
    let ctx = drawingContext;
    ctx.save();
    let bigTextSize = min(width * 0.045, 42);
    ctx.font = "italic " + bigTextSize + "px 'Caesar Dressing', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.lineWidth = bigTextSize * 0.12;
    ctx.strokeStyle = `rgba(10, 10, 10, ${0.95 * uiFade})`;
    ctx.strokeText("Presiona el ovillo", width / 2, height * 0.475);

    ctx.fillStyle = `rgba(255, 240, 200, ${alphaPulse / 255})`;
    ctx.fillText("Presiona el ovillo", width / 2, height * 0.475);
    ctx.restore();
    pop();
  }
}

function drawCaesarText(txt, x, y, size, elapsed) {
  let alphaIn = constrain(map(elapsed, 0, 500, 0, 1), 0, 1);
  let alphaOut = constrain(map(elapsed, STORY_DURATION - 500, STORY_DURATION, 1, 0), 0, 1);
  let finalAlpha = alphaIn * alphaOut;

  let ctx = drawingContext;
  ctx.save();
  ctx.font = size + "px 'Caesar Dressing', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = finalAlpha;

  ctx.lineWidth = size * 0.14;
  ctx.strokeStyle = "rgba(10, 10, 10, 0.95)";
  ctx.strokeText(txt, x, y);

  ctx.fillStyle = "rgb(255, 245, 220)";
  ctx.fillText(txt, x, y);
  ctx.restore();
}

function drawPairedClouds(elapsed) {
  let topTint, bottomTint;
  let epilogueElapsed = explosionTriggered ? (millis() - epilogueStartTime) : 0;

  if (elapsed < STORY_DURATION) {
    topTint = color(255, 255, 255);
    bottomTint = color(235, 240, 248);
  } else if (elapsed < FLIGHT_START) {
    let skyT = constrain(map(elapsed, STORY_DURATION, STORY_DURATION + 450, 0, 1), 0, 1);
    topTint = lerpColor(color(255, 255, 255), color(145, 215, 255), skyT);
    bottomTint = lerpColor(color(235, 240, 248), color(120, 195, 248), skyT);
  } else if (!explosionTriggered) {
    if (progress < 0.08) {
      topTint = color(145, 215, 255);
      bottomTint = color(120, 195, 248);
    } else if (progress < 0.25) {
      let t = map(progress, 0.08, 0.25, 0, 1);
      topTint = lerpColor(color(145, 215, 255), color(255, 245, 200), t);
      bottomTint = lerpColor(color(120, 195, 248), color(255, 230, 175), t);
    } else if (progress >= 0.25 && progress < 0.34) {
      let flashYellow = sin(millis() * 0.025) * 35;
      topTint = color(255, 240 + flashYellow, 135);
      bottomTint = color(255, 215 + flashYellow, 110);
    } else if (progress < 0.62) {
      let t = map(progress, 0.34, 0.62, 0, 1);
      topTint = lerpColor(color(255, 225, 115), color(255, 130, 40), t);
      bottomTint = lerpColor(color(255, 195, 95), color(245, 100, 25), t);
    } else {
      let pulse = sin(millis() * 0.015) * 35;
      topTint = color(255 + pulse, 70 + max(pulse, 0), 15);
      bottomTint = color(255 + pulse, 45 + max(pulse, 0), 10);
    }
  } else {
    let stormT = constrain(map(epilogueElapsed, 21500, 23500, 0, 1), 0, 1);
    let pulse = sin(millis() * 0.02) * 40 * (1 - stormT);
    let fireTop = color(255 + pulse, 50 + max(pulse, 0), 15);
    let fireBot = color(245 + pulse, 35 + max(pulse, 0), 10);
    let stormTop = color(38, 42, 52);
    let stormBot = color(24, 27, 35);
    topTint = lerpColor(fireTop, stormTop, stormT);
    bottomTint = lerpColor(fireBot, stormBot, stormT);
  }

  let imgTop = nubeArribaSoft || nubeArribaImg;
  let imgBot = nubeAbajoSoft || nubeAbajoImg;

  push();
  imageMode(CENTER);
  let cx = width / 2;

  if (imgTop && imgTop.width > 0) {
    let wArriba = min(width * 0.72, 910);
    let hArriba = wArriba * (imgTop.height / imgTop.width);
    let yArriba = height * 0.20;

    tint(red(topTint), green(topTint), blue(topTint), 255);
    image(imgTop, cx, yArriba, wArriba, hArriba);
  }

  if (imgBot && imgBot.width > 0) {
    let wAbajo = min(width * 0.69, 870);
    let hAbajo = wAbajo * (imgBot.height / imgBot.width);
    let cxAbajo = cx + wAbajo * 0.085;
    let yAbajo = height * 0.43;

    tint(red(bottomTint), green(bottomTint), blue(bottomTint), 255);
    image(imgBot, cxAbajo, yAbajo, wAbajo, hAbajo);

    if (leavesImg && leavesImg.width > 0 && elapsed < STORY_DURATION) {
      let leafAlpha = map(elapsed, 0, STORY_DURATION, 200, 0, true);
      tint(255, 255, 255, leafAlpha);
      image(leavesImg, cxAbajo - wAbajo * 0.40, yAbajo + 10, 65, 65 * (leavesImg.height / leavesImg.width));
      image(leavesImg, cxAbajo + wAbajo * 0.40, yAbajo + 10, 65, 65 * (leavesImg.height / leavesImg.width));
    }
  }

  pop();
}

function updateFloatingLeaves() {
  if (!leavesImg || leavesImg.width === 0 || floatingLeaves.length === 0) return;
  push();
  imageMode(CENTER);
  for (let i = floatingLeaves.length - 1; i >= 0; i--) {
    let lf = floatingLeaves[i];
    lf.x += lf.vx;
    lf.y += (lf.vy * 1.5);
    lf.rotation += lf.rotSpeed;
    lf.alpha -= 2.2;

    tint(255, 255, 255, max(lf.alpha, 0));
    push();
    translate(lf.x, lf.y);
    rotate(lf.rotation);
    let aspect = leavesImg.height / leavesImg.width;
    image(leavesImg, 0, 0, lf.size, lf.size * aspect);
    pop();

    if (lf.alpha <= 0 || lf.y < -100 || lf.x < -100 || lf.x > width + 100) {
      floatingLeaves.splice(i, 1);
    }
  }
  pop();
}

function drawAscendingBackgroundClouds(elapsed) {
  let bgCloudTint;
  let epilogueElapsed = explosionTriggered ? (millis() - epilogueStartTime) : 0;

  if (elapsed < STORY_DURATION) {
    bgCloudTint = color(215, 225, 238);
  } else if (elapsed < FLIGHT_START) {
    let skyT = constrain(map(elapsed, STORY_DURATION, STORY_DURATION + 450, 0, 1), 0, 1);
    bgCloudTint = lerpColor(color(215, 225, 238), color(140, 210, 255), skyT);
  } else if (!explosionTriggered) {
    if (progress < 0.08) {
      bgCloudTint = color(140, 210, 255);
    } else if (progress < 0.25) {
      let t = map(progress, 0.08, 0.25, 0, 1);
      bgCloudTint = lerpColor(color(140, 210, 255), color(255, 230, 170), t);
    } else if (progress < 0.34) {
      bgCloudTint = color(255, 240, 140);
    } else if (progress < 0.62) {
      let t = map(progress, 0.34, 0.62, 0, 1);
      bgCloudTint = lerpColor(color(255, 200, 100), color(245, 140, 90), t);
    } else {
      let t = map(progress, 0.62, 1.0, 0, 1);
      bgCloudTint = lerpColor(color(245, 140, 90), color(230, 40, 10), t);
    }
  } else {
    let stormT = constrain(map(epilogueElapsed, 21500, 23500, 0, 1), 0, 1);
    bgCloudTint = lerpColor(color(220, 50, 20), color(30, 34, 44), stormT);
  }

  let burnScaleFactor = 1.0;
  if (!explosionTriggered && progress >= 0.58) {
    burnScaleFactor = map(progress, 0.58, 1.0, 1.0, 2.2, true);
  } else if (explosionTriggered) {
    burnScaleFactor = 2.2;
  }

  let speedMultiplier = map(progress, 0, 1, 1.0, 5.5, true);

  if (!explosionTriggered && progress >= 0.08 && progress < 0.30) {
    speedMultiplier = 3.5;
  }

  let sizeMultiplier = 1.0;
  if (!explosionTriggered && progress >= 0.34 && progress < 0.58) {
    speedMultiplier = 4.4;
    sizeMultiplier = 1.3;
  } else if (!explosionTriggered && progress >= 0.58) {
    speedMultiplier = 5.2;
    sizeMultiplier = 1.4;
  }

  push();
  imageMode(CENTER);

  for (let bc of bgClouds) {
    let baseDrift = 1.2 * speedMultiplier;
    let speedBonus = (wingOpenness > 0.08) ? map(wingOpenness, 0.08, 1.0, 0.5, 4.0, true) * speedMultiplier : 0;

    bc.y += (bc.speedY * speedMultiplier + baseDrift + speedBonus);

    let imgToUse = bc.isTopType ? (nubeArribaBgSoft || nubeArribaImg) : (nubeAbajoBgSoft || nubeAbajoImg);
    let aspect = (imgToUse && imgToUse.width > 0) ? (imgToUse.height / imgToUse.width) : 0.45;
    let currentW = bc.sizeW * burnScaleFactor * sizeMultiplier * 1.08;
    let currentH = currentW * aspect;

    if (bc.y > height + currentH) {
      bc.y = -currentH;
      bc.x = random(width * 0.18, width * 0.82);
    }

    if (imgToUse && imgToUse.width > 0) {
      tint(red(bgCloudTint), green(bgCloudTint), blue(bgCloudTint), bc.alpha);
      image(imgToUse, bc.x, bc.y, currentW, currentH);
    }
  }
  pop();
}

function drawInteractiveWings(px, py, openness) {
  if (!alasCerradasImg || alasCerradasImg.width === 0 || !alasAbiertasImg || alasAbiertasImg.width === 0) return;

  push();
  let baseW = min(width * 0.42, 520);
  let currentW = lerp(baseW * 0.85, baseW * 1.35, openness);
  let closedH = currentW * (alasCerradasImg.height / alasCerradasImg.width);
  let openH = currentW * (alasAbiertasImg.height / alasAbiertasImg.width);
  let currentH = lerp(closedH, openH, openness);

  let verticalOffset = map(openness, 0, 1, 0, 25);
  translate(px, py - verticalOffset);

  imageMode(CENTER);

  let targetAlphaOpen = map(openness, 0.05, 0.45, 0, 255, true);
  alasAlpha = lerp(alasAlpha, targetAlphaOpen, 0.4);

  let alphaCerradas = 255 - alasAlpha;
  let alphaAbiertas = alasAlpha;

  if (alphaCerradas > 2) {
    tint(255, 255, 255, alphaCerradas);
    image(alasCerradasImg, 0, 0, currentW, currentH);
  }

  if (alphaAbiertas > 2) {
    let finalOpenAlpha = map(alphaAbiertas, 0, 255, 80, 255);
    tint(255, 255, 255, finalOpenAlpha);
    image(alasAbiertasImg, 0, 0, currentW, currentH);
  }

  pop();
}

function drawSolidBlackRibbonsAndBottomBar() {
  let ctx = drawingContext;
  ctx.save();

  let sideMargin = width * 0.08;
  let topMargin = 16;
  let barHeight = 80;
  let cornerRadius = 56;
  let blurSize = 24;

  let x1 = sideMargin;
  let y1 = topMargin;
  let x2 = width - sideMargin;
  let y2 = height - barHeight;
  let r = min(cornerRadius, (x2 - x1) / 2, (y2 - y1) / 2);

  ctx.shadowColor = "rgba(0, 0, 0, 1)";
  ctx.shadowBlur = blurSize;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = "#000000";
  ctx.beginPath();

  ctx.rect(-100, -100, width + 200, height + 200);

  ctx.moveTo(x1 + r, y1);
  ctx.quadraticCurveTo(x1, y1, x1, y1 + r);
  ctx.lineTo(x1, y2 - r);
  ctx.quadraticCurveTo(x1, y2, x1 + r, y2);
  ctx.lineTo(x2 - r, y2);
  ctx.quadraticCurveTo(x2, y2, x2, y2 - r);
  ctx.lineTo(x2, y1 + r);
  ctx.quadraticCurveTo(x2, y1, x2 - r, y1);
  ctx.closePath();

  ctx.fill("evenodd");
  ctx.restore();
}

function handleSequentialAudio(elapsed) {
  if (!playingAmbiente && sndAmbiente && sndAmbiente.isLoaded()) {
    if (!sndAmbiente.isPlaying()) {
      sndAmbiente.loop();
      sndAmbiente.setVolume(0.35);
    }
    playingAmbiente = true;
  }

  if (elapsed >= FLIGHT_START && !playingAleteo && progress < 0.56 && !aleteoFaded) {
    if (sndAleteo && sndAleteo.isLoaded() && !sndAleteo.isPlaying()) {
      sndAleteo.loop();
      sndAleteo.setVolume(0.35);
      playingAleteo = true;
    }
  }

  if (progress >= 0.32 && !playingViento && progress < 0.85) {
    if (sndViento && sndViento.isLoaded() && !sndViento.isPlaying()) {
      sndViento.loop();
      sndViento.setVolume(0.4);
      playingViento = true;
    }
  }

  if (progress >= 0.56 && progress < 0.85) {
    if (!aleteoFaded) {
      playingAleteo = false;
      if (sndAleteo && sndAleteo.isPlaying()) {
        sndAleteo.setVolume(0, 1.5);
      }
      aleteoFaded = true;
    }

    if (!playingFuego) {
      if (sndFuego && sndFuego.isLoaded() && !sndFuego.isPlaying()) {
        sndFuego.loop();
        sndFuego.setVolume(0);
        sndFuego.setVolume(0.8, 2.0);
      }
      playingFuego = true;
    }

    if (!playingFuego2) {
      if (sndFuego2 && sndFuego2.isLoaded() && !sndFuego2.isPlaying()) {
        sndFuego2.loop();
        sndFuego2.setVolume(0);
        sndFuego2.setVolume(0.7, 2.0);
      }
      playingFuego2 = true;
    }
  }

  if (progress >= 0.85 && !audioEndingFaded) {
    if (sndViento && sndViento.isPlaying()) sndViento.setVolume(0, 2.0);
    if (sndFuego && sndFuego.isPlaying()) sndFuego.setVolume(0, 2.0);
    if (sndFuego2 && sndFuego2.isPlaying()) sndFuego2.setVolume(0, 2.0);

    if (sndFinal && sndFinal.isLoaded() && !playingFinal) {
      sndFinal.play();
      sndFinal.setVolume(0.8);
      playingFinal = true;
    }

    audioEndingFaded = true;
  }
}

function startCameraTracking() {
  if (cameraStarted) return;
  cameraStarted = true;

  video = createCapture({
    video: {
      width: { ideal: 160 },
      height: { ideal: 120 },
      frameRate: { ideal: 24 }
    },
    audio: false
  });
  video.size(160, 120);
  video.hide();

  pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });

  pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: false,
    minDetectionConfidence: 0.35,
    minTrackingConfidence: 0.35
  });

  pose.onResults(gotPose);

  cameraInstance = new Camera(video.elt, {
    onFrame: async () => {
      if (!pose || !video || !video.elt || cameraShutDown || isPaused) return;

      let now = performance.now();
      if (isProcessingPose || (now - lastPoseSendTime < POSE_INTERVAL_MS)) return;

      isProcessingPose = true;
      lastPoseSendTime = now;
      try {
        await pose.send({ image: video.elt });
      } catch (e) {
      } finally {
        isProcessingPose = false;
      }
    },
    width: 160,
    height: 120
  });

  cameraInstance.start().catch((err) => console.error("Error cámara:", err));
}

function stopCameraTracking() {
  if (cameraShutDown) return;
  cameraShutDown = true;
  try {
    if (cameraInstance && cameraInstance.stop) {
      cameraInstance.stop();
    }
    if (video && video.elt && video.elt.srcObject) {
      let tracks = video.elt.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  } catch (e) {}
  poses = [];
}

function gotPose(results) {
  if (!cameraShutDown && !isPaused) {
    poses = results.poseLandmarks || [];
  }
}

function drawPauseOverlay() {
  push();
  fill(0, 0, 0, 130);
  rect(0, 0, width, height);
  drawCaesarText("PAUSA", width / 2, height / 2 - 25, min(width * 0.12, 95), 500);

  let ctx = drawingContext;
  ctx.save();
  ctx.font = "italic 28px 'Caesar Dressing', serif";
  ctx.fillStyle = "rgba(230, 235, 245, 230)";
  ctx.textAlign = "center";
  ctx.fillText("Haz clic para continuar", width / 2, height / 2 + 55);
  ctx.restore();
  pop();
}

function drawPromptMessage(elapsed) {
  if (elapsed >= STORY_DURATION && elapsed < FLIGHT_START) {
    let a = constrain(map(elapsed, STORY_DURATION, STORY_DURATION + 350, 0, 1) * map(elapsed, FLIGHT_START - 350, FLIGHT_START, 1, 0), 0, 1);
    drawCaesarText("ES HORA", width / 2, height * 0.19, min(width * 0.085, 72), a * 1000);
    drawCaesarText("DE VOLAR!", width / 2, height * 0.42, min(width * 0.085, 72), a * 1000);
  }
}

function drawWarningBanner() {
  if (progress >= 0.08 && progress < 0.30) {
    let a = constrain(map(progress, 0.08, 0.13, 0, 1) * map(progress, 0.25, 0.30, 1, 0), 0, 1);
    drawCaesarText("EXTIENDE", width / 2, height * 0.19, min(width * 0.08, 68), a * 1000);
    drawCaesarText("TUS ALAS!", width / 2, height * 0.42, min(width * 0.08, 68), a * 1000);
  } else if (progress >= 0.34 && progress < 0.58) {
    let a = constrain(map(progress, 0.34, 0.39, 0, 1) * map(progress, 0.53, 0.58, 1, 0), 0, 1);
    drawCaesarText("DATE", width / 2, height * 0.19, min(width * 0.085, 72), a * 1000);
    drawCaesarText("PRISA!", width / 2, height * 0.42, min(width * 0.085, 72), a * 1000);
  } else if (progress >= 0.62 && progress < 0.84) {
    let a = constrain(map(progress, 0.62, 0.67, 0, 1) * map(progress, 0.79, 0.84, 1, 0), 0, 1);
    drawCaesarText("¡LA CERA SE", width / 2, height * 0.19, min(width * 0.075, 64), a * 1000);
    drawCaesarText("DERRITE!", width / 2, height * 0.42, min(width * 0.075, 64), a * 1000);
  }
}

function drawFinalRain(alphaFactor) {
  if (alphaFactor <= 0.01) return;
  push();
  strokeWeight(1.5);
  for (let r of finalRainDrops) {
    r.y += r.speedY;
    r.x += r.speedX;
    if (r.y > height - 80) {
      r.y = random(-80, 0);
      r.x = random(width * 0.08, width * 0.92);
    }
    stroke(185, 205, 230, r.alpha * alphaFactor);
    line(r.x, r.y, r.x + r.speedX * 1.6, r.y + r.len);
  }
  pop();
}

function triggerAndDropExplosion() {
  if (!explosionTriggered) {
    explosionTriggered = true;
    explosionFlash = 255;
    epilogueStartTime = millis();
    feathers = [];
  }

  let epilogueElapsed = millis() - epilogueStartTime;

  if (epilogueElapsed >= 30000 && !resolumeSenalEnviada) {
    resolumeSenalEnviada = true;
    avisar("juego_terminado");
    enviarSenalAResolume();

    setTimeout(() => {
      window.location.reload();
    }, 3500);
  }

  let maxFeathers = (epilogueElapsed >= 14000 && epilogueElapsed < 21500) ? 30 : 10;
  let spawnChance = (epilogueElapsed >= 14000 && epilogueElapsed < 21500) ? 0.75 : 0.12;

  if (epilogueElapsed < 21500 && random() < spawnChance && feathers.length < maxFeathers) {
    feathers.push({
      x: width * 0.5 + random(-width * 0.48, width * 0.48),
      y: -30,
      vx: random(-3.0, 3.0),
      vy: (epilogueElapsed >= 14000 && epilogueElapsed < 21500) ? random(12, 22) : random(5.5, 11.0),
      gravity: 0.16,
      swayFreq: 0.05,
      swayAmp: 2.8,
      phase: random(TWO_PI),
      rotation: random(TWO_PI),
      rotationSpeed: random(-0.05, 0.05),
      size: random(85, 135),
      flipX: random() < 0.5 ? 1 : -1,
      flipY: random() < 0.5 ? 1 : -1,
      alpha: 255,
      alphaSpeed: 1.1
    });
  }

  if (explosionFlash > 0) {
    push();
    fill(255, 255, 255, explosionFlash);
    rect(0, 0, width, height);
    pop();
    explosionFlash = lerp(explosionFlash, 0, 0.09);
  }

  if (icaroCayendoImg && icaroCayendoImg.width > 0 && epilogueElapsed < 12000) {
    push();
    imageMode(CENTER);

    let fallX = map(epilogueElapsed, 0, 4500, width * 0.78, width * 0.22, true);
    let fallY = map(epilogueElapsed, 0, 4500, height * 0.12, height + 250, true);
    let fallRot = map(epilogueElapsed, 0, 4500, 0.2, 1.1, true);

    translate(fallX, fallY);
    rotate(fallRot);

    let icaroAlpha = map(epilogueElapsed, 2800, 4500, 255, 0, true);
    tint(255, 255, 255, icaroAlpha);

    image(icaroCayendoImg, 0, 0, min(width * 0.35, 420), min(height * 0.58, 580));
    pop();
  }

  if (epilogueElapsed < 21500) {
    drawBurningFeatherDecor(width * 0.22, height * 0.65, 1, 200);
    drawBurningFeatherDecor(width * 0.78, height * 0.65, -1, 200);
  }

  if (epilogueElapsed >= 500 && epilogueElapsed < 8200) {
    let a = constrain(map(epilogueElapsed, 500, 1500, 0, 1) * map(epilogueElapsed, 7200, 8200, 1, 0), 0, 1);

    drawCaesarText("EL SOL CALCINÓ", width / 2, height * 0.19, min(width * 0.08, 70), a * 1000);
    drawCaesarText("LAS ALAS DE ÍCARO", width / 2, height * 0.42, min(width * 0.07, 60), a * 1000);
  }

  if (epilogueElapsed >= 14000 && epilogueElapsed < 21500) {
    let a = constrain(map(epilogueElapsed, 14000, 15200, 0, 1) * map(epilogueElapsed, 20300, 21500, 1, 0), 0, 1);

    drawCaesarText("DEJA TUS ALAS,", width / 2, height * 0.16, min(width * 0.055, 48), a * 1000);
    drawCaesarText("ES HORA DE DESCANSAR...", width / 2, height * 0.34, min(width * 0.045, 40), a * 1000);
  }

  if (epilogueElapsed >= 21500) {
    let stormFactor = constrain(map(epilogueElapsed, 21500, 23200, 0, 1), 0, 1);

    if (epilogueElapsed >= 22800 && !finalStormLightningDone) {
      triggerLightning();
      finalStormLightningDone = true;
      if (thunderEnv) thunderEnv.play();
    }

    drawFinalRain(stormFactor);

    if (epilogueElapsed >= 23000) {
      let textAlpha = constrain(map(epilogueElapsed, 23000, 24500, 0, 1), 0, 1);
      let ctx = drawingContext;
      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      let mainSize = min(width * 0.095, 86);
      ctx.font = mainSize + "px 'Caesar Dressing', serif";
      ctx.lineWidth = mainSize * 0.14;
      ctx.strokeStyle = "rgba(5, 5, 8, 0.98)";
      ctx.fillStyle = "rgb(245, 245, 250)";
      ctx.strokeText("EL MITO", width / 2, height * 0.19);
      ctx.fillText("EL MITO", width / 2, height * 0.19);

      let subSize = min(width * 0.052, 46);
      ctx.font = subSize + "px 'Caesar Dressing', serif";
      ctx.lineWidth = subSize * 0.14;
      ctx.strokeText("DE ÍCARO Y DÉDALO", width / 2, height * 0.42);
      ctx.fillText("DE ÍCARO Y DÉDALO", width / 2, height * 0.42);
      ctx.restore();

      drawInvertedArchFeathers(width / 2, height * 0.54, textAlpha * 230);
    }

    if (epilogueElapsed >= 29500) {
      let fadeBlack = constrain(map(epilogueElapsed, 29500, 32500, 0, 255), 0, 255);
      push();
      noStroke();
      fill(0, 0, 0, fadeBlack);
      rect(0, 0, width, height);
      pop();
    }
  }
}

function enviarSenalAResolume() {
  fetch('http://localhost:8080/disparar-mapping', {
    method: 'POST'
  }).catch(err => console.log("Servidor local apagado o inaccesible", err));
}

function drawInvertedArchFeathers(centerX, centerY, alphaVal) {
  if (!featherImg || featherImg.width === 0) return;
  push();
  imageMode(CENTER);

  let pWidth = min(width * 0.08, 90);
  let pHeight = pWidth * (featherImg.height / featherImg.width);
  let spacing = pWidth * 0.85;

  let offsets = [
    { x: -spacing, y: 12, rot: -0.45 },
    { x: 0,        y: 0,  rot: 0.0 },
    { x: spacing,  y: 12, rot: 0.45 }
  ];

  for (let f of offsets) {
    push();
    translate(centerX + f.x, centerY + f.y);
    rotate(f.rot);

    tint(255, 230, 180, alphaVal * 0.85);
    image(featherImg, 0, 0, pWidth * 1.05, pHeight * 1.05);

    tint(255, 255, 255, alphaVal);
    image(featherImg, 0, 0, pWidth, pHeight);
    pop();
  }
  pop();
}

function drawAtmosphere(elapsed) {
  let epilogueElapsed = explosionTriggered ? (millis() - epilogueStartTime) : 0;

  let cTop, cBottom;

  if (elapsed < FLIGHT_START) {
    let t = map(elapsed, 0, FLIGHT_START, 0, 1);
    cTop = lerpColor(color(5, 8, 14), color(15, 75, 160), t);
    cBottom = lerpColor(color(12, 18, 28), color(100, 195, 255), t);
  } else if (!explosionTriggered) {
    if (progress < 0.25) {
      let t = map(progress, 0, 0.25, 0, 1);
      cTop = lerpColor(color(15, 75, 160), color(40, 130, 210), t);
      cBottom = lerpColor(color(100, 195, 255), color(180, 220, 240), t);
    } else if (progress < 0.34) {
      cTop = color(220, 100, 20);
      cBottom = color(255, 220, 80);
    } else if (progress < 0.62) {
      let t = map(progress, 0.34, 0.62, 0, 1);
      cTop = lerpColor(color(220, 100, 20), color(145, 30, 25), t);
      cBottom = lerpColor(color(255, 220, 80), color(245, 110, 30), t);
    } else {
      let t = map(progress, 0.62, 1.0, 0, 1);
      cTop = lerpColor(color(145, 30, 25), color(215, 10, 5), t);
      cBottom = lerpColor(color(245, 110, 30), color(255, 45, 10), t);
    }
  } else {
    let stormT = constrain(map(epilogueElapsed, 21500, 23500, 0, 1), 0, 1);
    cTop = lerpColor(color(215, 10, 5), color(10, 12, 18), stormT);
    cBottom = lerpColor(color(255, 45, 10), color(26, 30, 42), stormT);
  }

  let topKey = `${Math.round(red(cTop))},${Math.round(green(cTop))},${Math.round(blue(cTop))}`;
  let botKey = `${Math.round(red(cBottom))},${Math.round(green(cBottom))},${Math.round(blue(cBottom))}`;
  let ctx = drawingContext;

  if (!cachedGrad || topKey !== cachedTopKey || botKey !== cachedBotKey || height !== cachedGradH) {
    let gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `rgb(${topKey})`);
    gradient.addColorStop(1, `rgb(${botKey})`);
    cachedGrad = gradient;
    cachedTopKey = topKey;
    cachedBotKey = botKey;
    cachedGradH = height;
  }

  ctx.fillStyle = cachedGrad;
  ctx.fillRect(0, 0, width, height);
}

function drawBurningFeatherDecor(x, y, scaleX, alphaVal) {
  if (!featherImg || featherImg.width === 0) return;

  push();
  translate(x, y);
  scale(scaleX, 1);
  rotate(0.35 + sin(millis() * 0.004) * 0.05);
  imageMode(CENTER);

  let pWidth = min(width * 0.16, 180);
  let pHeight = pWidth * (featherImg.height / featherImg.width);

  tint(255, 60, 10, alphaVal * 0.85);
  image(featherImg, 0, 0, pWidth * 1.05, pHeight * 1.05);

  tint(255, 200, 70, alphaVal);
  image(featherImg, 0, 0, pWidth, pHeight);

  pop();
}

function drawSeagulls() {
  push();
  noFill();
  stroke(245, 250, 255, map(progress, 0.35, 0.50, 210, 0, true));
  strokeWeight(2.2);

  for (let g of seagulls) {
    g.x += g.vx;
    g.wingAngle += g.wingSpeed;

    if (g.x > width + 60) {
      g.x = -60;
      g.y = random(height * 0.2, height * 0.65);
      g.vx = random(3.5, 5.5);
    }

    let flapY = sin(g.wingAngle) * (g.size * 0.45);

    push();
    translate(g.x, g.y);
    beginShape();
    vertex(-g.size, flapY);
    quadraticVertex(-g.size * 0.45, -flapY * 0.5, 0, 0);
    quadraticVertex(g.size * 0.45, -flapY * 0.5, g.size, flapY);
    endShape();
    pop();
  }
  pop();
}

function releaseFastBurnFeathers() {
  if (random() < 0.12 && feathers.length < 10) {
    feathers.push({
      x: width * 0.5 + random(-width * 0.45, width * 0.45),
      y: -30,
      vx: random(-3.5, 3.5),
      vy: random(9.5, 17.5),
      gravity: 0.42,
      swayFreq: 0.08,
      swayAmp: 3.5,
      phase: random(TWO_PI),
      rotation: random(TWO_PI),
      rotationSpeed: random(-0.08, 0.08),
      size: random(85, 135),
      flipX: random() < 0.5 ? 1 : -1,
      flipY: random() < 0.5 ? 1 : -1,
      alpha: 255,
      alphaSpeed: 1.8
    });
  }
}

function updateFeathersOnTop() {
  let barHeight = 80;
  for (let i = feathers.length - 1; i >= 0; i--) {
    let f = feathers[i];

    f.vy += f.gravity;
    f.phase += f.swayFreq;
    let swayX = sin(f.phase) * f.swayAmp;

    f.x += f.vx + swayX;
    f.y += f.vy;

    f.rotation += f.rotationSpeed;
    f.alpha -= f.alphaSpeed;

    drawFallingFeather(f);

    if (f.y > height - barHeight || f.alpha <= 0) {
      f.y = height - barHeight;
      f.vy = 0;
      f.vx = 0;
      f.gravity = 0;
      f.swayAmp = 0;
      f.alpha -= 0.5;
    }
  }
}

function drawFallingFeather(f) {
  if (!featherImg || featherImg.width === 0) return;

  push();
  translate(f.x, f.y);
  rotate(f.rotation);
  scale(f.flipX, f.flipY);
  imageMode(CENTER);

  let aspect = featherImg.height / featherImg.width;

  tint(255, 75, 15, f.alpha);
  image(featherImg, 0, 0, f.size, f.size * aspect);
  tint(255, 210, 100, f.alpha * 0.85);
  image(featherImg, 0, 0, f.size * 0.7, f.size * 0.7 * aspect);

  pop();
}

function triggerLightning() {
  let startX = random(width * 0.25, width * 0.75);
  let mainBranches = [];
  let segments = floor(random(9, 12));
  let curX = startX;
  let curY = -10;
  let totalH = height * 0.8;
  let stepY = totalH / segments;

  let path = [{ x: curX, y: curY }];

  for (let i = 0; i < segments; i++) {
    curX += random(-40, 40);
    curY += stepY + random(-10, 15);
    path.push({ x: curX, y: curY });

    if (random() < 0.25 && i < segments - 2) {
      let subPath = [{ x: curX, y: curY }];
      let subX = curX;
      let subY = curY;
      for (let j = 0; j < 3; j++) {
        subX += random(15, 30) * (random() < 0.5 ? -1 : 1);
        subY += random(10, 25);
        subPath.push({ x: subX, y: subY });
      }
      mainBranches.push(subPath);
    }
  }

  currentLightning = {
    main: path,
    sub: mainBranches,
    life: 255
  };

  lightningFlash = 220;
}

function updateAndDrawLightning() {
  if (lightningFlash > 0) {
    push();
    noStroke();
    fill(210, 230, 255, lightningFlash * 0.55);
    rect(0, 0, width, height);
    pop();
    lightningFlash = lerp(lightningFlash, 0, 0.18);
  }

  if (currentLightning && currentLightning.life > 0) {
    push();
    stroke(255, 255, 255, currentLightning.life);
    strokeWeight(2.5);
    noFill();

    beginShape();
    for (let pt of currentLightning.main) vertex(pt.x, pt.y);
    endShape();

    strokeWeight(1.5);
    for (let branch of currentLightning.sub) {
      beginShape();
      for (let pt of branch) vertex(pt.x, pt.y);
      endShape();
    }
    pop();

    currentLightning.life -= 28;
    if (currentLightning.life <= 0) {
      currentLightning = null;
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  cachedGrad = null;
  if (introLayer) {
    introLayer.resizeCanvas(windowWidth, windowHeight);
  }
}
