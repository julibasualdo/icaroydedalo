let video = null;
let pose = null;
let cameraInstance = null;
let poses = [];
let feathers = [];
let waxDrops = [];
let seagulls = [];

let featherImg = null;
let cloudImg = null;
let leavesImg = null;

// ----------------------------------------
// CONTROL DE AUDIOS
// ----------------------------------------
let sndAmbiente = null;
let sndAleteo = null;
let sndViento = null;
let sndFuego = null;
let sndFuego2 = null;

let thunderNoise = null;
let thunderEnv = null;

// Flags para la secuencia (Seguros anti-congelamiento)
let playingAmbiente = false;
let playingAleteo = false;
let playingViento = false;
let playingFuego = false;
let playingFuego2 = false;
let aleteoFaded = false;
let audioEndingFaded = false; 

// ----------------------------------------
// CONTROL DE PAUSA OPCIONAL
// ----------------------------------------
let isPaused = false;
let pauseStartMillis = 0;
let totalPausedDuration = 0;

// ----------------------------------------
// TEMPORIZACIÓN
// ----------------------------------------
let startTime = null;
const STORY_DURATION = 24000;      // 24s prólogo
const TRANSITION_DURATION = 3500;  // 3.5s consigna
const FLIGHT_START = STORY_DURATION + TRANSITION_DURATION; // 27.5s
const FLIGHT_DURATION = 38000; 

let progress = 0;
let cameraStarted = false;
let cameraShutDown = false;

// Aleteo
let previousLeftY = null;
let previousRightY = null;
let leftFlap = 0;
let rightFlap = 0;
let flapStrength = 0;

// Rayo inicial
let lightningFlash = 0;
let currentLightning = null;
let lightningTriggered = false;

// Clímax final
let explosionTriggered = false;
let explosionFlash = 0;
let epilogueStartTime = 0;

// Nubes
let clouds = [];
let cloudCount = 6; 
let lastAudioUpdate = 0;

// ----------------------------------------
// PRELOAD
// ----------------------------------------
function preload() {
  featherImg = loadImage('pluma.png');
  leavesImg = loadImage('hojas.png');

  soundFormats('mp3');
  sndAmbiente = loadSound('1AMBIENTE.mp3');
  sndAleteo   = loadSound('2ALETEO.mp3');
  sndViento   = loadSound('3VIENTO 4.mp3');
  sndFuego    = loadSound('3FUEGO.mp3');
  sndFuego2   = loadSound('FUEGO2.mp3');
}

// ----------------------------------------
// SETUP
// ----------------------------------------
function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);

  thunderEnv = new p5.Envelope();
  thunderEnv.setADSR(0.01, 1.2, 0.1, 0.8);
  thunderEnv.setRange(0.8, 0);
  thunderNoise = new p5.Noise('brown');
  thunderNoise.amp(thunderEnv);
  thunderNoise.start();

  loadImage('nube.png', (img) => {
    cloudImg = img;
  });

  for (let i = 0; i < cloudCount; i++) {
    clouds.push({
      x: random(width),
      y: random(height),
      scale: random(0.5, 1.1),
      speed: random(1.8, 3.4),
      alpha: random(110, 180),
      flip: random() < 0.5 ? 1 : -1
    });
  }

  for (let i = 0; i < 4; i++) {
    seagulls.push({
      x: random(-width * 0.5, 0),
      y: random(height * 0.2, height * 0.6),
      vx: random(2.2, 3.8),
      size: random(16, 28),
      wingAngle: random(TWO_PI),
      wingSpeed: random(0.08, 0.14)
    });
  }
}

// ----------------------------------------
// CONTROL DE MOUSE Y PAUSA
// ----------------------------------------
function mousePressed() {
  userStartAudio();

  if (sndAmbiente && !sndAmbiente.isPlaying()) {
    sndAmbiente.loop();
    sndAmbiente.setVolume(0.35);
    playingAmbiente = true;
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
}

function resumeCurrentSounds() {
  if (playingAmbiente && sndAmbiente) sndAmbiente.loop();
  if (playingAleteo && sndAleteo && !playingFuego) sndAleteo.loop();
  if (playingViento && sndViento) sndViento.loop();
  if (playingFuego && sndFuego) sndFuego.loop();
  if (playingFuego2 && sndFuego2) sndFuego2.loop();
}

// ----------------------------------------
// DRAW
// ----------------------------------------
function draw() {
  if (startTime === null) {
    startTime = millis();
  }

  if (isPaused) {
    drawPauseOverlay();
    return;
  }

  let elapsed = (millis() - totalPausedDuration) - startTime;

  if (elapsed > FLIGHT_START) {
    progress = constrain((elapsed - FLIGHT_START) / FLIGHT_DURATION, 0, 1);
    
    if (!cameraStarted && progress < 0.88) {
      startCameraTracking();
    }
    
    if (progress >= 0.88 && !cameraShutDown) {
      stopCameraTracking();
    }
  } else {
    progress = 0;
  }

  handleSequentialAudio(elapsed);

  if (playingAleteo && sndAleteo && sndAleteo.isPlaying() && millis() - lastAudioUpdate > 150) {
    let flapVol = map(flapStrength, 0, 15, 0.2, 0.65, true);
    sndAleteo.setVolume(flapVol, 0.1);
    lastAudioUpdate = millis();
  }

  drawAtmosphere(elapsed);

  if (!explosionTriggered || explosionFlash > 10) {
    drawClouds(elapsed);
  }

  if (elapsed > FLIGHT_START && progress < 0.50 && !explosionTriggered) {
    drawSeagulls();
  }

  if (elapsed > 3500 && !lightningTriggered) {
    triggerLightning();
    lightningTriggered = true;
    if (thunderEnv) thunderEnv.play();
  }
  updateAndDrawLightning();

  if (poses.length > 0 && elapsed > FLIGHT_START && progress < 0.88) {
    let leftShoulder = getPoint(11);
    let rightShoulder = getPoint(12);
    let leftElbow = getPoint(13);
    let rightElbow = getPoint(14);
    let leftWrist = getPoint(15);
    let rightWrist = getPoint(16);

    if (
      leftShoulder && rightShoulder &&
      leftElbow && rightElbow &&
      leftWrist && rightWrist
    ) {
      if (previousLeftY !== null) {
        let leftMovement = abs(leftWrist.y - previousLeftY);
        let rightMovement = abs(rightWrist.y - previousRightY);

        leftFlap = lerp(leftFlap, leftMovement, 0.2);
        rightFlap = lerp(rightFlap, rightMovement, 0.2);

        flapStrength = (leftFlap + rightFlap) / 2;
      }

      previousLeftY = leftWrist.y;
      previousRightY = rightWrist.y;

      let wingAlpha = map(elapsed, FLIGHT_START, FLIGHT_START + 1200, 0, 255, true);

      if (wingAlpha > 10) {
        drawStyledWings(leftShoulder, leftElbow, leftWrist, -1, leftFlap);
        drawStyledWings(rightShoulder, rightElbow, rightWrist, 1, rightFlap);
      }
    }
  }

  if (progress >= 0.82 && progress < 1.0 && !explosionTriggered) {
    releaseFastBurnFeathers();
  }

  updateFeathers();
  updateWaxDrops();

  drawCinematicPrologue(elapsed);
  drawPromptMessage(elapsed);
  drawWarningBanner();

  if (progress >= 0.88) {
    triggerAndDrawExplosion();
  }

  drawOrganicOrganicRibbons();
}

// =========================================================
// MÁSCARA LATERAL CON ONDAS
// =========================================================
function drawOrganicOrganicRibbons() {
  push();
  noStroke();
  fill(0, 0, 0, 220);

  let t = millis() * 0.0008;

  beginShape();
  vertex(0, 0);
  vertex(width * 0.22, 0);
  for (let y = 0; y <= height; y += 60) {
    let wave1 = sin(y * 0.008 + t) * 35;
    let x = width * 0.12 + wave1;
    vertex(x, y);
  }
  vertex(0, height);
  endShape(CLOSE);

  beginShape();
  vertex(width, 0);
  vertex(width * 0.78, 0);
  for (let y = 0; y <= height; y += 60) {
    let wave1 = sin(y * 0.008 - t * 1.2) * 35;
    let x = width * 0.88 - wave1;
    vertex(x, y);
  }
  vertex(width, height);
  endShape(CLOSE);
  pop();
}

// =========================================================
// BANNER CON FONDO DE ONDAS TIPO FUEGO
// =========================================================
function drawWavyBannerBg(xCenter, yCenter, wBox, hBox, alphaVal) {
  push();
  noStroke();
  fill(20, 5, 2, alphaVal * 0.85);

  let t = millis() * 0.003; 
  let halfH = hBox / 2;
  let halfW = wBox / 2;

  beginShape();
  for (let x = xCenter - halfW; x <= xCenter + halfW; x += 15) {
    let waveY = yCenter - halfH + sin(x * 0.03 + t) * 8;
    vertex(x, waveY);
  }
  for (let y = yCenter - halfH; y <= yCenter + halfH; y += 15) {
    let waveX = xCenter + halfW + cos(y * 0.03 + t) * 8;
    vertex(waveX, y);
  }
  for (let x = xCenter + halfW; x >= xCenter - halfW; x -= 15) {
    let waveY = yCenter + halfH + sin(x * 0.03 - t) * 8;
    vertex(x, waveY);
  }
  for (let y = yCenter + halfH; y >= yCenter - halfH; y -= 15) {
    let waveX = xCenter - halfW + cos(y * 0.03 - t) * 8;
    vertex(waveX, y);
  }
  endShape(CLOSE);

  noFill();
  stroke(255, 120, 30, alphaVal * 0.7);
  strokeWeight(2);
  beginShape();
  for (let x = xCenter - halfW; x <= xCenter + halfW; x += 20) {
    vertex(x, yCenter - halfH + sin(x * 0.03 + t) * 8);
  }
  for (let x = xCenter + halfW; x >= xCenter - halfW; x -= 20) {
    vertex(x, yCenter + halfH + sin(x * 0.03 - t) * 8);
  }
  endShape();

  pop();
}

// =========================================================
// LÓGICA DE AUDIOS
// =========================================================
function handleSequentialAudio(elapsed) {
  if (!playingAmbiente && sndAmbiente) {
    if (!sndAmbiente.isPlaying()) {
      sndAmbiente.loop();
      sndAmbiente.setVolume(0.35);
    }
    playingAmbiente = true;
  }

  if (elapsed >= (FLIGHT_START + 4000) && !playingAleteo && progress < 0.68 && !aleteoFaded) {
    if (sndAleteo && !sndAleteo.isPlaying()) {
      sndAleteo.loop();
      sndAleteo.setVolume(0.3);
      playingAleteo = true;
    }
  }

  if (progress >= 0.38 && !playingViento && progress < 0.88) {
    if (sndViento && !sndViento.isPlaying()) {
      sndViento.loop();
      sndViento.setVolume(0.4);
      playingViento = true;
    }
  }

  if (progress >= 0.68 && progress < 0.88) {
    if (!aleteoFaded) {
      playingAleteo = false; 
      if (sndAleteo && sndAleteo.isPlaying()) {
        sndAleteo.setVolume(0, 1.5);
      }
      aleteoFaded = true;
    }

    if (!playingFuego) {
      if (sndFuego && !sndFuego.isPlaying()) {
        sndFuego.loop();
        sndFuego.setVolume(0);
        sndFuego.setVolume(0.8, 2.0);
      }
      playingFuego = true;
    }

    if (!playingFuego2) {
      if (sndFuego2 && !sndFuego2.isPlaying()) {
        sndFuego2.loop();
        sndFuego2.setVolume(0);
        sndFuego2.setVolume(0.7, 2.0);
      }
      playingFuego2 = true;
    }
  }

  if (progress >= 0.88 && !audioEndingFaded) {
    if (sndViento && sndViento.isPlaying()) sndViento.setVolume(0, 2.0);
    if (sndFuego && sndFuego.isPlaying()) sndFuego.setVolume(0, 2.0);
    if (sndFuego2 && sndFuego2.isPlaying()) sndFuego2.setVolume(0, 2.0);
    audioEndingFaded = true;
  }
}

// =========================================================
// CONTROL DE CÁMARA
// =========================================================
function startCameraTracking() {
  if (cameraStarted) return;
  cameraStarted = true;

  video = createCapture(VIDEO);
  video.size(320, 240);
  video.hide();

  pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });

  pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  pose.onResults(gotPose);

  cameraInstance = new Camera(video.elt, {
    onFrame: async () => {
      if (pose && video && video.elt && !cameraShutDown && !isPaused) {
        try {
          await pose.send({ image: video.elt });
        } catch(e) {}
      }
    },
    width: 320,
    height: 240
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
  } catch(e) {}
  poses = [];
}

function gotPose(results) {
  if (!cameraShutDown && !isPaused) {
    poses = results.poseLandmarks || [];
  }
}

// =========================================================
// INDICADOR VISUAL DE PAUSA
// =========================================================
function drawPauseOverlay() {
  push();
  fill(0, 0, 0, 110);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  textFont('Caesar Dressing', 'serif');
  textSize(min(width * 0.075, 62)); 
  fill(255, 235, 190);
  noStroke();

  text("PAUSA", width / 2, height / 2 - 15);

  textFont('Georgia', 'serif');
  textStyle(ITALIC);
  textSize(min(width * 0.026, 22)); 
  fill(230, 235, 245, 210);
  text("Haz clic para continuar", width / 2, height / 2 + 45);
  pop();
}

// =========================================================
// INTRO CINEMÁTICA
// =========================================================
function drawCinematicPrologue(elapsed) {
  if (elapsed >= 0 && elapsed < STORY_DURATION) {
    let alphaIn = map(elapsed, 0, 1200, 0, 255, true);
    let alphaOut = map(elapsed, STORY_DURATION - 1200, STORY_DURATION, 255, 0, true);
    let a = min(alphaIn, alphaOut);

    push();
    textAlign(CENTER, CENTER);

    let titleY = height * 0.5;
    let titleSize = min(width * 0.085, 82); 
    textFont('Caesar Dressing', 'serif');
    textSize(titleSize);
    let textW = textWidth("EL MITO DE ÍCARO Y DÉDALO");

    if (leavesImg && leavesImg.width > 0) {
      let leafH = min(width * 0.22, 230);
      let leafW = leafH * (leavesImg.width / leavesImg.height);

      drawingContext.globalAlpha = (a / 255) * 0.85;
      imageMode(CENTER);

      let branchY = titleY + titleSize * 0.45;
      let branchXOffset = textW * 0.44;

      push();
      translate(width / 2 - branchXOffset, branchY);
      rotate(HALF_PI * 0.95);
      scale(1, -1);
      image(leavesImg, 0, 0, leafW, leafH);
      pop();

      push();
      translate(width / 2 + branchXOffset, branchY);
      rotate(-HALF_PI * 0.95);
      image(leavesImg, 0, 0, leafW, leafH);
      pop();
    }

    drawingContext.globalAlpha = 1.0;
    noStroke();
    fill(255, 248, 235, a);
    text("EL MITO DE ÍCARO Y DÉDALO", width / 2, titleY);
    pop();
  }
}

// =========================================================
// CONSIGNA DE INICIO
// =========================================================
function drawPromptMessage(elapsed) {
  if (elapsed >= STORY_DURATION && elapsed < FLIGHT_START) {
    let alphaIn = map(elapsed, STORY_DURATION, STORY_DURATION + 800, 0, 255, true);
    let alphaOut = map(elapsed, FLIGHT_START - 800, FLIGHT_START, 255, 0, true);
    let a = min(alphaIn, alphaOut);

    push();
    textAlign(CENTER, CENTER);
    textFont('Caesar Dressing', 'serif');

    let promptSize = min(width * 0.075, 64); 
    textSize(promptSize);
    fill(255, 255, 255, a);
    noStroke();
    text("¡ES HORA DE VOLAR!", width / 2, height / 2 - 15);

    textFont('Georgia', 'serif');
    textSize(min(width * 0.028, 24)); 
    fill(235, 245, 255, a * 0.9);
    text("Mueve tus brazos para ascender hacia el cielo...", width / 2, height / 2 + 40);
    pop();
  }
}

// =========================================================
// CARTELES NARRATIVOS CON FONDO DE ONDAS
// =========================================================
function drawWarningBanner() {
  if (progress >= 0.15 && progress < 0.32) {
    let alphaIn = map(progress, 0.15, 0.20, 0, 255, true);
    let alphaOut = map(progress, 0.27, 0.32, 255, 0, true);
    let a = min(alphaIn, alphaOut);

    drawWavyBannerBg(width / 2, height * 0.24, min(width * 0.65, 750), 110, a);

    push();
    textAlign(CENTER, CENTER);
    textFont('Caesar Dressing', 'serif');

    let titleSize = min(width * 0.055, 48); 
    textSize(titleSize);
    fill(255, 250, 240, a);
    noStroke();
    text("ÍCARO ESTÁ VOLANDO MUY ALTO", width / 2, height * 0.225);

    textFont('Georgia', 'serif');
    textSize(min(width * 0.022, 20)); 
    textStyle(ITALIC);
    fill(235, 245, 255, a * 0.95);
    text("¡Date prisa! Alcánzalo antes de que sea tarde...", width / 2, height * 0.265);
    pop();
  }

  if (progress >= 0.42 && progress < 0.58) {
    let alphaIn = map(progress, 0.42, 0.46, 0, 255, true);
    let alphaOut = map(progress, 0.54, 0.58, 255, 0, true);
    let a = min(alphaIn, alphaOut);

    drawWavyBannerBg(width / 2, height * 0.24, min(width * 0.72, 850), 110, a);

    push();
    textAlign(CENTER, CENTER);
    textFont('Caesar Dressing', 'serif');

    let titleSize = min(width * 0.055, 48); 
    textSize(titleSize);

    fill(255, 240, 215, a);
    noStroke();
    text("¿ESTÁS SEGURO DE SEGUIR ALETEANDO?", width / 2, height * 0.225);

    textFont('Georgia', 'serif');
    textSize(min(width * 0.022, 20)); 
    fill(240, 245, 255, a * 0.95);
    text("La cera comienza a calentarse bajo la mirada del Sol...", width / 2, height * 0.265);
    pop();
  }

  if (progress >= 0.64 && progress < 0.80) {
    let alphaIn = map(progress, 0.64, 0.68, 0, 255, true);
    let alphaOut = map(progress, 0.76, 0.80, 255, 0, true);
    let a = min(alphaIn, alphaOut);

    drawWavyBannerBg(width / 2, height * 0.24, min(width * 0.78, 920), 110, a);

    push();
    textAlign(CENTER, CENTER);
    textFont('Caesar Dressing', 'serif');

    let titleSize = min(width * 0.058, 52); 
    textSize(titleSize);

    fill(255, 220, 180, a);
    noStroke();
    text("¡ÍCARO ESTÁ DEMASIADO CERCA DEL SOL!", width / 2, height * 0.225);

    textFont('Georgia', 'serif');
    textSize(min(width * 0.022, 20)); 
    textStyle(ITALIC);
    fill(255, 235, 220, a * 0.98);
    text("¡La cera se derrite! ¡Las alas no resistirán!", width / 2, height * 0.265);
    pop();
  }
}

// =========================================================
// ATMÓSFERA SÚPER GRADUAL
// =========================================================
function drawAtmosphere(elapsed) {
  let cTop, cBottom;

  if (elapsed < FLIGHT_START) {
    let t = map(elapsed, 0, FLIGHT_START, 0, 1);
    cTop = lerpColor(color(5, 8, 14), color(10, 15, 24), t);
    cBottom = lerpColor(color(12, 18, 28), color(20, 30, 45), t);
  } else if (progress < 0.35) {
    let t = map(progress, 0, 0.35, 0, 1);
    cTop = lerpColor(color(20, 105, 205), color(35, 115, 205), t);
    cBottom = lerpColor(color(150, 215, 255), color(180, 225, 245), t);
  } else if (progress < 0.60) {
    let t = map(progress, 0.35, 0.60, 0, 1);
    cTop = lerpColor(color(35, 115, 205), color(75, 80, 145), t);
    cBottom = lerpColor(color(180, 225, 245), color(235, 185, 120), t);
  } else if (progress < 0.80) {
    let t = map(progress, 0.60, 0.80, 0, 1);
    cTop = lerpColor(color(75, 80, 145), color(145, 30, 25), t);
    cBottom = lerpColor(color(235, 185, 120), color(245, 110, 30), t);
  } else {
    let t = map(progress, 0.80, 1.0, 0, 1);
    cTop = lerpColor(color(145, 30, 25), color(215, 10, 5), t);
    cBottom = lerpColor(color(245, 110, 30), color(255, 45, 10), t);
  }

  let ctx = drawingContext;
  let gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, cTop.toString());
  gradient.addColorStop(1, cBottom.toString());
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

// =========================================================
// NUBES
// =========================================================
function drawClouds(elapsed) {
  let cloudTint;

  if (elapsed < FLIGHT_START) {
    cloudTint = color(190, 205, 220);
  } else if (progress < 0.45) {
    cloudTint = color(255, 255, 255);
  } else {
    cloudTint = lerpColor(color(255, 255, 255), color(255, 90, 40), (progress - 0.45) / 0.55);
  }

  let heightSpeedMultiplier = map(progress, 0.15, 0.88, 1.0, 3.2, true);
  let playerSpeedBoost = map(flapStrength, 0, 15, 1, 2.0, true);

  push();
  blendMode(BLEND);
  imageMode(CENTER);

  for (let c of clouds) {
    c.y += (elapsed < FLIGHT_START ? c.speed : c.speed * heightSpeedMultiplier * playerSpeedBoost);

    if (c.y > height + 250) {
      c.y = -200;
      c.x = random(width);
      c.scale = random(0.5, 1.1);
      c.flip = random() < 0.5 ? 1 : -1;
    }

    if (cloudImg && cloudImg.width > 0) {
      push();
      translate(c.x, c.y);
      scale(c.scale * c.flip, c.scale);
      tint(red(cloudTint), green(cloudTint), blue(cloudTint), c.alpha);
      image(cloudImg, 0, 0);
      pop();
    } else {
      noStroke();
      fill(red(cloudTint), green(cloudTint), blue(cloudTint), c.alpha * 0.4);
      ellipse(c.x, c.y, 280 * c.scale, 110 * c.scale);
    }
  }
  pop();
}

// =========================================================
// PLUMAS ARDIENTES LATERALES
// =========================================================
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

// =========================================================
// CLÍMAX: EXPLOSIÓN SOLAR Y EPÍLOGOS CON ZOOM DE PLUMAS
// =========================================================
function triggerAndDrawExplosion() {
  if (!explosionTriggered) {
    explosionTriggered = true;
    explosionFlash = 255;
    epilogueStartTime = millis();

    feathers = [];
    waxDrops = [];
  }

  let epilogueElapsed = millis() - epilogueStartTime;

  // Generación extra de plumas durante el inicio del epílogo para el efecto zoom
  if (epilogueElapsed < 5000 && random() < 0.35 && feathers.length < 30) {
    feathers.push({
      x: width * 0.5 + random(-width * 0.48, width * 0.48),
      y: random(-50, height * 0.5),
      vx: random(-2.0, 2.0),
      vy: random(2.0, 5.0),
      gravity: 0.05,
      swayFreq: 0.04,
      swayAmp: 2.0,
      phase: random(TWO_PI),
      rotation: random(TWO_PI),
      rotationSpeed: random(-0.03, 0.03),
      size: random(80, 140),
      flipX: random() < 0.5 ? 1 : -1,
      flipY: random() < 0.5 ? 1 : -1,
      alpha: 255,
      alphaSpeed: 0.5
    });
  }

  if (explosionFlash > 0) {
    push();
    fill(255, 255, 255, explosionFlash);
    rect(0, 0, width, height);
    pop();
    explosionFlash = lerp(explosionFlash, 0, 0.09);
  }

  push();
  if (epilogueElapsed < 8500) {
    let redTone = map(epilogueElapsed, 0, 8500, 200, 35);
    fill(redTone, 15, 8);
    rect(0, 0, width, height);
  } else {
    fill(4, 7, 14);
    rect(0, 0, width, height);
  }
  pop();

  // EFECTO ZOOM DE PLUMAS AL FINAL (Entre los 18 y 20 segundos del epílogo)
  if (epilogueElapsed >= 18000 && epilogueElapsed < 20000) {
    let zoomProgress = map(epilogueElapsed, 18000, 20000, 1, 15);
    let zoomAlpha = map(epilogueElapsed, 18000, 20000, 0, 255);

    push();
    imageMode(CENTER);
    tint(255, 100, 20, zoomAlpha);
    // Dibujamos plumas gigantes haciendo zoom hacia la cámara
    image(featherImg, width / 2, height / 2, width * zoomProgress, height * zoomProgress);
    pop();
  }

  if (epilogueElapsed >= 500 && epilogueElapsed < 8200) {
    let alphaIn = map(epilogueElapsed, 500, 1500, 0, 255, true);
    let alphaOut = map(epilogueElapsed, 7200, 8200, 255, 0, true);
    let a = min(alphaIn, alphaOut);

    drawWavyBannerBg(width / 2, height * 0.48, min(width * 0.85, 950), 130, a);

    push();
    textAlign(CENTER, CENTER);
    textFont('Caesar Dressing', 'serif');
    let titleSize = min(width * 0.055, 48); 
    textSize(titleSize);
    noStroke();
    fill(255, 230, 195, a);
    text("EL SOL HA CALCINADO LAS ALAS DE ÍCARO", width / 2, height * 0.455);

    textFont('Georgia', 'serif');
    textSize(min(width * 0.024, 21)); 
    textStyle(ITALIC);
    fill(245, 240, 230, a * 0.95);
    text("La cera cedió ante el calor implacable y el joven se fundió en el cielo...", width / 2, height * 0.505);
    pop();
  }

  if (epilogueElapsed >= 8800) {
    if (epilogueElapsed < 19500) {
      let alphaIn = map(epilogueElapsed, 8800, 10200, 0, 255, true);
      let alphaOut = map(epilogueElapsed, 18500, 19500, 255, 0, true);
      let a = min(alphaIn, alphaOut);

      push();
      rectMode(CENTER);
      textAlign(CENTER, CENTER);

      stroke(218, 175, 105, a * 0.45);
      strokeWeight(1);
      line(width / 2 - 140, height * 0.30, width / 2 + 140, height * 0.30);
      line(width / 2 - 100, height * 0.70, width / 2 + 100, height * 0.70);
      noStroke();

      textFont('Georgia', 'serif');
      textStyle(ITALIC);
      let quoteSize = min(width * 0.03, 27); 
      textSize(quoteSize);
      textLeading(quoteSize * 1.65);
      fill(252, 244, 228, a);

      let finalQuote = "“Y ahora el cielo guarda por siempre la imagen de un vuelo perfecto y hermoso,\nmientras que el viento se quedó con el eco de un llanto\nque ninguna de sus invenciones pudo consolar.”";

      text(finalQuote, width / 2, height * 0.50, min(width * 0.82, 860), height * 0.35);
      pop();
    }
  }

  if (epilogueElapsed >= 20000) {
    let a = map(epilogueElapsed, 20000, 21800, 0, 255, true);

    push();
    textAlign(CENTER, CENTER);

    let titleY = height * 0.40; // Subido un poquito más para separar del "Hecho por"
    let titleSize = min(width * 0.08, 76); 
    textFont('Caesar Dressing', 'serif');
    textSize(titleSize);
    
    let titleText = "EL MITO DE ÍCARO Y DÉDALO";
    let textW = textWidth(titleText);

    let featherXOffset = textW * 0.52 + min(width * 0.04, 40);
    drawBurningFeatherDecor(width / 2 - featherXOffset, titleY, -1, a);
    drawBurningFeatherDecor(width / 2 + featherXOffset, titleY, 1, a);

    noStroke();
    fill(255, 246, 230, a);
    text(titleText, width / 2, titleY);

    textFont('Georgia', 'serif');
    textStyle(ITALIC);
    textSize(min(width * 0.026, 24)); 
    fill(218, 175, 105, a * 0.85);
    text("Fin", width / 2, titleY + titleSize * 1.05);

    // Separación corregida y generosa para el "Hecho por"
    let creditText = "Hecho por:\n\nAvanzini Angela • Basualdo Julia • Cayoja Pinto Matias Brandon\nCesar Ariana • Falero Daiana • Farias Jomñuk Laura Merlina\nGóngora García Sasha Agustina • Pedro Camila • Peñaloza Milena Gabriela\nPino Martina • Sanchez Rodriguez Guadalupe • Sequeira Biagetti Candela";
    
    rectMode(CENTER);
    textSize(min(width * 0.015, 15));
    fill(218, 175, 105, a * 0.65);
    textLeading(24); 
    text(creditText, width / 2, titleY + titleSize * 2.1);

    pop();
  }
}

// =========================================================
// GAVIOTAS
// =========================================================
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
      g.vx = random(2.2, 3.8);
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

// =========================================================
// GOTAS DE CERA LÍQUIDA
// =========================================================
function releaseMeltingWax(rate) {
  // Desactivado en zona de carteles
}

function updateWaxDrops() {
  push();
  for (let i = waxDrops.length - 1; i >= 0; i--) {
    let w = waxDrops[i];
    w.y += w.vy;
    w.vy += 0.38;

    stroke(red(w.color), green(w.color), blue(w.color), w.alpha);
    strokeWeight(w.thickness);
    line(w.x, w.y, w.x, w.y - w.length);

    noStroke();
    fill(255, 255, 210, w.alpha);
    circle(w.x, w.y, w.thickness * 1.4);

    if (w.y > height + 40) {
      waxDrops.splice(i, 1);
    }
  }
  pop();
}

// =========================================================
// PLUMAS CAYENDO
// =========================================================
function releaseFastBurnFeathers() {
  if (random() < 0.15 && feathers.length < 12) {
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
      size: random(65, 110),
      flipX: random() < 0.5 ? 1 : -1,
      flipY: random() < 0.5 ? 1 : -1,
      alpha: 255,
      alphaSpeed: 1.8
    });
  }
}

function updateFeathers() {
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

    if (f.y > height + 80 || f.alpha <= 0) {
      feathers.splice(i, 1);
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

// =========================================================
// ALAS ESTILIZADAS CON DOBLE CAPA
// =========================================================
function drawStyledWings(shoulder, elbow, wrist, side, movement) {
  push();
  let flapOffset = constrain(movement * 2.0, 0, 32);
  
  let wingColor = lerpColor(
    color(245, 250, 255, 240),
    color(255, 145, 45, 245),
    map(progress, 0.35, 0.88, 0, 1, true)
  );

  stroke(wingColor);
  strokeWeight(3.8);
  noFill();

  let tipX = wrist.x + side * (90 + flapOffset * 0.9);
  let tipY = wrist.y - (50 + flapOffset * 1.5);

  beginShape();
  curveVertex(shoulder.x, shoulder.y);
  curveVertex(shoulder.x, shoulder.y);
  curveVertex(elbow.x + side * 22, elbow.y - 18 - flapOffset * 0.45);
  curveVertex(wrist.x + side * 40, wrist.y - 30 - flapOffset * 0.95);
  curveVertex(tipX, tipY);
  curveVertex(tipX, tipY);
  endShape();

  let coverCount = 4;
  for (let j = 0; j < coverCount; j++) {
    let t = j / (coverCount - 1);
    let rootX = lerp(shoulder.x, tipX, t * 0.75);
    let rootY = lerp(shoulder.y, tipY, t * 0.75);
    let featherLen = lerp(30, 60, t);
    let baseAngle = side * (-0.25 + t * 0.40) - (flapOffset * 0.012 * side);
    drawFeatherBlade(rootX, rootY, featherLen, baseAngle, side, t, color(255, 255, 255, 160), 0.7);
  }

  let totalFeathers = 6;
  for (let i = 0; i < totalFeathers; i++) {
    let t = i / (totalFeathers - 1);
    let rootX = lerp(shoulder.x, tipX, t);
    let rootY = lerp(shoulder.y, tipY, t);

    let featherLen = lerp(50, 120, t) + sin(t * PI) * 18;
    let baseAngle = side * (-0.38 + t * 0.58) - (flapOffset * 0.018 * side);

    drawFeatherBlade(rootX, rootY, featherLen, baseAngle, side, t, wingColor, 1.0);
  }

  pop();
}

function drawFeatherBlade(x, y, len, angle, side, t, col, widthScale) {
  push();
  translate(x, y);
  rotate(angle);

  let w = lerp(11, 18, t) * widthScale;

  noStroke();
  fill(red(col), green(col), blue(col), map(t, 0, 1, 130, 220));
  
  beginShape();
  vertex(0, 0);
  bezierVertex(side * w * 0.65, -len * 0.35, side * w * 0.85, -len * 0.75, 0, -len);
  bezierVertex(-side * w * 0.35, -len * 0.75, -side * w * 0.25, -len * 0.35, 0, 0);
  endShape(CLOSE);

  stroke(255, 255, 255, 235);
  strokeWeight(1.4 * widthScale);
  line(0, 0, 0, -len * 0.96);

  pop();
}

// =========================================================
// RAYO INICIAL
// =========================================================
function triggerLightning() {
  let startX = random(width * 0.25, width * 0.75);
  let mainBranches = [];
  let segments = floor(random(10, 14));
  let curX = startX;
  let curY = -10;
  let totalH = height * 0.8;
  let stepY = totalH / segments;

  let path = [{ x: curX, y: curY }];

  for (let i = 0; i < segments; i++) {
    curX += random(-40, 40);
    curY += stepY + random(-10, 15);
    path.push({ x: curX, y: curY });

    if (random() < 0.30 && i < segments - 2) {
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

// ========================================
// TRACKING DE PUNTOS
// ========================================
function getPoint(index) {
  if (!poses[index]) return null;
  return {
    x: width - poses[index].x * width,
    y: poses[index].y * height
  };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}